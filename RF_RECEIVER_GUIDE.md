# RF Receiver Guide - 433MHz Remote Control Integration

## Overview

Your ESP32 Relay Controller now includes **RF (433MHz) receiver functionality** that allows you to capture signals from RF transmitters and create a virtual trigger in Home Assistant. When the learned signal is detected, a binary sensor turns ON for 2 seconds then automatically turns OFF.

## Hardware Requirements

- **SYN480R RF Receiver Module** (or compatible 433MHz receiver)
- Connected to **GPIO 15** on your ESP32
- **433MHz RF Transmitter** (remote control, key fob, etc.)

## Wiring

```
SYN480R Receiver → ESP32
─────────────────────────
VCC              → 5V or 3.3V
GND              → GND  
DATA             → GPIO 15
```

**Note:** GPIO 15 is defined in `include/config.h` and can be changed if needed.

## How It Works

1. **Learning Mode:** Activate learning mode via web interface
2. **Capture Signal:** Press button on your RF transmitter
3. **Save Code:** The RF code is captured and saved to NVS (non-volatile storage)
4. **Detection:** When the same signal is received again, triggers Home Assistant entity
5. **Auto-Off:** The trigger automatically turns OFF after 2 seconds

## Setup Instructions

### 1. Hardware Connection

Connect your SYN480R receiver to GPIO 15 as shown in the wiring diagram above.

### 2. Access RF Learning Page

Navigate to the RF Learning interface:
- **Main Dashboard** → Click **"📡 RF Learning"** button
- Or directly: `http://esp32-relay.local/rf_learn.html`

### 3. Learn Your RF Signal

1. Click **"🎓 Start Learning Mode"**
2. Within 30 seconds, press any button on your RF transmitter
3. The system will capture the signal automatically
4. You'll see a success message with the captured code details

### 4. Verify in Home Assistant

After learning a code, a new entity will appear in Home Assistant:
- **Entity Name:** `binary_sensor.rf_trigger`
- **Device Class:** Motion
- **Icon:** 📡 Remote
- **Auto-Off Delay:** 2 seconds

## Web Interface

### RF Learning Page

Access at: `http://esp32-relay.local/rf_learn.html`

**Features:**
- **Learning Status:** Shows current state (Ready, Learning, Configured)
- **Learned RF Code:** Displays captured code details
  - RF Code (decimal value)
  - Bit Length
  - Protocol Number
- **Start Learning Mode:** Activates 30-second learning window
- **Clear Learned Code:** Removes saved RF code

### Main Dashboard

The main interface (`index.html`) now includes:
- **RF Learning Button:** Quick access to RF configuration

## API Endpoints

### Get RF Status
```bash
GET /api/rf/status
```

**Response:**
```json
{
  "learning_mode": false,
  "code_learned": true,
  "rf_code": "5592332",
  "bit_length": 24,
  "protocol": 1,
  "trigger_active": false
}
```

### Start Learning Mode
```bash
POST /api/rf/learn
```

**Response:**
```json
{
  "success": true,
  "message": "Learning mode activated"
}
```

**Note:** Learning mode auto-deactivates after 30 seconds or when a code is captured.

### Stop Learning Mode
```bash
POST /api/rf/stop
```

### Clear Learned Code
```bash
POST /api/rf/clear
```

## Home Assistant Integration

### MQTT Discovery

The RF trigger is automatically discovered by Home Assistant via MQTT:

**Topic Structure:**
- **Config Topic:** `homeassistant/binary_sensor/esp32-relay_rf_trigger/config`
- **State Topic:** `homeassistant/switch/esp32-relay/rf_trigger/state`
- **Availability Topic:** `homeassistant/switch/esp32-relay/availability`

### Entity Details

```yaml
platform: mqtt
name: "RF Trigger"
unique_id: "esp32-relay_rf_trigger"
state_topic: "homeassistant/switch/esp32-relay/rf_trigger/state"
device_class: motion
icon: "mdi:remote"
off_delay: 2  # Auto-off after 2 seconds
```

### Using in Automations

**Example 1: Turn on Light when RF Button Pressed**
```yaml
automation:
  - alias: "RF Button Triggers Light"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_trigger
        to: "on"
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
```

**Example 2: Toggle Device**
```yaml
automation:
  - alias: "RF Button Toggles Fan"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_trigger
        to: "on"
    action:
      - service: switch.toggle
        target:
          entity_id: switch.bedroom_fan
```

**Example 3: Trigger Multiple Actions**
```yaml
automation:
  - alias: "RF Button Scene"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_trigger
        to: "on"
    action:
      - service: scene.turn_on
        target:
          entity_id: scene.movie_time
```

## Serial Monitor Output

### During Learning
```
[RF] Learning mode activated - press transmitter button
[RF] Code learned: 5592332 (bit: 24, protocol: 1)
[RF] Code saved to preferences
[MQTT] RF Trigger discovery published
```

### During Signal Detection
```
[RF] Learned signal detected!
[RF] Published trigger state: ON
[RF] Trigger auto-off
[RF] Published trigger state: OFF
```

### On Boot
```
[RF] Receiver initialized on GPIO 15
[RF] Learned code loaded: 5592332 (bit: 24, protocol: 1)
```

## Technical Details

### RF Code Storage

Learned codes are stored in NVS (Non-Volatile Storage) and persist across reboots:
- **Key:** `rf_code` - The RF code value (unsigned long)
- **Key:** `rf_bits` - Bit length (unsigned int)
- **Key:** `rf_proto` - Protocol number (unsigned int)

### Supported Protocols

The RCSwitch library supports multiple 433MHz protocols:
- **Protocol 1:** Most common (e.g., cheap RF outlets)
- **Protocol 2-7:** Various other encodings

Your receiver will automatically detect the protocol.

### Auto-Off Timing

The 2-second auto-off delay is defined in `config.h`:
```cpp
#define RF_TRIGGER_DURATION 2000  // milliseconds
```

Change this value if you need a different duration.

## Troubleshooting

### RF Code Not Capturing

**Problem:** Learning mode times out without capturing signal

**Solutions:**
1. Verify receiver is connected to GPIO 15
2. Check power supply (3.3V or 5V depending on module)
3. Ensure transmitter is within range (typically 10-50 meters)
4. Try different transmitter buttons
5. Check serial monitor for error messages

### Multiple Codes from Same Button

**Problem:** Same button produces different codes

**Cause:** Some transmitters use rolling codes for security

**Solution:** These transmitters are not compatible with simple RF receivers. Use fixed-code transmitters instead.

### Trigger Not Appearing in Home Assistant

**Checklist:**
1. Verify MQTT broker is running
2. Check ESP32 is connected to MQTT (check main dashboard)
3. Ensure a code has been learned
4. Restart Home Assistant to force discovery
5. Check Home Assistant MQTT integration logs

### False Triggers

**Problem:** Trigger activates unexpectedly

**Cause:** Other 433MHz devices on same frequency

**Solutions:**
1. Learn a different button/transmitter
2. Move receiver away from interference sources
3. Use transmitters with longer/unique codes

## Advanced Configuration

### Change RF Receiver Pin

Edit `include/config.h`:
```cpp
#define RF_RECEIVER_PIN 15  // Change to your desired GPIO
```

Re-upload firmware after changes.

### Change Auto-Off Duration

Edit `include/config.h`:
```cpp
#define RF_TRIGGER_DURATION 5000  // 5 seconds instead of 2
```

### Multiple RF Codes

**Current Limitation:** Only one RF code can be learned at a time.

**Workaround:** 
- Learn code from transmitter button 1
- Create automation in Home Assistant
- Clear code and learn button 2
- Create separate automation

**Future Enhancement:** Multi-code support could be added if needed.

## Use Cases

### 1. Doorbell Integration
- Learn your doorbell's RF signal
- Trigger Home Assistant notifications
- Turn on porch light automatically

### 2. Panic Button
- Use RF key fob as emergency alert
- Trigger security actions
- Send notifications to phone

### 3. Remote Scene Control
- Press RF button to activate scene
- No need to open phone/dashboard
- Physical button convenience

### 4. Elderly Care
- Give elderly person RF pendant
- Monitor button presses
- Alert caregivers if help needed

### 5. Garage Door Sensor
- Learn garage door opener signal
- Track door open/close events
- Automate lights when entering

## Safety Notes

⚠️ **Important:**
- RF signals are NOT secure
- Do not use for critical security functions
- Anyone with same frequency transmitter can trigger
- Suitable for convenience, not security

## Configuration Summary

| Setting | Value | Location |
|---------|-------|----------|
| **GPIO Pin** | 15 | `config.h` |
| **Auto-Off Duration** | 2000ms (2 sec) | `config.h` |
| **Learning Timeout** | 30 seconds | `rf_learn.html` |
| **Storage** | NVS Preferences | Persistent |
| **MQTT Topic** | `homeassistant/switch/esp32-relay/rf_trigger/state` | Automatic |

## Code Reference

### Main Functions

- `setupRFReceiver()` - Initialize receiver on GPIO 15
- `checkRFSignal()` - Check for incoming RF signals (called in loop)
- `publishRFTriggerState()` - Publish ON/OFF to MQTT
- `saveRFCode()` - Save learned code to NVS
- `restoreRFCode()` - Load code from NVS on boot

### API Routes

- `/api/rf/status` - Get current RF status
- `/api/rf/learn` - Start learning mode
- `/api/rf/stop` - Stop learning mode
- `/api/rf/clear` - Clear learned code

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Author:** AI Assistant  
**Status:** ✅ Production Ready

