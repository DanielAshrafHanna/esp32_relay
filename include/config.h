#ifndef CONFIG_H
#define CONFIG_H

// Device Configuration
#define DEVICE_NAME "ESP32-Relay"
#define AP_NAME "ESP32-Relay-Setup"
#define AP_PASSWORD "12345678"

// Relay Configuration
#define NUM_RELAYS 16  // Change this to match your number of relays

// Relay GPIO Pins (adjust these to match your hardware)
static constexpr int RELAY_PINS[NUM_RELAYS] = {
    13,  // Relay 1
    12,  // Relay 2
    14,  // Relay 3
    27,  // Relay 4
    26,  // Relay 5
    25,  // Relay 6
    33,  // Relay 7
    32,  // Relay 8
    2,   // Relay 9
    4,   // Relay 10
    16,  // Relay 11
    17,  // Relay 12
    18,  // Relay 13
    19,  // Relay 14
    21,  // Relay 15
    22   // Relay 16
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
    "Relay 8",
    "Relay 9",
    "Relay 10",
    "Relay 11",
    "Relay 12",
    "Relay 13",
    "Relay 14",
    "Relay 15",
    "Relay 16"
};

// MQTT Configuration
#define MQTT_PORT 1883
#define MQTT_TOPIC_PREFIX "homeassistant/switch/"
#define MQTT_DISCOVERY_PREFIX "homeassistant"

// Web Server
#define WEB_SERVER_PORT 80

// mDNS hostname (will be accessible at http://esp32-relay.local)
#define MDNS_HOSTNAME "esp32-relay"

// WiFi Configuration Portal timeout (seconds)
#define PORTAL_TIMEOUT 180

#endif

