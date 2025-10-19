#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Preferences.h>
#include "config.h"
#include "relay_control.h"

// Global objects
WiFiClient espClient;
PubSubClient mqttClient(espClient);
AsyncWebServer server(WEB_SERVER_PORT);
RelayControl relayControl;
Preferences preferences;

// MQTT settings (hardcoded)
char mqtt_server[40] = "192.168.68.100";
char mqtt_port[6] = "1883";
char mqtt_user[40] = "solacemqtt";
char mqtt_password[40] = "solacepass";

// Admin settings
const char* ADMIN_PASSWORD = "Solacepass@123";
int activeRelayCount = 16;  // Default to all 16 relays

// WiFi reconnection management
unsigned long lastWiFiCheck = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000;     // Check WiFi every 30 seconds
const unsigned long RECONNECT_INTERVAL = 60000;      // Try to reconnect every 60 seconds
const unsigned long RECONNECT_TIMEOUT = 30000;       // 30 second timeout for reconnection
bool apModeActive = false;
bool wifiConnected = false;
bool wifiReconnecting = false;
unsigned long reconnectStartTime = 0;
WiFiEventId_t wifiConnectHandler;
WiFiEventId_t wifiDisconnectHandler;

// Function declarations
void checkWiFiConnection();
void startAPMode();
void setupWiFi();
void setupWiFiEvents();
void onWiFiConnect(WiFiEvent_t event, WiFiEventInfo_t info);
void onWiFiDisconnect(WiFiEvent_t event, WiFiEventInfo_t info);
void setupMQTT();
void setupWebServer();
void setupMDNS();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void reconnectMQTT();
void publishDiscovery();
void publishState(int relayIndex);
void saveConfigCallback();
void saveRelayStates();
void restoreRelayStates();
bool shouldSaveConfig = false;

void setup() {
    Serial.begin(115200);
    Serial.println("\n\n=== ESP32 Relay Controller ===");
    
    // Initialize relay control
    relayControl.init();
    
    // Restore saved relay states
    restoreRelayStates();
    
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
    
    // Setup MQTT
    setupMQTT();
    
    // Setup Web Server
    setupWebServer();
    
    Serial.println("\n=== Setup Complete ===");
    Serial.printf("Device Name: %s\n", DEVICE_NAME);
    Serial.printf("WiFi SSID: %s\n", WiFi.SSID().c_str());
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("mDNS URL: http://%s.local\n", MDNS_HOSTNAME);
    Serial.printf("Admin Page: http://%s.local/solaceadmin\n", MDNS_HOSTNAME);
    Serial.printf("MQTT Server: %s:%s\n", mqtt_server, mqtt_port);
    Serial.printf("Active Relays: %d\n", activeRelayCount);
    Serial.println("======================\n");
}

void loop() {
    // Check WiFi connection status
    checkWiFiConnection();
    
    // Reconnect to MQTT if needed (only if WiFi is connected)
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            reconnectMQTT();
        }
        mqttClient.loop();
    }
    
    // Small delay to prevent watchdog resets and allow background tasks
    delay(10);
}

// WiFi event handlers - called automatically by ESP32
void onWiFiConnect(WiFiEvent_t event, WiFiEventInfo_t info) {
    Serial.println("[WiFi] Event: Connected!");
    Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
    wifiConnected = true;
    wifiReconnecting = false;
    
    // If we were in AP mode, we can disable it now
    if (apModeActive) {
        Serial.println("[WiFi] Disabling AP mode - connected to network");
        apModeActive = false;
        WiFi.mode(WIFI_STA);  // Switch back to station-only mode
    }
    
    // Restart mDNS for new IP
    MDNS.end();
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("[mDNS] Responder started: http://%s.local\n", MDNS_HOSTNAME);
        MDNS.addService("http", "tcp", 80);
    }
}

void onWiFiDisconnect(WiFiEvent_t event, WiFiEventInfo_t info) {
    Serial.println("[WiFi] Event: Disconnected!");
    wifiConnected = false;
    // Don't take action here - let checkWiFiConnection() handle it
}

void setupWiFiEvents() {
    Serial.println("[WiFi] Registering event handlers...");
    // Register event handlers for automatic WiFi status updates
    wifiConnectHandler = WiFi.onEvent(onWiFiConnect, WiFiEvent_t::ARDUINO_EVENT_WIFI_STA_GOT_IP);
    wifiDisconnectHandler = WiFi.onEvent(onWiFiDisconnect, WiFiEvent_t::ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
    Serial.println("[WiFi] Event handlers registered");
}

void checkWiFiConnection() {
    unsigned long currentMillis = millis();
    
    // Check connection status every 30 seconds (non-critical with event-driven approach)
    if (currentMillis - lastWiFiCheck < WIFI_CHECK_INTERVAL) {
        return;
    }
    lastWiFiCheck = currentMillis;
    
    // If connected, nothing to do (events handle status changes)
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }
    
    // If currently reconnecting, check timeout
    if (wifiReconnecting) {
        if (currentMillis - reconnectStartTime > RECONNECT_TIMEOUT) {
            Serial.println("[WiFi] Reconnect timeout - entering AP mode");
            wifiReconnecting = false;
            startAPMode();
        }
        // Still waiting for connection - event will notify us
        return;
    }
    
    // If in AP mode
    if (apModeActive) {
        int clientCount = WiFi.softAPgetStationNum();
        
        if (clientCount > 0) {
            // Don't try to reconnect while clients are connected
            lastReconnectAttempt = currentMillis;
            return;
        }
        
        // Try to reconnect every 60 seconds
        if (currentMillis - lastReconnectAttempt < RECONNECT_INTERVAL) {
            return;
        }
        
        Serial.println("[WiFi] No AP clients - attempting reconnect (non-blocking)...");
        lastReconnectAttempt = currentMillis;
        wifiReconnecting = true;
        reconnectStartTime = currentMillis;
        
        // NON-BLOCKING: Just initiate connection, event will notify when ready
        WiFi.mode(WIFI_AP_STA);
        WiFi.begin();
        return;
    }
    
    // Not in AP mode, not reconnecting - start reconnection attempt
    Serial.println("[WiFi] WiFi disconnected - starting reconnect attempt...");
    wifiReconnecting = true;
    reconnectStartTime = currentMillis;
    
    // NON-BLOCKING: Just initiate, event will fire when connected
    WiFi.begin();
    
    // Give it a brief moment to see if connection is immediate
    delay(100);
    
    // If still not connected after brief check, we'll wait for event
    // Set a timeout check for next iteration
}

void startAPMode() {
    Serial.println("[WiFi] Starting AP mode...");
    
    // Start AP mode while keeping STA active
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_NAME, AP_PASSWORD);
    
    apModeActive = true;
    lastReconnectAttempt = millis();
    
    IPAddress apIP = WiFi.softAPIP();
    Serial.println("[WiFi] AP Mode Started");
    Serial.printf("[WiFi] AP SSID: %s\n", AP_NAME);
    Serial.printf("[WiFi] AP Password: %s\n", AP_PASSWORD);
    Serial.printf("[WiFi] AP IP: %s\n", apIP.toString().c_str());
    Serial.println("[WiFi] Connect to configure WiFi or wait for automatic reconnection attempts");
    
    // Restart mDNS to work with AP IP
    MDNS.end();
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("[mDNS] Responder started in AP mode: http://%s.local\n", MDNS_HOSTNAME);
        MDNS.addService("http", "tcp", 80);
    }
}

void setupWiFi() {
    WiFiManager wifiManager;
    
    // Create custom parameters for MQTT configuration
    WiFiManagerParameter custom_mqtt_server("server", "MQTT Server IP", mqtt_server, 40);
    WiFiManagerParameter custom_mqtt_port("port", "MQTT Port", mqtt_port, 6);
    WiFiManagerParameter custom_mqtt_user("user", "MQTT Username", mqtt_user, 40);
    WiFiManagerParameter custom_mqtt_password("password", "MQTT Password", mqtt_password, 40);
    
    // Add all custom parameters to WiFiManager
    wifiManager.addParameter(&custom_mqtt_server);
    wifiManager.addParameter(&custom_mqtt_port);
    wifiManager.addParameter(&custom_mqtt_user);
    wifiManager.addParameter(&custom_mqtt_password);
    
    // Set timeout
    wifiManager.setConfigPortalTimeout(PORTAL_TIMEOUT);
    
    // Try to connect to saved WiFi or start captive portal
    if (!wifiManager.autoConnect(AP_NAME, AP_PASSWORD)) {
        Serial.println("Failed to connect and hit timeout");
        delay(3000);
        ESP.restart();
    }
    
    // Connected!
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    wifiConnected = true;  // Mark WiFi as connected
    apModeActive = false;
    
    // Read MQTT parameters from WiFiManager
    String new_server = custom_mqtt_server.getValue();
    String new_port = custom_mqtt_port.getValue();
    String new_user = custom_mqtt_user.getValue();
    String new_password = custom_mqtt_password.getValue();
    
    // If MQTT parameters were provided, save them
    if (new_server.length() > 0) {
        // Save to preferences
        preferences.begin("relay-states", false);
        preferences.putString("mqtt_server", new_server);
        preferences.putString("mqtt_port", new_port);
        preferences.putString("mqtt_user", new_user);
        preferences.putString("mqtt_pass", new_password);
        preferences.end();
        
        // Update current variables
        new_server.toCharArray(mqtt_server, 40);
        new_port.toCharArray(mqtt_port, 6);
        new_user.toCharArray(mqtt_user, 40);
        new_password.toCharArray(mqtt_password, 40);
        
        Serial.println("[WiFiManager] MQTT settings saved");
        Serial.printf("  Server: %s:%s\n", mqtt_server, mqtt_port);
        Serial.printf("  User: %s\n", mqtt_user);
    } else {
        Serial.println("[WiFiManager] Using existing MQTT settings:");
        Serial.printf("  Server: %s:%s\n", mqtt_server, mqtt_port);
        Serial.printf("  User: %s\n", mqtt_user);
    }
}

void setupMDNS() {
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("mDNS responder started: http://%s.local\n", MDNS_HOSTNAME);
        MDNS.addService("http", "tcp", 80);
    } else {
        Serial.println("Error setting up mDNS responder!");
    }
}

void setupMQTT() {
    if (strlen(mqtt_server) > 0) {
        mqttClient.setServer(mqtt_server, atoi(mqtt_port));
        mqttClient.setCallback(mqttCallback);
        mqttClient.setBufferSize(1024);  // Increase buffer for discovery messages
        reconnectMQTT();
    } else {
        Serial.println("MQTT server not configured");
    }
}

void reconnectMQTT() {
    static unsigned long lastAttempt = 0;
    static bool discoveryPublished = false;
    
    // Only try to reconnect every 5 seconds
    if (millis() - lastAttempt < 5000) {
        return;
    }
    lastAttempt = millis();
    
    if (strlen(mqtt_server) == 0) {
        return;
    }
    
    Serial.print("Attempting MQTT connection...");
    
    String clientId = String(DEVICE_NAME) + "-" + String(ESP.getEfuseMac(), HEX);
    String availTopic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/availability";
    
    bool connected;
    if (strlen(mqtt_user) > 0) {
        connected = mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_password, 
                                       availTopic.c_str(), 0, true, "offline");
    } else {
        connected = mqttClient.connect(clientId.c_str(), 
                                       availTopic.c_str(), 0, true, "offline");
    }
    
    if (connected) {
        Serial.println("connected");
        
        // Publish availability as online
        mqttClient.publish(availTopic.c_str(), "online", true);
        
        // Subscribe to command topics for each relay
        for (int i = 0; i < NUM_RELAYS; i++) {
            String topic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/relay" + String(i + 1) + "/set";
            mqttClient.subscribe(topic.c_str());
        }
        Serial.println("Subscribed to command topics");
        
        // Only publish discovery once per boot to avoid blocking
        if (!discoveryPublished) {
            Serial.println("Publishing discovery messages (one-time)...");
            publishDiscovery();
            discoveryPublished = true;
            
            // Publish initial states
            for (int i = 0; i < NUM_RELAYS; i++) {
                publishState(i);
                delay(10);  // Small delay between states
            }
        } else {
            Serial.println("Discovery already published, skipping");
        }
    } else {
        Serial.print("failed, rc=");
        Serial.println(mqttClient.state());
    }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    Serial.printf("Message arrived [%s]: %s\n", topic, message.c_str());
    
    // Parse topic to get relay number
    String topicStr = String(topic);
    for (int i = 0; i < NUM_RELAYS; i++) {
        String expectedTopic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/relay" + String(i + 1) + "/set";
        if (topicStr == expectedTopic) {
            bool newState = (message == "ON");
            relayControl.setState(i, newState);
            publishState(i);
            saveRelayStates();  // Save state to persistent storage
            break;
        }
    }
}

void publishState(int relayIndex) {
    if (!mqttClient.connected()) return;
    
    String topic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/relay" + String(relayIndex + 1) + "/state";
    String state = relayControl.getState(relayIndex) ? "ON" : "OFF";
    mqttClient.publish(topic.c_str(), state.c_str(), true);
}

void publishDiscovery() {
    if (!mqttClient.connected()) return;
    
    String availTopic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/availability";
    
    Serial.printf("[MQTT] Publishing discovery for %d relays\n", activeRelayCount);
    
    for (int i = 0; i < activeRelayCount; i++) {
        StaticJsonDocument<1024> doc;
        
        String uniqueId = String(MDNS_HOSTNAME) + "_relay" + String(i + 1);
        String name = String(RELAY_NAMES[i]);
        String stateTopic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/relay" + String(i + 1) + "/state";
        String commandTopic = String(MQTT_TOPIC_PREFIX) + MDNS_HOSTNAME + "/relay" + String(i + 1) + "/set";
        String configTopic = String(MQTT_DISCOVERY_PREFIX) + "/switch/" + MDNS_HOSTNAME + "_relay" + String(i + 1) + "/config";
        
        doc["name"] = name;
        doc["unique_id"] = uniqueId;
        doc["state_topic"] = stateTopic;
        doc["command_topic"] = commandTopic;
        doc["availability_topic"] = availTopic;
        doc["payload_on"] = "ON";
        doc["payload_off"] = "OFF";
        doc["state_on"] = "ON";
        doc["state_off"] = "OFF";
        doc["optimistic"] = false;
        doc["icon"] = "mdi:electric-switch";
        
        JsonObject device = doc["device"].to<JsonObject>();
        device["identifiers"][0] = MDNS_HOSTNAME;
        device["name"] = DEVICE_NAME;
        device["manufacturer"] = "ESP32";
        device["model"] = "16-Channel Relay Controller";
        device["sw_version"] = "1.0.0";
        
        String output;
        serializeJson(doc, output);
        
        mqttClient.publish(configTopic.c_str(), output.c_str(), true);
        
        // Minimal delay and yield to prevent blocking web server
        if (i < activeRelayCount - 1) {  // Don't delay after the last one
            delay(20);
            yield();
        }
    }
    
    Serial.printf("[MQTT] Discovery complete for %d relays\n", activeRelayCount);
}

void setupWebServer() {
    // API routes MUST be defined BEFORE static file serving
    
    // API: Get relay states
    server.on("/api/relays", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<2048> doc;
        JsonArray relays = doc["relays"].to<JsonArray>();
        
        for (int i = 0; i < NUM_RELAYS; i++) {
            JsonObject relay = relays.createNestedObject();
            relay["id"] = i + 1;
            relay["name"] = RELAY_NAMES[i];
            relay["state"] = relayControl.getState(i);
            relay["pin"] = RELAY_PINS[i];
        }
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Control relay
    server.on("/api/relay", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            StaticJsonDocument<256> doc;
            DeserializationError error = deserializeJson(doc, (char*)data);
            
            if (error) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            
            int relayId = doc["relay"];
            bool state = doc["state"];
            
            if (relayId >= 1 && relayId <= NUM_RELAYS) {
                relayControl.setState(relayId - 1, state);
                publishState(relayId - 1);
                saveRelayStates();  // Save state to persistent storage
                
                StaticJsonDocument<256> response;
                response["success"] = true;
                response["relay"] = relayId;
                response["state"] = state;
                
                String output;
                serializeJson(response, output);
                request->send(200, "application/json", output);
            } else {
                request->send(400, "application/json", "{\"error\":\"Invalid relay ID\"}");
            }
        }
    );
    
    // API: Get WiFi info
    server.on("/api/wifi", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<256> doc;
        doc["ssid"] = WiFi.SSID();
        doc["ip"] = WiFi.localIP().toString();
        doc["rssi"] = WiFi.RSSI();
        doc["hostname"] = String(MDNS_HOSTNAME) + ".local";
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Get MQTT info
    server.on("/api/mqtt", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<256> doc;
        doc["server"] = mqtt_server;
        doc["port"] = atoi(mqtt_port);
        doc["connected"] = mqttClient.connected();
        
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
    
    // API: Reconfigure WiFi (useful when in AP mode)
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
            
            // Save new credentials and reconnect
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
        doc["active_relays"] = activeRelayCount;
        doc["total_relays"] = NUM_RELAYS;
        doc["mqtt_server"] = mqtt_server;
        doc["mqtt_port"] = atoi(mqtt_port);
        doc["mqtt_user"] = mqtt_user;
        // Don't send password for security
        doc["mqtt_password"] = "••••••••";
        
        String output;
        serializeJson(doc, output);
        request->send(200, "application/json", output);
    });
    
    // API: Save admin configuration
    server.on("/api/admin/config", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            if (!request->authenticate("admin", ADMIN_PASSWORD)) {
                return request->requestAuthentication();
            }
            
            StaticJsonDocument<256> doc;
            DeserializationError error = deserializeJson(doc, (char*)data);
            
            if (error) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            
            int newRelayCount = doc["active_relays"];
            
            if (newRelayCount != 8 && newRelayCount != 12 && newRelayCount != 16) {
                request->send(400, "application/json", "{\"error\":\"Invalid relay count. Must be 8, 12, or 16\"}");
                return;
            }
            
            // Save to preferences
            preferences.begin("relay-states", false);
            preferences.putInt("active_count", newRelayCount);
            preferences.end();
            
            activeRelayCount = newRelayCount;
            
            Serial.printf("[Admin] Relay count changed to: %d\n", activeRelayCount);
            
            request->send(200, "application/json", "{\"success\":true}");
            
            // Restart ESP32 to apply changes and republish discovery
            delay(1000);
            ESP.restart();
        }
    );
    
    // API: Save MQTT configuration
    server.on("/api/admin/mqtt", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
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
            
            String new_server = doc["mqtt_server"].as<String>();
            int new_port = doc["mqtt_port"];
            String new_user = doc["mqtt_user"].as<String>();
            String new_password = doc["mqtt_password"].as<String>();
            
            // Validate inputs
            if (new_server.length() == 0 || new_port < 1 || new_port > 65535) {
                request->send(400, "application/json", "{\"error\":\"Invalid MQTT settings\"}");
                return;
            }
            
            // Save to preferences
            preferences.begin("relay-states", false);
            preferences.putString("mqtt_server", new_server);
            preferences.putString("mqtt_port", String(new_port));
            preferences.putString("mqtt_user", new_user);
            
            // Only save password if it's not the placeholder
            if (new_password != "••••••••") {
                preferences.putString("mqtt_pass", new_password);
            }
            
            preferences.end();
            
            // Update current variables
            new_server.toCharArray(mqtt_server, 40);
            String(new_port).toCharArray(mqtt_port, 6);
            new_user.toCharArray(mqtt_user, 40);
            if (new_password != "••••••••") {
                new_password.toCharArray(mqtt_password, 40);
            }
            
            Serial.println("[Admin] MQTT settings updated");
            Serial.printf("  Server: %s:%d\n", mqtt_server, new_port);
            Serial.printf("  User: %s\n", mqtt_user);
            
            request->send(200, "application/json", "{\"success\":true}");
            
            // Restart ESP32 to apply MQTT changes
            delay(1000);
            ESP.restart();
        }
    );
    
    // Serve static files LAST (so API routes are matched first)
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
    
    server.begin();
    Serial.println("Web server started");
}

void saveConfigCallback() {
    Serial.println("Should save config");
    shouldSaveConfig = true;
}

void saveRelayStates() {
    preferences.begin("relay-states", false);
    
    for (int i = 0; i < NUM_RELAYS; i++) {
        String key = "relay" + String(i);
        bool state = relayControl.getState(i);
        preferences.putBool(key.c_str(), state);
    }
    
    preferences.end();
    Serial.println("[Storage] Relay states saved");
}

void restoreRelayStates() {
    preferences.begin("relay-states", true);  // Read-only mode
    
    Serial.println("[Storage] Restoring relay states...");
    
    // Restore active relay count
    activeRelayCount = preferences.getInt("active_count", 16);
    Serial.printf("[Storage] Active relay count: %d\n", activeRelayCount);
    
    // Restore MQTT settings if they exist (override hardcoded defaults)
    String saved_server = preferences.getString("mqtt_server", "");
    if (saved_server.length() > 0) {
        saved_server.toCharArray(mqtt_server, 40);
        String saved_port = preferences.getString("mqtt_port", "1883");
        saved_port.toCharArray(mqtt_port, 6);
        String saved_user = preferences.getString("mqtt_user", "");
        saved_user.toCharArray(mqtt_user, 40);
        String saved_pass = preferences.getString("mqtt_pass", "");
        saved_pass.toCharArray(mqtt_password, 40);
        Serial.println("[Storage] MQTT settings loaded from preferences");
    } else {
        Serial.println("[Storage] Using hardcoded MQTT settings");
    }
    
    for (int i = 0; i < NUM_RELAYS; i++) {
        String key = "relay" + String(i);
        bool state = preferences.getBool(key.c_str(), false);  // Default to OFF if not found
        relayControl.setState(i, state);
        Serial.printf("  Relay %d: %s\n", i + 1, state ? "ON" : "OFF");
    }
    
    preferences.end();
    Serial.println("[Storage] Relay states restored");
}

