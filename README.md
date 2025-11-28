# ESP32 Relay Controller

**Version 1.2** - Professional 16-channel relay controller with WiFi, MQTT, and RF receiver support.

> **📚 New to this project? See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for a complete guide to all documentation.**
>
> **🔥 Having issues? Check [CHANGELOG.md](CHANGELOG.md) - every problem and fix is documented there!**

> **⚡ Quick Upload Commands**
> ```bash
> pio run --target uploadfs    # Upload web files (when HTML/CSS/JS changes)
> pio run --target upload       # Upload firmware (when code changes)
> ```

A professional ESP32-based relay controller with WiFi configuration portal, full Home Assistant integration via MQTT, and 433MHz RF receiver support.

## Features

- 🔌 **16-Channel Relay Control**: Support for up to 16 relays (configurable: 8/12/16)
- 📡 **WiFi Manager**: Captive portal for easy WiFi and MQTT configuration
- 🌐 **Web Interface**: Modern, responsive web UI accessible via `.local` domain
- 🏠 **Home Assistant Integration**: Full MQTT auto-discovery support
- 📻 **RF Receiver**: SYN480R 433MHz receiver with learning mode
- 🔐 **Admin Panel**: Password-protected configuration panel
- 📱 **Mobile Responsive**: Works great on phones and tablets
- 🔒 **Persistent State**: Relay states and settings saved across reboots
- ⚡ **High Performance**: Optimized non-blocking code for instant response

## Hardware Requirements

- ESP32 Development Board (ESP32-D0WD-V3 or similar)
- 16-Channel Relay Module (or 8/12-channel)
- SYN480R 433MHz RF Receiver (optional)
- Power Supply (5V for ESP32, appropriate voltage for relay coils)
- Jumper wires

## Wiring

Connect the relays to the GPIO pins defined in `include/config.h`:

```
Current GPIO Pin Configuration (16 relays):
- Relay 1:  GPIO 13    │  Relay 9:  GPIO 2
- Relay 2:  GPIO 12    │  Relay 10: GPIO 4
- Relay 3:  GPIO 14    │  Relay 11: GPIO 16
- Relay 4:  GPIO 27    │  Relay 12: GPIO 17
- Relay 5:  GPIO 26    │  Relay 13: GPIO 18
- Relay 6:  GPIO 25    │  Relay 14: GPIO 19
- Relay 7:  GPIO 33    │  Relay 15: GPIO 21
- Relay 8:  GPIO 32    │  Relay 16: GPIO 22

Optional - RF Receiver:
- RF Data Pin: GPIO 15
```

**Important**: Adjust these pins in `include/config.h` to match your hardware setup.

**See** `WIRING.md` for detailed wiring diagrams and safety information.

## Software Setup

### Prerequisites

1. **PlatformIO**: Install via VS Code extension or CLI
   - [Install PlatformIO IDE](https://platformio.org/install/ide?install=vscode)

2. **USB Drivers**: Install CP2102 or CH340 drivers for your ESP32

### Installation Steps

> **⚠️ CRITICAL: TWO-STEP UPLOAD PROCESS**
> 
> ESP32 requires **TWO separate uploads**:
> 1. **Filesystem** (web files) → `pio run --target uploadfs`
> 2. **Firmware** (code) → `pio run --target upload`
> 
> **If webpage doesn't work**, you probably forgot step 1!
> Error: `/littlefs/index.html does not exist` = filesystem not uploaded

> **📦 ALTERNATIVE: Upload via .bin Files**
> 
> If flashing via bin files instead of PlatformIO commands, you need **two files**:
> 
> | File | Address | Build Command |
> |------|---------|---------------|
> | `firmware.bin` | `0x10000` | `pio run` |
> | `littlefs.bin` | `0x290000` | `pio run --target buildfs` |
> 
> **Flash with esptool:**
> ```bash
> esptool.py --chip esp32 --port YOUR_PORT write_flash 0x10000 firmware.bin 0x290000 littlefs.bin
> ```
> 
> **Note:** If updating an existing device, you only need these two files. For a fresh ESP32, also include:
> - `bootloader.bin` at `0x1000`
> - `partitions.bin` at `0x8000`
> 
> Find all files in: `.pio/build/esp32dev/`

1. **Clone or download this project**

2. **Configure Hardware Settings**
   
   Edit `include/config.h`:
   - Set `NUM_RELAYS` to match your relay count
   - Update `RELAY_PINS[]` array with your GPIO pins
   - Customize `RELAY_NAMES[]` for friendly names
   - Change `MDNS_HOSTNAME` if desired (default: `esp32-relay`)

3. **Upload Filesystem (Web Interface) - STEP 1** ⚠️
   
   ```bash
   pio run --target uploadfs
   ```
   
   This uploads the web interface files (HTML/CSS/JS) to the ESP32's LittleFS filesystem.
   
   **DO THIS FIRST** or webpage won't work!

4. **Compile and Upload Code - STEP 2** ⚠️
   
   ```bash
   pio run --target upload
   ```
   
   Or use the PlatformIO upload button in VS Code.
   
   **Note**: The VS Code upload button ONLY uploads firmware, not filesystem!

5. **Monitor Serial Output**
   
   ```bash
   pio device monitor --baud 115200
   ```

## First-Time Setup

### 1. WiFi Configuration

1. After uploading, the ESP32 will create a WiFi access point:
   - **SSID**: `ESP32-Relay-Setup`
   - **Password**: `12345678`

2. Connect to this network with your phone or computer

3. A captive portal should open automatically (or navigate to `192.168.4.1`)

4. Enter your WiFi credentials and MQTT settings:
   - **SSID**: Your WiFi network name
   - **Password**: Your WiFi password
   - **MQTT Server**: IP address of your MQTT broker (e.g., `192.168.1.100`)
   - **MQTT Port**: Usually `1883`
   - **MQTT User**: MQTT username (if required)
   - **MQTT Password**: MQTT password (if required)

5. Click "Save" - the ESP32 will connect to your WiFi

### 2. Access Web Interface

Once connected to WiFi, access the web interface at:
- `http://esp32-relay.local` (recommended)
- Or use the IP address shown in serial monitor

## Home Assistant Integration

### Automatic Discovery (Recommended)

The controller automatically publishes MQTT discovery messages to Home Assistant.

**Requirements:**
- MQTT broker running (Mosquitto recommended)
- Home Assistant MQTT integration configured

**Setup:**

1. Configure MQTT in Home Assistant (`configuration.yaml`):
   ```yaml
   mqtt:
     broker: YOUR_MQTT_BROKER_IP
     port: 1883
     username: YOUR_USERNAME  # if required
     password: YOUR_PASSWORD  # if required
     discovery: true
   ```

2. Restart Home Assistant

3. The relays will automatically appear as switches in Home Assistant

4. Find them in:
   - **Devices & Services** → **MQTT** → **ESP32-Relay**

### Manual MQTT Topics

If auto-discovery doesn't work, you can manually configure switches:

```yaml
switch:
  - platform: mqtt
    name: "Relay 1"
    state_topic: "homeassistant/switch/esp32-relay/relay1/state"
    command_topic: "homeassistant/switch/esp32-relay/relay1/set"
    payload_on: "ON"
    payload_off: "OFF"
```

## Web Interface Features

### Relay Control
- Real-time relay status display
- One-click toggle for each relay
- Visual feedback (colors, animations)
- GPIO pin information

### System Information
- WiFi network details
- IP address and hostname
- Signal strength indicator
- MQTT connection status

### Settings
- Reset WiFi configuration
- Reconfigure MQTT settings

## MQTT Topics Structure

### State Topics (Published by ESP32)
```
homeassistant/switch/esp32-relay/relay1/state
homeassistant/switch/esp32-relay/relay2/state
...
```

### Command Topics (Subscribed by ESP32)
```
homeassistant/switch/esp32-relay/relay1/set
homeassistant/switch/esp32-relay/relay2/set
...
```

### Discovery Topics
```
homeassistant/switch/esp32-relay/relay1/config
homeassistant/switch/esp32-relay/relay2/config
...
```

## Customization

### Change Number of Relays

Edit `include/config.h`:
```cpp
#define NUM_RELAYS 8  // Change to your relay count

const int RELAY_PINS[NUM_RELAYS] = {
    23, 22, 21, 19, 18, 5, 4, 2  // Add your GPIO pins
};

const char* RELAY_NAMES[NUM_RELAYS] = {
    "Living Room Light",
    "Bedroom Fan",
    // ... add your names
};
```

### Change Hostname

Edit `include/config.h`:
```cpp
#define MDNS_HOSTNAME "my-relay"  // Access at http://my-relay.local
```

### Modify Web Interface

Edit files in `data/` folder:
- `index.html` - Structure
- `style.css` - Styling
- `script.js` - Functionality

After changes, re-upload filesystem:
```bash
pio run --target uploadfs
```

## Troubleshooting

### ⚠️ Web Interface Not Loading (Most Common Issue)

**Error in Serial Monitor:**
```
[E][vfs_api.cpp:105] open(): /littlefs/index.html does not exist
```

**Cause**: Filesystem not uploaded (only firmware was uploaded)

**Solution**:
```bash
# Upload the filesystem (web files)
pio run --target uploadfs

# Then reboot the ESP32 (press RESET button)
```

**Why this happens**: 
- PlatformIO's upload button ONLY uploads firmware, not filesystem
- After code changes, you often need to re-upload filesystem too
- The two storage areas (code flash vs. data flash) are separate

### Cannot Access Web Interface

1. **Check if filesystem is uploaded** (see error above)
2. Check serial monitor for IP address
3. Try IP address instead of `.local` domain
4. Ensure you're on the same network
5. Restart ESP32

### MQTT Not Connecting

1. Verify MQTT broker is running
2. Check MQTT credentials
3. Ensure broker IP is correct
4. Check firewall settings

### Relays Not Switching

1. Verify GPIO pins in `config.h`
2. Check relay module power supply
3. Test relays manually with jumpers
4. Check serial monitor for errors

### Reset Configuration

1. Via web interface: Click "Reset Configuration"
2. Via serial: Connect and reflash
3. Via code: Call `WiFiManager::resetSettings()`

## API Endpoints

The web server exposes REST API endpoints for advanced control and troubleshooting:

### Relay Control

#### GET /api/relays
Returns status of all relays
```json
{
  "relays": [
    {"id": 1, "name": "Relay 1", "state": true, "pin": 13},
    {"id": 2, "name": "Relay 2", "state": false, "pin": 12},
    ...
  ]
}
```

#### POST /api/relay
Control a single relay
```json
{
  "relay": 1,
  "state": true
}
```

### Network Status

#### GET /api/wifi
Get WiFi connection information

#### GET /api/mqtt
Get MQTT connection status

#### GET /api/mdns/status
Get mDNS service status
```json
{
  "hostname": "esp32-relay",
  "url": "http://esp32-relay.local",
  "ip": "192.168.1.100",
  "wifi_connected": true
}
```

### Configuration & Admin

#### GET /api/admin/config
Get admin configuration (requires authentication)

#### POST /api/admin/config
Update relay count configuration (requires authentication)

#### POST /api/admin/mqtt
Update MQTT credentials (requires authentication)

#### POST /api/reset
Reset WiFi configuration and restart

### RF Receiver

#### GET /api/rf/status
Get RF learning status and learned code

#### POST /api/rf/learn
Activate RF learning mode

#### POST /api/rf/stop
Stop RF learning mode

#### POST /api/rf/clear
Clear learned RF code

### Troubleshooting

#### POST /api/mqtt/rediscover
Force MQTT discovery republish (bypasses cooldown)

#### POST /api/mdns/restart
Restart mDNS service manually

**Note**: Admin endpoints require HTTP Basic Authentication:
- Username: `admin`
- Password: `Solacepass@123`

## Libraries Used

- WiFiManager (v2.0.17) - WiFi configuration portal
- PubSubClient (v2.8.0) - MQTT client
- ArduinoJson (v6.21.5) - JSON parsing
- ESPAsyncWebServer (v1.2.4) - Async web server
- AsyncTCP (v1.1.1) - Async TCP library
- RCSwitch (v2.6.4) - RF receiver/transmitter
- ESPmDNS (v2.0.0) - mDNS responder
- LittleFS (v2.0.0) - Filesystem
- Preferences (v2.0.0) - NVS storage

## 📚 Documentation

This project includes comprehensive documentation for all features and troubleshooting:

### Getting Started
- **README.md** (this file) - Main project overview and setup
- `QUICK_REFERENCE.md` - Command reference and quick tips
- `GET_STARTED.md` - Beginner-friendly setup guide
- `SETUP_GUIDE.md` - Detailed installation instructions

### Hardware
- `WIRING.md` - Wiring diagrams and safety information
- `FILE_STRUCTURE.txt` - Project file organization

### Features & Guides
- `RF_RECEIVER_GUIDE.md` - Complete RF receiver setup and usage
- `RF_IMPLEMENTATION_SUMMARY.md` - RF feature quick reference
- `WIFI_RECONNECTION.md` - WiFi reconnection logic explained
- `EVENT_DRIVEN_WIFI.md` - Event-driven WiFi implementation details
- `home_assistant_example.yaml` - Home Assistant configuration examples

### Troubleshooting & Fixes
- `TROUBLESHOOTING.md` - General troubleshooting guide
- `CHANGELOG.md` - **⭐ Complete history of issues and fixes**
- `MQTT_OPTIMIZATION.md` - MQTT performance optimization details
- `PERFORMANCE_FIX_SUMMARY.md` - Performance improvements summary
- `PERFORMANCE_IMPROVEMENTS.md` - Technical performance details
- `MDNS_FIX.md` - mDNS .local URL issue resolution
- `PC_MDNS_TROUBLESHOOTING.md` - PC-side mDNS setup guide
- `PROJECT_SUMMARY.md` - High-level project overview

### Most Important Documents

🔥 **If you have issues, read these first:**
1. **CHANGELOG.md** - Every problem we faced and how it was fixed
2. **TROUBLESHOOTING.md** - Common issues and solutions
3. **PC_MDNS_TROUBLESHOOTING.md** - Why .local URL doesn't work on your PC

📖 **For understanding the system:**
- **PERFORMANCE_FIX_SUMMARY.md** - Why relays were slow and how we fixed it
- **MQTT_OPTIMIZATION.md** - Why MQTT reconnection was blocking
- **MDNS_FIX.md** - Why .local URL stopped working

🎓 **For learning:**
- **RF_RECEIVER_GUIDE.md** - Complete RF setup walkthrough
- **EVENT_DRIVEN_WIFI.md** - Non-blocking WiFi implementation

## License

This project is open source. Feel free to modify and distribute.

## Support

For issues and questions:
1. **Read CHANGELOG.md** - Every issue and fix is documented there
2. Check the troubleshooting section above
3. Review serial monitor output
4. Verify hardware connections
5. Check Home Assistant logs

## Quick Reference

### Common Commands

```bash
# Full Setup (first time or after major changes)
pio run --target uploadfs    # Upload web files
pio run --target upload       # Upload firmware

# Monitor Serial Output
pio device monitor --baud 115200

# After Code Changes Only
pio run --target upload       # Firmware only

# After Web Interface Changes (HTML/CSS/JS in data/)
pio run --target uploadfs     # Filesystem only

# Clean Build (if issues)
pio run --target clean
pio run --target uploadfs
pio run --target upload
```

### Web Interface URLs

```
Main Interface:     http://esp32-relay.local
                    http://192.168.x.x

Admin Panel:        http://esp32-relay.local/solaceadmin
                    Username: admin
                    Password: Solacepass@123

RF Learning:        http://esp32-relay.local/rf_learn.html
```

### Default Credentials

**WiFi AP Mode** (if not configured):
- SSID: `ESP32-Relay-Config`
- Password: `12345678`

**MQTT** (hardcoded, changeable via web):
- Broker: `192.168.68.100:1883`
- User: `solacemqtt`
- Password: `solacepass`

**Admin Panel**:
- Username: `admin`
- Password: `Solacepass@123`

## Version History

- **v1.4.1** - WiFi reconnection speed improvement (October 2025)
  - Faster WiFi disconnection detection (30s → 5s, 6x faster)
  - Faster AP mode entry (30s → 15s timeout, 2x faster)
  - More frequent reconnection attempts (60s → 30s, 2x more)
  - Total time to AP mode reduced from ~60s to ~20s (3x faster)
  - Maintains non-blocking operation and AP client protection

- **v1.4** - Performance optimization (October 2025)
  - Optimized MQTT reconnection (48x faster)
  - Removed blocking delays from discovery publishing
  - Added smart WiFi reconnection with AP fallback
  - Improved system responsiveness

- **v1.3** - RF Receiver support (October 2025)
  - SYN480R 433MHz receiver integration
  - RF learning mode via web interface
  - Home Assistant RF trigger entity
  - Manual stop learning mode button

- **v1.2** - Enhanced configuration (October 2025)
  - Password-protected admin panel
  - Dynamic relay count configuration (8/12/16)
  - MQTT credential management
  - State persistence across reboots

- **v1.1** - Full Home Assistant integration (October 2025)
  - MQTT auto-discovery
  - 16-relay support
  - Enhanced web interface
  - mDNS support (.local URLs)

- **v1.0** - Initial release
  - WiFi configuration portal
  - Basic web interface
  - MQTT integration
  - Multi-relay support





