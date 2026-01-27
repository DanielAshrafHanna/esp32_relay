# Changelog - ESP32 RF-to-MQTT Bridge

This document tracks all versions, features, and fixes.

---

## Version 2.0.0 - RF-to-MQTT Bridge (Current)

### 🚀 Major Release - Complete Refactor

This version transforms the project from a relay controller to a dedicated RF-to-MQTT bridge.

### New Features

#### 1. ✅ RF-Only Design
- Removed all relay-related functionality
- Dedicated RF signal reception and MQTT publishing
- Streamlined codebase for RF operations only

#### 2. ✅ Multi-Code RF Learning
- Support for up to **10 RF codes** (configurable)
- Each code has a custom name
- Each code creates a separate Home Assistant binary sensor
- Persistent storage (survives reboots)

#### 3. ✅ Enhanced RF Manager Web Interface
- Learn new codes with custom names
- View all learned codes with details
- Delete individual codes
- Real-time learning status

#### 4. ✅ Updated Configuration
- Device name: `ESP32-RF-Bridge`
- AP name: `ESP32-RF-Setup`
- mDNS hostname: `esp32-rf`
- Preferences namespace: `rf-bridge`

### Changes from v1.x

#### Removed
- All relay control functionality
- Relay GPIO configurations
- Relay MQTT topics and discovery
- Relay web interface elements
- `relay_control.cpp` and `relay_control.h` files

#### Modified
- `main.cpp` - Complete RF-focused refactor
- `config.h` - Removed relay definitions
- `README.md` - Updated for RF-only device
- All documentation updated

#### Files Modified
- `src/main.cpp`
- `include/config.h`
- `data/index.html`
- All `.md` documentation files

---

## Version 1.4.1 - Stability Improvements

### Improvements

#### 1. ⚡ Disabled ESP32 Auto-Reconnect
- Prevents conflicts with custom reconnection logic
- More predictable WiFi behavior

#### 2. ⚡ Added Watchdog Feed During MQTT Operations
- Added `yield()` before/after `mqttClient.connect()`
- Prevents watchdog resets during long MQTT connection attempts
- Improved stability under weak WiFi conditions

---

## Version 1.4.0 - Safety & Uptime

### Features Added

#### 1. ✅ Removed ESP.restart() on WiFi Failure
- **Problem**: ESP32 rebooting when WiFi failed caused relay clicks
- **Solution**: Enter AP mode instead of rebooting
- **Benefit**: Critical for safety-sensitive applications

#### 2. ✅ Added Uptime Display
- Shows time since last reboot on webpage
- Available via `/api/wifi` endpoint

#### 3. ✅ Background WiFi Reconnection
- Continues trying to reconnect every 60 seconds in AP mode
- Non-blocking operation

---

## Version 1.3.0 - Smart Reconnection System

### Features Added

#### 1. ✅ Smart WiFi Reconnection
- **Fast phase**: 6 attempts, 10 seconds apart
- **AP mode fallback**: After fast phase fails
- **Slow phase**: 60-second intervals in AP mode
- **AP client protection**: Pauses when user is connected

#### 2. ✅ Smart MQTT Reconnection
- **Exponential backoff**: 10s → 30s → 60s → 5min
- **Credential error detection**: Stops retrying on auth failures
- **Detailed logging**: Error codes explained

#### 3. ✅ WiFiManager MQTT Fix
- Fixed MQTT credentials not saving from captive portal
- Added hostname field to configuration
- Proper save callback implementation

---

## Version 1.2.0 - Enhanced Configuration

### Features Added

#### 1. ✅ Password-Protected Admin Panel
- URL: `/solaceadmin`
- Configure MQTT settings
- Manage device configuration

#### 2. ✅ State Persistence
- Settings saved to NVS
- Survives reboots

---

## Version 1.1.0 - Home Assistant Integration

### Features Added

#### 1. ✅ MQTT Auto-Discovery
- Automatic entity creation in Home Assistant
- Device grouping
- Availability tracking

#### 2. ✅ Smart WiFi with AP Fallback
- Event-driven WiFi management
- Automatic AP mode on failure

---

## Version 1.0.0 - Initial Release

### Features
- WiFi configuration portal
- Basic web interface
- MQTT integration
- mDNS support

---

## Common Issues & Solutions Summary

### 🔴 Issue: Webpage Not Loading
**Error**: `/littlefs/index.html does not exist`

**Quick Fix**:
```bash
pio run --target uploadfs
```

### 🔴 Issue: .local URL Not Working
**Symptoms**: Works on phone, not on PC

**Quick Fix**:
- **Mac**: `sudo killall -HUP mDNSResponder`
- **Windows**: Install Bonjour
- **Alternative**: Use IP address instead

### 🔴 Issue: RF Code Not Capturing
**Symptoms**: Learning mode times out

**Quick Fix**:
- Check wiring (DATA to GPIO 22)
- Use 5V power for receiver
- Move transmitter closer
- Try different buttons

### 🔴 Issue: MQTT Not Connecting
**Symptoms**: `rc=-2` errors in serial

**Quick Fix**:
- Verify broker IP and credentials
- Check broker is running
- Verify firewall allows port 1883

---

## Best Practices

1. **Always use two-step upload**: Filesystem first, then firmware
2. **Non-blocking code**: Use `yield()` in loops
3. **Proper antenna**: 17.3cm wire for 433MHz
4. **5V power**: Better RF sensitivity than 3.3V
5. **Documentation**: Keep changelog updated

---

## Files Organization

### Core Code
- `src/main.cpp` - Main firmware logic
- `include/config.h` - Hardware configuration

### Web Interface
- `data/index.html` - Main page
- `data/rf_manager.html` - RF learning interface
- `data/admin.html` - Admin panel
- `data/style.css` - Styling
- `data/script.js` - JavaScript

### Documentation
- `README.md` - Main documentation
- `CHANGELOG.md` - This file
- `SETUP_GUIDE.md` - Setup instructions
- `TROUBLESHOOTING.md` - Problem solving
- `RF_RECEIVER_GUIDE.md` - RF details
- `WIRING.md` - Hardware connections

---

## Current Version Stats

**Version**: 2.0.0
**Lines of Code**: ~1,100 (main.cpp)
**RAM Usage**: ~15% (49KB / 320KB)
**Flash Usage**: ~65%
**RF Codes Supported**: 10
**Web Files**: 5 HTML/CSS/JS files
**Documentation Files**: 12 markdown files

---

## Migration Notes

### From v1.x to v2.0.0
- This is a complete functional change
- All relay code has been removed
- Preferences namespace changed to `rf-bridge`
- Device/AP/mDNS names changed
- **Note**: Use `rf-module` branch for this version

---

**End of Changelog**

*For current documentation, see README.md*
*For troubleshooting, see TROUBLESHOOTING.md*
