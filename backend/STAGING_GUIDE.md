# Staging Deployment Guide

This guide packages the current Phase 1 stack for an online VPS:

- Fastify API
- MQTT gateway worker
- PostgreSQL
- Mosquitto
- Caddy reverse proxy with HTTPS

## 1. Prepare the server

- Ubuntu VPS with Docker and Docker Compose installed
- A DNS record pointing your API hostname to the VPS
- Port `80` and `443` open for HTTPS
- Port `1883` open only if your relays need to reach the broker directly

## 2. Upload the backend folder

Copy [backend](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend) to your VPS.

## 3. Create staging env

Copy `.env.staging.example` to `.env.staging` and set:

- `JWT_SECRET`
- `POSTGRES_PASSWORD`
- `SEED_ADMIN_PASSWORD`
- `SEED_SERVICE_ACCOUNT_TOKEN`
- `PUBLIC_HOSTNAME`

Set these important values in `.env.staging`:

- `DATABASE_URL=postgres://solace:<POSTGRES_PASSWORD>@postgres:5432/solace_relay`
- `MQTT_URL=mqtt://mosquitto:1883`

## 4. Set the public hostname for Caddy

Export the hostname before you start compose:

```bash
export PUBLIC_HOSTNAME=api.your-domain.com
```

## 5. Start the stack

```bash
docker compose -f docker-compose.staging.yml up -d --build
```

## 6. Initialize the database

```bash
docker compose -f docker-compose.staging.yml exec api node dist/db/migrate.js
docker compose -f docker-compose.staging.yml exec api node dist/db/seed.js
```

## 7. Point one test relay to staging

Use the server public IP or DNS name for MQTT:

- MQTT server: your VPS IP or broker DNS
- MQTT port: `1883`
- MQTT hostname: `esp32-relay` or the device-specific hostname you seeded

## 8. Trigger a real webhook test

```bash
curl -X POST https://api.your-domain.com/api/services/lock/unlock \
  -H "Authorization: Bearer <SEED_SERVICE_ACCOUNT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"lock.aywanalocker_door"}'
```

## Important current limitation

This staging package is good for a controlled internet test, but Mosquitto is still configured for anonymous access in the current config. Before real customer rollout, we should add broker authentication and per-device credentials.
