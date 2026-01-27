# Troubleshooting Guide - ESP32 RF-to-MQTT Bridge

## Common Issues and Solutions

### WiFi & Connection Issues

#### ❌ Cannot find ESP32-RF-Setup WiFi network
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
AP Name: ESP32-RF-Setup
```

---

#### ❌ Connected to AP but captive portal doesn't open
**Symptoms**: Connected to ESP32-RF-Setup but no configuration page

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

#### ❌ Cannot access http://esp32-rf.local
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

**Serial Debug**:
```
Look for:
[MQTT] Connected!
```

---

#### ❌ Home Assistant not discovering RF triggers
**Symptoms**: No ESP32-RF-Bridge device in HA

**Solutions**:

1. **Learn at least one RF code first** - no discovery without codes

2. **Verify MQTT discovery is enabled** in `configuration.yaml`:
   ```yaml
   mqtt:
     broker: BROKER_IP
     discovery: true
     discovery_prefix: homeassistant
   ```

3. **Check MQTT integration** in HA:
   - Settings → Devices & Services → MQTT
   - Should show "configured"

4. **Restart Home Assistant** after config changes

5. **Check MQTT topics** in HA:
   - Developer Tools → MQTT
   - Listen to: `homeassistant/#`
   - You should see discovery messages

6. **Force republish discovery**:
   ```bash
   curl -X POST http://esp32-rf.local/api/mqtt/rediscover
   ```

---

### RF Receiver Issues

#### ❌ RF code not capturing
**Symptoms**: Learning mode times out without capturing signal

**Solutions**:

1. **Check wiring**:
   - Verify DATA pin is connected to GPIO 22
   - Verify GND is connected
   - Verify VCC has power (3.3V or 5V)

2. **Check power supply**:
   - Use 5V for better sensitivity
   - Ensure stable power

3. **Check transmitter**:
   - Verify transmitter has battery/power
   - Move transmitter closer (within 1 meter for testing)
   - Try different buttons on the transmitter

4. **Check serial monitor**:
   ```
   # Should see when learning:
   [RF] Learning mode activated - press transmitter button
   
   # On successful capture:
   [RF] Code learned: XXXXXX (bit: XX, protocol: X)
   ```

5. **Try different transmitter**:
   - Some transmitters use rolling codes (not compatible)
   - Use fixed-code transmitters

---

#### ❌ Multiple codes from same button
**Symptoms**: Same button produces different codes each time

**Cause**: Transmitter uses rolling codes for security

**Solution**: These transmitters are not compatible. Use fixed-code transmitters instead.

---

#### ❌ Weak RF range
**Symptoms**: Only works when transmitter is very close

**Solutions**:

1. **Add antenna**:
   - Solder 17.3cm wire to ANT pad
   - Keep antenna vertical if possible
   - Keep away from metal objects

2. **Use 5V power**:
   - Better sensitivity than 3.3V
   - Connect VCC to ESP32 5V pin

3. **Move receiver**:
   - Away from ESP32 (reduces interference)
   - Away from WiFi router
   - Away from other electronics

4. **Check for interference**:
   - Other 433MHz devices nearby
   - Strong RF sources
   - Metal enclosures

---

#### ❌ False triggers
**Symptoms**: Trigger activates unexpectedly

**Causes**:
- Other 433MHz devices nearby
- Electrical noise
- Poor antenna connection

**Solutions**:
1. Learn a different button/transmitter
2. Add shielding around receiver
3. Use transmitters with longer codes
4. Improve antenna connection

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
   - rf_manager.html
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

#### ❌ Web interface not updating
**Symptoms**: Status doesn't refresh

**Solutions**:

1. **Check browser console** (F12):
   - Look for JavaScript errors
   - Check network requests

2. **Clear browser cache** (Ctrl+Shift+R)

3. **Try different browser**

4. **Verify web server** is running (serial):
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

### Reset & Recovery

#### 🔧 Factory Reset (Software)

Via web interface:
1. Go to Settings
2. Click "Reset Configuration"
3. Reconnect to `ESP32-RF-Setup`

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
mosquitto_sub -h BROKER_IP -t "homeassistant/#" -v
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
2. **Hardware details** (ESP32 model, RF receiver model)
3. **Configuration** (RF pin from config.h)
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
2. **Document your RF codes** (transmitter, button, name)
3. **Use static IP for MQTT broker**
4. **Keep backup of working firmware**
5. **Use proper antenna for RF**
6. **Test range before permanent installation**

---

**Still having issues?** Double-check the wiring, verify all IP addresses, and review the serial monitor output carefully. Most issues are configuration-related and can be resolved by carefully following this guide.
