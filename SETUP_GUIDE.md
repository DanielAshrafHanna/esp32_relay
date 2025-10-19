# ESP32 Relay Controller - Quick Setup Guide

## Step-by-Step Setup

### 1. Prepare Hardware

#### Materials Needed:
- ESP32 development board
- 4-channel relay module (or your specific relay board)
- Jumper wires
- USB cable
- Power supply for relays (if needed)

#### Wiring Connections:

```
ESP32 GPIO 23  →  Relay 1 Signal (IN1)
ESP32 GPIO 22  →  Relay 2 Signal (IN2)
ESP32 GPIO 21  →  Relay 3 Signal (IN3)
ESP32 GPIO 19  →  Relay 4 Signal (IN4)
ESP32 GND      →  Relay Module GND
ESP32 3.3V/5V  →  Relay Module VCC (check your module voltage)
```

**⚠️ Important Notes:**
- Some relay modules are **active LOW** (trigger on LOW signal)
- Some are **active HIGH** (trigger on HIGH signal)
- Verify your relay module type and adjust code if needed
- Use appropriate power supply for high-current loads

### 2. Install PlatformIO

#### Option A: VS Code (Recommended)
1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install PlatformIO IDE extension:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search "PlatformIO IDE"
   - Click Install

#### Option B: Command Line
```bash
pip install platformio
```

### 3. Configure Your Hardware

1. Open `include/config.h`

2. Set the number of relays:
```cpp
#define NUM_RELAYS 4  // Change this number
```

3. Define your GPIO pins:
```cpp
const int RELAY_PINS[NUM_RELAYS] = {
    23,  // Relay 1
    22,  // Relay 2
    21,  // Relay 3
    19   // Relay 4
};
```

4. Name your relays:
```cpp
const char* RELAY_NAMES[NUM_RELAYS] = {
    "Living Room Light",
    "Bedroom Fan",
    "Garden Pump",
    "Garage Door"
};
```

5. (Optional) Change hostname:
```cpp
#define MDNS_HOSTNAME "my-smart-home"
```

### 4. Upload to ESP32

#### Upload Filesystem (Web Interface)
```bash
pio run --target uploadfs
```
*This uploads the web interface files (HTML, CSS, JS)*

#### Upload Code
```bash
pio run --target upload
```

#### Monitor Serial Output
```bash
pio device monitor
```

### 5. Configure WiFi

1. **Power on ESP32** - Look for serial output showing AP mode

2. **Connect to WiFi AP**:
   - SSID: `ESP32-Relay-Setup`
   - Password: `12345678`

3. **Configure Settings**:
   - Captive portal should open automatically
   - If not, go to: `http://192.168.4.1`

4. **Enter Information**:
   - **WiFi SSID**: Your home WiFi name
   - **WiFi Password**: Your WiFi password
   - **MQTT Server**: IP of your MQTT broker (e.g., `192.168.1.100`)
   - **MQTT Port**: `1883`
   - **MQTT User**: (if authentication enabled)
   - **MQTT Password**: (if authentication enabled)

5. **Save and Connect**
   - ESP32 will restart and connect to your WiFi

### 6. Setup MQTT Broker (If Not Already Running)

#### Option A: Mosquitto on Raspberry Pi / Linux
```bash
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

#### Option B: Home Assistant Add-on
1. Go to **Supervisor** → **Add-on Store**
2. Install **Mosquitto broker**
3. Start the add-on
4. Configure users in add-on configuration

#### Option C: Docker
```bash
docker run -d -p 1883:1883 --name mosquitto eclipse-mosquitto
```

### 7. Setup Home Assistant

#### Configure MQTT Integration

1. **Edit** `configuration.yaml`:
```yaml
mqtt:
  broker: localhost  # or IP of MQTT broker
  port: 1883
  username: YOUR_USERNAME  # if required
  password: YOUR_PASSWORD  # if required
  discovery: true  # Enable auto-discovery
  discovery_prefix: homeassistant
```

2. **Restart Home Assistant**

3. **Verify Connection**:
   - Go to **Settings** → **Devices & Services**
   - Click on **MQTT**
   - You should see "ESP32-Relay" device with 4 switches

#### Manual Configuration (If Auto-Discovery Fails)

Add to `configuration.yaml`:
```yaml
switch:
  - platform: mqtt
    name: "Living Room Light"
    unique_id: esp32_relay1
    state_topic: "homeassistant/switch/esp32-relay/relay1/state"
    command_topic: "homeassistant/switch/esp32-relay/relay1/set"
    payload_on: "ON"
    payload_off: "OFF"
    
  - platform: mqtt
    name: "Bedroom Fan"
    unique_id: esp32_relay2
    state_topic: "homeassistant/switch/esp32-relay/relay2/state"
    command_topic: "homeassistant/switch/esp32-relay/relay2/set"
    payload_on: "ON"
    payload_off: "OFF"
    
  # Repeat for other relays...
```

### 8. Access Web Interface

Open your browser and go to:
```
http://esp32-relay.local
```

Or use the IP address shown in serial monitor:
```
http://192.168.1.XXX
```

### 9. Test Everything

#### Test via Web Interface:
1. Open web interface
2. Click relay buttons
3. Verify relays click on/off

#### Test via Home Assistant:
1. Go to **Developer Tools** → **States**
2. Find your relay switches
3. Toggle them on/off
4. Verify relays respond

#### Test MQTT (Optional):
```bash
# Subscribe to state
mosquitto_sub -h localhost -t "homeassistant/switch/esp32-relay/#"

# Publish command
mosquitto_pub -h localhost -t "homeassistant/switch/esp32-relay/relay1/set" -m "ON"
```

## Common Issues & Solutions

### ❌ Cannot connect to WiFi AP
- **Solution**: 
  - Restart ESP32
  - Check AP name in serial monitor
  - Disable mobile data on phone

### ❌ Web interface not loading
- **Solution**: 
  - Re-upload filesystem: `pio run --target uploadfs`
  - Check LittleFS is enabled in `platformio.ini`
  - Use IP address instead of `.local`

### ❌ MQTT not connecting
- **Solution**: 
  - Verify MQTT broker is running: `sudo systemctl status mosquitto`
  - Check IP address is correct
  - Test with MQTT client: `mosquitto_pub -h IP -t test -m hello`
  - Check firewall allows port 1883

### ❌ Relays not switching
- **Solution**: 
  - Check wiring connections
  - Verify GPIO pins in `config.h`
  - Check relay module power supply
  - Your relay might be active-low (invert logic)

### ❌ Home Assistant not discovering
- **Solution**: 
  - Ensure `discovery: true` in MQTT config
  - Check `discovery_prefix: homeassistant` matches
  - Restart Home Assistant
  - Check HA MQTT logs
  - Manually subscribe to: `homeassistant/switch/#`

## Active-Low Relay Modules

If your relays turn ON when they should be OFF, you have an active-low module.

**Fix**: Edit `src/relay_control.cpp`:
```cpp
void RelayControl::setState(int relayIndex, bool state) {
    if (relayIndex >= 0 && relayIndex < NUM_RELAYS) {
        relayStates[relayIndex] = state;
        // Invert the signal for active-low relays
        digitalWrite(RELAY_PINS[relayIndex], state ? LOW : HIGH);
        Serial.printf("Relay %d set to %s\n", relayIndex + 1, state ? "ON" : "OFF");
    }
}
```

## Next Steps

Once everything is working:

1. **Create Automations** in Home Assistant
2. **Add to Lovelace Dashboard** for easy control
3. **Set up scenes** with multiple relays
4. **Integrate with voice assistants** (Alexa, Google Home)
5. **Add schedules** for automated control

## Support Resources

- **PlatformIO Docs**: https://docs.platformio.org/
- **ESP32 Docs**: https://docs.espressif.com/
- **Home Assistant MQTT**: https://www.home-assistant.io/integrations/mqtt/
- **WiFiManager**: https://github.com/tzapu/WiFiManager

---

**Congratulations! Your ESP32 Relay Controller is now set up and integrated with Home Assistant! 🎉**





