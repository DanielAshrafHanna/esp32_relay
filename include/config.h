#ifndef CONFIG_H
#define CONFIG_H

// Device Configuration
#define DEVICE_NAME "ESP32-Relay"
#define AP_NAME_PREFIX "Aywana-Hub-Setup-"
#define AP_PASSWORD "aywanapass26"

// Relay Configuration
#define NUM_RELAYS 8  // Logical relays 1-8 mapped onto the current 8-channel board

// Relay GPIO Pins for the current 8-channel board.
// Logical channels 1-8 follow the current board wiring order.
static constexpr int RELAY_PINS[NUM_RELAYS] = {
    13,  // Relay 1
    4,   // Relay 2
    12,  // Relay 3
    14,  // Relay 4
    27,  // Relay 5
    26,  // Relay 6
    25,  // Relay 7
    32   // Relay 8
};

// Relay Names (customize as needed)
static constexpr const char* RELAY_NAMES[NUM_RELAYS] = {
    "Relay 1",
    "Relay 2",
    "Relay 3",
    "Relay 4",
    "Relay 5",
    "Relay 6",
    "Relay 7",
    "Relay 8"
};

// MQTT Configuration
#define MQTT_PORT 1883
#define MQTT_TOPIC_PREFIX "homeassistant/switch/"
#define MQTT_DISCOVERY_PREFIX "homeassistant"
#define MQTT_SERVER_MAX_LEN 128
#define MQTT_USER_MAX_LEN 64
#define MQTT_PASSWORD_MAX_LEN 64
#define MQTT_HOSTNAME_MAX_LEN 64

// Web Server
#define WEB_SERVER_PORT 80

// Default mDNS hostname fallback (actual runtime mDNS hostname follows MQTT hostname)
#define MDNS_HOSTNAME_DEFAULT "esp32-relay"

// WiFi Configuration Portal timeout (seconds)
#define PORTAL_TIMEOUT 180

// RF Receiver Configuration
#define RF_RECEIVER_PIN 15
#define RF_TRIGGER_DURATION 2000  // 2 seconds in milliseconds

#endif
