#ifndef CONFIG_H
#define CONFIG_H

// Device Configuration
#define DEVICE_NAME "ESP32-RF-Bridge"
#define AP_NAME "ESP32-RF-Setup"
#define AP_PASSWORD "12345678"

// MQTT Configuration
#define MQTT_PORT 1883
#define MQTT_TOPIC_PREFIX "homeassistant/switch/"
#define MQTT_DISCOVERY_PREFIX "homeassistant"

// Webhook Configuration
#define DEFAULT_WEBHOOK_URL "https://trash-monitor-web.vercel.app/api/bin-event"
#define DEFAULT_WEBHOOK_SECRET ""

// Web Server
#define WEB_SERVER_PORT 80

// mDNS hostname (will be accessible at http://esp32-rf.local)
#define MDNS_HOSTNAME "esp32-rf"

// WiFi Configuration Portal timeout (seconds)
#define PORTAL_TIMEOUT 180

// RF Receiver Configuration
#define RF_RECEIVER_PIN 22
#define RF_TRIGGER_DURATION 2000  // 2 seconds in milliseconds
#define RF_COOLDOWN_TIME 3000     // 3 seconds cooldown between triggers for same code
#define RF_MIN_BIT_LENGTH 20      // Minimum bit length to accept (filter noise)

#endif
