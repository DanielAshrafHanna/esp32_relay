# ESP32 Relay Controller

A professional ESP32-based relay controller with WiFi configuration portal and full Home Assistant integration via MQTT.

## Features

- 🔌 **Multi-Relay Control**: Support for up to 4 relays (easily expandable)
- 📡 **WiFi Manager**: Captive portal for easy WiFi and MQTT configuration
- 🌐 **Web Interface**: Modern, responsive web UI accessible via `.local` domain
- 🏠 **Home Assistant Integration**: Full MQTT auto-discovery support
- 📱 **Mobile Responsive**: Works great on phones and tablets
- 🔒 **Persistent Configuration**: Settings saved across reboots

## Hardware Requirements

- ESP32 Development Board
- Relay Module (4-channel or similar)
- Power Supply (appropriate for your relays)
- Jumper wires

## Wiring

Connect the relays to the GPIO pins defined in `include/config.h`:

```
Default GPIO Pins:
- Relay 1: GPIO 23
- Relay 2: GPIO 22
- Relay 3: GPIO 21
- Relay 4: GPIO 19
```

**Important**: Adjust these pins in `config.h` to match your hardware setup.

## Software Setup

### Prerequisites

1. **PlatformIO**: Install via VS Code extension or CLI
   - [Install PlatformIO IDE](https://platformio.org/install/ide?install=vscode)

2. **USB Drivers**: Install CP2102 or CH340 drivers for your ESP32

### Installation Steps

1. **Clone or download this project**

2. **Configure Hardware Settings**
   
   Edit `include/config.h`:
   - Set `NUM_RELAYS` to match your relay count
   - Update `RELAY_PINS[]` array with your GPIO pins
   - Customize `RELAY_NAMES[]` for friendly names
   - Change `MDNS_HOSTNAME` if desired (default: `esp32-relay`)

3. **Upload Filesystem (Web Interface)**
   
   ```bash
   pio run --target uploadfs
   ```
   
   This uploads the web interface files to the ESP32's LittleFS filesystem.

4. **Compile and Upload Code**
   
   ```bash
   pio run --target upload
   ```
   
   Or use the PlatformIO upload button in VS Code.

5. **Monitor Serial Output**
   
   ```bash
   pio device monitor
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

### Cannot Access Web Interface

1. Check serial monitor for IP address
2. Try IP address instead of `.local` domain
3. Ensure you're on the same network
4. Restart ESP32

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

The web server exposes REST API endpoints:

### GET /api/relays
Returns status of all relays
```json
{
  "relays": [
    {"id": 1, "name": "Relay 1", "state": true, "pin": 23},
    ...
  ]
}
```

### POST /api/relay
Control a relay
```json
{
  "relay": 1,
  "state": true
}
```

### GET /api/wifi
Get WiFi information

### GET /api/mqtt
Get MQTT status

### POST /api/reset
Reset WiFi configuration

## Libraries Used

- WiFiManager (v2.0.16-rc.2) - WiFi configuration portal
- PubSubClient (v2.8) - MQTT client
- ArduinoJson (v6.21.3) - JSON parsing
- ESPAsyncWebServer (v1.2.3) - Async web server
- AsyncTCP (v1.1.1) - Async TCP library

## License

This project is open source. Feel free to modify and distribute.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review serial monitor output
3. Verify hardware connections
4. Check Home Assistant logs

## Version History

- **v1.0** - Initial release
  - WiFi configuration portal
  - Web interface
  - Home Assistant MQTT integration
  - Multi-relay support





