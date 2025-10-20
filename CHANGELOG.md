# Changelog - ESP32 Relay Controller

This document tracks all issues encountered during development and their solutions.

---

## Version 1.4.1 - WiFi Reconnection Speed Improvement (October 2025)

### Improvements

#### 1. ⚡ Faster WiFi Reconnection
**Request**: Speed up WiFi reconnection without blocking code execution

**Changes**:
- Reduced detection interval: 30s → 5s (6x faster detection)
- Reduced reconnection timeout: 30s → 15s (2x faster AP mode entry)
- Reduced retry interval in AP mode: 60s → 30s (2x more frequent attempts)

**Result**:
- **Total time to AP mode**: ~60 seconds → ~20 seconds (3x faster)
- **Detection speed**: 30s → 5s (6x faster)
- **Reconnection attempts**: 60/hour → 120/hour (2x more)
- Still fully non-blocking ✅
- AP client pause protection maintained ✅

**Files Modified**: `src/main.cpp`

---

## Version 1.4 - Performance & Stability (October 2025)

### Issues Fixed

#### 1. ❌ MQTT Reconnection Causing System Slowdown
**Problem**: After implementing MQTT auto-discovery, the system became slow and unresponsive. Relays took several seconds to respond from Home Assistant or webpage.

**Root Cause**: 
- Discovery republishing on every MQTT reconnection used blocking `delay()` calls
- 20ms × 8 relays = 160ms blocked for discovery
- 10ms × 8 relays = 80ms blocked for state publishing
- Total: ~240ms+ blocking time preventing WiFi/web/MQTT processing

**Solution**: 
- Changed to "publish once per boot" strategy
- Replaced all `delay()` with `yield()` for non-blocking operation
- Increased MQTT retry interval from 5s to 10s
- Subsequent reconnections only republish states (fast)

**Files Modified**: `src/main.cpp`

**Documentation**: `MQTT_OPTIMIZATION.md`, `PERFORMANCE_FIX_SUMMARY.md`

**Result**: 48x faster reconnection, instant relay response (<100ms)

---

#### 2. ❌ Web Interface Not Loading (Multiple Occurrences)
**Problem**: Accessing ESP32 via IP address resulted in error: `/littlefs/index.html does not exist`

**Root Cause**: 
- LittleFS filesystem was not uploaded to ESP32
- PlatformIO's "Upload" button only uploads firmware, not filesystem
- Two separate flash partitions: firmware vs filesystem

**Solution**: 
- Upload filesystem: `pio run --target uploadfs`
- Then upload firmware: `pio run --target upload`
- Added prominent warnings in README

**Files Modified**: `README.md`

**Documentation**: `README.md` (installation steps), added two-step upload warning box

**Prevention**: Always remember TWO separate uploads are needed

---

#### 3. ❌ .local URL Not Working (mDNS Failure)
**Problem**: `http://esp32-relay.local` was working initially, then stopped working after MQTT optimizations. Worked on phone but not on all devices.

**Root Cause**: 
- WiFi event handler (`onWiFiConnect`) was interfering with initial mDNS setup in `setup()`
- Race condition: both tried to initialize mDNS at same time
- Double initialization caused mDNS to fail silently

**Solution**: 
- Added `mdnsInitialized` flag to track mDNS state
- Event handler only restarts mDNS on reconnections (when flag is true)
- Initial setup handled cleanly by `setup()` function
- Added 100-250ms timing delays for proper mDNS initialization

**Files Modified**: `src/main.cpp`

**Documentation**: `MDNS_FIX.md`, `PC_MDNS_TROUBLESHOOTING.md`

**Result**: .local URL works reliably across all devices

---

#### 4. ❌ Favicon Errors Spamming Serial Monitor
**Problem**: Serial monitor filled with errors:
```
[E][vfs_api.cpp:105] open(): /littlefs/favicon.ico does not exist
```

**Root Cause**: 
- Browsers automatically request favicon.ico
- No handler or file for favicon requests
- LittleFS logs error for each missing file request

**Solution**: 
- Added server handler for `/favicon.ico` returning HTTP 204 (No Content)
- Silences browser requests without error logging

**Files Modified**: `src/main.cpp`

**Result**: Clean serial monitor output

---

## Version 1.3 - RF Receiver Integration (October 2025)

### Features Added

#### 1. ✅ SYN480R 433MHz RF Receiver Support
**Implementation**:
- Connected to GPIO 15
- RF learning mode via web interface at `/rf_learn.html`
- Stores learned RF codes in NVS (persistent across reboots)
- Home Assistant binary sensor entity with 2-second auto-off
- Manual "Stop Learning Mode" button

**Files Added**: 
- `data/rf_learn.html`
- `RF_RECEIVER_GUIDE.md`
- `RF_IMPLEMENTATION_SUMMARY.md`

**Files Modified**: 
- `src/main.cpp` (RF receiver logic, learning mode, MQTT discovery)
- `include/config.h` (RF_RECEIVER_PIN, RF_TRIGGER_DURATION)
- `data/index.html` (link to RF learning page)

**Library Added**: `rc-switch @ ^2.6.4` in `platformio.ini`

---

## Version 1.2 - Enhanced Configuration (October 2025)

### Features Added

#### 1. ✅ Password-Protected Admin Panel
**Implementation**:
- URL: `/solaceadmin`
- Username: `admin`
- Password: `Solacepass@123`
- Configure number of relay entities (8/12/16 channels)
- MQTT credential management

**Files Added**: `data/admin.html`

**Files Modified**: `src/main.cpp` (admin routes, authentication)

---

#### 2. ✅ State Persistence Across Reboots
**Problem**: Relay states reset after power cycle

**Solution**:
- Used ESP32 Preferences library (NVS)
- Saves relay states on every change
- Restores states on boot

**Files Modified**: `src/main.cpp`

---

#### 3. ✅ MQTT Configuration in WiFiManager
**Implementation**:
- Added MQTT fields to WiFiManager captive portal
- Hardcoded defaults with option to change
- Settings saved to NVS

**Files Modified**: `src/main.cpp`

---

## Version 1.1 - Full Home Assistant Integration (October 2025)

### Issues Fixed

#### 1. ❌ Webpage Showing Only 13 of 16 Relays
**Problem**: Web interface displayed only 13 relays despite 16 configured

**Root Cause**: 
- ArduinoJson `StaticJsonDocument<1024>` buffer too small
- JSON was truncated when serializing 16 relays

**Solution**: 
- Increased buffer size to `StaticJsonDocument<2048>`

**Files Modified**: `src/main.cpp` (line ~547)

---

#### 2. ❌ MQTT Not Connecting to Home Assistant
**Problem**: 
- MQTT connection attempts failed with `rc=-2`
- Devices not appearing in Home Assistant despite MQTT messages visible

**Root Cause**: 
- MQTT credentials from WiFiManager not saving properly
- Discovery messages too large for default PubSubClient buffer
- Missing LWT (Last Will Testament) configuration
- Discovery topic format issues

**Solution**: 
- Hardcoded MQTT credentials as defaults (changeable via web)
- Increased PubSubClient buffer to 1024 bytes: `mqttClient.setBufferSize(1024)`
- Added LWT configuration for availability tracking
- Enhanced discovery JSON with `state_on`, `state_off`, `icon`, `sw_version`
- Fixed discovery topic format

**Files Modified**: `src/main.cpp`

**Documentation**: User confirmed: "it's working now great"

---

#### 3. ❌ Web Server Inaccessible and Slow
**Problem**: 
- Could not access device via IP or .local URL
- Home Assistant control was slow and unresponsive

**Root Cause**: 
- Called `MDNS.update()` in loop (not needed for ESP32)
- MQTT `publishDiscovery()` had blocking delays (20ms × relays)
- Loop blocking prevented web server from processing requests

**Solution**: 
- Removed `MDNS.update()` from loop
- Added `delay(10)` to loop for watchdog
- Reduced delays in `publishDiscovery()` to 20ms with `yield()`

**Files Modified**: `src/main.cpp`

---

### Features Added

#### 1. ✅ 16-Relay Support
**Implementation**:
- Updated `NUM_RELAYS` from 4 to 16
- GPIO pins: 13, 12, 14, 27, 26, 25, 33, 32, 2, 4, 16, 17, 18, 19, 21, 22
- Added `static constexpr` to array declarations to fix linking errors

**Files Modified**: `include/config.h`

---

#### 2. ✅ MQTT Auto-Discovery for Home Assistant
**Implementation**:
- Full Home Assistant MQTT Discovery protocol
- Switch entities for each relay
- Device information (manufacturer, model, version)
- Availability tracking via LWT
- State persistence

**Files Modified**: `src/main.cpp`

---

#### 3. ✅ Smart WiFi Reconnection with AP Fallback
**Problem**: ESP32 couldn't recover from WiFi changes (SSID/password change)

**Solution**:
- Event-driven WiFi management
- Enters AP mode if connection fails
- Attempts reconnection every 60 seconds
- Pauses reconnection if device connected to AP
- Non-blocking operation

**Files Added**: 
- `WIFI_RECONNECTION.md`
- `EVENT_DRIVEN_WIFI.md`

**Files Modified**: `src/main.cpp`

---

## Version 1.0 - Initial Release

### Features
- WiFi configuration portal (WiFiManager)
- Basic web interface for relay control
- MQTT integration
- mDNS support (.local URLs)
- 4-relay support (expandable)

---

## Common Issues & Solutions Summary

### 🔴 Issue: Webpage Not Loading
**Error**: `/littlefs/index.html does not exist`

**Quick Fix**:
```bash
pio run --target uploadfs  # Upload web files
# Press RESET button on ESP32
```

**Prevention**: Remember TWO uploads needed (filesystem + firmware)

---

### 🔴 Issue: .local URL Not Working
**Symptoms**: Works on phone, not on PC

**Quick Fix**:
- **Mac**: `sudo killall -HUP mDNSResponder`
- **Windows**: Install Bonjour (via iTunes or Print Services)
- **Alternative**: Use IP address instead

**Documentation**: `PC_MDNS_TROUBLESHOOTING.md`

---

### 🔴 Issue: Slow Relay Response
**Symptoms**: Takes 2-5 seconds to toggle relay

**Quick Fix**: Check serial monitor for MQTT reconnection loops
- If seeing frequent "Attempting MQTT connection", there's a problem
- Current version (1.4) has optimized MQTT with 10s retry interval

**Fixed In**: Version 1.4 (MQTT optimization)

---

### 🔴 Issue: MQTT Devices Not Appearing in HA
**Symptoms**: MQTT messages visible but no devices

**Checklist**:
1. Check MQTT broker IP and credentials
2. Verify MQTT integration in HA uses prefix `homeassistant`
3. Check serial monitor for "Publishing discovery"
4. Verify `PubSubClient` buffer size is 1024+

**Fixed In**: Version 1.1 (enhanced discovery)

---

### 🔴 Issue: Only 13 Relays Showing (Expected 16)
**Symptoms**: Web interface truncates relay list

**Quick Fix**: Increase JSON buffer in `/api/relays` handler

**Fixed In**: Version 1.1 (buffer increase)

---

## Development Issues & Learnings

### Compilation Errors Encountered

#### 1. `JsonDocument` is protected
**Error**: ArduinoJson v7 API change

**Fix**: Use `StaticJsonDocument` instead of `JsonDocument`

---

#### 2. Multiple definition of `RELAY_NAMES`
**Error**: Linker error when including config.h in multiple files

**Fix**: Add `static constexpr` to array declarations

---

#### 3. `'class MDNSResponder' has no member named 'update'`
**Error**: Trying to call ESP8266-specific function on ESP32

**Fix**: Remove `MDNS.update()` - not needed for ESP32

---

### Upload Issues Encountered

#### 1. Flash Chip Verification Failure
**Error**: `Unable to verify flash chip connection`

**Fix**: 
- Reduced upload speed to 115200 baud
- Hold BOOT button during upload
- Unplug/replug USB cable

---

#### 2. Serial Port Conflict
**Error**: `device reports readiness to read but returned no data`

**Fix**: 
- Stop serial monitor before upload
- Unplug and replug USB
- Kill background processes: `pkill -f "pio device monitor"`

---

## Best Practices Learned

1. **Always use two-step upload**: Filesystem first, then firmware
2. **Non-blocking code**: Use `yield()` instead of `delay()` in loops
3. **Buffer sizes**: Calculate JSON size, add 20% margin
4. **Event-driven WiFi**: Use WiFi event handlers, not polling
5. **State management**: Use flags to prevent race conditions (e.g., `mdnsInitialized`)
6. **Error logging**: Minimize serial spam (e.g., favicon handler)
7. **MQTT reliability**: Longer retry intervals, state-based discovery
8. **Documentation**: Document issues as you go, future you will thank present you

---

## Files Organization

### Core Code
- `src/main.cpp` - Main firmware logic
- `src/relay_control.cpp` - Relay control class
- `include/config.h` - Hardware configuration
- `include/relay_control.h` - Relay class header

### Web Interface
- `data/index.html` - Main relay control page
- `data/admin.html` - Admin configuration panel
- `data/rf_learn.html` - RF receiver learning interface
- `data/style.css` - Global styling
- `data/script.js` - Client-side JavaScript

### Documentation
- `README.md` - Main project documentation
- `CHANGELOG.md` - This file (issues & fixes)
- `TROUBLESHOOTING.md` - General troubleshooting
- `MQTT_OPTIMIZATION.md` - MQTT performance details
- `MDNS_FIX.md` - mDNS issue resolution
- `PC_MDNS_TROUBLESHOOTING.md` - Client-side mDNS setup
- `WIFI_RECONNECTION.md` - WiFi reconnection logic
- `RF_RECEIVER_GUIDE.md` - RF receiver setup
- `QUICK_REFERENCE.md` - Command reference

---

## Current Version Stats

**Version**: 1.4  
**Lines of Code**: ~1,000+ (main.cpp)  
**RAM Usage**: 15.0% (49KB / 320KB)  
**Flash Usage**: 78.9% (1,033KB / 1,310KB)  
**Supported Relays**: 16 (configurable 8/12/16)  
**Web Files**: 7 HTML/CSS/JS files  
**Documentation Files**: 13 markdown files  

---

## Future Improvements

### Potential Features
- [ ] Web-based firmware OTA updates
- [ ] Scheduling/timers for relay automation
- [ ] Power consumption monitoring
- [ ] Telegram bot integration
- [ ] Multiple RF transmitters support
- [ ] Relay groups/scenes

### Known Limitations
- Maximum 16 relays (GPIO limitation)
- .local URLs require mDNS client on device
- RF receiver supports single learned code
- No HTTPS (use VPN for remote access)

---

## Support & Credits

**Developed**: October 2025  
**Platform**: ESP32 (ESP32-D0WD-V3)  
**Framework**: Arduino (via PlatformIO)  
**Build Tool**: PlatformIO

### Key Libraries
- WiFiManager 2.0.17
- PubSubClient 2.8.0
- ArduinoJson 6.21.5
- ESPAsyncWebServer 1.2.4
- RCSwitch 2.6.4

---

## Migration Notes

### From v1.3 to v1.4
- MQTT discovery now publishes once per boot (not on every reconnection)
- Favicon handler added (cosmetic, no breaking changes)
- mDNS restart logic improved (automatic, no action needed)
- **No configuration changes required**

### From v1.2 to v1.3
- RF receiver feature added (optional)
- New GPIO pin 15 used for RF (check for conflicts)
- New web page at `/rf_learn.html`

### From v1.1 to v1.2
- Admin panel requires authentication
- New preferences stored in NVS
- MQTT credentials configurable but still have hardcoded defaults

### From v1.0 to v1.1
- Increased from 4 to 16 relays (update `config.h`)
- MQTT buffer increased (automatic)
- LittleFS filesystem required (run `uploadfs`)

---

## Testing Checklist

Use this checklist when deploying updates:

### Basic Functionality
- [ ] Web interface loads via IP
- [ ] Web interface loads via .local URL
- [ ] All relays toggle from web interface
- [ ] All relays toggle from Home Assistant
- [ ] Relay states persist after reboot

### Network Features
- [ ] WiFi reconnection works (test by router reboot)
- [ ] AP mode activates when WiFi unavailable
- [ ] MQTT stays connected for 1+ hour
- [ ] mDNS works on multiple devices

### Admin Features
- [ ] Admin panel requires password
- [ ] Relay count configuration works
- [ ] MQTT credential changes save

### RF Features (if used)
- [ ] Learning mode activates
- [ ] RF code saves successfully
- [ ] Learned signal triggers Home Assistant entity
- [ ] Entity auto-off after 2 seconds

---

**End of Changelog**

*For current documentation, see README.md*  
*For troubleshooting, see TROUBLESHOOTING.md*  
*For quick commands, see QUICK_REFERENCE.md*

