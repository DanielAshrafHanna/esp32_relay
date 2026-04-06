#!/bin/sh
set -eu

CONFIG_DIR="${MOSQUITTO_CONFIG_DIR:-/mosquitto/config}"
DATA_DIR="${MOSQUITTO_DATA_DIR:-/mosquitto/data}"
LOG_DIR="${MOSQUITTO_LOG_DIR:-/mosquitto/log}"

mkdir -p "$CONFIG_DIR" "$DATA_DIR" "$LOG_DIR"

if [ ! -f "$CONFIG_DIR/mosquitto.conf" ]; then
  cp /defaults/mosquitto.conf "$CONFIG_DIR/mosquitto.conf"
fi

if [ ! -f "$CONFIG_DIR/aclfile" ]; then
  cp /defaults/aclfile "$CONFIG_DIR/aclfile"
fi

if [ ! -f "$CONFIG_DIR/passwd" ]; then
  touch "$CONFIG_DIR/passwd"
fi

chmod 600 "$CONFIG_DIR/passwd"

if [ -n "${MQTT_BOOTSTRAP_USERS:-}" ]; then
  printf '%s\n' "$MQTT_BOOTSTRAP_USERS" | while IFS= read -r entry; do
    if [ -z "$entry" ]; then
      continue
    fi

    username=${entry%%:*}
    password=${entry#*:}

    if [ -z "$username" ] || [ "$username" = "$entry" ] || [ -z "$password" ]; then
      echo "Skipping invalid MQTT_BOOTSTRAP_USERS entry: $entry" >&2
      continue
    fi

    mosquitto_passwd -b "$CONFIG_DIR/passwd" "$username" "$password"
  done
fi

exec mosquitto -c "$CONFIG_DIR/mosquitto.conf"
