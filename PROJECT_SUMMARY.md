# ESP32 RF-to-MQTT Bridge - Project Summary

## 📋 Project Overview

A complete ESP32-based RF-to-MQTT bridge that captures 433MHz RF signals and publishes them to Home Assistant via MQTT. This project allows you to integrate RF remotes, doorbells, sensors, and other 433MHz devices into your smart home automation system.

---

## ✨ Key Features

### Core Functionality
- ✅ **433MHz RF Reception**: SYN480R receiver with multi-code learning
- ✅ **WiFi Manager**: Captive portal for WiFi credentials (no hardcoding)
- ✅ **Web Interface**: Modern, responsive UI with real-time updates
- ✅ **mDNS Support**: Access via `http://esp32-rf.local`
- ✅ **MQTT Integration**: Full Home Assistant auto-discovery
- ✅ **REST API**: JSON API for external control
- ✅ **Persistent Config**: Settings and RF codes saved across reboots

### Home Assistant Integration
- ✅ **Auto-Discovery**: RF triggers appear automatically in HA
- ✅ **Binary Sensors**: Each RF code creates a motion-type sensor
- ✅ **Auto-Off**: Triggers reset after 2 seconds (configurable)
- ✅ **Device Grouping**: All RF codes grouped under one device

### User Experience
- ✅ **Mobile Responsive**: Works on phones, tablets, desktops
- ✅ **Dark Theme**: Modern, easy-on-eyes interface
- ✅ **Visual Feedback**: Real-time RF signal detection
- ✅ **Status Indicators**: WiFi, MQTT, RF status
- ✅ **Easy Reset**: Reconfigure via web interface

---

## 📁 Project Structure

```
esp32_rellay/
│
├── 📂 include/                    # Header files
│   └── config.h                   # Main configuration (GPIO, names, settings)
│
├── 📂 src/                        # Source code
│   └── main.cpp                   # Main program (WiFi, MQTT, RF, Web Server)
│
├── 📂 data/                       # Web interface files (upload to LittleFS)
│   ├── index.html                 # Main HTML page
│   ├── rf_manager.html            # RF learning interface
│   ├── admin.html                 # Admin configuration panel
│   ├── style.css                  # Styling
│   └── script.js                  # JavaScript logic
│
├── 📄 platformio.ini              # PlatformIO configuration
├── 📄 .gitignore                  # Git ignore rules
│
├── 📚 Documentation
│   ├── README.md                  # Complete documentation
│   ├── SETUP_GUIDE.md            # Step-by-step setup guide
│   ├── TROUBLESHOOTING.md        # Problem-solving guide
│   ├── WIRING.md                 # Hardware wiring guide
│   ├── QUICK_REFERENCE.md        # Quick reference card
│   ├── PROJECT_SUMMARY.md        # This file
│   ├── RF_RECEIVER_GUIDE.md      # Complete RF guide
│   └── home_assistant_example.yaml # HA configuration examples
```

---

## 🔧 Technical Stack

### Hardware
- **MCU**: ESP32 (any variant)
- **RF Receiver**: SYN480R 433MHz module
- **Power**: 5V USB
- **Connectivity**: WiFi 2.4GHz

### Software Framework
- **Platform**: PlatformIO
- **Framework**: Arduino
- **Language**: C++ (backend), JavaScript (frontend)

### Key Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| WiFiManager | 2.0.17 | WiFi configuration portal |
| PubSubClient | 2.8 | MQTT communication |
| ArduinoJson | 6.21.5 | JSON parsing |
| ESPAsyncWebServer | 1.2.4 | Async web server |
| AsyncTCP | 1.1.1 | Async TCP connections |
| RCSwitch | 2.6.4 | RF receiver support |

---

## 🏗️ Architecture

### System Flow

```
┌─────────────┐
│   ESP32     │
│   Boots     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ WiFi Saved? │────>│ Start AP     │
│     No      │     │ Captive      │
└─────────────┘     │ Portal       │
       │            └──────────────┘
       │ Yes               │
       ▼                   │ Configure
┌─────────────┐            │
│ Connect to  │◄───────────┘
│ WiFi        │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Start mDNS  │
│ Start MQTT  │
│ Start Web   │
│ Start RF    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│                Main Loop                     │
├─────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────────┐  │
│ │ Check   │  │ Check   │  │ Handle      │  │
│ │ WiFi    │  │ MQTT    │  │ Web Server  │  │
│ └─────────┘  └─────────┘  └─────────────┘  │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │         Check RF Signal                 │ │
│ │  (Interrupt-based via RCSwitch)         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
       │
       ▼ (when RF signal detected)
┌─────────────────────────────────────────────┐
│           Publish to MQTT                    │
│    Topic: homeassistant/switch/esp32-rf/    │
│           rf_X/state → "ON"                  │
│           (then "OFF" after 2 seconds)       │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│            Home Assistant                    │
│    Binary sensor state changes              │
│    Automation triggers fire                  │
└─────────────────────────────────────────────┘
```

### Communication Protocols

**Web Interface** → ESP32:
- HTTP/REST API (JSON)
- Status polling (every 2s)

**ESP32** → Home Assistant:
- MQTT state updates
- Topics: `homeassistant/switch/esp32-rf/rf_X/state`
- MQTT discovery (on boot)

---

## 🎯 Use Cases

### Smart Home Integration
- **Doorbell Alerts**: RF doorbell → HA notification
- **Remote Controls**: RF remote → Scene activation
- **Panic Buttons**: RF key fob → Emergency alerts
- **Motion Sensors**: RF PIR → Lighting automation

### Practical Applications
- **Elderly Care**: RF pendant → Alert system
- **Garage Monitor**: Learn opener signal → Track events
- **Access Control**: RF key fob → Log entries
- **Environmental**: RF sensors → HA monitoring

---

## 🔒 Security Considerations

### Current Implementation
- ✅ WPA2 WiFi encryption
- ✅ Local network only (no internet exposure)
- ⚠️ RF signals are NOT encrypted
- ⚠️ Basic web authentication for admin

### Important Notes
- RF 433MHz is inherently insecure
- Don't use for critical security functions
- Anyone with same frequency transmitter can trigger
- Suitable for convenience, not security

---

## 📊 Performance Specs

### Resource Usage
- **Flash**: ~600KB (code + libraries)
- **LittleFS**: ~50KB (web files)
- **RAM**: ~60KB runtime
- **WiFi**: 2.4GHz 802.11 b/g/n

### Response Times
- **RF Detection**: <10ms (interrupt-based)
- **Web UI Update**: 2s polling interval
- **MQTT Publish**: <100ms
- **WiFi Reconnect**: 5-20s

### Limitations
- **Max RF Codes**: 10 (configurable)
- **Network**: 2.4GHz WiFi only
- **Range**: Depends on RF module/antenna
- **Concurrent Users**: ~4-5 web clients

---

## 🚀 Getting Started (Quick)

### Prerequisites
```bash
# Install PlatformIO
pip install platformio

# Or use VS Code extension
```

### Upload & Run
```bash
# Navigate to project
cd esp32_rellay

# Upload web files
pio run --target uploadfs

# Upload code
pio run --target upload

# Monitor
pio device monitor
```

### Configure
1. Connect to `ESP32-RF-Setup` WiFi
2. Enter credentials in portal
3. Access at `http://esp32-rf.local`
4. Go to RF Manager to learn codes

---

## 🔧 Customization Guide

### Change RF Pin
```cpp
// include/config.h
#define RF_RECEIVER_PIN 22  // Change GPIO
```

### Change Trigger Duration
```cpp
// include/config.h
#define RF_TRIGGER_DURATION 5000  // 5 seconds
```

### Modify Web Theme
```css
/* data/style.css */
:root {
    --primary-color: #FF5722;  /* Orange theme */
}
```

---

## 📈 Future Enhancements

### Potential Features
- [ ] OTA (Over-The-Air) firmware updates
- [ ] RF transmitter support (send RF signals)
- [ ] Code rolling/security code support
- [ ] Multiple receiver support
- [ ] Telegram bot integration
- [ ] Local logging to SD card

---

## 🐛 Known Issues

### Minor Issues
1. **mDNS on Android**: Some devices don't support .local (use IP)
2. **WiFi Reconnect**: May take 5-20 seconds after router restart

### Workarounds Included
- ✅ IP fallback for mDNS
- ✅ Auto-reconnect for WiFi & MQTT
- ✅ Retained messages for state persistence

---

## 📚 Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **README.md** | Complete documentation | Overview & reference |
| **SETUP_GUIDE.md** | Step-by-step setup | First-time setup |
| **WIRING.md** | Hardware connections | Before wiring |
| **RF_RECEIVER_GUIDE.md** | RF details | Understanding RF |
| **TROUBLESHOOTING.md** | Problem solving | When issues occur |
| **QUICK_REFERENCE.md** | Quick lookup | Daily use |

---

## 🎓 Learning Outcomes

By using this project, you'll learn:

### ESP32 Development
- WiFi management
- mDNS/Bonjour
- Async web servers
- LittleFS filesystem
- Interrupt-based RF reception

### IoT & Networking
- MQTT protocol
- REST API design
- JSON communication
- Captive portals

### Home Automation
- Home Assistant integration
- MQTT discovery
- Binary sensors
- Automation triggers

---

## 📄 License

This project is open source and free to use, modify, and distribute.

---

## 🙏 Acknowledgments

### Libraries Used
- **WiFiManager** by tzapu
- **PubSubClient** by knolleary
- **ArduinoJson** by Benoit Blanchon
- **ESPAsyncWebServer** by me-no-dev
- **RCSwitch** by sui77

### Inspired By
- Home Assistant community
- ESP32 Arduino community
- Open-source smart home projects

---

**Happy Building! 🚀**

*Last Updated: 2025*
*Version: 2.0.0*
