# Documentation Index

**ESP32 RF-to-MQTT Bridge - Complete Documentation Guide**

This index helps you quickly find the documentation you need.

---

## 🚀 Quick Start

**New to this project? Start here:**

1. Read `README.md` - Overview and basic setup
2. Follow `SETUP_GUIDE.md` or `GET_STARTED.md` - Step-by-step installation
3. Check `WIRING.md` - Connect your RF receiver
4. Reference `QUICK_REFERENCE.md` - Common commands

---

## 📖 Documentation by Category

### Getting Started & Setup

| Document | Description | When to Read |
|----------|-------------|--------------|
| **README.md** | Main project documentation | First time, overview |
| **GET_STARTED.md** | Beginner-friendly setup guide | New users |
| **SETUP_GUIDE.md** | Detailed installation steps | Complete setup |
| **QUICK_REFERENCE.md** | Command cheat sheet | Quick lookups |

### Hardware & Wiring

| Document | Description | When to Read |
|----------|-------------|--------------|
| **WIRING.md** | RF receiver wiring & antenna | Before connecting hardware |

### Features & Implementation

| Document | Description | When to Read |
|----------|-------------|--------------|
| **RF_RECEIVER_GUIDE.md** | Complete RF receiver setup | Using RF feature |
| **RF_IMPLEMENTATION_SUMMARY.md** | RF quick reference | RF troubleshooting |
| **WIFI_RECONNECTION.md** | WiFi reconnection logic | Understanding WiFi behavior |
| **home_assistant_example.yaml** | Home Assistant config | HA integration |

### Troubleshooting & Fixes

| Document | Description | When to Read |
|----------|-------------|--------------|
| **CHANGELOG.md** ⭐ | **Every issue & fix** | **When you have ANY problem** |
| **TROUBLESHOOTING.md** | General troubleshooting | Common issues |
| **MDNS_FIX.md** | .local URL not working | mDNS troubleshooting |

### Project Information

| Document | Description | When to Read |
|----------|-------------|--------------|
| **PROJECT_SUMMARY.md** | High-level overview | Quick project understanding |
| **DOCUMENTATION_INDEX.md** | This file | Finding documentation |
| **userguide.md** | User guide | Daily operation |

---

## 🔥 Problem? Start Here!

### Issue: Webpage Not Loading
**Error**: `/littlefs/index.html does not exist`

➡️ Read: **CHANGELOG.md** → "Web Interface Not Loading"

**Quick Fix**:
```bash
pio run --target uploadfs
```

---

### Issue: .local URL Not Working
**Symptom**: Can't access `http://esp32-rf.local`

➡️ Read: **MDNS_FIX.md**

**Quick Test**: Does it work on your phone? If yes, it's a PC issue (needs Bonjour).

---

### Issue: RF Code Not Capturing
**Symptom**: Learning mode times out

➡️ Read: **RF_RECEIVER_GUIDE.md** → Troubleshooting

**Quick Fixes**:
- Check wiring (DATA to GPIO 22)
- Use 5V power for receiver
- Move transmitter closer

---

### Issue: MQTT Not Connecting
**Symptom**: `rc=-2` errors in serial monitor

➡️ Read: **TROUBLESHOOTING.md** → MQTT Issues

**Check**: 
- MQTT broker IP and credentials
- Serial monitor for connection attempts

---

### Issue: RF Trigger Not in Home Assistant
**Symptom**: No binary sensor appears

➡️ Read: **RF_RECEIVER_GUIDE.md** → Home Assistant Integration

**Fixes**:
- Learn at least one RF code first
- Check MQTT connection
- Restart Home Assistant

---

## 📚 Learning Resources

### Want to Understand How It Works?

**RF Reception**:
- `RF_RECEIVER_GUIDE.md` - Complete RF walkthrough
- `RF_IMPLEMENTATION_SUMMARY.md` - Technical details

**WiFi & Network**:
- `WIFI_RECONNECTION.md` - Reconnection strategy
- `MDNS_FIX.md` - mDNS implementation

**Home Assistant**:
- `home_assistant_example.yaml` - Configuration examples
- `README.md` - MQTT topics and discovery

---

## 🛠️ Development Reference

### Code Organization

```
esp32_rellay/
├── src/
│   └── main.cpp              - Main firmware logic
├── include/
│   └── config.h              - Hardware configuration
├── data/
│   ├── index.html            - Main page
│   ├── rf_manager.html       - RF learning page
│   ├── admin.html            - Admin panel
│   ├── style.css             - Global styles
│   └── script.js             - Client-side JS
└── platformio.ini            - Build configuration
```

### Common Commands

```bash
# Upload web files
pio run --target uploadfs

# Upload firmware
pio run --target upload

# Monitor serial
pio device monitor --baud 115200

# Clean build
pio run --target clean
```

---

## 📊 Document Statistics

**Total Documentation Files**: 12
- Setup & Getting Started: 4
- Hardware: 1
- Features: 3
- Troubleshooting: 3
- Project Info: 3

**Most Important Document**: **CHANGELOG.md** (contains every issue and fix)

---

## 🎯 Recommended Reading Order

### For New Users
1. README.md
2. GET_STARTED.md or SETUP_GUIDE.md
3. WIRING.md
4. RF_RECEIVER_GUIDE.md
5. QUICK_REFERENCE.md

### For Troubleshooting
1. **CHANGELOG.md** (find your exact issue)
2. TROUBLESHOOTING.md (general solutions)
3. Specific guides based on issue

### For Understanding the System
1. PROJECT_SUMMARY.md (overview)
2. RF_RECEIVER_GUIDE.md (RF details)
3. WIFI_RECONNECTION.md (WiFi implementation)

---

## 💡 Documentation Tips

**Looking for a specific issue?**
- Check **CHANGELOG.md** first - it lists every problem encountered

**Want quick commands?**
- Go to **QUICK_REFERENCE.md** - one-page command list

**RF not working?**
- Check wiring first (WIRING.md)
- Then RF_RECEIVER_GUIDE.md troubleshooting

**Webpage not working?**
- 99% chance you forgot: `pio run --target uploadfs`
- See CHANGELOG.md → "Web Interface Not Loading"

**.local URL not working?**
- Works on phone? → PC needs Bonjour/Avahi
- Doesn't work anywhere? → Check MDNS_FIX.md

---

## 🌟 Most Valuable Documents

If you could only read 5 documents, read these:

1. ⭐⭐⭐ **CHANGELOG.md** - Every problem and solution
2. ⭐⭐⭐ **README.md** - Essential overview
3. ⭐⭐ **RF_RECEIVER_GUIDE.md** - RF setup details
4. ⭐⭐ **QUICK_REFERENCE.md** - Common commands
5. ⭐ **TROUBLESHOOTING.md** - General solutions

---

## 📞 Still Can't Find What You Need?

1. Search CHANGELOG.md for your exact error message
2. Check serial monitor output and search for that in docs
3. Review the troubleshooting section in README.md
4. Check if your issue matches any in TROUBLESHOOTING.md

**Remember**: Almost every issue has been encountered and documented. The solution is probably already written!

---

**Happy Building! 🚀**
