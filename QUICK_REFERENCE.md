# Quick Reference Card

## 🚀 Quick Start (5 Minutes)

1. **Upload code**:
   ```bash
   pio run --target uploadfs && pio run --target upload
   ```

2. **Connect to WiFi AP**: `ESP32-Relay-Setup` (password: `12345678`)

3. **Configure WiFi & MQTT** via captive portal

4. **Access web interface**: `http://esp32-relay.local`

5. **Check Home Assistant**: Devices & Services → MQTT

---

## 📍 Default Settings

| Setting | Value |
|---------|-------|
| AP Name | `ESP32-Relay-Setup` |
| AP Password | `12345678` |
| Web Interface | `http://esp32-relay.local` |
| MQTT Topic Prefix | `homeassistant/switch/` |
| Default GPIO Pins | 23, 22, 21, 19 |
| Number of Relays | 4 |

---

## 🔌 GPIO Pin Map (Default)

```
GPIO 23 → Relay 1
GPIO 22 → Relay 2  
GPIO 21 → Relay 3
GPIO 19 → Relay 4
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/relays` | Get all relay states |
| POST | `/api/relay` | Control relay |
| GET | `/api/wifi` | WiFi information |
| GET | `/api/mqtt` | MQTT status |
| POST | `/api/reset` | Reset configuration |

### Example API Usage

**Get relay states**:
```bash
curl http://esp32-relay.local/api/relays
```

**Turn ON relay 1**:
```bash
curl -X POST http://esp32-relay.local/api/relay \
  -H "Content-Type: application/json" \
  -d '{"relay":1,"state":true}'
```

---

## 📡 MQTT Topics

### Command Topics (Subscribe)
```
homeassistant/switch/esp32-relay/relay1/set
homeassistant/switch/esp32-relay/relay2/set
...
```

### State Topics (Publish)
```
homeassistant/switch/esp32-relay/relay1/state
homeassistant/switch/esp32-relay/relay2/state
...
```

### Discovery Topics
```
homeassistant/switch/esp32-relay/relay1/config
...
```

### Manual MQTT Commands

**Turn ON relay 1**:
```bash
mosquitto_pub -h BROKER_IP \
  -t "homeassistant/switch/esp32-relay/relay1/set" \
  -m "ON"
```

**Subscribe to all states**:
```bash
mosquitto_sub -h BROKER_IP \
  -t "homeassistant/switch/esp32-relay/#" -v
```

---

## 🏠 Home Assistant Configuration

### Minimal MQTT Config
```yaml
mqtt:
  broker: 192.168.1.100
  discovery: true
```

### Manual Switch Config (if needed)
```yaml
switch:
  - platform: mqtt
    name: "Relay 1"
    state_topic: "homeassistant/switch/esp32-relay/relay1/state"
    command_topic: "homeassistant/switch/esp32-relay/relay1/set"
    payload_on: "ON"
    payload_off: "OFF"
```

---

## 🛠️ Common Commands

### PlatformIO Commands

```bash
# Upload filesystem (web files)
pio run --target uploadfs

# Upload code
pio run --target upload

# Monitor serial
pio device monitor

# Clean build
pio run --target clean

# Erase flash
pio run --target erase

# Build (no upload)
pio run
```

### Configuration Files to Edit

| File | Purpose |
|------|---------|
| `include/config.h` | GPIO pins, relay count, names |
| `platformio.ini` | Libraries, board settings |
| `data/index.html` | Web interface structure |
| `data/style.css` | Web interface styling |
| `data/script.js` | Web interface logic |

---

## 🔧 Customization Snippets

### Change Number of Relays
**File**: `include/config.h`
```cpp
#define NUM_RELAYS 8  // Your relay count

const int RELAY_PINS[NUM_RELAYS] = {
    23, 22, 21, 19, 18, 5, 4, 2
};
```

### Change Relay Names
**File**: `include/config.h`
```cpp
const char* RELAY_NAMES[NUM_RELAYS] = {
    "Living Room Light",
    "Bedroom Fan",
    "Garden Pump",
    "Garage Door"
};
```

### Change Hostname
**File**: `include/config.h`
```cpp
#define MDNS_HOSTNAME "my-relay"
// Access at: http://my-relay.local
```

### Invert Relay Logic (Active-Low)
**File**: `src/relay_control.cpp`
```cpp
// In setState():
digitalWrite(RELAY_PINS[relayIndex], state ? LOW : HIGH);

// In init():
digitalWrite(RELAY_PINS[i], HIGH);
```

---

## 🐛 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Can't find WiFi AP | Wait 30s, restart ESP32 |
| Captive portal won't open | Go to `192.168.4.1` manually |
| `.local` not working | Use IP address instead |
| MQTT not connecting | Check broker IP, restart broker |
| HA not discovering | Restart HA, check `discovery: true` |
| Relays inverted | Invert logic in relay_control.cpp |
| Web page blank | Re-upload filesystem |

---

## 📊 Serial Monitor Output (Normal Boot)

```
=== ESP32 Relay Controller ===
Relays initialized
WiFi connected!
IP address: 192.168.1.50
mDNS responder started: http://esp32-relay.local
Attempting MQTT connection...connected
Subscribed to: homeassistant/switch/esp32-relay/relay1/set
Subscribed to: homeassistant/switch/esp32-relay/relay2/set
Published discovery for Relay 1
Published discovery for Relay 2
Web server started
Setup complete!
Access web interface at: http://esp32-relay.local
```

---

## 🔍 Testing Checklist

- [ ] Code uploads successfully
- [ ] ESP32 boots and connects to WiFi
- [ ] Web interface accessible
- [ ] Relays click when toggled via web
- [ ] MQTT connects to broker
- [ ] Home Assistant discovers device
- [ ] HA switches control relays
- [ ] States sync between web and HA

---

## 📞 Quick Debug Commands

**Check WiFi**:
```bash
pio device monitor | grep "WiFi"
```

**Check MQTT**:
```bash
pio device monitor | grep "MQTT"
```

**Test MQTT broker**:
```bash
mosquitto_pub -h BROKER_IP -t test -m hello
mosquitto_sub -h BROKER_IP -t test
```

**Find ESP32 IP**:
```bash
arp -a | grep esp
# Or check serial monitor
```

---

## 🔐 Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| WiFi AP | - | `12345678` |
| MQTT | (configure in portal) | (configure in portal) |
| Web Interface | - | No auth (add if needed) |

---

## 📁 Project Structure

```
esp32_rellay/
├── include/
│   ├── config.h              # Main configuration
│   └── relay_control.h       # Relay control header
├── src/
│   ├── main.cpp              # Main program
│   └── relay_control.cpp     # Relay implementation
├── data/
│   ├── index.html            # Web interface
│   ├── style.css             # Styles
│   └── script.js             # JavaScript
├── platformio.ini            # PlatformIO config
├── README.md                 # Full documentation
├── SETUP_GUIDE.md           # Step-by-step setup
├── TROUBLESHOOTING.md       # Problem solving
└── WIRING.md                # Hardware connections
```

---

## 🚨 Emergency Reset

**Via Web Interface**:
Settings → Reset Configuration

**Via Code** (add temporarily):
```cpp
WiFiManager wm;
wm.resetSettings();
ESP.restart();
```

**Via Erase**:
```bash
pio run --target erase
```

---

## 🔗 Useful Links

- PlatformIO Docs: https://docs.platformio.org/
- ESP32 Pinout: https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- Home Assistant MQTT: https://www.home-assistant.io/integrations/mqtt/
- WiFiManager: https://github.com/tzapu/WiFiManager

---

**Keep this reference handy for quick lookups! 📌**





