# Solace Relay Backend

Phase 1 backend for the cloud-managed relay product. It provides:

- Native product API for auth, devices, outputs, commands, and provisioning
- Home Assistant-style compatibility write endpoints for the current mobile app
- MQTT gateway worker that translates queued commands into the ESP firmware's existing MQTT topics
- PostgreSQL schema for customers, devices, outputs, commands, audit logs, and service accounts
- A built-in web console at `/` or `/console` for operators

## Quick Start

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start infrastructure:

```bash
docker compose -f backend/docker-compose.yml up -d
```

3. Install dependencies:

```bash
cd backend
npm install
```

4. Run migrations and seed data:

```bash
npm run db:migrate
npm run db:seed
```

5. Start the API and gateway in separate terminals:

```bash
npm run dev:api
npm run dev:gateway
```

6. Open the operator console:

```text
http://localhost:8080
```

The console lets you:

- log in as admin
- auto-load sites, boards, and outputs when a saved admin session exists
- inspect all outputs
- change a relay between `gate`, `light`, `cover`, `switch`, and `generic relay`
- edit webhook entity IDs
- trigger compatibility webhooks from the browser when needed
- copy ready-to-use compatibility webhook `curl` commands per relay row
- view latest board telemetry such as uptime, RSSI, heap, and MQTT status
- see command latency tracing in the webhook status panel after triggering a relay
- group boards by site with collapsible site and board sections
- create, rename, and delete empty sites from the console

For responsive relay triggering, the recommended gateway setting is:

- `COMMAND_POLL_INTERVAL_MS=150`
- `COMMAND_REPLAY_MAX_AGE_MS=5000`

The gateway now uses a push-based PostgreSQL wake-up path for new commands and keeps the poll interval as a fallback safety net plus timeout cadence. `150ms` is still a good default for your current scale without making the worker noisy.

To prevent old queued commands from replaying after a gateway restart, the gateway discards startup commands that were never started and are older than `COMMAND_REPLAY_MAX_AGE_MS`. This keeps stale relay actions from firing after a redeploy without interfering with normal in-progress pulse follow-up steps.

When you trigger a relay from the console, the webhook status panel now shows a simple timing breakdown:

- `Created -> gateway start`
- `Created -> MQTT publish ack`
- `Created -> completed`

That makes it easier to tell whether any remaining lag is coming from command pickup, broker publish, or the device-side completion path.

The latest tracing update also adds a lightweight ESP-side trace:

- the ESP publishes a tiny MQTT trace event when it receives a relay command
- it publishes another when the relay state is applied
- the middleware stores the latest device trace and includes it in the webhook status summary when available

That lets you compare backend timing against the final device-side hop without adding heavy logging or polling.

## Current Branch Checkpoints

Current recommended branch checkpoints before rollout:

- ESP firmware stability: `c4bbaea` `Harden ESP runtime stability`
- ESP telemetry export: `e5ccd2c` `Add lightweight device telemetry`
- ESP MQTT recovery hardening: `ac02b87` `Harden MQTT recovery behavior`
- Middleware webhook helper fix: `dfcf339` `Fix console webhook helper script`

## Default Local Credentials

These are seeded for local testing only:

- Admin email: `admin@solace.local`
- Admin password: `ChangeMe123!`
- Service token: `solace-local-test-token`

Change them before any internet-facing deployment.

## Current Railway Test Deployment

The current hosted test environment we created uses:

- API URL: `https://esp32relay-production.up.railway.app/`
- Secure MQTT broker public host: `maglev.proxy.rlwy.net`
- Secure MQTT broker public port: `44016`
- Secure MQTT broker private host for Railway services: `fulfilling-essence.railway.internal`
- Seeded admin email: `admin@solace.local`
- Seeded admin password: `ChangeMe123!`
- Seeded service token: `solace-railway-test-token`
- Seeded device MQTT hostname/topic namespace: `esp32-relay`

These values are for the current test deployment only. Rotate them before any real customer rollout.

Important Railway note:

- on Railway, the seed script now defaults to **not** recreating the demo `esp32-relay` device on every restart
- it still seeds the admin user and service account unless you remove `node dist/db/seed.js` from your start/init flow
- if you explicitly want the demo board back, set `SEED_INCLUDE_DEMO_DEVICE=true`

## ESP Firmware Note For Railway MQTT

Railway broker hostnames can be long. The firmware originally stored `mqtt_server` in a 40-character buffer, which truncates long broker hosts and causes MQTT connection failure.

This branch includes a firmware fix that increases the MQTT server, username, password, and MQTT hostname buffers. After flashing the updated firmware:

- re-enter the full MQTT server hostname
- use the Railway-generated TCP proxy port, not the internal broker port unless the proxy explicitly shows `1883`
- use the per-board MQTT username and password shown below for the secure broker
- clear the password field only if you intentionally want it blank on a local anonymous broker
- keep MQTT hostname as `esp32-relay`

If the password field in `/solaceadmin` shows dots, that is a masked placeholder, not proof that a real password is still required.

The currently verified working secure Railway MQTT device settings are:

- MQTT server: `maglev.proxy.rlwy.net`
- MQTT port: `44016`
- MQTT username: `esp32-relay`
- MQTT password: `BoardPass123`
- MQTT hostname: `esp32-relay`

## Phase 1 Compatibility Routes

These routes accept the current Home Assistant-style webhook writes from the app:

- `POST /api/services/:domain/:service`
- `POST /compat/ha/api/services/:domain/:service`

Authentication for compatibility routes:

- use `Authorization: Bearer <service-account-token>`
- for the current Railway test deployment, that token is `solace-railway-test-token`

Request body:

```json
{
  "entity_id": "lock.aywanalocker_door"
}
```

You can also send multiple entities in one call:

```json
{
  "entity_id": ["switch.relay_demo_01_relay_3", "switch.relay_demo_01_relay_4"]
}
```

Typical success response:

```json
{
  "commands": [
    {
      "id": "command-id",
      "status": "queued"
    }
  ],
  "accepted": 1
}
```

Example:

```bash
curl -X POST http://localhost:8080/api/services/lock/unlock \
  -H "Authorization: Bearer replace-with-service-account-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"lock.aywanalocker_door"}'
```

Supported compatibility webhook families:

- `POST /api/services/lock/unlock`
- `POST /api/services/light/turn_on`
- `POST /api/services/light/turn_off`
- `POST /api/services/light/toggle`
- `POST /api/services/switch/turn_on`
- `POST /api/services/switch/turn_off`
- `POST /api/services/switch/toggle`
- `POST /api/services/cover/open_cover`
- `POST /api/services/cover/close_cover`
- `POST /api/services/cover/stop_cover`

The same handlers are also exposed under:

- `POST /compat/ha/api/services/:domain/:service`

Compatibility behavior mapping:

- `lock.unlock` on a `gate` profile becomes a backend pulse using `pulse_ms`
- `light.turn_on` on a `light` profile becomes relay `ON`
- `light.turn_off` on a `light` profile becomes relay `OFF`
- `switch.turn_on` on a `generic_relay` profile becomes relay `ON`
- `switch.toggle` becomes relay `TOGGLE`
- `cover.*` is supported only when the output profile and allowed actions are configured to accept it

## Current Seeded Relays

The seed now creates one 8-channel device model:

- Channel 1: `light.entry_light`
- Channel 2: `lock.aywanalocker_door`
- Channels 3-8: `switch.relay_demo_01_relay_<channel>`

That means you can immediately trigger any of channels 3-8 with compatibility webhooks like:

```bash
curl -X POST http://localhost:8080/api/services/switch/turn_on \
  -H "Authorization: Bearer replace-with-service-account-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

## Native API

Authentication for native API routes:

- `POST /v1/auth/login` uses email and password
- all other `/v1/*` routes use `Authorization: Bearer <admin-jwt>` unless stated otherwise

Core native routes:

- `POST /v1/auth/login`
- `GET /v1/me`
- `GET /v1/devices`
- `GET /v1/devices/:id`
- `DELETE /v1/devices/:id`
- `GET /v1/outputs`
- `GET /v1/outputs/:id`
- `POST /v1/outputs/:id/actions`
- `PATCH /v1/outputs/:id/profile`
- `PUT /v1/devices/:id/outputs/configuration`
- `GET /v1/commands/:id`
- `POST /v1/provisioning/boards`
- `POST /v1/provisioning/device-credentials`
- `GET /v1/discovery/boards`
- `POST /v1/discovery/boards/:mqtt_hostname/claim`

Admin login:

```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solace.local","password":"ChangeMe123!"}'
```

List devices:

```bash
curl http://localhost:8080/v1/devices \
  -H "Authorization: Bearer <admin-jwt>"
```

List outputs:

```bash
curl http://localhost:8080/v1/outputs \
  -H "Authorization: Bearer <admin-jwt>"
```

Run a native action directly:

```bash
curl -X POST http://localhost:8080/v1/outputs/<output-id>/actions \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"action":"pulse","duration_ms":2000}'
```

Supported native actions:

- `on`
- `off`
- `toggle`
- `pulse`

Common native API response behavior:

- command-creation endpoints return `202 Accepted`
- provisioning returns `201 Created`
- listing routes return `200 OK`
- validation failures return `400`
- unsupported compatibility routes return `404`
- suspended customers are blocked from command creation

## Auth Models

There are two main auth modes in the middleware:

- admin/operator auth:
  - log in at `POST /v1/auth/login`
  - receive a JWT
  - use this for GUI access, device management, output profile changes, and reading command/device data
- service-account auth:
  - use a fixed bearer token
  - intended for the current mobile app compatibility webhook calls
  - should not be used for full admin operations in the long term

## Choosing Gate vs Light Per Relay

Use the native API to reconfigure any output profile. For a single output:

```bash
curl -X PATCH http://localhost:8080/v1/outputs/<output-id>/profile \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_type": "gate",
    "display_name": "Sliding Gate",
    "compat_entity_id": "lock.sliding_gate"
  }'
```

For multiple relays at once on the same device:

```bash
curl -X PUT http://localhost:8080/v1/devices/<device-id>/outputs/configuration \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "outputs": [
      {
        "channel": 5,
        "profile_type": "gate",
        "display_name": "Workshop Gate",
        "compat_entity_id": "lock.workshop_gate",
        "pulse_ms": 2000
      },
      {
        "channel": 6,
        "profile_type": "light",
        "display_name": "Garden Lights",
        "compat_entity_id": "light.garden_lights"
      }
    ]
  }'
```

After that, the same webhook contract works:

- gate: `POST /api/services/lock/unlock`
- light: `POST /api/services/light/turn_on`
- generic relay: `POST /api/services/switch/turn_on`

## Device Key vs MQTT Hostname

These two values are related, but they are not the same thing:

- `mqtt_hostname`
  - the board's real MQTT identity
  - used in MQTT topics like `homeassistant/switch/<mqtt_hostname>/relay1/set`
  - used for per-board MQTT credentials and ACL scoping
  - used as the default board title fallback
  - used as the namespace for default entity IDs like `switch.dany.relay1`
- `device_key`
  - middleware-side internal label for the board record
  - used for searching, logs, and identifying the board in the database
  - does **not** control MQTT topics or broker access

Recommended rule:

- keep `device_key` the same as `mqtt_hostname` unless you have a specific reason not to

That keeps the system easier to understand and troubleshoot.

## GUI Workflow

For the easiest operator flow:

1. Open `/console`
2. Log in with the admin credentials
3. If a saved admin session exists, the console now auto-loads sites, devices, and outputs.
4. If needed, use `Load Devices` or `Load Outputs` as manual refresh buttons.
5. Edit any row:
   - `Profile` decides whether a relay behaves like a gate, light, cover, switch, or generic relay
   - `Entity` decides which webhook `entity_id` will target that relay
   - `Pulse` matters for gate or pulse-style behavior
6. Click `Save` on that row
7. Use the row action buttons, or open `Advanced Tools` if you need the webhook tester or manual board add fallback

### Load Devices vs Load Outputs

The console separates board-level data from relay-level data:

- `Load Devices`
  - fetches the relay board records
  - shows board sections, titles, MQTT hostnames, availability, and enabled/disabled status
  - does not need to fetch every relay row
- `Load Outputs`
  - fetches the individual relay outputs for all loaded boards
  - fills in each relay row, profile, entity ID, pulse setting, and last known state

Why it can feel like you need both:

- a board is the physical ESP unit
- an output is one relay channel on that board
- the UI first learns which boards exist, then fills in the relays that belong to them

The console now renders board sections after `Load Devices`, even before outputs are loaded, so the separation is easier to see. The page also auto-loads both when a saved admin session is restored, so most operators should not need to press both buttons every time.

## Board Onboarding Flow

The console now supports two onboarding paths:

- preferred: let the ESP connect first and claim it from `Discovered Boards`
- fallback: open `Advanced Tools` and use `Manual Board Add`

The manual board-add flow will:

- create the device record
- create the default 8 outputs
- issue MQTT credentials for that board
- return the exact `username:password` line to append to `MQTT_BOOTSTRAP_USERS`

Operator flow:

1. Log in as admin
2. In `Advanced Tools -> Manual Board Add`, enter:
   - board title
   - MQTT hostname
   - optional device key
   - channel count, usually `8`
3. Click `Create Board`
4. Copy the returned `MQTT_BOOTSTRAP_USERS` line into the secure broker service
5. Redeploy the secure broker
6. Put the same MQTT username/password into the ESP `/solaceadmin`

Best practice:

- use the exact ESP `mqtt_hostname`
- keep `device_key` the same unless you deliberately want a separate internal label

Native API example:

```bash
curl -X POST https://esp32relay-production.up.railway.app/v1/provisioning/boards \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Dany Main Board",
    "mqtt_hostname": "dany",
    "channel_count": 8
  }'
```

Typical response shape:

```json
{
  "device": {
    "id": "device-id",
    "deviceKey": "dany",
    "mqttHostname": "dany"
  },
  "credentials": {
    "username": "dany",
    "password": "generated-password"
  },
  "mqttBootstrapEntry": "dany:generated-password"
}
```

## Discovery And Claim Flow

The gateway now subscribes to wildcard legacy MQTT topics and records unknown boards in `discovered_devices`.

What this means operationally:

- if an ESP connects to MQTT with a hostname the middleware does not know yet
- the board appears in the console under `Discovered Boards`
- you can click `Claim Board`
- the middleware creates the device, creates its relay outputs, issues MQTT credentials, and returns the broker bootstrap line

This is the preferred workflow for new boards because it feels closer to automatic discovery while still keeping the final board claim explicit and safe.

Discovery behavior notes:

- discovery records are persisted in the database
- deleting a claimed board does **not** erase the remembered discovery hostname
- if the board is still powered and connected, it can rediscover itself without a physical reboot because telemetry, availability, or state traffic will be seen again
- if the board is unplugged, no new live traffic is sent, but retained MQTT messages may still make the hostname reappear later

The console now treats `Discovered Boards` more like a live inbox:

- stale discovered boards are hidden by default
- you can enable `Show stale discovered boards`
- you can `Dismiss` an unclaimed discovered board to clear it from the list

Default entity IDs for newly claimed boards now use the MQTT hostname namespace:

- light profile: `light.dany.relay1`
- gate profile: `lock.dany.relay1`
- switch profile: `switch.dany.relay1`
- generic relay profile: `switch.dany.relay1`

`switch` and `generic relay` are intentionally different:

- `generic relay`
  - normal switch-style relay behavior
  - `switch.turn_on` stays on
  - no pulse override by default
- `switch`
  - switch-style entity and webhook family
  - default entity like `switch.dany.relay1`
  - `switch.turn_on` maps to a pulse by default
  - keeps `turn_off` and `toggle` available
  - uses `pulse_ms`, defaulting to `2000`

Native discovery routes:

- `GET /v1/discovery/boards`
- `POST /v1/discovery/boards/:mqtt_hostname/claim`

Example:

```bash
curl -X POST https://esp32relay-production.up.railway.app/v1/discovery/boards/dany/claim \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Dany Main Board",
    "device_key": "dany",
    "channel_count": 8
  }'
```

If you delete a claimed board later, its discovery record can still reappear when the ESP reconnects, because discovery is now stored separately from the claimed device record.

## Relay Board Sections

The console groups outputs by relay board instead of showing one flat list.

Each board section includes:

- a board title shown above that board's relays
- the MQTT hostname and availability for that board
- a board-level enable toggle using `desired_enabled`
- grouped relay rows underneath the board header

Board titles now default to the device `mqtt_hostname`, which matches the `MQTT Hostname` field you set on the ESP in `/solaceadmin`.

If you set a custom board title in the middleware console, that custom title overrides the MQTT hostname fallback.

If you later want the board title to originate from the ESP `/solaceadmin` page and sync automatically into middleware, that can be added as a follow-up feature.

You can also delete a board directly from its section header. Deleting a board removes the claimed device record and cascades to its outputs and middleware-stored credentials. If the board also has a broker user in Railway `MQTT_BOOTSTRAP_USERS`, remove that line there too and redeploy the secure broker.

## Current Test Webhooks

Against the current Railway deployment:

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/lock/unlock \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"lock.aywanalocker_door"}'
```

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/light/turn_on \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"light.entry_light"}'
```

Turn a generic relay on:

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/switch/turn_on \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

Turn a generic relay off:

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/switch/turn_off \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

## Live Test Checklist

Use this exact order for a live cloud test:

1. Confirm the ESP is connected to Wi-Fi and MQTT using:
   - MQTT server: `maglev.proxy.rlwy.net`
   - MQTT port: `44016`
   - MQTT username: `esp32-relay`
   - MQTT password: `BoardPass123`
   - MQTT hostname: `esp32-relay`
2. Open the GUI:
   - `https://esp32relay-production.up.railway.app/`
3. Log in with:
   - email: `admin@solace.local`
   - password: `ChangeMe123!`
4. Click `Load Devices`
5. Click `Load Outputs`
6. Trigger one of these tests:
   - gate pulse: `lock.aywanalocker_door`
   - light on/off: `light.entry_light`
   - generic relay on/off: `switch.relay_demo_01_relay_3`
7. If using curl, keep polling the command id with `GET /v1/commands/:id` if you want to confirm completion status

## Staging Deployment

Use:

- [Dockerfile](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/Dockerfile)
- [docker-compose.staging.yml](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/docker-compose.staging.yml)
- [STAGING_GUIDE.md](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/STAGING_GUIDE.md)

## Hosting Recommendation

For this architecture, use a host that supports persistent container services:

- API service
- long-running MQTT gateway worker
- PostgreSQL
- Mosquitto

Vercel is not a good primary fit for the current architecture because the gateway is a continuously running worker and the broker is a persistent service. For a first hosted version, use a container-friendly platform such as Railway, Render, Fly.io, or a VPS.

## Secure MQTT Per Board

For production, do not keep MQTT anonymous.

The secure model in this repo is:

- one MQTT username/password per relay board
- the MQTT username is the board `mqtt_hostname`
- Mosquitto ACLs allow each board to access only its own topic namespace
- the backend gateway uses its own broker account with broader access

Broker files:

- config: [backend/docker/mosquitto/mosquitto.conf](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/docker/mosquitto/mosquitto.conf)
- ACLs: [backend/docker/mosquitto/aclfile](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/docker/mosquitto/aclfile)

ACL behavior:

- device username `board-a` can only access `homeassistant/switch/board-a/#`
- device username `board-b` can only access `homeassistant/switch/board-b/#`
- backend user `backend-gateway` can access all relay topics

Current Railway secure-broker example:

- broker public TCP endpoint for ESPs: `maglev.proxy.rlwy.net:44016`
- broker private endpoint for Railway services: `mqtt://fulfilling-essence.railway.internal:1883`
- gateway broker username: `backend-gateway`
- demo board broker username: `esp32-relay`

Issue credentials for a board:

```bash
curl -X POST https://esp32relay-production.up.railway.app/v1/provisioning/device-credentials \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"<device-id>"}'
```

The returned username will be the board `mqtt_hostname`. The returned password is what you put into the ESP `/solaceadmin` page and also into the Mosquitto password file.

On Railway, the easiest way to manage broker users is with the secure Mosquitto service variable `MQTT_BOOTSTRAP_USERS`. Put one `username:password` pair per line and redeploy the broker.

You can enter it either as real multiple lines in the value field or as a single raw-editor value using `\n` between entries.

Example:

```text
backend-gateway:STRONG_GATEWAY_PASSWORD
esp32-relay:DEVICE_PASSWORD
dany:ANOTHER_DEVICE_PASSWORD
```

Raw editor example:

```text
MQTT_BOOTSTRAP_USERS=backend-gateway:STRONG_GATEWAY_PASSWORD\nesp32-relay:DEVICE_PASSWORD\ndany:ANOTHER_DEVICE_PASSWORD
```

The startup script will create or update `/mosquitto/config/passwd` automatically on every deploy.

For the current secure Railway deployment, the working value is:

```text
backend-gateway:StrongGatewayPass123
esp32-relay:BoardPass123
```

If you are running Mosquitto manually outside Railway, create or update the password file entry with:

```bash
mosquitto_passwd -b backend/docker/mosquitto/passwd <mqtt_hostname> <generated-password>
```

Create the backend gateway broker user too:

```bash
mosquitto_passwd -b backend/docker/mosquitto/passwd backend-gateway <strong-random-password>
```

Then set on the `gateway` service:

- `MQTT_USERNAME=backend-gateway`
- `MQTT_PASSWORD=<strong-random-password>`
- `MQTT_URL=mqtt://<secure-mosquitto-private-host>:1883`

After changing the password file, reload or restart Mosquitto.

For the current Railway secure broker, the matching gateway variables are:

```text
MQTT_URL=mqtt://fulfilling-essence.railway.internal:1883
MQTT_USERNAME=backend-gateway
MQTT_PASSWORD=StrongGatewayPass123
```

### How To Add A New Board User

1. Pick a unique board identifier, for example `club-a-main`.
2. Use that same value as the board `mqtt_hostname` in the middleware and on the ESP.
3. Add a new line to the secure Mosquitto service variable `MQTT_BOOTSTRAP_USERS`:

```text
backend-gateway:StrongGatewayPass123
esp32-relay:BoardPass123
club-a-main:ClubAMqttPass456
```

4. Redeploy the secure Mosquitto service.
5. On the ESP board, set:
   - MQTT server = secure broker public TCP hostname
   - MQTT port = secure broker public TCP port
   - MQTT username = `club-a-main`
   - MQTT password = `ClubAMqttPass456`
   - MQTT hostname = `club-a-main`
6. In the middleware, make sure that board's device record uses `mqtt_hostname = club-a-main`.

Because ACLs key off the MQTT username, a board with username `club-a-main` will only be able to read and write `homeassistant/switch/club-a-main/#`.

## Seeded Demo Data

The seed script creates:

- one admin user
- one service account token for the current app
- one demo 8-channel device using the legacy Home Assistant MQTT topics
- 8 output records ready for webhook-driven testing
