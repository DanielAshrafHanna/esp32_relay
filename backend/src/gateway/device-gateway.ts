import { setTimeout as delay } from "node:timers/promises";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import pg, { type Client as PgClient } from "pg";
import type { Pool, PoolClient } from "pg";
import { getEnv } from "../config/env.js";
import { normalizeReportedState } from "../domain/actions.js";
import { createId } from "../lib/security.js";
import { mapOutputRow } from "../services/mappers.js";
import type { OutputRecord, OutputState, TransportStep } from "../types/domain.js";

interface GatewayCommandRow {
  id: string;
  output_id: string;
  customer_id: string;
  current_step: number;
  steps: TransportStep[];
  device_key: string;
  mqtt_hostname: string;
  transport_version: "legacy_ha" | "solace_v1";
}

export class DeviceGateway {
  private static readonly DISCOVERY_AVAILABILITY_TOPIC = "homeassistant/switch/+/availability";
  private static readonly DISCOVERY_STATE_TOPIC = "homeassistant/switch/+/+/state";
  private static readonly DISCOVERY_TELEMETRY_TOPIC = "homeassistant/switch/+/telemetry";
  private static readonly COMMAND_QUEUE_CHANNEL = "solace_command_queue";
  private readonly env = getEnv();
  private mqttClient: MqttClient | null = null;
  private commandListener: PgClient | null = null;
  private running = false;
  private commandProcessing = false;
  private commandProcessingRequested = false;
  private readonly subscriptions = new Set<string>();
  private readonly outputTopicMap = new Map<string, OutputRecord>();

  constructor(private readonly pool: Pool) {}

  async start() {
    this.running = true;
    this.mqttClient = await this.connectMqtt();
    await this.startCommandListener();
    await this.refreshDeviceTopics();
    this.requestCommandProcessing();
    void this.subscriptionRefreshLoop();
    void this.commandLoop();
    void this.timeoutLoop();
  }

  async stop() {
    this.running = false;
    if (this.commandListener) {
      await this.commandListener.end();
      this.commandListener = null;
    }
    if (this.mqttClient) {
      await new Promise<void>((resolve) => this.mqttClient?.end(false, {}, () => resolve()));
    }
  }

  private async connectMqtt(): Promise<MqttClient> {
    const options: IClientOptions = {
      clientId: `${this.env.mqttClientIdPrefix}-gateway`,
      username: this.env.mqttUsername,
      password: this.env.mqttPassword,
      reconnectPeriod: 1000,
    };

    const client = mqtt.connect(this.env.mqttUrl, options);

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", (error) => reject(error));
    });

    client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload.toString("utf8")).catch((error) => {
        console.error("Gateway MQTT message handling error", error);
      });
    });

    return client;
  }

  private async startCommandListener() {
    const client = new pg.Client({
      connectionString: this.env.databaseUrl,
    });

    await client.connect();
    await client.query(`listen ${DeviceGateway.COMMAND_QUEUE_CHANNEL}`);
    client.on("notification", (message) => {
      if (message.channel !== DeviceGateway.COMMAND_QUEUE_CHANNEL) {
        return;
      }
      this.requestCommandProcessing();
    });
    client.on("error", (error) => {
      console.error("Gateway command listener error", error);
    });
    this.commandListener = client;
  }

  private async subscriptionRefreshLoop() {
    while (this.running) {
      await this.refreshDeviceTopics();
      await delay(this.env.deviceRefreshIntervalMs);
    }
  }

  private async refreshDeviceTopics() {
    const result = await this.pool.query(
      `
        select
          o.id,
          d.customer_id,
          o.device_id,
          d.device_key,
          d.mqtt_hostname,
          d.transport_version,
          o.channel,
          o.profile_type,
          o.display_name,
          o.pulse_ms,
          o.invert_relay,
          o.default_state,
          o.allowed_actions,
          o.compat_domain,
          o.compat_entity_id,
          o.service_map,
          c.status as customer_status,
          coalesce(s.last_state, 'UNKNOWN') as last_known_state,
          s.updated_at as last_state_at
        from device_outputs o
        join devices d on d.id = o.device_id
        join customers c on c.id = d.customer_id
        left join output_state_snapshots s on s.output_id = o.id
        where d.active = true
      `,
    );

    const desiredTopics = new Set<string>([
      DeviceGateway.DISCOVERY_AVAILABILITY_TOPIC,
      DeviceGateway.DISCOVERY_STATE_TOPIC,
      DeviceGateway.DISCOVERY_TELEMETRY_TOPIC,
    ]);
    const outputs = result.rows.map((row) => mapOutputRow(row as Record<string, unknown>));
    this.outputTopicMap.clear();

    for (const output of outputs) {
      if (output.transportVersion !== "legacy_ha") {
        continue;
      }

      const stateTopic = `homeassistant/switch/${output.mqttHostname}/relay${output.channel}/state`;
      this.outputTopicMap.set(stateTopic, output);
    }

    for (const topic of desiredTopics) {
      if (!this.subscriptions.has(topic)) {
        await this.subscribe(topic);
      }
    }

    for (const topic of [...this.subscriptions]) {
      if (!desiredTopics.has(topic)) {
        await this.unsubscribe(topic);
      }
    }
  }

  private async subscribe(topic: string) {
    if (!this.mqttClient) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.mqttClient?.subscribe(topic, (error) => (error ? reject(error) : resolve()));
    });
    this.subscriptions.add(topic);
  }

  private async unsubscribe(topic: string) {
    if (!this.mqttClient) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.mqttClient?.unsubscribe(topic, (error) => (error ? reject(error) : resolve()));
    });
    this.subscriptions.delete(topic);
  }

  private async commandLoop() {
    while (this.running) {
      this.requestCommandProcessing();
      await delay(this.env.commandPollIntervalMs);
    }
  }

  private async timeoutLoop() {
    while (this.running) {
      try {
        await this.expireTimedOutCommands();
      } catch (error) {
        console.error("Gateway timeout loop error", error);
      }

      await delay(this.env.commandPollIntervalMs);
    }
  }

  private requestCommandProcessing() {
    if (!this.running) {
      return;
    }

    this.commandProcessingRequested = true;
    if (this.commandProcessing) {
      return;
    }

    this.commandProcessing = true;
    void this.runCommandProcessingLoop();
  }

  private async runCommandProcessingLoop() {
    try {
      while (this.running && this.commandProcessingRequested) {
        this.commandProcessingRequested = false;

        let processed = 0;
        do {
          processed = await this.processQueuedCommands();
        } while (this.running && processed > 0);
      }
    } catch (error) {
      console.error("Gateway command loop error", error);
    } finally {
      this.commandProcessing = false;
      if (this.running && this.commandProcessingRequested) {
        this.requestCommandProcessing();
      }
    }
  }

  private async processQueuedCommands(): Promise<number> {
    if (!this.mqttClient?.connected) {
      return 0;
    }

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `
          with next_commands as (
            select c.id
            from commands c
            join customers cu on cu.id = c.customer_id
            where c.status = 'queued'
              and c.next_step_at <= now()
              and cu.status = 'active'
            order by c.created_at
            limit 25
            for update skip locked
          )
          select
            c.id,
            c.output_id,
            c.customer_id,
            c.current_step,
            c.steps,
            d.device_key,
            d.mqtt_hostname,
            d.transport_version
          from commands c
          join next_commands n on n.id = c.id
          join device_outputs o on o.id = c.output_id
          join devices d on d.id = o.device_id
        `,
      );

      for (const row of result.rows as GatewayCommandRow[]) {
        const steps = row.steps;
        const step = steps[row.current_step];
        if (!step) {
          await client.query(
            `
              update commands
              set status = 'failed', last_error = 'Missing execution step', completed_at = now()
              where id = $1
            `,
            [row.id],
          );
          continue;
        }

        await new Promise<void>((resolve, reject) => {
          this.mqttClient?.publish(step.topic, step.payload, { qos: 1, retain: false }, (error) =>
            error ? reject(error) : resolve(),
          );
        });

        if (row.transport_version === "legacy_ha") {
          await this.completeLegacyStep(client, row, step);
        } else {
          await client.query(
            `
              update commands
              set
                status = 'waiting_state',
                expected_step_state = $2,
                step_timeout_at = now() + ($3 || ' milliseconds')::interval,
                started_at = coalesce(started_at, now()),
                result_payload = jsonb_set(
                  jsonb_set(
                    coalesce(result_payload, '{}'::jsonb),
                    '{trace,gateway_started_at}',
                    to_jsonb(coalesce(started_at, now())::text),
                    true
                  ),
                  '{trace,last_publish_ack_at}',
                  to_jsonb(now()::text),
                  true
                )
              where id = $1
            `,
            [row.id, step.expectState, this.env.commandStepTimeoutMs],
          );
        }

        await client.query(
          `
            insert into device_events (id, device_id, output_id, event_type, payload)
            select $1, o.device_id, o.id, 'command.step_published', $3::jsonb
            from device_outputs o
            where o.id = $2
          `,
          [createId(), row.output_id, JSON.stringify({ topic: step.topic, payload: step.payload })],
        );
      }

      await client.query("commit");
      return result.rowCount ?? 0;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async expireTimedOutCommands() {
    await this.pool.query(
      `
        update commands
        set
          status = 'timed_out',
          last_error = coalesce(last_error, 'No state confirmation received before timeout'),
          completed_at = now()
        where status = 'waiting_state'
          and step_timeout_at is not null
          and step_timeout_at < now()
      `,
    );
  }

  private async handleMessage(topic: string, payload: string) {
    if (topic.endsWith("/telemetry")) {
      await this.handleTelemetry(topic, payload);
      return;
    }

    if (topic.endsWith("/availability")) {
      await this.handleAvailability(topic, payload);
      return;
    }

    await this.handleState(topic, payload);
  }

  private async handleAvailability(topic: string, payload: string) {
    const match = topic.match(/^homeassistant\/switch\/([^/]+)\/availability$/);
    if (!match) {
      return;
    }

    const hostname = match[1];
    const availability = payload === "online" ? "online" : "offline";
    const result = await this.pool.query(
      `
        update devices
        set availability = $2, last_seen_at = now(), updated_at = now()
        where mqtt_hostname = $1
        returning id
      `,
      [hostname, availability],
    );

    if (!result.rowCount) {
      await this.recordDiscoveredBoard(hostname, availability, payload);
    }
  }

  private async handleState(topic: string, payload: string) {
    const output = this.outputTopicMap.get(topic);
    const topicMatch = topic.match(/^homeassistant\/switch\/([^/]+)\/(relay(\d+))\/state$/);
    if (topicMatch && !output) {
      const hostname = topicMatch[1];
      const channel = Number(topicMatch[3]);
      await this.recordDiscoveredState(hostname, channel, topic, payload);
    }

    if (!output) {
      return;
    }

    const normalizedState = normalizeReportedState(payload, output.invertRelay);
    await this.pool.query(
      `
        insert into output_state_snapshots (output_id, last_state, source, raw_payload, updated_at)
        values ($1, $2, 'mqtt', $3::jsonb, now())
        on conflict (output_id)
        do update set last_state = excluded.last_state, source = excluded.source, raw_payload = excluded.raw_payload, updated_at = excluded.updated_at
      `,
      [output.id, normalizedState, JSON.stringify({ topic, payload })],
    );

    await this.pool.query(
      `
        update devices
        set last_seen_at = now(), availability = 'online', updated_at = now()
        where id = $1
      `,
      [output.deviceId],
    );

    await this.advanceCommandIfMatched(output.id, normalizedState, topic, payload);
  }

  private async handleTelemetry(topic: string, payload: string) {
    const match = topic.match(/^homeassistant\/switch\/([^/]+)\/telemetry$/);
    if (!match) {
      return;
    }

    const hostname = match[1];
    let telemetry: Record<string, unknown>;
    try {
      telemetry = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      telemetry = { raw_payload: payload };
    }

    const result = await this.pool.query(
      `
        update devices
        set
          metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{telemetry}', $2::jsonb, true),
          last_seen_at = now(),
          availability = 'online',
          updated_at = now()
        where mqtt_hostname = $1
        returning id
      `,
      [hostname, JSON.stringify(telemetry)],
    );

    if (!result.rowCount) {
      await this.pool.query(
        `
          insert into discovered_devices (
            mqtt_hostname, availability, first_seen_at, last_seen_at, last_payload
          )
          values ($1, 'online', now(), now(), $2::jsonb)
          on conflict (mqtt_hostname)
          do update set
            availability = 'online',
            last_seen_at = now(),
            last_payload = excluded.last_payload
        `,
        [hostname, JSON.stringify({ topic, telemetry })],
      );
      return;
    }

    await this.pool.query(
      `
        insert into device_events (id, device_id, output_id, event_type, payload)
        select $1, d.id, null, 'mqtt.telemetry', $3::jsonb
        from devices d
        where d.mqtt_hostname = $2
      `,
      [createId(), hostname, JSON.stringify({ topic, telemetry })],
    );
  }

  private async recordDiscoveredBoard(hostname: string, availability: "online" | "offline", payload: string) {
    await this.pool.query(
      `
        insert into discovered_devices (
          mqtt_hostname, availability, first_seen_at, last_seen_at, last_payload
        )
        values ($1, $2, now(), now(), $3::jsonb)
        on conflict (mqtt_hostname)
        do update set
          availability = excluded.availability,
          last_seen_at = excluded.last_seen_at,
          last_payload = excluded.last_payload
      `,
      [hostname, availability, JSON.stringify({ availability, payload, topic: `homeassistant/switch/${hostname}/availability` })],
    );
  }

  private async recordDiscoveredState(hostname: string, channel: number, topic: string, payload: string) {
    await this.pool.query(
      `
        update devices
        set availability = 'online', last_seen_at = now(), updated_at = now()
        where mqtt_hostname = $1
      `,
      [hostname],
    );

    await this.pool.query(
      `
        insert into discovered_devices (
          mqtt_hostname, availability, first_seen_at, last_seen_at, highest_channel, last_state_topic, last_payload
        )
        values ($1, 'online', now(), now(), $2, $3, $4::jsonb)
        on conflict (mqtt_hostname)
        do update set
          availability = 'online',
          last_seen_at = now(),
          highest_channel = greatest(discovered_devices.highest_channel, excluded.highest_channel),
          last_state_topic = excluded.last_state_topic,
          last_payload = excluded.last_payload
      `,
      [hostname, channel, topic, JSON.stringify({ topic, payload, channel })],
    );
  }

  private async advanceCommandIfMatched(outputId: string, state: OutputState, topic: string, payload: string) {
    if (state === "UNKNOWN") {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `
          select *
          from commands
          where output_id = $1
            and status = 'waiting_state'
            and expected_step_state = $2
          order by created_at
          limit 1
          for update skip locked
        `,
        [outputId, state],
      );

      if (!result.rowCount) {
        await client.query("commit");
        return;
      }

      const row = result.rows[0];
      const steps = row.steps as TransportStep[];
      const currentStep = Number(row.current_step);
      const executedStep = steps[currentStep];
      const nextStepIndex = currentStep + 1;

      if (nextStepIndex >= steps.length) {
        await client.query(
          `
            update commands
            set
              status = 'completed',
              current_step = $2,
              expected_step_state = null,
              step_timeout_at = null,
              result_payload = jsonb_set(coalesce(result_payload, '{}'::jsonb), '{completed_state}', to_jsonb($3::text), true),
              completed_at = now()
            where id = $1
          `,
          [row.id, nextStepIndex, state],
        );
      } else {
        await client.query(
          `
            update commands
            set
              status = 'queued',
              current_step = $2,
              expected_step_state = null,
              step_timeout_at = null,
              next_step_at = now() + ($3 || ' milliseconds')::interval,
              result_payload = jsonb_set(
                jsonb_set(
                  coalesce(result_payload, '{}'::jsonb),
                  '{last_confirmed_state}',
                  to_jsonb($4::text),
                  true
                ),
                '{trace,last_state_confirmed_at}',
                to_jsonb(now()::text),
                true
              )
            where id = $1
          `,
          [row.id, nextStepIndex, executedStep.delayAfterMs ?? 0, state],
        );
      }

      await client.query(
        `
          insert into device_events (id, device_id, output_id, event_type, payload)
          select $1, o.device_id, o.id, 'mqtt.state', $3::jsonb
          from device_outputs o
          where o.id = $2
        `,
        [createId(), outputId, JSON.stringify({ topic, payload, normalized_state: state })],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async completeLegacyStep(client: PoolClient, row: GatewayCommandRow, step: TransportStep) {
    const nextStepIndex = row.current_step + 1;

    await client.query(
      `
        insert into output_state_snapshots (output_id, last_state, source, raw_payload, updated_at)
        values ($1, $2, 'gateway_optimistic', $3::jsonb, now())
        on conflict (output_id)
        do update set last_state = excluded.last_state, source = excluded.source, raw_payload = excluded.raw_payload, updated_at = excluded.updated_at
      `,
      [row.output_id, step.expectState, JSON.stringify({ topic: step.topic, payload: step.payload, optimistic: true })],
    );

    if (nextStepIndex >= row.steps.length) {
      await client.query(
        `
          update commands
          set
            status = 'completed',
            current_step = $2,
            expected_step_state = null,
            step_timeout_at = null,
            started_at = coalesce(started_at, now()),
            result_payload = jsonb_set(
              jsonb_set(
                jsonb_set(
                  coalesce(result_payload, '{}'::jsonb),
                  '{completed_state}',
                  to_jsonb($3::text),
                  true
                ),
                '{trace,gateway_started_at}',
                to_jsonb(coalesce(started_at, now())::text),
                true
              ),
              '{trace,last_publish_ack_at}',
              to_jsonb(now()::text),
              true
            ),
            completed_at = now()
          where id = $1
        `,
        [row.id, nextStepIndex, step.expectState],
      );
      return;
    }

    await client.query(
        `
        update commands
        set
          status = 'queued',
          current_step = $2,
          expected_step_state = null,
          step_timeout_at = null,
          started_at = coalesce(started_at, now()),
          next_step_at = now() + ($3 || ' milliseconds')::interval,
          result_payload = jsonb_set(
            jsonb_set(
              jsonb_set(
                coalesce(result_payload, '{}'::jsonb),
                '{last_confirmed_state}',
                to_jsonb($4::text),
                true
              ),
              '{trace,gateway_started_at}',
              to_jsonb(coalesce(started_at, now())::text),
              true
            ),
            '{trace,last_publish_ack_at}',
            to_jsonb(now()::text),
            true
          )
        where id = $1
      `,
      [row.id, nextStepIndex, step.delayAfterMs ?? 0, step.expectState],
    );
  }
}
