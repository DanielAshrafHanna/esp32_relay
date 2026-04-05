import { resolveOutputProfileConfig } from "../domain/output-profiles.js";
import { createPool } from "./pool.js";
import { createId, hashApiToken, hashSecret } from "../lib/security.js";

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

async function main() {
  const pool = createPool();
  const client = await pool.connect();

  const customerSlug = env("SEED_CUSTOMER_SLUG", "demo-customer");
  const customerName = env("SEED_CUSTOMER_NAME", "Demo Customer");
  const adminEmail = env("SEED_ADMIN_EMAIL", "admin@solace.local");
  const adminPassword = env("SEED_ADMIN_PASSWORD", "ChangeMe123!");
  const siteName = env("SEED_SITE_NAME", "Main Site");
  const deviceKey = env("SEED_DEVICE_KEY", "relay-demo-01");
  const deviceHostname = env("SEED_DEVICE_HOSTNAME", "esp32-relay");
  const serviceAccountName = env("SEED_SERVICE_ACCOUNT_NAME", "mobile-app");
  const serviceAccountToken = env("SEED_SERVICE_ACCOUNT_TOKEN", "replace-with-long-random-token");

  try {
    await client.query("begin");

    const customerResult = await client.query(
      `
        insert into customers (id, name, slug, status)
        values ($1, $2, $3, 'active')
        on conflict (slug) do update set name = excluded.name
        returning id
      `,
      [createId(), customerName, customerSlug],
    );
    const customerId = customerResult.rows[0].id as string;

    const userResult = await client.query(
      `
        insert into users (id, email, display_name, password_hash, status)
        values ($1, $2, $3, $4, 'active')
        on conflict (email) do update set display_name = excluded.display_name, password_hash = excluded.password_hash
        returning id
      `,
      [createId(), adminEmail, "Solace Admin", hashSecret(adminPassword)],
    );
    const userId = userResult.rows[0].id as string;

    await client.query(
      `
        insert into customer_memberships (user_id, customer_id, role)
        values ($1, $2, 'admin')
        on conflict (user_id, customer_id) do update set role = 'admin'
      `,
      [userId, customerId],
    );

    const siteResult = await client.query(
      `
        insert into sites (id, customer_id, name)
        values ($1, $2, $3)
        on conflict (customer_id, name) do update set name = excluded.name
        returning id
      `,
      [createId(), customerId, siteName],
    );
    const siteId = siteResult.rows[0].id as string;

    const deviceResult = await client.query(
      `
        insert into devices (
          id, customer_id, site_id, device_key, mqtt_hostname, transport_version, active, desired_enabled, availability
        )
        values ($1, $2, $3, $4, $5, 'legacy_ha', true, true, 'unknown')
        on conflict (device_key) do update set mqtt_hostname = excluded.mqtt_hostname, site_id = excluded.site_id
        returning id
      `,
      [createId(), customerId, siteId, deviceKey, deviceHostname],
    );
    const deviceId = deviceResult.rows[0].id as string;

    await client.query(
      `
        delete from output_aliases
        where output_id in (
          select id
          from device_outputs
          where device_id = $1 and channel > 8
        )
      `,
      [deviceId],
    );

    await client.query(
      `
        delete from output_state_snapshots
        where output_id in (
          select id
          from device_outputs
          where device_id = $1 and channel > 8
        )
      `,
      [deviceId],
    );

    await client.query(
      `
        delete from commands
        where output_id in (
          select id
          from device_outputs
          where device_id = $1 and channel > 8
        )
      `,
      [deviceId],
    );

    await client.query(
      `
        delete from device_events
        where output_id in (
          select id
          from device_outputs
          where device_id = $1 and channel > 8
        )
      `,
      [deviceId],
    );

    await client.query(`delete from device_outputs where device_id = $1 and channel > 8`, [deviceId]);

    for (let channel = 1; channel <= 8; channel++) {
      const profile =
        channel === 1
          ? resolveOutputProfileConfig({
              deviceKey,
              channel,
              profileType: "light",
              displayName: "Entry Light",
              compatEntityId: "light.entry_light",
            })
          : channel === 2
            ? resolveOutputProfileConfig({
                deviceKey,
                channel,
                profileType: "gate",
                displayName: "Aywana Locker Door",
                compatEntityId: "lock.aywanalocker_door",
              })
            : resolveOutputProfileConfig({
                deviceKey,
                channel,
                profileType: "generic_relay",
                displayName: `Relay ${channel}`,
              });

      const outputResult = await client.query(
        `
          insert into device_outputs (
            id, device_id, channel, profile_type, display_name, pulse_ms, invert_relay, default_state,
            allowed_actions, compat_domain, compat_entity_id, service_map
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb)
          on conflict (device_id, channel) do update set
            profile_type = excluded.profile_type,
            display_name = excluded.display_name,
            pulse_ms = excluded.pulse_ms,
            invert_relay = excluded.invert_relay,
            default_state = excluded.default_state,
            allowed_actions = excluded.allowed_actions,
            compat_domain = excluded.compat_domain,
            compat_entity_id = excluded.compat_entity_id,
            service_map = excluded.service_map,
            updated_at = now()
          returning id
        `,
        [
          createId(),
          deviceId,
          channel,
          profile.profileType,
          profile.displayName,
          profile.pulseMs,
          profile.invertRelay,
          profile.defaultState,
          JSON.stringify(profile.allowedActions),
          profile.compatDomain,
          profile.compatEntityId,
          JSON.stringify(profile.serviceMap),
        ],
      );

      const outputId = outputResult.rows[0].id as string;

      await client.query(
        `
          insert into output_aliases (id, output_id, alias_type, alias_value)
          values ($1, $2, 'compat_entity', $3)
          on conflict (alias_value) do update set output_id = excluded.output_id
        `,
        [createId(), outputId, profile.compatEntityId],
      );

      await client.query(
        `
          insert into output_state_snapshots (output_id, last_state, source, raw_payload)
          values ($1, 'OFF', 'seed', '{}'::jsonb)
          on conflict (output_id) do nothing
        `,
        [outputId],
      );
    }

    await client.query(
      `
        insert into service_accounts (id, customer_id, name, token_hash, status, scopes)
        values ($1, $2, $3, $4, 'active', $5::jsonb)
        on conflict (customer_id, name) do update set token_hash = excluded.token_hash, status = 'active', scopes = excluded.scopes
      `,
      [createId(), customerId, serviceAccountName, hashApiToken(serviceAccountToken), JSON.stringify(["compat:write"])],
    );

    await client.query("commit");

    console.log("Seed complete");
    console.log(`Admin email: ${adminEmail}`);
    console.log(`Admin password: ${adminPassword}`);
    console.log(`Service account token: ${serviceAccountToken}`);
    console.log("Default webhook entity IDs:");
    console.log("- Channel 1: light.entry_light");
    console.log("- Channel 2: lock.aywanalocker_door");
    console.log("- Channels 3-8: switch.relay_demo_01_relay_<channel>");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
