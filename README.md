# ESP32 RF Repeater

Standalone 433MHz RF repeater/extender for ESP32.

This firmware receives RF signals, compares them against saved/learned codes, and retransmits matching signals to extend range. It does not require Home Assistant or MQTT.

## Version

- `3.0.0` (RF repeater mode)

## What It Does

- Receives RF on `GPIO 22` (`D22`)
- Stores up to 10 learned RF codes in NVS (`Preferences`)
- Matches incoming codes by:
  - code value
  - bit length
  - protocol
- Retransmits a matching signal on `GPIO 21` (`D21`) once
- Applies cooldown (`RF_COOLDOWN_TIME`) to avoid rapid retrigger loops
- Provides a Wi-Fi web UI for RF learning and management

## Hardware

- ESP32 dev board
- 433MHz RF receiver module (for example SYN480R)
- 433MHz RF transmitter module
- Optional antenna wire for better range

## Pin Mapping

- RF Receiver DATA -> `GPIO 22` (`D22`)
- RF Transmitter DATA -> `GPIO 21` (`D21`)
- Receiver and transmitter GND -> ESP32 GND
- Receiver/transmitter VCC -> module-rated supply (3.3V or 5V as supported)

See `WIRING.md` for full wiring details.

## Build and Flash

```bash
pio run
pio run --target upload
pio device monitor
```

## Web Interface

After joining Wi-Fi, open:

- `http://esp32-rf.local/` (dashboard)
- `http://esp32-rf.local/rf_manager.html` (learn/manage RF codes)
- `http://esp32-rf.local/solaceadmin` (admin actions)

### RF Learning Flow

1. Open RF Manager
2. Enter a name for the signal
3. Start learning
4. Press your remote button
5. Signal is saved and available for repeater matching

## RF Repeater Logic

1. Device receives an RF packet on `D22`
2. Packet is filtered (`code != 0`, `bitLength >= RF_MIN_BIT_LENGTH`)
3. If in learning mode, packet is saved
4. If not in learning mode, packet is compared to saved entries
5. On match and cooldown pass, signal is retransmitted on `D21`

## Configuration

Main constants are in `include/config.h`:

- `RF_RECEIVER_PIN`
- `RF_TRANSMITTER_PIN`
- `RF_COOLDOWN_TIME`
- `RF_MIN_BIT_LENGTH`
- `RF_RETRANSMIT_COUNT`

## Notes

- This project no longer publishes MQTT topics.
- Home Assistant-specific discovery/config is removed.
- Saved RF codes are kept in NVS under namespace `rf-bridge`.

## Troubleshooting

- If nothing is detected:
  - verify receiver DATA line is on `GPIO 22`
  - verify common ground
  - test with remote close to receiver first
- If no retransmit:
  - verify transmitter DATA line is on `GPIO 21`
  - confirm the incoming signal is already learned
  - check serial logs for matched/ignored events
- If repeated/unstable behavior:
  - increase `RF_COOLDOWN_TIME`
  - improve antenna placement and power quality
# ESP32 RF-to-MQTT Bridge

**Version 2.0.1** - 433MHz RF-to-MQTT Bridge with Home Assistant integration.

> **📚 New to this project? See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for a complete guide to all documentation.**
>
> **🔥 Having issues? Check [CHANGELOG.md](CHANGELOG.md) - every problem and fix is documented there!**

> **⚡ Quick Upload Commands**
> ```bash
> pio run --target uploadfs    # Upload web files (when HTML/CSS/JS changes)
> pio run --target upload       # Upload firmware (when code changes)
> ```

A professional ESP32-based RF-to-MQTT bridge that captures 433MHz RF signals and publishes them to Home Assistant via MQTT. Perfect for integrating RF remotes, doorbells, and sensors into your smart home.

## Features

- 📻 **433MHz RF Receiver**: SYN480R receiver with learning mode for multiple RF codes
- 🏠 **Home Assistant Integration**: Full MQTT auto-discovery support
- 📡 **WiFi Manager**: Captive portal for easy WiFi and MQTT configuration
- 🌐 **Web Interface**: Modern, responsive web UI accessible via `.local` domain
- 🔐 **Admin Panel**: Password-protected configuration panel
- 📱 **Mobile Responsive**: Works great on phones and tablets
- 🔒 **Persistent Storage**: RF codes and settings saved across reboots
- ⚡ **High Performance**: Optimized non-blocking code for instant response

## Hardware Requirements

- ESP32 Development Board (ESP32-D0WD-V3 or similar)
- SYN480R 433MHz RF Receiver Module
- Power Supply (5V for ESP32)
- Jumper wires

## Wiring

Connect the RF receiver to the GPIO pin defined in `include/config.h`:

```
SYN480R Receiver → ESP32
─────────────────────────
VCC              → 3.3V or 5V
GND              → GND  
DATA             → GPIO 22
```

**Important**: Adjust the RF pin in `include/config.h` to match your hardware setup.

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

1. **Clone or download this project**

2. **Configure Hardware Settings**
   
   Edit `include/config.h`:
   - Set `RF_RECEIVER_PIN` to your GPIO pin
   - Change `MDNS_HOSTNAME` if desired (default: `esp32-rf`)

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

5. **Monitor Serial Output**
   
   ```bash
   pio device monitor --baud 115200
   ```

## First-Time Setup

### 1. WiFi Configuration

1. After uploading, the ESP32 will create a WiFi access point:
   - **SSID**: `ESP32-RF-Setup`
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
- `http://esp32-rf.local` (recommended)
- Or use the IP address shown in serial monitor

### 3. Learn RF Codes

1. Navigate to the RF Manager page via the web interface
2. Enter a name for your RF device (e.g., "Doorbell", "Remote Button 1")
3. Click "Start Learning Mode"
4. Press the button on your RF transmitter within 30 seconds
5. The code will be captured and saved automatically

## Home Assistant Integration

### Automatic Discovery (Recommended)

The bridge automatically publishes MQTT discovery messages to Home Assistant.

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

3. The RF triggers will automatically appear as binary sensors in Home Assistant

4. Find them in:
   - **Devices & Services** → **MQTT** → **ESP32-RF-Bridge**

### RF Trigger Entities

Each learned RF code creates a binary sensor entity:
- **Entity Type**: `binary_sensor`
- **Device Class**: Motion
- **Auto-Off**: 2 seconds after trigger
- **Icon**: mdi:remote

### Using in Automations

```yaml
automation:
  - alias: "RF Button Triggers Light"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_doorbell
        to: "on"
    action:
      - service: light.toggle
        target:
          entity_id: light.living_room
```

## Web Interface Features

### RF Manager
- Learn new RF codes with custom names
- View all learned codes with details (code, bits, protocol)
- Delete individual codes
- Real-time signal detection indicator

### System Information
- WiFi network details
- IP address and hostname
- Signal strength indicator
- MQTT connection status
- Device uptime

### Settings
- Reset WiFi configuration
- Reconfigure MQTT settings

## MQTT Topics Structure

### RF Trigger State Topics (Published by ESP32)
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

## API Endpoints

The web server exposes REST API endpoints for control and troubleshooting:

### RF Control

#### GET /api/rf/status
Get RF learning status and learned codes

#### GET /api/rf/codes
Get all learned RF codes
```json
{
  "codes": [
    {"slot": 0, "name": "Doorbell", "code": 5592332, "bits": 24, "protocol": 1, "active": true},
    {"slot": 1, "name": "Remote 1", "code": 1234567, "bits": 24, "protocol": 1, "active": true}
  ],
  "count": 2,
  "max": 10
}
```

#### POST /api/rf/learn
Start RF learning mode (requires `name` parameter)

#### POST /api/rf/stop
Stop RF learning mode

#### POST /api/rf/delete
Delete a learned RF code (requires `slot` parameter)

### Network Status

#### GET /api/wifi
Get WiFi connection information including uptime

#### GET /api/mqtt
Get MQTT connection status

#### GET /api/mdns/status
Get mDNS service status

### Configuration & Admin

#### GET /api/admin/config
Get admin configuration (requires authentication)

#### POST /api/admin/mqtt
Update MQTT credentials (requires authentication)

#### POST /api/reset
Reset WiFi configuration and restart

### Troubleshooting

#### POST /api/mqtt/rediscover
Force MQTT discovery republish

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

### Getting Started
- **README.md** (this file) - Main project overview and setup
- `QUICK_REFERENCE.md` - Command reference and quick tips
- `GET_STARTED.md` - Beginner-friendly setup guide
- `SETUP_GUIDE.md` - Detailed installation instructions

### Hardware
- `WIRING.md` - Wiring diagrams and safety information

### Features & Guides
- `RF_RECEIVER_GUIDE.md` - Complete RF receiver setup and usage
- `RF_IMPLEMENTATION_SUMMARY.md` - RF feature quick reference
- `WIFI_RECONNECTION.md` - WiFi reconnection logic explained
- `home_assistant_example.yaml` - Home Assistant configuration examples

### Troubleshooting & Fixes
- `TROUBLESHOOTING.md` - General troubleshooting guide
- `CHANGELOG.md` - Complete history of issues and fixes
- `MDNS_FIX.md` - mDNS .local URL issue resolution

## Troubleshooting

### ⚠️ Web Interface Not Loading (Most Common Issue)

**Error in Serial Monitor:**
```
[E][vfs_api.cpp:105] open(): /littlefs/index.html does not exist
```

**Solution**:
```bash
pio run --target uploadfs
```

### Cannot Access Web Interface

1. Check if filesystem is uploaded (see error above)
2. Check serial monitor for IP address
3. Try IP address instead of `.local` domain
4. Ensure you're on the same network

### MQTT Not Connecting

1. Verify MQTT broker is running
2. Check MQTT credentials
3. Ensure broker IP is correct
4. Check firewall settings

### RF Code Not Capturing

1. Verify receiver is connected to correct GPIO pin
2. Check power supply (3.3V or 5V depending on module)
3. Ensure transmitter is within range
4. Try different transmitter buttons

## Quick Reference

### Common Commands

```bash
# Full Setup (first time or after major changes)
pio run --target uploadfs    # Upload web files
pio run --target upload       # Upload firmware

# Monitor Serial Output
pio device monitor --baud 115200

# Clean Build (if issues)
pio run --target clean
pio run --target uploadfs
pio run --target upload
```

### Web Interface URLs

```
Main Interface:     http://esp32-rf.local
                    http://192.168.x.x

Admin Panel:        http://esp32-rf.local/solaceadmin
                    Username: admin
                    Password: Solacepass@123

RF Manager:         http://esp32-rf.local/rf_manager.html
```

### Default Credentials

**WiFi AP Mode** (if not configured):
- SSID: `ESP32-RF-Setup`
- Password: `12345678`

**MQTT** (defaults, changeable via web):
- Broker: `192.168.68.100:1883`
- User: `solacemqtt`
- Password: `solacepass`

**Admin Panel**:
- Username: `admin`
- Password: `Solacepass@123`

## Version History

- **v2.0.1** - RF false-trigger reduction (Current)
  - Cooldown period (3 s) between triggers for the same RF code to debounce repeats
  - Minimum bit-length filter to reject short/noisy signals
  - Stricter receive tolerance (40%) to reduce false positives from electrical noise
  - Serial debug logging for all received RF signals (`[RF-DEBUG]`) to help diagnose issues

- **v2.0.0** - RF-to-MQTT Bridge
  - Complete refactor to RF-only device
  - Removed all relay functionality
  - Multi-code RF learning support (up to 10 codes)
  - Each RF code creates a Home Assistant binary sensor
  - Custom naming for RF codes
  - Streamlined web interface for RF management
  - Reduced code size and memory footprint
  - Updated preferences namespace to `rf-bridge`

- **v1.4.1** - Stability improvements for weak WiFi
  - Disabled ESP32's internal auto-reconnect
  - Added watchdog feed during MQTT operations
  - Improved system stability

- **v1.4.0** - Safety & Uptime
  - Removed ESP.restart() on WiFi failure
  - Added uptime display on webpage
  - Background WiFi reconnection

- **v1.3.0** - Smart Reconnection System
  - Smart WiFi Reconnection with AP fallback
  - Smart MQTT Reconnection with Exponential Backoff
  - Credential error detection
  - WiFiManager fix for MQTT credentials

## License

This project is open source. Feel free to modify and distribute.

## Support

For issues and questions:
1. **Read CHANGELOG.md** - Every issue and fix is documented there
2. Check the troubleshooting section above
3. Review serial monitor output
4. Verify hardware connections
