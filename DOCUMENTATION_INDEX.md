# Documentation Index

**ESP32 Relay Controller - Complete Documentation Guide**

This index helps you quickly find the documentation you need.

---

## 🚀 Quick Start

**New to this project? Start here:**

1. Read `README.md` - Overview and basic setup
2. Follow `SETUP_GUIDE.md` or `GET_STARTED.md` - Step-by-step installation
3. Check `WIRING.md` - Connect your hardware safely
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
| **FILE_STRUCTURE.txt** | Project organization | Understanding codebase |

### Hardware & Wiring

| Document | Description | When to Read |
|----------|-------------|--------------|
| **WIRING.md** | Wiring diagrams & safety | Before connecting hardware |

### Features & Implementation

| Document | Description | When to Read |
|----------|-------------|--------------|
| **RF_RECEIVER_GUIDE.md** | Complete RF receiver setup | Using RF feature |
| **RF_IMPLEMENTATION_SUMMARY.md** | RF quick reference | RF troubleshooting |
| **WIFI_RECONNECTION.md** | WiFi reconnection logic | Understanding WiFi behavior |
| **EVENT_DRIVEN_WIFI.md** | Event-driven WiFi details | Advanced WiFi info |
| **home_assistant_example.yaml** | Home Assistant config | HA integration |

### Troubleshooting & Fixes

| Document | Description | When to Read |
|----------|-------------|--------------|
| **CHANGELOG.md** ⭐ | **Every issue & fix** | **When you have ANY problem** |
| **TROUBLESHOOTING.md** | General troubleshooting | Common issues |
| **PERFORMANCE_FIX_SUMMARY.md** | Why system was slow | Understanding speed fixes |
| **MQTT_OPTIMIZATION.md** | MQTT performance details | MQTT issues |
| **MDNS_FIX.md** | .local URL not working | mDNS troubleshooting |
| **PC_MDNS_TROUBLESHOOTING.md** | PC-side mDNS setup | .local doesn't work on PC |
| **PERFORMANCE_IMPROVEMENTS.md** | Technical performance | Advanced optimization |

### Project Information

| Document | Description | When to Read |
|----------|-------------|--------------|
| **PROJECT_SUMMARY.md** | High-level overview | Quick project understanding |
| **DOCUMENTATION_INDEX.md** | This file | Finding documentation |

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
**Symptom**: Can't access `http://esp32-relay.local`

➡️ Read: 
1. **MDNS_FIX.md** - ESP32-side fixes
2. **PC_MDNS_TROUBLESHOOTING.md** - PC-side fixes

**Quick Test**: Does it work on your phone? If yes, it's a PC issue.

---

### Issue: Slow Relay Response
**Symptom**: Takes 2-5 seconds to toggle relay

➡️ Read: **PERFORMANCE_FIX_SUMMARY.md**

**Fixed In**: Version 1.4 (current version)

---

### Issue: MQTT Not Connecting
**Symptom**: `rc=-2` errors in serial monitor

➡️ Read: **CHANGELOG.md** → "MQTT Not Connecting to Home Assistant"

**Check**: 
- MQTT broker IP and credentials
- Serial monitor for connection attempts

---

### Issue: Only 13 Relays Showing
**Symptom**: Web interface shows 13 of 16 relays

➡️ Read: **CHANGELOG.md** → "Webpage Showing Only 13 of 16 Relays"

**Fixed In**: Version 1.1+

---

## 📚 Learning Resources

### Want to Understand How It Works?

**Event-Driven WiFi**:
- `EVENT_DRIVEN_WIFI.md` - Non-blocking WiFi implementation
- `WIFI_RECONNECTION.md` - Reconnection strategy

**MQTT Performance**:
- `MQTT_OPTIMIZATION.md` - Why we publish once per boot
- `PERFORMANCE_FIX_SUMMARY.md` - 48x speedup explanation

**mDNS Troubleshooting**:
- `MDNS_FIX.md` - Race condition fix
- `PC_MDNS_TROUBLESHOOTING.md` - Client setup

**RF Receiver**:
- `RF_RECEIVER_GUIDE.md` - Complete walkthrough
- `RF_IMPLEMENTATION_SUMMARY.md` - Quick reference

---

## 🛠️ Development Reference

### Code Organization

```
esp32_rellay/
├── src/
│   ├── main.cpp              - Main firmware logic
│   └── relay_control.cpp     - Relay control class
├── include/
│   ├── config.h              - Hardware configuration
│   └── relay_control.h       - Relay class header
├── data/
│   ├── index.html            - Main control page
│   ├── admin.html            - Admin panel
│   ├── rf_learn.html         - RF learning page
│   ├── style.css             - Global styles
│   └── script.js             - Client-side JS
└── platformio.ini            - Build configuration
```

**See**: `FILE_STRUCTURE.txt` for complete layout

### Common Commands

**See**: `QUICK_REFERENCE.md` for full command list

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

**Total Documentation Files**: 18
- Setup & Getting Started: 5
- Hardware: 1
- Features: 4
- Troubleshooting: 7
- Project Info: 2

**Total Lines of Documentation**: ~10,000+ lines

**Most Important Document**: **CHANGELOG.md** (contains every issue and fix)

---

## 🎯 Recommended Reading Order

### For New Users
1. README.md
2. GET_STARTED.md or SETUP_GUIDE.md
3. WIRING.md
4. QUICK_REFERENCE.md

### For Troubleshooting
1. **CHANGELOG.md** (find your exact issue)
2. TROUBLESHOOTING.md (general solutions)
3. Specific guides based on issue

### For Understanding the System
1. PROJECT_SUMMARY.md (overview)
2. PERFORMANCE_FIX_SUMMARY.md (why it's fast)
3. EVENT_DRIVEN_WIFI.md (WiFi implementation)
4. MQTT_OPTIMIZATION.md (MQTT strategy)

### For RF Feature
1. RF_RECEIVER_GUIDE.md (complete guide)
2. RF_IMPLEMENTATION_SUMMARY.md (quick reference)

---

## 💡 Documentation Tips

**Looking for a specific issue?**
- Check **CHANGELOG.md** first - it lists every problem encountered

**Want quick commands?**
- Go to **QUICK_REFERENCE.md** - one-page command list

**Need to understand why something works a certain way?**
- Check the technical docs: MQTT_OPTIMIZATION.md, EVENT_DRIVEN_WIFI.md, etc.

**Webpage not working?**
- 99% chance you forgot: `pio run --target uploadfs`
- See CHANGELOG.md → "Web Interface Not Loading"

**.local URL not working?**
- Works on phone? → PC needs Bonjour/Avahi (PC_MDNS_TROUBLESHOOTING.md)
- Doesn't work anywhere? → ESP32 issue (MDNS_FIX.md)

---

## 🔍 Search Tips

**Using grep to find information:**
```bash
# Find all mentions of a specific issue
grep -r "webpage not loading" *.md

# Find all references to a command
grep -r "uploadfs" *.md

# Find error messages
grep -r "littlefs" *.md
```

---

## 📝 Document Maintenance

**Last Updated**: October 2025  
**Current Version**: 1.4  
**Documentation Status**: ✅ Complete and up-to-date

**All issues encountered are documented in**: **CHANGELOG.md**

---

## 🌟 Most Valuable Documents

If you could only read 5 documents, read these:

1. ⭐⭐⭐ **CHANGELOG.md** - Every problem and solution
2. ⭐⭐⭐ **README.md** - Essential overview
3. ⭐⭐ **QUICK_REFERENCE.md** - Common commands
4. ⭐⭐ **TROUBLESHOOTING.md** - General solutions
5. ⭐ **PERFORMANCE_FIX_SUMMARY.md** - Why it's optimized

---

## 📞 Still Can't Find What You Need?

1. Search CHANGELOG.md for your exact error message
2. Check serial monitor output and search for that in docs
3. Review the troubleshooting section in README.md
4. Check if your issue matches any in TROUBLESHOOTING.md

**Remember**: Almost every issue has been encountered and documented. The solution is probably already written!

---

**Happy Building! 🚀**

