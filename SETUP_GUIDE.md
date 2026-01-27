# ESP32 RF-to-MQTT Bridge - Quick Setup Guide

## Step-by-Step Setup

### 1. Prepare Hardware

#### Materials Needed:
- ESP32 development board
- SYN480R 433MHz RF Receiver module
- Jumper wires (3 wires)
- USB cable
- 17.3cm wire for antenna (optional but recommended)

#### Wiring Connections:

```
SYN480R Receiver → ESP32
─────────────────────────
VCC              → 3.3V or 5V
GND              → GND  
DATA             → GPIO 22
```

**⚠️ Important Notes:**
- 5V VCC gives better RF range than 3.3V
- Add a 17.3cm wire antenna for better reception
- Keep receiver away from the ESP32 if possible (reduces interference)

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

2. Verify RF pin (change if needed):
```cpp
#define RF_RECEIVER_PIN 22  // GPIO pin for RF receiver
```

3. (Optional) Change hostname:
```cpp
#define MDNS_HOSTNAME "my-rf-bridge"
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
   - SSID: `ESP32-RF-Setup`
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
   - You should see "ESP32-RF-Bridge" device (after learning RF codes)

### 8. Learn RF Codes

1. **Access RF Manager**:
   - Go to `http://esp32-rf.local/rf_manager.html`
   - Or click "RF Manager" from main page

2. **Learn a code**:
   - Enter a name (e.g., "Doorbell")
   - Click "Start Learning Mode"
   - Press button on your RF transmitter
   - Code is captured automatically

3. **Verify in Home Assistant**:
   - New binary sensor appears for each learned code
   - Press RF transmitter → sensor turns ON briefly

### 9. Access Web Interface

Open your browser and go to:
```
http://esp32-rf.local
```

Or use the IP address shown in serial monitor:
```
http://192.168.1.XXX
```

### 10. Test Everything

#### Test via Web Interface:
1. Open web interface
2. Go to RF Manager
3. Verify learned codes are listed
4. Check MQTT connection status

#### Test via Home Assistant:
1. Go to **Developer Tools** → **States**
2. Find your RF binary sensors
3. Press RF transmitter
4. Verify sensor state changes

#### Test MQTT (Optional):
```bash
# Subscribe to all topics
mosquitto_sub -h localhost -t "homeassistant/switch/esp32-rf/#" -v

# Press RF transmitter - you should see state changes
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
  - Use IP address instead of `.local`

### ❌ MQTT not connecting
- **Solution**: 
  - Verify MQTT broker is running: `sudo systemctl status mosquitto`
  - Check IP address is correct
  - Test with MQTT client: `mosquitto_pub -h IP -t test -m hello`
  - Check firewall allows port 1883

### ❌ RF code not capturing
- **Solution**: 
  - Check wiring connections (especially DATA pin)
  - Verify GPIO pin in `config.h`
  - Try 5V instead of 3.3V for receiver
  - Move transmitter closer
  - Try different buttons

### ❌ Home Assistant not discovering
- **Solution**: 
  - Ensure `discovery: true` in MQTT config
  - Check `discovery_prefix: homeassistant` matches
  - Learn at least one RF code first
  - Restart Home Assistant
  - Check HA MQTT logs

### ❌ Weak RF range
- **Solution**:
  - Add 17.3cm wire antenna to receiver
  - Use 5V power for receiver
  - Move receiver away from ESP32/router
  - Position receiver higher up

## Next Steps

Once everything is working:

1. **Learn all your RF codes** with meaningful names
2. **Create Automations** in Home Assistant
3. **Set up notifications** for important triggers (doorbell, alerts)
4. **Integrate with voice assistants** (Alexa, Google Home via HA)

## Support Resources

- **PlatformIO Docs**: https://docs.platformio.org/
- **ESP32 Docs**: https://docs.espressif.com/
- **Home Assistant MQTT**: https://www.home-assistant.io/integrations/mqtt/
- **RCSwitch Library**: https://github.com/sui77/rc-switch

---

**Congratulations! Your ESP32 RF-to-MQTT Bridge is now set up and integrated with Home Assistant! 🎉**
