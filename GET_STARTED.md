# 🚀 Get Started - ESP32 RF-to-MQTT Bridge

## Welcome!

You now have a complete, professional ESP32 RF-to-MQTT bridge ready to deploy! This guide will get you up and running in **15 minutes**.

---

## 📦 What's Included

Your project contains:

```
✅ Complete ESP32 firmware
✅ WiFi configuration portal  
✅ Modern web interface
✅ Full Home Assistant integration
✅ MQTT auto-discovery
✅ Multi-code RF learning
✅ Comprehensive documentation
```

---

## ⚡ Quick Start (3 Steps)

### Step 1: Hardware Setup (5 minutes)

**Connect your RF receiver to ESP32**:

```
SYN480R Receiver → ESP32
─────────────────────────
VCC              → 5V (or 3.3V)
GND              → GND  
DATA             → GPIO 22
```

**💡 Tip**: Add a 17.3cm wire antenna for better RF range!

📘 **Detailed wiring**: See `WIRING.md`

---

### Step 2: Upload Firmware (5 minutes)

**Option A: Using PlatformIO CLI**
```bash
# Install PlatformIO (if not installed)
pip install platformio

# Navigate to project
cd esp32_rellay

# Upload filesystem (web interface)
pio run --target uploadfs

# Upload firmware
pio run --target upload

# Monitor serial output
pio device monitor
```

**Option B: Using VS Code**
1. Install **PlatformIO IDE** extension
2. Open project folder
3. Click **Upload File System** (PlatformIO toolbar)
4. Click **Upload** (PlatformIO toolbar)
5. Click **Serial Monitor** to view output

📘 **Detailed upload guide**: See `SETUP_GUIDE.md`

---

### Step 3: Configure WiFi & MQTT (5 minutes)

1. **Wait for ESP32 to boot** (check serial monitor)

2. **Connect to WiFi network**:
   - SSID: `ESP32-RF-Setup`
   - Password: `12345678`

3. **Captive portal should open automatically**
   - If not, go to: `192.168.4.1`

4. **Enter your settings**:
   ```
   WiFi SSID:      [Your WiFi Name]
   WiFi Password:  [Your WiFi Password]
   MQTT Server:    [Your MQTT Broker IP, e.g., 192.168.1.100]
   MQTT Port:      1883
   MQTT User:      [Optional - if authentication enabled]
   MQTT Password:  [Optional - if authentication enabled]
   ```

5. **Click Save** - ESP32 will restart and connect

---

## ✅ Verify Everything Works

### 1. Access Web Interface

Open your browser:
- **Recommended**: `http://esp32-rf.local`
- **Alternative**: Use IP address from serial monitor

You should see:
- Modern dark-themed interface
- WiFi and MQTT status
- Link to RF Manager
- System information

### 2. Learn Your First RF Code

1. Click **"RF Manager"** or go to `http://esp32-rf.local/rf_manager.html`
2. Enter a name (e.g., "Doorbell")
3. Click **"Start Learning Mode"**
4. Press a button on your RF transmitter
5. ✅ Code captured and saved!

### 3. Check Home Assistant

1. Open Home Assistant
2. Go to **Settings** → **Devices & Services** → **MQTT**
3. You should see **"ESP32-RF-Bridge"** device
4. Each learned RF code appears as a binary sensor
5. Press RF transmitter - sensor should briefly turn ON

**🎉 Success!** Your system is fully operational!

---

## 🎯 What You Can Do Now

### Control Methods

**1. RF Triggers**
- Press any learned RF button
- Creates momentary trigger in Home Assistant
- Perfect for automations

**2. Home Assistant Automations**
```yaml
automation:
  - alias: "Doorbell Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_doorbell
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          message: "Someone at the door!"
```

**3. REST API**
```bash
# Get RF status
curl http://esp32-rf.local/api/rf/status

# Get learned codes
curl http://esp32-rf.local/api/rf/codes
```

---

## 🏠 Home Assistant Examples

### Doorbell Notification

```yaml
automation:
  - alias: "RF Doorbell Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_doorbell
        to: "on"
    action:
      - service: notify.mobile_app_phone
        data:
          message: "🔔 Someone is at the door!"
      - service: light.turn_on
        target:
          entity_id: light.porch
```

### Panic Button Alert

```yaml
automation:
  - alias: "RF Panic Button"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_panic
        to: "on"
    action:
      - service: notify.all_devices
        data:
          message: "🚨 PANIC BUTTON PRESSED!"
      - service: scene.turn_on
        target:
          entity_id: scene.all_lights_on
```

### Scene Activation

```yaml
automation:
  - alias: "RF Movie Mode"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_remote_1
        to: "on"
    action:
      - service: scene.turn_on
        target:
          entity_id: scene.movie_mode
```

📘 **More examples**: See `home_assistant_example.yaml`

---

## 🔧 Customize Your Setup

### Change RF Pin

Edit `include/config.h`:
```cpp
#define RF_RECEIVER_PIN 22  // Change to your desired GPIO
```

### Change Hostname

Edit `include/config.h`:
```cpp
#define MDNS_HOSTNAME "my-rf-bridge"
// Access at: http://my-rf-bridge.local
```

### Change Trigger Duration

Edit `include/config.h`:
```cpp
#define RF_TRIGGER_DURATION 5000  // 5 seconds instead of 2
```

### Customize Web Interface

Edit files in `data/` folder:
- `index.html` - Structure
- `style.css` - Colors, fonts, layout  
- `script.js` - Functionality

After changes, re-upload:
```bash
pio run --target uploadfs
```

---

## 📚 Documentation Index

| Document | When to Read |
|----------|--------------|
| **GET_STARTED.md** ⭐ | You are here - Quick start |
| **README.md** | Complete reference |
| **SETUP_GUIDE.md** | Detailed step-by-step setup |
| **WIRING.md** | Hardware connections |
| **RF_RECEIVER_GUIDE.md** | Complete RF guide |
| **TROUBLESHOOTING.md** | When something doesn't work |
| **QUICK_REFERENCE.md** | Quick lookup & commands |

---

## ❓ Common Questions

### Q: Can't access esp32-rf.local?
**A:** Use the IP address instead (check serial monitor). Some systems need Bonjour/Avahi for .local to work.

### Q: RF code not capturing?
**A:** 
1. Check wiring (DATA to GPIO 22)
2. Try 5V power for receiver
3. Move transmitter closer
4. Try different buttons

### Q: Home Assistant not discovering?
**A:**
1. Ensure `discovery: true` in HA MQTT config
2. Learn at least one RF code first
3. Restart Home Assistant
4. Check MQTT broker is running

### Q: How do I reset everything?
**A:** Via web interface: Settings → Reset Configuration

📘 **Full Q&A**: See `TROUBLESHOOTING.md`

---

## 🎓 Use Cases

### Integrate RF Devices
- Doorbells
- Remote controls
- Key fobs
- Motion sensors
- Window/door sensors

### Automation Ideas
- Doorbell notifications
- Panic button alerts
- Scene activation
- Presence detection
- Elderly care alerts

---

## 🔐 Security Tips

**For Local Network (Current)**:
- ✅ Keep on trusted network only
- ✅ Use strong WiFi password
- ✅ Use MQTT authentication

**Note**: RF signals are NOT secure - don't use for critical security functions.

---

## 🆘 Need Help?

### Troubleshooting Steps
1. ✅ Check serial monitor output
2. ✅ Verify wiring connections
3. ✅ Read TROUBLESHOOTING.md
4. ✅ Check Home Assistant logs
5. ✅ Test MQTT manually

### Debug Commands
```bash
# Monitor ESP32
pio device monitor

# Test MQTT
mosquitto_sub -h YOUR_MQTT_IP -t "homeassistant/#" -v

# Check WiFi
ping esp32-rf.local
```

---

## ✅ Setup Checklist

- [ ] RF receiver wired correctly
- [ ] Firmware uploaded successfully
- [ ] Filesystem uploaded
- [ ] ESP32 connected to WiFi
- [ ] Web interface accessible
- [ ] At least one RF code learned
- [ ] MQTT broker configured
- [ ] Home Assistant connected
- [ ] RF trigger appears in HA
- [ ] Trigger activates when RF pressed
- [ ] Created first automation

**All checked?** Congratulations! 🎉

---

## 🚀 Next Steps

1. **Learn all your RF codes** with meaningful names
2. **Create Automations** in Home Assistant
3. **Set up Notifications** for important events
4. **Add to Dashboard** for monitoring
5. **Share Your Setup** with the community!

---

## 🎉 You're All Set!

Your ESP32 RF-to-MQTT Bridge is now:
- ✅ Fully functional
- ✅ Web accessible
- ✅ Home Assistant integrated
- ✅ MQTT enabled
- ✅ Ready for automation

**Enjoy your smart home! 🏠✨**

---

*Need help? Check TROUBLESHOOTING.md*
*Want to customize? See config.h*
*Questions? Read the FAQ in README.md*

**Happy Automating! 🚀**
