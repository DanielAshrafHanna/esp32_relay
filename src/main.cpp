#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <RCSwitch.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include "config.h"

// Global objects
AsyncWebServer server(WEB_SERVER_PORT);
Preferences preferences;
RCSwitch rfReceiver = RCSwitch();
WiFiClient webhookClient;
WiFiClientSecure secureWebhookClient;

// Device + webhook settings
char device_id[40] = "esp32-rf";
char webhook_url[160] = DEFAULT_WEBHOOK_URL;
char webhook_secret[80] = DEFAULT_WEBHOOK_SECRET;
char webhook_device_id[40] = "esp32-rf";
char webhook_bin_id[40] = "";

// Admin settings
const char* ADMIN_PASSWORD = "Solacepass@123";

// RF Receiver settings - Multiple codes support
#define MAX_RF_CODES 2

struct RFCode {
    char name[32];              // User-defined name
    char state[8];              // FULL or NORMAL
    unsigned long code;         // RF code value
    unsigned int bitLength;     // Bit length
    unsigned int protocol;      // Protocol
    bool active;                // Is this slot in use
    unsigned long lastTrigger;  // Last trigger timestamp
};

RFCode rfCodes[MAX_RF_CODES];
int rfCodeCount = 0;
bool rfLearningMode = false;
int rfLearningSlot = -1;        // Which slot we're learning for
char pendingRFName[32] = "";    // Name for code being learned
char pendingRFState[8] = "FULL";

// WiFi reconnection management
unsigned long lastWiFiCheck = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long WIFI_CHECK_INTERVAL = 2000;      // Check WiFi every 2 seconds
const unsigned long RECONNECT_TIMEOUT = 15000;       // 15 second timeout per attempt
bool apModeActive = false;
bool wifiConnected = false;
bool wifiReconnecting = false;
unsigned long reconnectStartTime = 0;
bool mdnsInitialized = false;  // Track if mDNS has been set up in setup()
WiFiEventId_t wifiConnectHandler;
WiFiEventId_t wifiDisconnectHandler;

// WiFi Smart Reconnection with Fast/Slow phases
int wifiReconnectAttempts = 0;
const int WIFI_FAST_ATTEMPTS = 12;                   // 12 fast attempts before AP mode
const unsigned long WIFI_FAST_INTERVAL = 5000;       // 5 seconds between fast attempts
const unsigned long WIFI_SLOW_INTERVAL = 30000;      // 30 seconds between attempts in AP mode

struct WebhookEvent {
    char state[8];
    int slot;
    unsigned long queuedAt;
};

QueueHandle_t webhookQueue = nullptr;
TaskHandle_t webhookTaskHandle = nullptr;
const int WEBHOOK_QUEUE_SIZE = 8;
const unsigned long WEBHOOK_MAX_EVENT_AGE_MS = 7000;
volatile int lastWebhookStateSentCode = 0;
volatile int lastWebhookStateQueuedCode = 0;

// Function declarations
void checkWiFiConnection();
void startAPMode();
void setupWiFi();
void setupWiFiEvents();
void onWiFiConnect(WiFiEvent_t event, WiFiEventInfo_t info);
void onWiFiDisconnect(WiFiEvent_t event, WiFiEventInfo_t info);
void setupWebServer();
void setupMDNS();
void beginStationReconnect();
void saveConfigCallback();
void restoreSettings();
void setupWebhookSender();
void webhookSenderTask(void* parameter);
void setupRFReceiver();
void checkRFSignal();
void publishRFTriggerState(int slot);
bool sendWebhookState(const char* state, int slot);
bool sendWebhookStateNow(const char* state, int slot);
int stateToCode(const char* state);
void saveRFCodes();
void restoreRFCodes();
int addRFCode(const char* name, const char* state, unsigned long code, unsigned int bitLength, unsigned int protocol);
void deleteRFCode(int slot);
int findRFCodeByState(const char* state);
String normalizeDeviceId(String value);
bool shouldSaveConfig = false;

String normalizeDeviceId(String value) {
    value.trim();
    value.toLowerCase();
    value.replace(" ", "-");

    while (value.indexOf("--") >= 0) {
        value.replace("--", "-");
    }

    return value;
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n\n=== ESP32 RF Webhook Bridge ===");
    
    // Restore saved settings and RF codes
    restoreSettings();
    restoreRFCodes();
    
    // Initialize LittleFS for web files
    if (!LittleFS.begin(true)) {
        Serial.println("LittleFS Mount Failed");
    }
    
    // Setup WiFi event handlers FIRST (before connecting)
    setupWiFiEvents();
    
    // Setup WiFi with captive portal
    setupWiFi();
    
    // Setup mDNS
    setupMDNS();
    
    // Setup Web Server
    setupWebServer();

    // Setup async webhook sender
    setupWebhookSender();
    
    // Setup RF Receiver
    setupRFReceiver();
    
    Serial.println("\n=== Setup Complete ===");
    Serial.printf("Device Name: %s\n", DEVICE_NAME);
    Serial.printf("WiFi SSID: %s\n", WiFi.SSID().c_str());
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("mDNS URL: http://%s.local\n", MDNS_HOSTNAME);
    Serial.printf("Admin Page: http://%s.local/solaceadmin\n", MDNS_HOSTNAME);
    Serial.printf("Device ID: %s\n", device_id);
    Serial.printf("Webhook URL: %s\n", webhook_url);
    Serial.printf("RF Codes: %d learned\n", rfCodeCount);
    Serial.println("======================\n");
}

void loop() {
    // Check WiFi connection status
    checkWiFiConnection();

    // Check RF signals
    checkRFSignal();
    
    // Small delay to prevent watchdog resets and allow background tasks
    delay(10);
}

// WiFi event handlers - called automatically by ESP32
void onWiFiConnect(WiFiEvent_t event, WiFiEventInfo_t info) {
    Serial.println("[WiFi] Event: Connected!");
    Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
    wifiConnected = true;
    wifiReconnecting = false;
    wifiReconnectAttempts = 0;  // Reset attempt counter on success
    
    // If we were in AP mode, we can disable it now
    if (apModeActive) {
        Serial.println("[WiFi] Disabling AP mode - connected to network");
        WiFi.softAPdisconnect(true);
        apModeActive = false;
        WiFi.mode(WIFI_STA);  // Switch back to station-only mode
    }
    
    // ONLY restart mDNS if it was already initialized (reconnection scenario)
    if (mdnsInitialized) {
        Serial.println("[WiFi] Reconnection detected - restarting mDNS...");
        
        delay(100);
        MDNS.end();
        delay(50);
        
        if (MDNS.begin(MDNS_HOSTNAME)) {
            Serial.printf("[mDNS] Responder restarted: http://%s.local\n", MDNS_HOSTNAME);
            MDNS.addService("http", "tcp", 80);
            delay(100);
            Serial.println("[mDNS] Service re-announced");
        } else {
            Serial.println("[mDNS] ERROR: Failed to restart mDNS responder!");
        }
    } else {
        Serial.println("[WiFi] Initial connection - mDNS will be set up in setup()");
    }
}

void onWiFiDisconnect(WiFiEvent_t event, WiFiEventInfo_t info) {
    Serial.println("[WiFi] Event: Disconnected!");
    wifiConnected = false;
    wifiReconnecting = false;
    lastReconnectAttempt = 0;
}

void setupWiFiEvents() {
    Serial.println("[WiFi] Registering event handlers...");
    wifiConnectHandler = WiFi.onEvent(onWiFiConnect, WiFiEvent_t::ARDUINO_EVENT_WIFI_STA_GOT_IP);
    wifiDisconnectHandler = WiFi.onEvent(onWiFiDisconnect, WiFiEvent_t::ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
    Serial.println("[WiFi] Event handlers registered");
}

/*
 * Smart WiFi Reconnection System
 */
void checkWiFiConnection() {
    unsigned long currentMillis = millis();
    
    if (currentMillis - lastWiFiCheck < WIFI_CHECK_INTERVAL) {
        return;
    }
    lastWiFiCheck = currentMillis;
    
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }
    
    if (wifiReconnecting) {
        if (currentMillis - reconnectStartTime > RECONNECT_TIMEOUT) {
            wifiReconnecting = false;
            wifiReconnectAttempts++;
            
            Serial.printf("[WiFi] Reconnect attempt %d/%d timed out\n", 
                         wifiReconnectAttempts, WIFI_FAST_ATTEMPTS);
            
            if (wifiReconnectAttempts >= WIFI_FAST_ATTEMPTS && !apModeActive) {
                Serial.println("[WiFi] Fast reconnection phase failed - entering AP mode");
                startAPMode();
            }
        }
        return;
    }
    
    if (apModeActive) {
        if (currentMillis - lastReconnectAttempt < WIFI_SLOW_INTERVAL) {
            return;
        }
        
        Serial.println("[WiFi] AP mode - attempting STA reconnect...");
        lastReconnectAttempt = currentMillis;
        wifiReconnecting = true;
        reconnectStartTime = currentMillis;
        
        WiFi.mode(WIFI_AP_STA);
        beginStationReconnect();
        return;
    }
    
    unsigned long reconnectInterval = (wifiReconnectAttempts < WIFI_FAST_ATTEMPTS) 
        ? WIFI_FAST_INTERVAL 
        : WIFI_SLOW_INTERVAL;
    
    if (currentMillis - lastReconnectAttempt < reconnectInterval) {
        return;
    }
    
    Serial.printf("[WiFi] Reconnect attempt %d/%d starting...\n", 
                 wifiReconnectAttempts + 1, WIFI_FAST_ATTEMPTS);
    lastReconnectAttempt = currentMillis;
    wifiReconnecting = true;
    reconnectStartTime = currentMillis;
    
    beginStationReconnect();
}

void startAPMode() {
    if (apModeActive) {
        return;
    }

    Serial.println("[WiFi] Starting AP mode...");
    
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_NAME, AP_PASSWORD);
    
    apModeActive = true;
    lastReconnectAttempt = millis();
    
    IPAddress apIP = WiFi.softAPIP();
    Serial.println("[WiFi] AP Mode Started");
    Serial.printf("[WiFi] AP SSID: %s\n", AP_NAME);
    Serial.printf("[WiFi] AP Password: %s\n", AP_PASSWORD);
    Serial.printf("[WiFi] AP IP: %s\n", apIP.toString().c_str());
    
    MDNS.end();
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("[mDNS] Responder started in AP mode: http://%s.local\n", MDNS_HOSTNAME);
        MDNS.addService("http", "tcp", 80);
    }
}

void setupWiFi() {
    WiFiManager wifiManager;
    
    shouldSaveConfig = false;

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(false);
    WiFi.setSleep(false);

    WiFiManagerParameter custom_device_id("device_id", "Device ID", device_id, 40);
    WiFiManagerParameter custom_webhook_url("webhook_url", "Webhook URL", webhook_url, 160);
    WiFiManagerParameter custom_webhook_secret("webhook_secret", "Webhook Secret", webhook_secret, 80);
    WiFiManagerParameter custom_webhook_device_id("webhook_device_id", "Webhook Device ID", webhook_device_id, 40);
    WiFiManagerParameter custom_webhook_bin_id("webhook_bin_id", "Webhook Bin ID", webhook_bin_id, 40);

    
    wifiManager.addParameter(&custom_device_id);
    wifiManager.addParameter(&custom_webhook_url);
    wifiManager.addParameter(&custom_webhook_secret);
    wifiManager.addParameter(&custom_webhook_device_id);
    wifiManager.addParameter(&custom_webhook_bin_id);
    
    wifiManager.setSaveConfigCallback(saveConfigCallback);
    wifiManager.setConfigPortalTimeout(PORTAL_TIMEOUT);
    wifiManager.setConnectTimeout(20);
    
    if (!wifiManager.autoConnect(AP_NAME, AP_PASSWORD)) {
        Serial.println("[WiFi] Failed to connect - entering AP mode (no reboot)");
        Serial.println("[WiFi] Will retry connection every 30 seconds in background");
        startAPMode();
    } else {
        Serial.println("WiFi connected!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
        
        wifiConnected = true;
        apModeActive = false;
    }
    
    if (shouldSaveConfig) {
        Serial.println("[WiFiManager] Save triggered - reading new settings...");

        String new_device_id = normalizeDeviceId(custom_device_id.getValue());
        String new_webhook_url = custom_webhook_url.getValue();
        String new_webhook_secret = custom_webhook_secret.getValue();
        String new_webhook_device_id = normalizeDeviceId(custom_webhook_device_id.getValue());
        String new_webhook_bin_id = custom_webhook_bin_id.getValue();
        
        if (new_device_id.length() == 0) {
            new_device_id = "esp32-rf";
        }
        if (new_webhook_url.length() == 0) {
            new_webhook_url = DEFAULT_WEBHOOK_URL;
        }
        if (new_webhook_device_id.length() == 0) {
            new_webhook_device_id = new_device_id;
        }
        
        preferences.begin("rf-bridge", false);
        preferences.putString("device_id", new_device_id);
        preferences.putString("webhook_url", new_webhook_url);
        preferences.putString("webhook_secret", new_webhook_secret);
        preferences.putString("webhook_device_id", new_webhook_device_id);
        preferences.putString("webhook_bin_id", new_webhook_bin_id);
        preferences.end();
        
        new_device_id.toCharArray(device_id, 40);
        new_webhook_url.toCharArray(webhook_url, 160);
        new_webhook_secret.toCharArray(webhook_secret, 80);
        new_webhook_device_id.toCharArray(webhook_device_id, 40);
        new_webhook_bin_id.toCharArray(webhook_bin_id, 40);
        
        Serial.println("[WiFiManager] Settings saved:");
        Serial.printf("  Device ID: %s\n", device_id);
        Serial.printf("  Webhook URL: %s\n", webhook_url);
        Serial.printf("  Webhook Device ID: %s\n", webhook_device_id);
        Serial.printf("  Webhook Bin ID: %s\n", webhook_bin_id);
    } else {
        Serial.println("[WiFiManager] Using existing settings:");
        Serial.printf("  Device ID: %s\n", device_id);
        Serial.printf("  Webhook URL: %s\n", webhook_url);
        Serial.printf("  Webhook Device ID: %s\n", webhook_device_id);
        Serial.printf("  Webhook Bin ID: %s\n", webhook_bin_id);
    }
}

void setupMDNS() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[mDNS] Waiting for WiFi connection...");
        return;
    }
    
    Serial.println("[mDNS] Starting mDNS responder...");
    
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("[mDNS] Responder started: http://%s.local\n", MDNS_HOSTNAME);
        Serial.printf("[mDNS] IP Address: %s\n", WiFi.localIP().toString().c_str());
        MDNS.addService("http", "tcp", 80);
        Serial.println("[mDNS] HTTP service registered");
        mdnsInitialized = true;
    } else {
        Serial.println("[mDNS] ERROR: Failed to start mDNS responder!");
        mdnsInitialized = false;
    }
}

void beginStationReconnect() {
    bool reconnectIssued = WiFi.reconnect();
    if (!reconnectIssued) {
        WiFi.disconnect(false, false);
        delay(50);
        WiFi.begin();
    }
}

void setupWebServer() {
    // API: Get WiFi info (includes uptime)
    server.on("/api/wifi", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<256> doc;
        doc["ssid"] = WiFi.SSID();
        doc["ip"] = WiFi.localIP().toString();
        doc["rssi"] = WiFi.RSSI();
        doc["hostname"] = String(MDNS_HOSTNAME) + ".local";
        doc["uptime"] = millis() / 1000;
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Get WiFi status
    server.on("/api/wifi/status", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<768> doc;
        
        doc["connected"] = (WiFi.status() == WL_CONNECTED);
        doc["ap_mode"] = apModeActive;
        doc["ssid"] = WiFi.SSID();
        doc["ip"] = WiFi.localIP().toString();
        doc["rssi"] = WiFi.RSSI();
        
        if (apModeActive) {
            doc["ap_ssid"] = AP_NAME;
            doc["ap_ip"] = WiFi.softAPIP().toString();
            doc["ap_clients"] = WiFi.softAPgetStationNum();
        }
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Reconfigure WiFi
    server.on("/api/wifi/reconfigure", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            StaticJsonDocument<768> doc;
            DeserializationError error = deserializeJson(doc, (char*)data);
            
            if (error) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            
            String new_ssid = doc["ssid"].as<String>();
            String new_password = doc["password"].as<String>();
            
            if (new_ssid.length() == 0) {
                request->send(400, "application/json", "{\"error\":\"SSID required\"}");
                return;
            }
            
            request->send(200, "application/json", "{\"success\":true,\"message\":\"Connecting to new WiFi...\"}");
            WiFi.begin(new_ssid.c_str(), new_password.c_str());
            Serial.printf("[WiFi] Attempting to connect to: %s\n", new_ssid.c_str());
        }
    );
    
    // API: Reset WiFi settings
    server.on("/api/reset", HTTP_POST, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", "{\"success\":true,\"message\":\"Resetting WiFi settings...\"}");
        delay(1000);
        WiFiManager wifiManager;
        wifiManager.resetSettings();
        ESP.restart();
    });
    
    // Restart page
    server.on("/restart", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/restart.html", "text/html");
    });
    
    // API: Restart ESP32
    server.on("/api/restart", HTTP_POST, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", "{\"success\":true,\"message\":\"Restarting ESP32...\"}");
        Serial.println("[System] Restart requested via web interface");
        delay(1000);
        ESP.restart();
    });
    
    // Admin page - password protected
    server.on("/solaceadmin", HTTP_GET, [](AsyncWebServerRequest *request) {
        if (!request->authenticate("admin", ADMIN_PASSWORD)) {
            return request->requestAuthentication();
        }
        request->send(LittleFS, "/admin.html", "text/html");
    });
    
    // API: Get admin configuration
    server.on("/api/admin/config", HTTP_GET, [](AsyncWebServerRequest *request) {
        if (!request->authenticate("admin", ADMIN_PASSWORD)) {
            return request->requestAuthentication();
        }
        
        StaticJsonDocument<512> doc;
        doc["device_id"] = device_id;
        doc["webhook_url"] = webhook_url;
        doc["webhook_device_id"] = webhook_device_id;
        doc["webhook_bin_id"] = webhook_bin_id;
        doc["webhook_secret"] = strlen(webhook_secret) > 0 ? "********" : "";
        doc["rf_codes"] = rfCodeCount;
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Save webhook/device configuration
    server.on("/api/admin/webhook", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            if (!request->authenticate("admin", ADMIN_PASSWORD)) {
                return request->requestAuthentication();
            }
            
            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, (char*)data);
            
            if (error) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            
            String new_device_id = normalizeDeviceId(doc["device_id"].as<String>());
            String new_webhook_url = doc["webhook_url"].as<String>();
            String new_webhook_secret = doc["webhook_secret"].as<String>();
            String new_webhook_device_id = normalizeDeviceId(doc["webhook_device_id"].as<String>());
            String new_webhook_bin_id = doc["webhook_bin_id"].as<String>();
            
            if (new_device_id.length() == 0 || new_device_id.length() > 39) {
                new_device_id = "esp32-rf";
            }
            if (new_webhook_url.length() == 0 || new_webhook_url.length() > 159) {
                new_webhook_url = DEFAULT_WEBHOOK_URL;
            }
            if (new_webhook_device_id.length() == 0 || new_webhook_device_id.length() > 39) {
                new_webhook_device_id = new_device_id;
            }
            
            preferences.begin("rf-bridge", false);
            preferences.putString("device_id", new_device_id);
            preferences.putString("webhook_url", new_webhook_url);
            preferences.putString("webhook_device_id", new_webhook_device_id);
            preferences.putString("webhook_bin_id", new_webhook_bin_id);
            
            if (new_webhook_secret != "********") {
                preferences.putString("webhook_secret", new_webhook_secret);
            }
            preferences.end();
            
            new_device_id.toCharArray(device_id, 40);
            new_webhook_url.toCharArray(webhook_url, 160);
            new_webhook_device_id.toCharArray(webhook_device_id, 40);
            new_webhook_bin_id.toCharArray(webhook_bin_id, 40);
            
            if (new_webhook_secret != "********") {
                new_webhook_secret.toCharArray(webhook_secret, 80);
            }
            Serial.println("[Admin] Device/webhook settings updated");
            Serial.printf("  Device ID: %s\n", device_id);
            Serial.printf("  Webhook URL: %s\n", webhook_url);
            Serial.printf("  Webhook Device ID: %s\n", webhook_device_id);
            Serial.printf("  Webhook Bin ID: %s\n", webhook_bin_id);
            
            request->send(200, "application/json", "{\"success\":true}");
            
            delay(1000);
            ESP.restart();
        }
    );
    
    // API: Get all RF codes
    server.on("/api/rf/codes", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<2048> doc;
        doc["learning_mode"] = rfLearningMode;
        doc["count"] = rfCodeCount;
        doc["max_codes"] = MAX_RF_CODES;
        
        JsonArray codes = doc["codes"].to<JsonArray>();
        for (int i = 0; i < MAX_RF_CODES; i++) {
            if (rfCodes[i].active) {
                JsonObject code = codes.createNestedObject();
                code["slot"] = i;
                code["name"] = rfCodes[i].name;
                code["state"] = rfCodes[i].state;
                code["code"] = String(rfCodes[i].code);
                code["bit_length"] = rfCodes[i].bitLength;
                code["protocol"] = rfCodes[i].protocol;
                code["last_trigger"] = rfCodes[i].lastTrigger;
            }
        }
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Get RF status
    server.on("/api/rf/status", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<256> doc;
        doc["learning_mode"] = rfLearningMode;
        doc["code_count"] = rfCodeCount;
        doc["max_codes"] = MAX_RF_CODES;
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Start RF learning mode
    server.on("/api/rf/learn", HTTP_POST, [](AsyncWebServerRequest *request) {
        String state = request->hasParam("state", true)
            ? request->getParam("state", true)->value()
            : "FULL";
        state.toUpperCase();
        if (state != "FULL" && state != "NORMAL") {
            request->send(400, "application/json", "{\"error\":\"State must be FULL or NORMAL\"}");
            return;
        }

        String name = state == "FULL" ? "Full Sensor" : "Empty Sensor";
        
        strncpy(pendingRFName, name.c_str(), sizeof(pendingRFName) - 1);
        pendingRFName[sizeof(pendingRFName) - 1] = '\0';
        strncpy(pendingRFState, state.c_str(), sizeof(pendingRFState) - 1);
        pendingRFState[sizeof(pendingRFState) - 1] = '\0';
        
        rfLearningMode = true;
        Serial.printf("[RF] Learning mode activated for '%s' [%s] - press transmitter button\n", pendingRFName, pendingRFState);
        request->send(200, "application/json", "{\"success\":true,\"message\":\"Learning mode activated\"}");
    });
    
    // API: Stop RF learning mode
    server.on("/api/rf/stop", HTTP_POST, [](AsyncWebServerRequest *request) {
        rfLearningMode = false;
        rfLearningSlot = -1;
        pendingRFName[0] = '\0';
        strncpy(pendingRFState, "FULL", sizeof(pendingRFState) - 1);
        pendingRFState[sizeof(pendingRFState) - 1] = '\0';
        Serial.println("[RF] Learning mode deactivated");
        request->send(200, "application/json", "{\"success\":true,\"message\":\"Learning mode deactivated\"}");
    });
    
    // API: Delete RF code
    server.on("/api/rf/delete", HTTP_POST, [](AsyncWebServerRequest *request) {
        if (!request->hasParam("slot", true)) {
            request->send(400, "application/json", "{\"error\":\"Slot parameter required\"}");
            return;
        }
        
        int slot = request->getParam("slot", true)->value().toInt();
        if (slot < 0 || slot >= MAX_RF_CODES) {
            request->send(400, "application/json", "{\"error\":\"Invalid slot\"}");
            return;
        }
        
        if (!rfCodes[slot].active) {
            request->send(404, "application/json", "{\"error\":\"Slot is empty\"}");
            return;
        }
        
        deleteRFCode(slot);
        request->send(200, "application/json", "{\"success\":true,\"message\":\"RF code deleted\"}");
    });
    
    // API: Clear all RF codes
    server.on("/api/rf/clear", HTTP_POST, [](AsyncWebServerRequest *request) {
        for (int i = 0; i < MAX_RF_CODES; i++) {
            rfCodes[i].active = false;
            rfCodes[i].code = 0;
        }
        rfCodeCount = 0;
        saveRFCodes();
        Serial.println("[RF] All codes cleared");
        request->send(200, "application/json", "{\"success\":true,\"message\":\"All RF codes cleared\"}");
    });
    
    // API: Restart mDNS
    server.on("/api/mdns/restart", HTTP_POST, [](AsyncWebServerRequest *request) {
        Serial.println("[API] Restarting mDNS service...");
        MDNS.end();
        delay(100);
        
        if (MDNS.begin(MDNS_HOSTNAME)) {
            MDNS.addService("http", "tcp", 80);
            delay(100);
            mdnsInitialized = true;
            Serial.printf("[mDNS] Service restarted: http://%s.local\n", MDNS_HOSTNAME);
            request->send(200, "application/json", "{\"success\":true,\"message\":\"mDNS restarted\"}");
        } else {
            mdnsInitialized = false;
            Serial.println("[mDNS] ERROR: Failed to restart mDNS");
            request->send(500, "application/json", "{\"error\":\"Failed to restart mDNS\"}");
        }
    });
    
    // API: Get mDNS status
    server.on("/api/mdns/status", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<256> doc;
        doc["hostname"] = MDNS_HOSTNAME;
        doc["url"] = "http://" + String(MDNS_HOSTNAME) + ".local";
        doc["ip"] = WiFi.localIP().toString();
        doc["wifi_connected"] = WiFi.status() == WL_CONNECTED;
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // Handle favicon.ico
    server.on("/favicon.ico", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(204);
    });
    
    // Serve static files
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
    
    server.begin();
    Serial.println("Web server started");
}

void saveConfigCallback() {
    Serial.println("Should save config");
    shouldSaveConfig = true;
}

void restoreSettings() {
    preferences.begin("rf-bridge", true);
    
    Serial.println("[Storage] Restoring settings...");

    String saved_device_id = normalizeDeviceId(preferences.getString("device_id", "esp32-rf"));
    saved_device_id.toCharArray(device_id, sizeof(device_id));
    device_id[sizeof(device_id) - 1] = '\0';

    String saved_webhook_url = preferences.getString("webhook_url", DEFAULT_WEBHOOK_URL);
    saved_webhook_url.toCharArray(webhook_url, 160);
    String saved_webhook_secret = preferences.getString("webhook_secret", DEFAULT_WEBHOOK_SECRET);
    saved_webhook_secret.toCharArray(webhook_secret, 80);
    String saved_webhook_device_id = normalizeDeviceId(preferences.getString("webhook_device_id", saved_device_id));
    saved_webhook_device_id.toCharArray(webhook_device_id, 40);
    String saved_webhook_bin_id = preferences.getString("webhook_bin_id", "");
    saved_webhook_bin_id.toCharArray(webhook_bin_id, 40);

    Serial.println("[Storage] Device/webhook settings loaded from preferences");
    Serial.printf("[Storage] Device ID: %s\n", device_id);
    Serial.printf("[Storage] Webhook device ID: %s\n", webhook_device_id);
    Serial.printf("[Storage] Webhook bin ID: %s\n", webhook_bin_id);
    
    preferences.end();
}

// RF Receiver Functions

void setupRFReceiver() {
    rfReceiver.enableReceive(digitalPinToInterrupt(RF_RECEIVER_PIN));
    
    // Set tighter receive tolerance to reduce false triggers from noise
    // Default is 60, lower value = stricter matching (less false positives)
    rfReceiver.setReceiveTolerance(40);
    
    Serial.printf("[RF] Receiver initialized on GPIO %d (tolerance: 40%%)\n", RF_RECEIVER_PIN);
    
    if (rfCodeCount > 0) {
        Serial.printf("[RF] %d code(s) loaded\n", rfCodeCount);
    } else {
        Serial.println("[RF] No codes learned yet");
    }
}

void checkRFSignal() {
    if (rfReceiver.available()) {
        unsigned long receivedCode = rfReceiver.getReceivedValue();
        unsigned int bitLength = rfReceiver.getReceivedBitlength();
        unsigned int protocol = rfReceiver.getReceivedProtocol();
        
        // Filter out noise: reject codes with 0 value or too short bit length
        if (receivedCode == 0 || bitLength < RF_MIN_BIT_LENGTH) {
            rfReceiver.resetAvailable();
            return;
        }
        
        if (rfLearningMode) {
            int newSlot = addRFCode(pendingRFName, pendingRFState, receivedCode, bitLength, protocol);
            rfLearningMode = false;
            
            if (newSlot >= 0) {
                Serial.printf("[RF] Code learned '%s' [%s]: %lu (bit: %d, protocol: %d) in slot %d\n", 
                             pendingRFName, pendingRFState, receivedCode, bitLength, protocol, newSlot);
            } else {
                Serial.println("[RF] ERROR: Failed to add code (array full)");
            }
            
            pendingRFName[0] = '\0';
            strncpy(pendingRFState, "FULL", sizeof(pendingRFState) - 1);
            pendingRFState[sizeof(pendingRFState) - 1] = '\0';
        }
        else {
            unsigned long currentTime = millis();
            bool matched = false;
            
            // DEBUG: Log ALL received signals to help diagnose false triggers
            Serial.printf("[RF-DEBUG] Received: code=%lu, bits=%d, proto=%d\n", 
                         receivedCode, bitLength, protocol);
            
            for (int i = 0; i < MAX_RF_CODES; i++) {
                if (rfCodes[i].active && 
                    rfCodes[i].code == receivedCode && 
                    rfCodes[i].bitLength == bitLength && 
                    rfCodes[i].protocol == protocol) {
                    
                    matched = true;
                    
                    // COOLDOWN CHECK: Prevent rapid re-triggering (debounce)
                    unsigned long timeSinceLastTrigger = currentTime - rfCodes[i].lastTrigger;
                    if (timeSinceLastTrigger < RF_COOLDOWN_TIME) {
                        // Too soon, ignore this trigger (likely noise or repeated signal)
                        Serial.printf("[RF] Ignored '%s' - cooldown (%lu ms since last)\n", 
                                     rfCodes[i].name, timeSinceLastTrigger);
                        break;
                    }
                    
                    Serial.printf("[RF] Trigger detected '%s' [%s]: %lu (slot %d)\n", 
                                 rfCodes[i].name, rfCodes[i].state, receivedCode, i);
                    
                    rfCodes[i].lastTrigger = currentTime;
                    publishRFTriggerState(i);
                    
                    break;
                }
            }
            
            if (!matched) {
                Serial.printf("[RF-DEBUG] Unknown code (not registered)\n");
            }
        }
        
        rfReceiver.resetAvailable();
    }
}

void publishRFTriggerState(int slot) {
    if (slot < 0 || slot >= MAX_RF_CODES || !rfCodes[slot].active) return;

    sendWebhookState(rfCodes[slot].state, slot);
}

bool sendWebhookState(const char* state, int slot) {
    if (strlen(state) == 0) {
        return false;
    }

    int stateCode = stateToCode(state);
    if (stateCode > 0) {
        if (stateCode == lastWebhookStateSentCode || stateCode == lastWebhookStateQueuedCode) {
            Serial.printf("[Webhook] Skipped duplicate state '%s' (no state change)\n", state);
            return true;
        }
    }

    if (!webhookQueue) {
        return sendWebhookStateNow(state, slot);
    }

    WebhookEvent event;
    strncpy(event.state, state, sizeof(event.state) - 1);
    event.state[sizeof(event.state) - 1] = '\0';
    event.slot = slot;
    event.queuedAt = millis();

    if (xQueueSend(webhookQueue, &event, 0) == pdTRUE) {
        if (stateCode > 0) {
            lastWebhookStateQueuedCode = stateCode;
        }
        return true;
    }

    // Queue is full; drop oldest event and enqueue newest to keep latency low.
    WebhookEvent dropped;
    xQueueReceive(webhookQueue, &dropped, 0);
    if (xQueueSend(webhookQueue, &event, 0) == pdTRUE) {
        if (stateCode > 0) {
            lastWebhookStateQueuedCode = stateCode;
        }
        return true;
    }
    return false;
}

bool sendWebhookStateNow(const char* state, int slot) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[Webhook] Skipped - WiFi not connected");
        return false;
    }

    if (strlen(webhook_url) == 0) {
        Serial.println("[Webhook] Skipped - webhook URL not configured");
        return false;
    }

    String payloadDeviceId = strlen(webhook_device_id) > 0 ? webhook_device_id : device_id;
    payloadDeviceId = normalizeDeviceId(payloadDeviceId);
    StaticJsonDocument<256> doc;
    doc["deviceId"] = payloadDeviceId;
    doc["fullnessPercent"] = state;
    if (strlen(webhook_bin_id) > 0) {
        doc["binId"] = webhook_bin_id;
    }

    String payload;
    serializeJson(doc, payload);

    int httpCode = -1;
    HTTPClient http;
    // RF events are infrequent; avoid stale keep-alive sockets that can
    // introduce multi-second delays before reconnecting.
    http.setReuse(false);
    http.setTimeout(1200);
    http.setConnectTimeout(700);

    bool began = false;
    if (String(webhook_url).startsWith("https://")) {
        secureWebhookClient.setInsecure();
        began = http.begin(secureWebhookClient, webhook_url);
    } else {
        began = http.begin(webhookClient, webhook_url);
    }

    if (began) {
        http.addHeader("Content-Type", "application/json");
        if (strlen(webhook_secret) > 0) {
            http.addHeader("x-webhook-secret", webhook_secret);
        }
        httpCode = http.POST(payload);
        http.end();
    }

    if (httpCode > 0 && httpCode < 400) {
        Serial.printf("[Webhook] Sent %s for '%s' slot %d (HTTP %d)\n", state, payloadDeviceId.c_str(), slot, httpCode);
        return true;
    }

    Serial.printf("[Webhook] Failed for '%s' slot %d (HTTP %d)\n", payloadDeviceId.c_str(), slot, httpCode);
    return false;
}

void setupWebhookSender() {
    webhookQueue = xQueueCreate(WEBHOOK_QUEUE_SIZE, sizeof(WebhookEvent));
    if (!webhookQueue) {
        Serial.println("[Webhook] ERROR: Failed to create queue, falling back to direct sends");
        return;
    }

    BaseType_t taskCreated = xTaskCreate(
        webhookSenderTask,
        "webhook_sender",
        6144,
        nullptr,
        1,
        &webhookTaskHandle
    );

    if (taskCreated != pdPASS) {
        Serial.println("[Webhook] ERROR: Failed to create sender task, falling back to direct sends");
        vQueueDelete(webhookQueue);
        webhookQueue = nullptr;
        return;
    }

    Serial.println("[Webhook] Async sender ready");
}

void webhookSenderTask(void* parameter) {
    (void)parameter;

    for (;;) {
        WebhookEvent event;
        if (xQueueReceive(webhookQueue, &event, pdMS_TO_TICKS(1000)) == pdTRUE) {
            unsigned long age = millis() - event.queuedAt;
            if (age > WEBHOOK_MAX_EVENT_AGE_MS) {
                Serial.printf("[Webhook] Dropped stale event (%lums old)\n", age);
                int droppedStateCode = stateToCode(event.state);
                if (droppedStateCode > 0 && droppedStateCode == lastWebhookStateQueuedCode) {
                    lastWebhookStateQueuedCode = 0;
                }
                continue;
            }

            bool sent = sendWebhookStateNow(event.state, event.slot);
            int stateCode = stateToCode(event.state);
            if (stateCode > 0 && stateCode == lastWebhookStateQueuedCode) {
                lastWebhookStateQueuedCode = 0;
            }
            if (sent && stateCode > 0) {
                lastWebhookStateSentCode = stateCode;
            }
        }
    }
}

int stateToCode(const char* state) {
    if (!state) {
        return 0;
    }
    if (strcmp(state, "FULL") == 0) {
        return 1;
    }
    if (strcmp(state, "NORMAL") == 0) {
        return 2;
    }
    return 0;
}

void saveRFCodes() {
    preferences.begin("rf-bridge", false);
    preferences.putBytes("rf_codes", rfCodes, sizeof(rfCodes));
    preferences.putInt("rf_count", rfCodeCount);
    preferences.end();
    
    Serial.printf("[RF] %d codes saved to preferences\n", rfCodeCount);
}

void restoreRFCodes() {
    preferences.begin("rf-bridge", true);
    
    memset(rfCodes, 0, sizeof(rfCodes));
    rfCodeCount = 0;
    
    size_t len = preferences.getBytesLength("rf_codes");
    if (len == sizeof(rfCodes)) {
        preferences.getBytes("rf_codes", rfCodes, sizeof(rfCodes));
        rfCodeCount = 0;
        for (int i = 0; i < MAX_RF_CODES; i++) {
            if (rfCodes[i].active) {
                rfCodeCount++;
            }
        }
        
        if (rfCodeCount > 0) {
            Serial.printf("[RF] Restored %d codes from preferences\n", rfCodeCount);
            for (int i = 0; i < MAX_RF_CODES; i++) {
                if (rfCodes[i].active) {
                    if (strlen(rfCodes[i].state) == 0) {
                        strncpy(rfCodes[i].state, "FULL", sizeof(rfCodes[i].state) - 1);
                        rfCodes[i].state[sizeof(rfCodes[i].state) - 1] = '\0';
                    }
                    Serial.printf("  [%d] '%s' [%s]: %lu\n", i, rfCodes[i].name, rfCodes[i].state, rfCodes[i].code);
                }
            }
        }
    }
    
    preferences.end();
}

int addRFCode(const char* name, const char* state, unsigned long code, unsigned int bitLength, unsigned int protocol) {
    int existingStateSlot = findRFCodeByState(state);
    if (existingStateSlot >= 0) {
        strncpy(rfCodes[existingStateSlot].name, name, sizeof(rfCodes[existingStateSlot].name) - 1);
        rfCodes[existingStateSlot].name[sizeof(rfCodes[existingStateSlot].name) - 1] = '\0';
        strncpy(rfCodes[existingStateSlot].state, state, sizeof(rfCodes[existingStateSlot].state) - 1);
        rfCodes[existingStateSlot].state[sizeof(rfCodes[existingStateSlot].state) - 1] = '\0';
        rfCodes[existingStateSlot].code = code;
        rfCodes[existingStateSlot].bitLength = bitLength;
        rfCodes[existingStateSlot].protocol = protocol;
        rfCodes[existingStateSlot].lastTrigger = 0;

        saveRFCodes();
        return existingStateSlot;
    }
    
    for (int i = 0; i < MAX_RF_CODES; i++) {
        if (!rfCodes[i].active) {
            rfCodes[i].active = true;
            strncpy(rfCodes[i].name, name, sizeof(rfCodes[i].name) - 1);
            rfCodes[i].name[sizeof(rfCodes[i].name) - 1] = '\0';
            strncpy(rfCodes[i].state, state, sizeof(rfCodes[i].state) - 1);
            rfCodes[i].state[sizeof(rfCodes[i].state) - 1] = '\0';
            rfCodes[i].code = code;
            rfCodes[i].bitLength = bitLength;
            rfCodes[i].protocol = protocol;
            rfCodes[i].lastTrigger = 0;
            rfCodeCount++;
            
            saveRFCodes();
            return i;
        }
    }
    
    return -1;
}

int findRFCodeByState(const char* state) {
    for (int i = 0; i < MAX_RF_CODES; i++) {
        if (rfCodes[i].active && strcmp(rfCodes[i].state, state) == 0) {
            return i;
        }
    }

    return -1;
}

void deleteRFCode(int slot) {
    if (slot >= 0 && slot < MAX_RF_CODES && rfCodes[slot].active) {
        rfCodes[slot].active = false;
        rfCodes[slot].code = 0;
        rfCodeCount--;
        
        saveRFCodes();
        Serial.printf("[RF] Deleted code from slot %d\n", slot);
    }
}
