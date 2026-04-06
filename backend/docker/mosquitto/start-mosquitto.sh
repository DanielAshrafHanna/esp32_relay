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

exec mosquitto -c "$CONFIG_DIR/mosquitto.conf"
