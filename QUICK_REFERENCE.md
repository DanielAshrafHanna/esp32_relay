# Quick Reference Card - ESP32 RF-to-MQTT Bridge

## 🚀 Quick Start (5 Minutes)

1. **Upload code**:
   ```bash
   pio run --target uploadfs && pio run --target upload
   ```

2. **Connect to WiFi AP**: `ESP32-RF-Setup` (password: `12345678`)

3. **Configure WiFi & MQTT** via captive portal

4. **Access web interface**: `http://esp32-rf.local`

5. **Learn RF codes**: Go to RF Manager, enter name, click Learn

---

## 📍 Default Settings

| Setting | Value |
|---------|-------|
| AP Name | `ESP32-RF-Setup` |
| AP Password | `12345678` |
| Web Interface | `http://esp32-rf.local` |
| MQTT Topic Prefix | `homeassistant/switch/` |
| RF Receiver GPIO | 22 |
| Max RF Codes | 10 |

---

## 🔌 GPIO Pin Map

```
GPIO 22 → RF Receiver DATA
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rf/status` | Get RF status |
| GET | `/api/rf/codes` | Get all learned codes |
| POST | `/api/rf/learn` | Start learning mode |
| POST | `/api/rf/stop` | Stop learning mode |
| POST | `/api/rf/delete` | Delete RF code |
| GET | `/api/wifi` | WiFi information |
| GET | `/api/mqtt` | MQTT status |
| POST | `/api/reset` | Reset configuration |

### Example API Usage

**Get RF codes**:
```bash
curl http://esp32-rf.local/api/rf/codes
```

**Start learning mode**:
```bash
curl -X POST "http://esp32-rf.local/api/rf/learn" -d "name=Doorbell"
```

---

## 📡 MQTT Topics

### RF Trigger State Topics (Published)
```
homeassistant/switch/esp32-rf/rf_0/state
homeassistant/switch/esp32-rf/rf_1/state
...
```

### Availability Topic
```
homeassistant/switch/esp32-rf/availability
```

### Discovery Topics
```
homeassistant/binary_sensor/esp32-rf_rf_0/config
homeassistant/binary_sensor/esp32-rf_rf_1/config
...
```

### Subscribe to all RF topics
```bash
mosquitto_sub -h BROKER_IP -t "homeassistant/switch/esp32-rf/#" -v
```

---

## 🏠 Home Assistant Configuration

### Minimal MQTT Config
```yaml
mqtt:
  broker: 192.168.1.100
  discovery: true
```

### Example Automation
```yaml
automation:
  - alias: "RF Doorbell Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_doorbell
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          message: "Someone at the door!"
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

# Build (no upload)
pio run
```

### Configuration Files to Edit

| File | Purpose |
|------|---------|
| `include/config.h` | GPIO pins, device name, settings |
| `platformio.ini` | Libraries, board settings |
| `data/index.html` | Web interface structure |
| `data/style.css` | Web interface styling |
| `data/script.js` | Web interface logic |

---

## 🔧 Customization Snippets

### Change RF Pin
**File**: `include/config.h`
```cpp
#define RF_RECEIVER_PIN 22  // Change to your GPIO
```

### Change Hostname
**File**: `include/config.h`
```cpp
#define MDNS_HOSTNAME "my-rf-bridge"
// Access at: http://my-rf-bridge.local
```

### Change Trigger Duration
**File**: `include/config.h`
```cpp
#define RF_TRIGGER_DURATION 5000  // 5 seconds instead of 2
```

---

## 🐛 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Can't find WiFi AP | Wait 30s, restart ESP32 |
| Captive portal won't open | Go to `192.168.4.1` manually |
| `.local` not working | Use IP address instead |
| MQTT not connecting | Check broker IP, restart broker |
| RF not capturing | Check wiring, try 5V power |
| HA not discovering | Learn a code first, restart HA |
| Web page blank | Re-upload filesystem |

---

## 📊 Serial Monitor Output (Normal Boot)

```
=== ESP32 RF-to-MQTT Bridge ===
[Storage] Restoring settings...
WiFi connected!
IP address: 192.168.1.50
[mDNS] Responder started: http://esp32-rf.local
[MQTT] Connected!
[RF] Receiver initialized on GPIO 22
[RF] Restored 2 RF codes from storage
Web server started
Setup complete!
```

---

## 🔍 Testing Checklist

- [ ] Code uploads successfully
- [ ] ESP32 boots and connects to WiFi
- [ ] Web interface accessible
- [ ] RF Manager page works
- [ ] Can learn new RF codes
- [ ] MQTT connects to broker
- [ ] Home Assistant discovers device
- [ ] RF triggers work in HA

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
| Admin Panel | `admin` | `Solacepass@123` |

---

## 📁 Project Structure

```
esp32_rellay/
├── include/
│   └── config.h              # Main configuration
├── src/
│   └── main.cpp              # Main program
├── data/
│   ├── index.html            # Web interface
│   ├── rf_manager.html       # RF learning page
│   ├── admin.html            # Admin panel
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

**Via Erase**:
```bash
pio run --target erase
```

---

## 🔗 Useful Links

- PlatformIO Docs: https://docs.platformio.org/
- ESP32 Pinout: https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- Home Assistant MQTT: https://www.home-assistant.io/integrations/mqtt/
- RCSwitch Library: https://github.com/sui77/rc-switch

---

**Keep this reference handy for quick lookups! 📌**
