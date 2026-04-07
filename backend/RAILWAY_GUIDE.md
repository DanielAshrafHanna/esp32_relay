# Railway Guide

This guide gets the middleware online on Railway without requiring your own VPS first.

Current branch checkpoints:

- ESP runtime stability: `c4bbaea`
- ESP telemetry export: `e5ccd2c`
- ESP MQTT recovery hardening: `ac02b87`
- Middleware webhook helper repair: `dfcf339`

## What we will deploy

You need four Railway services in one project:

1. `api` - Fastify HTTP API and built-in GUI
2. `gateway` - long-running MQTT worker
3. `postgres` - PostgreSQL database
4. `mosquitto` - MQTT broker for the ESP relays

Why four:

- the API handles login, relay configuration, webhook compatibility, and the GUI
- the gateway keeps running all the time and translates backend commands into MQTT
- PostgreSQL stores customers, outputs, commands, logs, and profiles
- Mosquitto is the actual broker the ESP relay connects to

## Before you start

You need:

- a GitHub repo containing this branch
- a Railway account

You do **not** need:

- your own VPS
- your own domain yet

Railway can generate:

- a public HTTPS domain for the API
- a TCP proxy hostname and port for Mosquitto

## 1. Push this branch to GitHub

Branch:

- `codex-esp32-middleware`

If you have not pushed it yet:

```bash
git push -u origin codex-esp32-middleware
```

## 2. Create a new Railway project

In Railway:

1. Click `New Project`
2. Choose `Empty Project`

## 3. Add PostgreSQL

1. Click `New`
2. Add `PostgreSQL`

Railway will create a database service for you.

## 4. Add Secure Mosquitto

Create a dedicated broker service from the repo using:

- Repo: your GitHub repo
- Branch: `codex-esp32-middleware`
- Root Directory: `backend/docker/mosquitto`

Then set:

- `RAILWAY_RUN_UID=0`
- `MQTT_BOOTSTRAP_USERS=backend-gateway:StrongGatewayPass123\nesp32-relay:BoardPass123`

Attach one Railway volume to the Mosquitto service:

- mount path: `/mosquitto/config`

Why this volume matters:

- it stores the dynamic `passwd` file
- it keeps the broker config and ACL file persistent across redeploys

The broker image in this repo seeds:

- `mosquitto.conf`
- `aclfile`
- `passwd` if missing

on startup, then runs Mosquitto.

The secure broker now bootstraps its users from the `MQTT_BOOTSTRAP_USERS` variable on every deploy.

## 5. Add the API service

Create another new service from the same GitHub repo.

Settings:

- Branch: `codex-esp32-middleware`
- Root Directory: `backend`
- Start Command: `node dist/index.js`

Set variables on the API service:

- `PORT=8080`
- `LOG_LEVEL=info`
- `JWT_SECRET=<long random secret>`
- `JWT_ISSUER=solace-backend`
- `JWT_EXPIRY_SECONDS=28800`
- `MQTT_URL=mqtt://<mosquitto-private-host>:1883`
- `COMMAND_POLL_INTERVAL_MS=150`
- `COMMAND_REPLAY_MAX_AGE_MS=5000`
- `COMMAND_STEP_TIMEOUT_MS=8000`
- `DEVICE_REFRESH_INTERVAL_MS=30000`
- `ALLOW_ORIGIN=*`
- `SEED_ADMIN_EMAIL=admin@solace.local`
- `SEED_ADMIN_PASSWORD=<change this>`
- `SEED_SERVICE_ACCOUNT_NAME=mobile-app`
- `SEED_SERVICE_ACCOUNT_TOKEN=<long random token>`
- `SEED_CUSTOMER_SLUG=demo-customer`
- `SEED_CUSTOMER_NAME=Demo Customer`
- `SEED_SITE_NAME=Main Site`
- `SEED_DEVICE_KEY=relay-demo-01`
- `SEED_DEVICE_HOSTNAME=esp32-relay`

For `DATABASE_URL`, use the Railway PostgreSQL connection string.

## 6. Add the gateway service

Create another service from the same GitHub repo.

Settings:

- Branch: `codex-esp32-middleware`
- Root Directory: `backend`
- Start Command: `node dist/gateway-entry.js`

Use the same variables as the API service for:

- `DATABASE_URL`
- `MQTT_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `COMMAND_POLL_INTERVAL_MS`
- `COMMAND_REPLAY_MAX_AGE_MS`
- `COMMAND_STEP_TIMEOUT_MS`
- `DEVICE_REFRESH_INTERVAL_MS`
- `JWT_SECRET`
- `JWT_ISSUER`

Latency note:

- the gateway now wakes immediately on new commands through PostgreSQL notifications
- `COMMAND_POLL_INTERVAL_MS` still matters, but mainly as a fallback safety net and timeout cadence
- `COMMAND_REPLAY_MAX_AGE_MS=5000` prevents stale never-started commands from replaying after a gateway restart
- keep it around `150` for a stable default

The gateway does not need public HTTP networking.

## 7. Create the API public URL

On the `api` service:

1. Open `Settings`
2. Go to `Networking`
3. Under `Public Networking`, click `Generate Domain`

Railway will give you a public `*.up.railway.app` URL.

That becomes your first online middleware URL.

## 8. Create the MQTT public address

On the `mosquitto` service:

1. Open `Settings`
2. Go to `Networking`
3. Add a `TCP Proxy`
4. Internal port: `1883`

Railway will generate:

- a TCP proxy domain
- a TCP proxy port

Your ESP relay should use those values as:

- MQTT server = Railway TCP proxy hostname
- MQTT port = Railway TCP proxy port
- MQTT username = `esp32-relay`
- MQTT password = `BoardPass123`
- MQTT hostname/topic = `esp32-relay`

Important:

- the MQTT public endpoint must come from the Mosquitto service `TCP Proxy` entry
- this is typically a Railway proxy hostname plus a Railway-generated proxy port
- it is not usually the same as the service's normal `*.up.railway.app` HTTP domain
- it is not guaranteed to be port `1883`

The current verified secure-broker test endpoint is:

- MQTT server: `maglev.proxy.rlwy.net`
- MQTT port: `44016`
- MQTT username: `esp32-relay`
- MQTT password: `BoardPass123`

The current verified private broker endpoint for the `gateway` service is:

- `mqtt://fulfilling-essence.railway.internal:1883`

## 9. Initialize the database once

If Railway shell is available, open the API service shell and run:

```bash
node dist/db/migrate.js
node dist/db/seed.js
```

If Railway shell is not available, a simple first-pass workaround is to temporarily set the API start command to:

```bash
sh -c "node dist/db/migrate.js && node dist/db/seed.js && node dist/index.js"
```

That is how the current test deployment was initialized.

That creates:

- the admin login
- the service token
- the 8 output mappings

On Railway, the seed script now defaults to skipping the demo `esp32-relay` device so it does not keep reappearing on every restart. It will still seed the admin/service-account records unless you remove the seed step from your start/init flow.

## 10. First live test

Open the API public URL in the browser.

The GUI is served from:

- `/`
- `/console`

Log in with:

- email: `admin@solace.local`
- password: whatever you set in `SEED_ADMIN_PASSWORD`

The current test deployment uses:

- API URL: `https://esp32relay-production.up.railway.app/`
- Admin email: `admin@solace.local`
- Admin password: `ChangeMe123!`
- Service token: `solace-railway-test-token`

Then:

1. let the console auto-load if a saved session already exists
2. if needed, click `Load Devices` or `Load Outputs` as manual refresh actions
3. trigger a row action

The current console also shows:

- board telemetry badges for uptime, RSSI, heap, and MQTT status
- copyable per-relay webhook `curl` commands that track the current entity and profile
- site-grouped board sections with collapsible sites and boards

Or use a webhook:

```bash
curl -X POST https://YOUR-API.up.railway.app/api/services/lock/unlock \
  -H "Authorization: Bearer YOUR_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"lock.aywanalocker_door"}'
```

## 11. Updating code later

After this is connected to GitHub:

- edit locally
- commit
- push to `codex-esp32-middleware`
- Railway can auto-deploy from that branch

You can also change the deployment trigger branch per service in Railway settings.

## Important first-production caveats

Before using this for paying customers, we should still do these:

- generate per-device MQTT credentials
- rotate the seeded admin password and service token
- move migrate/seed out of the API start command into a one-time release/init flow
- replace seeded/default credentials
- add backups and production secrets hygiene
- make relay onboarding easier from the GUI

## Per-Board MQTT Auth

For real rollout, each relay board should have:

- MQTT username = that board's `mqtt_hostname`
- MQTT password = generated per board

The Mosquitto ACL file in this repo scopes each username to its own topic namespace.

Recommended production users:

- `backend-gateway`
  - used by the middleware gateway service
  - has access to all relay topics
- one user per board
  - username exactly matches `mqtt_hostname`
  - password unique per board

In Railway, set the secure Mosquitto service variable `MQTT_BOOTSTRAP_USERS` with one `username:password` pair per line.

You can enter this either as a real multiline value in the normal variable editor or as a single raw-editor line using `\n` between entries.

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

The broker startup script will create or update `/mosquitto/config/passwd` automatically on every deploy.

Then set on the Railway `gateway` service:

- `MQTT_URL=mqtt://fulfilling-essence.railway.internal:1883`
- `MQTT_USERNAME=backend-gateway`
- `MQTT_PASSWORD=<the same gateway password used in MQTT_BOOTSTRAP_USERS>`

Then restart or redeploy the secure Mosquitto service after changing `MQTT_BOOTSTRAP_USERS`.

### Add Another Board User

To add another board later:

1. Choose a unique board name, for example `club-a-main`.
2. Append it to `MQTT_BOOTSTRAP_USERS`:

```text
backend-gateway:StrongGatewayPass123
esp32-relay:BoardPass123
club-a-main:ClubAMqttPass456
```

3. Redeploy the secure Mosquitto service.
4. Configure that ESP board with:
   - MQTT server = the secure Mosquitto TCP proxy hostname
   - MQTT port = the secure Mosquitto TCP proxy port
   - MQTT username = `club-a-main`
   - MQTT password = `ClubAMqttPass456`
   - MQTT hostname = `club-a-main`
5. Make sure the device record in the middleware also uses `mqtt_hostname = club-a-main`.

Because the ACL uses `%u`, that board will only be able to access `homeassistant/switch/club-a-main/#`.

## Board Onboarding In The Middleware

You no longer have to create new board rows manually in the database.

Preferred flow:

1. connect the ESP to the broker
2. open the middleware console
3. let the console auto-load, or click `Load Devices` if needed
4. look in `Discovered Boards`
5. click `Claim Board`
6. append the returned `mqttBootstrapEntry` to `MQTT_BOOTSTRAP_USERS`
7. redeploy the secure broker
8. update the ESP to use the returned username/password if needed

Important naming note:

- `mqtt_hostname` is the real board identity for MQTT topics, credentials, and ACLs
- `device_key` is a middleware-side internal identifier
- in most deployments, keeping them the same is the simplest option

You can also use the manual fallback flow and call:

- `POST /v1/provisioning/boards`

Example:

```bash
curl -X POST https://esp32relay-production.up.railway.app/v1/provisioning/boards \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Club A Main",
    "mqtt_hostname": "club-a-main",
    "channel_count": 8
  }'
```

The response includes:

- the created device record
- the generated MQTT username/password
- `mqttBootstrapEntry`

Take that `mqttBootstrapEntry`, append it to `MQTT_BOOTSTRAP_USERS`, redeploy the secure broker, then enter the same username/password on the ESP.

The discovery-backed claim route is:

- `POST /v1/discovery/boards/:mqtt_hostname/claim`

Use that when the board has already appeared in `Discovered Boards`.

The discovery list is now treated as a live inbox:

- stale discovered boards are hidden by default
- you can toggle `Show stale discovered boards`
- you can dismiss an unclaimed stale discovery from the console

## Removing A Board

If you no longer want a board in the middleware:

1. Delete it from the middleware console using the board header `Delete Board` action, or call `DELETE /v1/devices/:id`.
2. Remove that board's `username:password` line from the secure broker variable `MQTT_BOOTSTRAP_USERS`.
3. Redeploy the secure Mosquitto service.

The middleware delete removes the device and its outputs from PostgreSQL. The extra Railway variable edit is still needed because the broker user list lives in Railway service variables, not in PostgreSQL.
