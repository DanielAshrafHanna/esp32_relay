# 🚀 Get Started - ESP32 Relay Controller

## Welcome!

You now have a complete, professional ESP32 relay controller ready to deploy! This guide will get you up and running in **15 minutes**.

---

## 📦 What's Included

Your project contains:

```
✅ Complete ESP32 firmware
✅ WiFi configuration portal  
✅ Modern web interface
✅ Full Home Assistant integration
✅ MQTT auto-discovery
✅ Comprehensive documentation
✅ Troubleshooting guides
✅ Wiring diagrams
```

---

## ⚡ Quick Start (3 Steps)

### Step 1: Hardware Setup (5 minutes)

**Connect your ESP32 to relay module**:

```
ESP32 GPIO 23  →  Relay 1 (IN1)
ESP32 GPIO 22  →  Relay 2 (IN2)
ESP32 GPIO 21  →  Relay 3 (IN3)
ESP32 GPIO 19  →  Relay 4 (IN4)
ESP32 GND      →  Relay GND
ESP32 5V/3.3V  →  Relay VCC
```

**⚠️ Important**: Check your relay module voltage requirements!

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
   - SSID: `ESP32-Relay-Setup`
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
- **Recommended**: `http://esp32-relay.local`
- **Alternative**: Use IP address from serial monitor

You should see:
- Modern dark-themed interface
- 4 relay cards
- WiFi and MQTT status
- System information

### 2. Test Relay Control

Click the relay buttons in the web interface:
- ✅ Relays should click on/off
- ✅ Status should update in real-time
- ✅ Visual feedback (colors, animations)

### 3. Check Home Assistant

1. Open Home Assistant
2. Go to **Settings** → **Devices & Services** → **MQTT**
3. You should see **"ESP32-Relay"** device
4. Click on it to see 4 relay switches
5. Toggle switches - relays should respond

**🎉 Success!** Your system is fully operational!

---

## 🎯 What You Can Do Now

### Control Methods

**1. Web Interface**
- Access from any device on your network
- Real-time status updates
- Manual control

**2. Home Assistant**
- Dashboard controls
- Automations
- Scenes
- Voice commands (Alexa, Google)

**3. MQTT Direct**
```bash
# Turn ON relay 1
mosquitto_pub -h YOUR_MQTT_IP \
  -t "homeassistant/switch/esp32-relay/relay1/set" \
  -m "ON"
```

**4. REST API**
```bash
# Get all relay states
curl http://esp32-relay.local/api/relays

# Turn ON relay 1
curl -X POST http://esp32-relay.local/api/relay \
  -H "Content-Type: application/json" \
  -d '{"relay":1,"state":true}'
```

---

## 🏠 Home Assistant Examples

### Create an Automation

```yaml
automation:
  - alias: "Turn on relay 1 at sunset"
    trigger:
      - platform: sun
        event: sunset
    action:
      - service: switch.turn_on
        target:
          entity_id: switch.esp32_relay_1
```

### Create a Scene

```yaml
scene:
  - name: Movie Mode
    entities:
      switch.esp32_relay_1:
        state: off  # Main lights off
      switch.esp32_relay_2:
        state: on   # Ambient lights on
```

### Add to Dashboard

```yaml
type: entities
title: Relay Controller
entities:
  - entity: switch.esp32_relay_1
    name: Living Room Light
  - entity: switch.esp32_relay_2
    name: Bedroom Fan
```

📘 **More examples**: See `home_assistant_example.yaml`

---

## 🔧 Customize Your Setup

### Change Number of Relays

Edit `include/config.h`:
```cpp
#define NUM_RELAYS 8  // Change to your relay count

const int RELAY_PINS[NUM_RELAYS] = {
    23, 22, 21, 19, 18, 5, 4, 2  // Your GPIO pins
};

const char* RELAY_NAMES[NUM_RELAYS] = {
    "Living Room Light",
    "Bedroom Fan",
    "Garden Pump",
    "Garage Door",
    "Pool Pump",
    "Fountain",
    "LED Strip",
    "Sprinkler"
};
```

### Change Hostname

Edit `include/config.h`:
```cpp
#define MDNS_HOSTNAME "my-relay"
// Access at: http://my-relay.local
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

📘 **Full customization guide**: See `PROJECT_SUMMARY.md`

---

## 📚 Documentation Index

| Document | When to Read |
|----------|--------------|
| **GET_STARTED.md** ⭐ | You are here - Quick start |
| **README.md** | Complete reference |
| **SETUP_GUIDE.md** | Detailed step-by-step setup |
| **WIRING.md** | Hardware connections & safety |
| **TROUBLESHOOTING.md** | When something doesn't work |
| **QUICK_REFERENCE.md** | Quick lookup & commands |
| **PROJECT_SUMMARY.md** | Technical overview |
| **home_assistant_example.yaml** | HA integration examples |

---

## ❓ Common Questions

### Q: Can't access esp32-relay.local?
**A:** Use the IP address instead (check serial monitor). Some systems need Bonjour/Avahi for .local to work.

### Q: Relays are backwards (ON when should be OFF)?
**A:** You have an active-low relay module. See TROUBLESHOOTING.md section "Relays are inverted".

### Q: MQTT not connecting?
**A:** 
1. Verify MQTT broker is running
2. Check IP address is correct
3. Test with: `mosquitto_pub -h YOUR_IP -t test -m hello`

### Q: Home Assistant not discovering?
**A:**
1. Ensure `discovery: true` in HA MQTT config
2. Restart Home Assistant
3. Check MQTT broker is running
4. Restart ESP32 to republish discovery

### Q: How do I reset everything?
**A:** Via web interface: Settings → Reset Configuration

📘 **Full Q&A**: See `TROUBLESHOOTING.md`

---

## 🎓 Learn More

### Expand Your System

**Add More Relays**:
- ESP32 supports up to ~16 GPIO pins
- Easy to expand in `config.h`

**Add Features**:
- Temperature sensors
- Energy monitoring
- LCD display
- Physical buttons
- IR remote control

**Integration Ideas**:
- Automate based on time
- Control based on sensors
- Create complex scenes
- Voice control via Alexa/Google
- Mobile app notifications

---

## 🔐 Security Tips

**For Local Network (Current)**:
- ✅ Keep on trusted network only
- ✅ Use strong WiFi password
- ✅ Use MQTT authentication

**For Internet Access**:
- ⚠️ Use VPN (WireGuard, OpenVPN)
- ⚠️ Add web authentication
- ⚠️ Use HTTPS/SSL
- ⚠️ Never expose directly to internet

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
mosquitto_sub -h YOUR_MQTT_IP -t "#" -v

# Check WiFi
ping esp32-relay.local
```

---

## ✅ Setup Checklist

- [ ] Hardware wired correctly
- [ ] Firmware uploaded successfully
- [ ] Filesystem uploaded
- [ ] ESP32 connected to WiFi
- [ ] Web interface accessible
- [ ] Relays respond to web controls
- [ ] MQTT broker configured
- [ ] Home Assistant connected
- [ ] Relays appear in HA
- [ ] HA switches control relays
- [ ] Created first automation

**All checked?** Congratulations! 🎉

---

## 🚀 Next Steps

1. **Create Automations** in Home Assistant
2. **Add to Dashboard** for easy access
3. **Set up Voice Control** via HA
4. **Create Scenes** for multiple relays
5. **Share Your Setup** with the community!

---

## 📸 Show Off Your Build

Built something cool? Share it!
- Take photos of your setup
- Document your use case
- Help others learn

---

## 🎉 You're All Set!

Your ESP32 Relay Controller is now:
- ✅ Fully functional
- ✅ Web accessible
- ✅ Home Assistant integrated
- ✅ MQTT enabled
- ✅ Ready for automation

**Enjoy your smart home! 🏠✨**

---

*Need help? Check TROUBLESHOOTING.md*
*Want to customize? See PROJECT_SUMMARY.md*
*Questions? Read the FAQ in README.md*

**Happy Automating! 🚀**





