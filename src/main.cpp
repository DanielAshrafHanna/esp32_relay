#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <RCSwitch.h>
#include "config.h"

// Global objects
AsyncWebServer server(WEB_SERVER_PORT);
Preferences preferences;
RCSwitch rfReceiver = RCSwitch();
RCSwitch rfTransmitter = RCSwitch();
unsigned long rfIgnoreUntil = 0;

// Admin settings
const char* ADMIN_PASSWORD = "Solacepass@123";

// RF Receiver settings - Multiple codes support
#define MAX_RF_CODES 10

struct RFCode {
    char name[32];              // User-defined name
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

// WiFi reconnection management
unsigned long lastWiFiCheck = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long WIFI_CHECK_INTERVAL = 5000;      // Check WiFi every 5 seconds (fast detection)
const unsigned long RECONNECT_TIMEOUT = 10000;       // 10 second timeout per reconnection attempt
bool apModeActive = false;
bool wifiConnected = false;
bool wifiReconnecting = false;
unsigned long reconnectStartTime = 0;
bool mdnsInitialized = false;  // Track if mDNS has been set up in setup()
WiFiEventId_t wifiConnectHandler;
WiFiEventId_t wifiDisconnectHandler;

// WiFi Smart Reconnection with Fast/Slow phases
int wifiReconnectAttempts = 0;
const int WIFI_FAST_ATTEMPTS = 6;                    // 6 fast attempts before AP mode (~1 minute)
const unsigned long WIFI_FAST_INTERVAL = 10000;      // 10 seconds between fast attempts
const unsigned long WIFI_SLOW_INTERVAL = 60000;      // 60 seconds between attempts in AP mode

// Function declarations
void checkWiFiConnection();
void startAPMode();
void setupWiFi();
void setupWiFiEvents();
void onWiFiConnect(WiFiEvent_t event, WiFiEventInfo_t info);
void onWiFiDisconnect(WiFiEvent_t event, WiFiEventInfo_t info);
void setupWebServer();
void setupMDNS();
void setupRFReceiver();
void setupRFTransmitter();
void checkRFSignal();
void retransmitRFCode(int slot);
void saveRFCodes();
void restoreRFCodes();
int addRFCode(const char* name, unsigned long code, unsigned int bitLength, unsigned int protocol);
void deleteRFCode(int slot);

void setup() {
    Serial.begin(115200);
    Serial.println("\n\n=== ESP32 RF Repeater ===");
    
    // Restore saved RF codes
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
    
    // Setup RF Receiver
    setupRFReceiver();
    setupRFTransmitter();
    
    Serial.println("\n=== Setup Complete ===");
    Serial.printf("Device Name: %s\n", DEVICE_NAME);
    Serial.printf("WiFi SSID: %s\n", WiFi.SSID().c_str());
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("mDNS URL: http://%s.local\n", MDNS_HOSTNAME);
    Serial.printf("Admin Page: http://%s.local/solaceadmin\n", MDNS_HOSTNAME);
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
        int clientCount = WiFi.softAPgetStationNum();
        
        if (clientCount > 0) {
            lastReconnectAttempt = currentMillis;
            return;
        }
        
        if (currentMillis - lastReconnectAttempt < WIFI_SLOW_INTERVAL) {
            return;
        }
        
        Serial.println("[WiFi] AP mode - attempting reconnect (every 60s)...");
        lastReconnectAttempt = currentMillis;
        wifiReconnecting = true;
        reconnectStartTime = currentMillis;
        
        WiFi.mode(WIFI_AP_STA);
        WiFi.begin();
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
    
    WiFi.begin();
}

void startAPMode() {
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
    wifiManager.setConfigPortalTimeout(PORTAL_TIMEOUT);
    
    if (!wifiManager.autoConnect(AP_NAME, AP_PASSWORD)) {
        Serial.println("[WiFi] Failed to connect - entering AP mode (no reboot)");
        Serial.println("[WiFi] Will retry connection every 60 seconds in background");
        startAPMode();
    } else {
        Serial.println("WiFi connected!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
        
        wifiConnected = true;
        apModeActive = false;
        
        WiFi.setAutoReconnect(false);
        Serial.println("[WiFi] Auto-reconnect disabled (using custom reconnection logic)");
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
        StaticJsonDocument<512> doc;
        
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
            StaticJsonDocument<512> doc;
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
        if (rfCodeCount >= MAX_RF_CODES) {
            request->send(400, "application/json", "{\"error\":\"Maximum codes reached\"}");
            return;
        }
        
        if (!request->hasParam("name", true)) {
            request->send(400, "application/json", "{\"error\":\"Name parameter required\"}");
            return;
        }
        
        String name = request->getParam("name", true)->value();
        if (name.length() == 0 || name.length() >= 32) {
            request->send(400, "application/json", "{\"error\":\"Name must be 1-31 characters\"}");
            return;
        }
        
        strncpy(pendingRFName, name.c_str(), sizeof(pendingRFName) - 1);
        pendingRFName[sizeof(pendingRFName) - 1] = '\0';
        
        rfLearningMode = true;
        Serial.printf("[RF] Learning mode activated for '%s' - press transmitter button\n", pendingRFName);
        request->send(200, "application/json", "{\"success\":true,\"message\":\"Learning mode activated\"}");
    });
    
    // API: Stop RF learning mode
    server.on("/api/rf/stop", HTTP_POST, [](AsyncWebServerRequest *request) {
        rfLearningMode = false;
        rfLearningSlot = -1;
        pendingRFName[0] = '\0';
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

void setupRFTransmitter() {
    rfTransmitter.enableTransmit(RF_TRANSMITTER_PIN);
    rfTransmitter.setRepeatTransmit(RF_RETRANSMIT_COUNT);
    Serial.printf("[RF] Transmitter initialized on GPIO %d\n", RF_TRANSMITTER_PIN);
}

void checkRFSignal() {
    // Extra anti-loop guard: ignore RF input briefly after this device transmits.
    if ((int32_t)(millis() - rfIgnoreUntil) < 0) {
        if (rfReceiver.available()) {
            rfReceiver.resetAvailable();
        }
        return;
    }

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
            int newSlot = addRFCode(pendingRFName, receivedCode, bitLength, protocol);
            rfLearningMode = false;
            
            if (newSlot >= 0) {
                Serial.printf("[RF] Code learned '%s': %lu (bit: %d, protocol: %d) in slot %d\n", 
                             pendingRFName, receivedCode, bitLength, protocol, newSlot);
                Serial.println("[RF] Learning complete - signal saved for repeater matching.");
            } else {
                Serial.println("[RF] ERROR: Failed to add code (array full)");
            }
            
            pendingRFName[0] = '\0';
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
                    
                    Serial.printf("[RF] Trigger detected '%s': %lu (slot %d)\n", 
                                 rfCodes[i].name, receivedCode, i);
                    
                    rfCodes[i].lastTrigger = currentTime;
                    retransmitRFCode(i);
                    
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

void retransmitRFCode(int slot) {
    if (slot < 0 || slot >= MAX_RF_CODES || !rfCodes[slot].active) return;

    // Prevent self-retrigger from local TX by muting RX around send.
    rfReceiver.disableReceive();
    rfTransmitter.setProtocol(rfCodes[slot].protocol);
    rfTransmitter.send(rfCodes[slot].code, rfCodes[slot].bitLength);
    rfReceiver.enableReceive(digitalPinToInterrupt(RF_RECEIVER_PIN));
    rfIgnoreUntil = millis() + RF_POST_TX_IGNORE_MS;

    Serial.printf("[RF] Retransmitted '%s': %lu (bits=%u, proto=%u, tx=GPIO%d)\n",
                 rfCodes[slot].name,
                 rfCodes[slot].code,
                 rfCodes[slot].bitLength,
                 rfCodes[slot].protocol,
                 RF_TRANSMITTER_PIN);
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
        rfCodeCount = preferences.getInt("rf_count", 0);
        
        if (rfCodeCount > 0) {
            Serial.printf("[RF] Restored %d codes from preferences\n", rfCodeCount);
            for (int i = 0; i < MAX_RF_CODES; i++) {
                if (rfCodes[i].active) {
                    Serial.printf("  [%d] '%s': %lu\n", i, rfCodes[i].name, rfCodes[i].code);
                }
            }
        }
    }
    
    preferences.end();
}

int addRFCode(const char* name, unsigned long code, unsigned int bitLength, unsigned int protocol) {
    if (rfCodeCount >= MAX_RF_CODES) {
        return -1;
    }
    
    for (int i = 0; i < MAX_RF_CODES; i++) {
        if (!rfCodes[i].active) {
            rfCodes[i].active = true;
            strncpy(rfCodes[i].name, name, sizeof(rfCodes[i].name) - 1);
            rfCodes[i].name[sizeof(rfCodes[i].name) - 1] = '\0';
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

void deleteRFCode(int slot) {
    if (slot >= 0 && slot < MAX_RF_CODES && rfCodes[slot].active) {
        rfCodes[slot].active = false;
        rfCodes[slot].code = 0;
        rfCodeCount--;
        
        saveRFCodes();
        Serial.printf("[RF] Deleted code from slot %d\n", slot);
    }
}
