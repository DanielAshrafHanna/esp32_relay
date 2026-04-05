# Railway Guide

This guide gets the middleware online on Railway without requiring your own VPS first.

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

## 4. Add Mosquitto

Create a new empty service for the broker.

Use this source:

- Repo: your GitHub repo
- Branch: `codex-esp32-middleware`
- Root Directory: `backend`

Then in service settings:

- ensure the Dockerfile is used from `backend/Dockerfile`
- set the start command to:

```bash
sh -c "mkdir -p /mosquitto/data /mosquitto/log && mosquitto -c /app/docker/mosquitto/mosquitto.conf"
```

Current note:

- the existing Mosquitto config allows anonymous access
- that is okay for a controlled first online test
- before real rollout we should replace this with broker auth and per-device credentials

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
- `COMMAND_POLL_INTERVAL_MS=1000`
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
- `COMMAND_STEP_TIMEOUT_MS`
- `DEVICE_REFRESH_INTERVAL_MS`
- `JWT_SECRET`
- `JWT_ISSUER`

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
- MQTT hostname/topic = `esp32-relay`

For the current test deployment, the generated public values are:

- MQTT server: `eclipse-mosquitto-production-1ad3.up.railway.app`
- MQTT port: `1883`

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
- the 16 output mappings

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

1. click `Load Devices`
2. click `Load Outputs`
3. trigger a row action

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

- add broker authentication to Mosquitto
- stop using anonymous MQTT
- generate per-device MQTT credentials
- rotate the seeded admin password and service token
- move migrate/seed out of the API start command into a one-time release/init flow
- replace seeded/default credentials
- add backups and production secrets hygiene
- make relay onboarding easier from the GUI
