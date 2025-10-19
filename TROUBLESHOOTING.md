# Troubleshooting Guide

## Common Issues and Solutions

### WiFi & Connection Issues

#### ❌ Cannot find ESP32-Relay-Setup WiFi network
**Symptoms**: WiFi AP not visible on phone/computer

**Solutions**:
1. Wait 30 seconds after powering ESP32
2. Check serial monitor for AP status
3. Restart ESP32
4. Verify WiFiManager library is installed
5. Some phones hide 2.4GHz networks - disable 5GHz temporarily

**Verify**:
```bash
# Serial output should show:
WiFi Manager
AP Name: ESP32-Relay-Setup
```

---

#### ❌ Connected to AP but captive portal doesn't open
**Symptoms**: Connected to ESP32-Relay-Setup but no configuration page

**Solutions**:
1. **Disable mobile data** on your phone
2. Manually navigate to: `192.168.4.1`
3. Try different browser (Chrome, Safari, Firefox)
4. Disable VPN
5. Forget network and reconnect

---

#### ❌ ESP32 won't connect to home WiFi
**Symptoms**: Keeps returning to AP mode

**Solutions**:
1. Verify WiFi credentials (case-sensitive)
2. Check WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Move ESP32 closer to router
4. Check router security (WPA2 recommended)
5. Try static IP configuration
6. Check MAC filtering on router

**Debug**:
```bash
# Monitor serial output:
pio device monitor

# Look for:
Connecting to WiFi...
WiFi connected!
IP address: 192.168.x.x
```

---

#### ❌ Cannot access http://esp32-relay.local
**Symptoms**: mDNS hostname not working

**Solutions**:
1. **Use IP address instead** (check serial monitor)
2. Install Bonjour/mDNS:
   - **Windows**: Install [Bonjour Print Services](https://support.apple.com/kb/DL999)
   - **Linux**: Install Avahi: `sudo apt-get install avahi-daemon`
   - **macOS**: Built-in
3. Try with `.local` suffix
4. Restart router
5. Clear DNS cache

**Alternative Access**:
```bash
# Find IP in serial monitor:
pio device monitor

# Access directly:
http://192.168.1.XXX
```

---

### MQTT Issues

#### ❌ MQTT not connecting
**Symptoms**: Web interface shows "MQTT: Disconnected"

**Solutions**:
1. **Verify MQTT broker is running**:
   ```bash
   # Linux/Pi:
   sudo systemctl status mosquitto
   
   # Or test connection:
   mosquitto_pub -h BROKER_IP -t test -m "hello"
   ```

2. **Check broker IP** is correct (not localhost from ESP32 perspective)

3. **Verify credentials** if authentication is enabled

4. **Check firewall**:
   ```bash
   # Linux/Pi:
   sudo ufw allow 1883
   ```

5. **Check broker logs**:
   ```bash
   # Mosquitto logs:
   sudo tail -f /var/log/mosquitto/mosquitto.log
   ```

6. **Test from ESP32 network**:
   ```bash
   mosquitto_pub -h BROKER_IP -p 1883 -t test -m "test"
   ```

**Serial Debug**:
```
Look for:
Attempting MQTT connection...connected
```

---

#### ❌ Home Assistant not discovering devices
**Symptoms**: No ESP32 device in HA

**Solutions**:

1. **Verify MQTT discovery is enabled** in `configuration.yaml`:
   ```yaml
   mqtt:
     broker: BROKER_IP
     discovery: true
     discovery_prefix: homeassistant
   ```

2. **Check MQTT integration** in HA:
   - Settings → Devices & Services → MQTT
   - Should show "configured"

3. **Restart Home Assistant** after config changes

4. **Check MQTT topics** in HA:
   - Developer Tools → MQTT
   - Listen to: `homeassistant/#`
   - You should see discovery messages

5. **Manually trigger discovery**:
   - Restart ESP32 (it republishes on boot)

6. **Check HA logs**:
   ```bash
   # Look for MQTT errors
   tail -f /config/home-assistant.log | grep mqtt
   ```

**Manual Test**:
```bash
# Subscribe to all homeassistant topics:
mosquitto_sub -h localhost -t "homeassistant/#" -v

# You should see:
homeassistant/switch/esp32-relay/relay1/config {...}
```

---

#### ❌ Relays don't respond to HA commands
**Symptoms**: HA shows switches but they don't control relays

**Solutions**:

1. **Verify MQTT connection** on ESP32 (check serial)

2. **Check command topics**:
   ```bash
   # Test manual command:
   mosquitto_pub -h BROKER_IP -t "homeassistant/switch/esp32-relay/relay1/set" -m "ON"
   ```

3. **Monitor ESP32 subscriptions**:
   ```bash
   # Serial should show:
   Subscribed to: homeassistant/switch/esp32-relay/relay1/set
   Message arrived [topic]: ON
   ```

4. **Check topic names match** in HA config

5. **Verify QoS and retain** settings

---

### Relay Hardware Issues

#### ❌ Relays not switching
**Symptoms**: No click sound, LED doesn't change

**Solutions**:

1. **Check wiring**:
   - Verify GPIO pins match `config.h`
   - Ensure GND is connected
   - Check VCC voltage (3.3V or 5V based on module)

2. **Test GPIO directly**:
   ```cpp
   // Add to setup() for testing:
   digitalWrite(23, HIGH);
   delay(1000);
   digitalWrite(23, LOW);
   ```

3. **Check relay module**:
   - Some need external power
   - Jumper settings (check JD-VCC)
   - Test with jumper wire to GND/VCC

4. **Verify signal level**:
   - Some relays need 5V signal
   - ESP32 outputs 3.3V (may need level shifter)

---

#### ❌ Relays are inverted (ON when should be OFF)
**Symptoms**: Active-low relay module

**Solution**:
Edit `src/relay_control.cpp`:
```cpp
void RelayControl::setState(int relayIndex, bool state) {
    if (relayIndex >= 0 && relayIndex < NUM_RELAYS) {
        relayStates[relayIndex] = state;
        // Change HIGH/LOW to LOW/HIGH:
        digitalWrite(RELAY_PINS[relayIndex], state ? LOW : HIGH);
        Serial.printf("Relay %d set to %s\n", relayIndex + 1, state ? "ON" : "OFF");
    }
}
```

Also in `init()`:
```cpp
void RelayControl::init() {
    for (int i = 0; i < NUM_RELAYS; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH);  // Changed from LOW
        relayStates[i] = false;
    }
}
```

---

### Web Interface Issues

#### ❌ Web page not loading / blank page
**Symptoms**: Can reach IP but page is empty

**Solutions**:

1. **Re-upload filesystem**:
   ```bash
   pio run --target uploadfs
   ```

2. **Check LittleFS** in `platformio.ini`:
   ```ini
   board_build.filesystem = littlefs
   ```

3. **Verify files in data/ folder**:
   - index.html
   - style.css
   - script.js

4. **Check serial** for LittleFS errors:
   ```
   LittleFS Mount Failed
   ```

5. **Try erasing flash** first:
   ```bash
   pio run --target erase
   pio run --target uploadfs
   pio run --target upload
   ```

---

#### ❌ Web interface not updating relay states
**Symptoms**: Buttons don't work or states wrong

**Solutions**:

1. **Check browser console** (F12):
   - Look for JavaScript errors
   - Check network requests

2. **Verify API endpoints**:
   ```bash
   # Test from command line:
   curl http://esp32-relay.local/api/relays
   curl -X POST http://esp32-relay.local/api/relay \
     -H "Content-Type: application/json" \
     -d '{"relay":1,"state":true}'
   ```

3. **Clear browser cache** (Ctrl+Shift+R)

4. **Try different browser**

5. **Check async web server** is running (serial):
   ```
   Web server started
   ```

---

### Upload & Compilation Issues

#### ❌ Failed to connect to ESP32
**Symptoms**: Upload fails, can't find port

**Solutions**:

1. **Install USB drivers**:
   - CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - CH340: http://www.wch.cn/downloads/CH341SER_ZIP.html

2. **Check USB cable** (must be data cable, not charge-only)

3. **Hold BOOT button** during upload

4. **Specify upload port** in `platformio.ini`:
   ```ini
   upload_port = /dev/ttyUSB0  # Linux
   upload_port = COM3          # Windows
   ```

5. **Try lower baud rate**:
   ```ini
   upload_speed = 115200
   ```

---

#### ❌ Compilation errors
**Symptoms**: Build fails with errors

**Solutions**:

1. **Update PlatformIO**:
   ```bash
   pio upgrade
   pio pkg update
   ```

2. **Clean build**:
   ```bash
   pio run --target clean
   pio run
   ```

3. **Check library versions** in `platformio.ini`

4. **Install missing libraries**:
   ```bash
   pio pkg install
   ```

---

#### ❌ Out of memory errors
**Symptoms**: Sketch too big, OTA fails

**Solutions**:

1. **Use correct partition scheme** in `platformio.ini`:
   ```ini
   board_build.partitions = min_spiffs.csv
   ```

2. **Reduce features** if needed

3. **Enable optimization**:
   ```ini
   build_flags = -Os
   ```

---

### Reset & Recovery

#### 🔧 Factory Reset (Software)

Via web interface:
1. Go to Settings
2. Click "Reset Configuration"
3. Reconnect to `ESP32-Relay-Setup`

Via serial:
```cpp
// Add to code temporarily:
WiFiManager wm;
wm.resetSettings();
ESP.restart();
```

---

#### 🔧 Complete Flash Erase

```bash
# Erase entire flash:
pio run --target erase

# Re-upload everything:
pio run --target uploadfs
pio run --target upload
```

---

## Debugging Tools

### Serial Monitor Commands

Monitor everything:
```bash
pio device monitor --baud 115200
```

### MQTT Tools

Subscribe to all topics:
```bash
mosquitto_sub -h BROKER_IP -t "#" -v
```

Test publish:
```bash
mosquitto_pub -h BROKER_IP -t "test/topic" -m "test message"
```

### Network Tools

Find ESP32 IP:
```bash
# Linux/Mac:
arp -a | grep esp

# Or use nmap:
nmap -sn 192.168.1.0/24
```

Test mDNS:
```bash
# Linux:
avahi-browse -a

# Mac:
dns-sd -B _http._tcp
```

---

## Getting Help

### What to Include When Asking for Help

1. **Serial monitor output** (full boot sequence)
2. **Hardware details** (ESP32 model, relay module)
3. **Configuration** (pins, settings from config.h)
4. **What you've tried** (from this guide)
5. **Expected vs actual behavior**

### Useful Commands for Debugging

```bash
# Full build with verbose output:
pio run -v

# Monitor with filters:
pio device monitor --filter esp32_exception_decoder

# Check installed packages:
pio pkg list
```

---

## Prevention Tips

1. **Always backup working configuration**
2. **Document your GPIO pin assignments**
3. **Use static IP for MQTT broker**
4. **Keep backup of working firmware**
5. **Test on breadboard before permanent install**
6. **Use fused power supplies**
7. **Label relay outputs**

---

**Still having issues?** Double-check the wiring, verify all IP addresses, and review the serial monitor output carefully. Most issues are configuration-related and can be resolved by carefully following this guide.





