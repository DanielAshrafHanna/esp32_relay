# RF Receiver Guide - 433MHz Remote Control Integration

## Overview

The ESP32 RF-to-MQTT Bridge captures signals from 433MHz RF transmitters and creates virtual triggers in Home Assistant. When a learned signal is detected, a binary sensor turns ON for 2 seconds then automatically turns OFF.

## Hardware Requirements

- **SYN480R RF Receiver Module** (or compatible 433MHz receiver)
- Connected to **GPIO 22** on your ESP32 (configurable)
- **433MHz RF Transmitter** (remote control, key fob, doorbell, etc.)
- **17.3cm wire antenna** (recommended for better range)

## Wiring

```
SYN480R Receiver → ESP32
─────────────────────────
VCC              → 5V (recommended) or 3.3V
GND              → GND  
DATA             → GPIO 22
```

**Note:** GPIO 22 is defined in `include/config.h` and can be changed if needed.

**Tip:** Use 5V power for the receiver for better sensitivity and range.

## How It Works

1. **Learning Mode:** Activate learning mode via web interface
2. **Enter Name:** Give your RF device a meaningful name
3. **Capture Signal:** Press button on your RF transmitter
4. **Save Code:** The RF code is captured and saved to NVS (non-volatile storage)
5. **Detection:** When the same signal is received again, triggers Home Assistant entity
6. **Auto-Off:** The trigger automatically turns OFF after 2 seconds

## Setup Instructions

### 1. Hardware Connection

Connect your SYN480R receiver to GPIO 22 as shown in the wiring diagram above. For best range, add a 17.3cm wire antenna to the ANT pad.

### 2. Access RF Manager Page

Navigate to the RF Manager interface:
- **Main Dashboard** → Click **"RF Manager"** button
- Or directly: `http://esp32-rf.local/rf_manager.html`

### 3. Learn Your RF Signal

1. Enter a **name** for your device (e.g., "Doorbell", "Remote Button 1")
2. Click **"Start Learning Mode"**
3. Within 30 seconds, press any button on your RF transmitter
4. The system will capture the signal automatically
5. You'll see a success message with the captured code details

### 4. Verify in Home Assistant

After learning a code, a new entity will appear in Home Assistant:
- **Entity Type:** `binary_sensor`
- **Entity Name:** `binary_sensor.rf_<your_name>`
- **Device Class:** Motion
- **Icon:** mdi:remote
- **Auto-Off Delay:** 2 seconds

## Web Interface

### RF Manager Page

Access at: `http://esp32-rf.local/rf_manager.html`

**Features:**
- **Learn New Code:** Enter name and start learning mode
- **Learned Codes List:** View all captured codes with details
  - Code name
  - RF Code (decimal value)
  - Bit Length
  - Protocol Number
- **Delete Codes:** Remove individual codes
- **Status Indicator:** Shows learning/ready state

## API Endpoints

### Get RF Status
```bash
GET /api/rf/status
```

**Response:**
```json
{
  "learning_mode": false,
  "code_count": 3,
  "max_codes": 10
}
```

### Get All Learned Codes
```bash
GET /api/rf/codes
```

**Response:**
```json
{
  "codes": [
    {"slot": 0, "name": "Doorbell", "code": 5592332, "bits": 24, "protocol": 1, "active": true},
    {"slot": 1, "name": "Remote 1", "code": 1234567, "bits": 24, "protocol": 1, "active": true}
  ],
  "count": 2,
  "max": 10
}
```

### Start Learning Mode
```bash
POST /api/rf/learn?name=Doorbell
```

**Response:**
```json
{
  "success": true,
  "message": "Learning mode activated for 'Doorbell'"
}
```

### Stop Learning Mode
```bash
POST /api/rf/stop
```

### Delete Learned Code
```bash
POST /api/rf/delete?slot=0
```

## Home Assistant Integration

### MQTT Discovery

RF triggers are automatically discovered by Home Assistant via MQTT:

**Topic Structure:**
- **Config Topic:** `homeassistant/binary_sensor/esp32-rf_rf_<name>/config`
- **State Topic:** `homeassistant/switch/esp32-rf/rf_<slot>/state`
- **Availability Topic:** `homeassistant/switch/esp32-rf/availability`

### Entity Details

```yaml
platform: mqtt
name: "RF Doorbell"
unique_id: "esp32-rf_rf_doorbell"
state_topic: "homeassistant/switch/esp32-rf/rf_0/state"
device_class: motion
icon: "mdi:remote"
off_delay: 2  # Auto-off after 2 seconds
```

### Using in Automations

**Example 1: Doorbell Notification**
```yaml
automation:
  - alias: "RF Doorbell Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_doorbell
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          title: "🔔 Doorbell"
          message: "Someone is at the door!"
      - service: light.turn_on
        target:
          entity_id: light.porch
```

**Example 2: Toggle Device**
```yaml
automation:
  - alias: "RF Button Toggles Fan"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_remote_1
        to: "on"
    action:
      - service: switch.toggle
        target:
          entity_id: switch.bedroom_fan
```

**Example 3: Trigger Scene**
```yaml
automation:
  - alias: "RF Button Scene"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_remote_2
        to: "on"
    action:
      - service: scene.turn_on
        target:
          entity_id: scene.movie_time
```

## Serial Monitor Output

### During Learning
```
[RF] Learning mode activated for 'Doorbell' - press transmitter button
[RF] Code learned: 'Doorbell' - 5592332 (bit: 24, protocol: 1)
[RF] Code saved to slot 0
[MQTT] RF discovery published for slot 0
```

### During Signal Detection
```
[RF] Signal received: 5592332
[RF] Match found: 'Doorbell' (slot 0)
[MQTT] RF 'Doorbell' (slot 0): ON
[MQTT] RF 'Doorbell' (slot 0): OFF
```

### On Boot
```
[RF] Receiver initialized on GPIO 22
[RF] Restored 2 RF codes from storage
```

## Technical Details

### RF Code Storage

Learned codes are stored in NVS (Non-Volatile Storage) and persist across reboots:
- **Namespace:** `rf-bridge`
- **Data:** Array of code structures (name, code, bits, protocol, active flag)

### Supported Protocols

The RCSwitch library supports multiple 433MHz protocols:
- **Protocol 1:** Most common (cheap RF outlets, doorbells)
- **Protocol 2-7:** Various other encodings

Your receiver will automatically detect the protocol.

### Auto-Off Timing

The 2-second auto-off delay is defined in `config.h`:
```cpp
#define RF_TRIGGER_DURATION 2000  // milliseconds
```

Change this value if you need a different duration.

### Maximum RF Codes

Up to 10 RF codes can be learned (configurable in `config.h`):
```cpp
#define MAX_RF_CODES 10
```

## Troubleshooting

### RF Code Not Capturing

**Problem:** Learning mode times out without capturing signal

**Solutions:**
1. Verify receiver is connected to GPIO 22 (or your configured pin)
2. Check power supply (5V recommended for best sensitivity)
3. Ensure transmitter is within range (start very close, ~1 meter)
4. Try different transmitter buttons
5. Check serial monitor for error messages
6. Add a 17.3cm wire antenna

### Multiple Codes from Same Button

**Problem:** Same button produces different codes

**Cause:** Some transmitters use rolling codes for security

**Solution:** These transmitters are not compatible with simple RF receivers. Use fixed-code transmitters instead.

### Trigger Not Appearing in Home Assistant

**Checklist:**
1. Verify MQTT broker is running
2. Check ESP32 is connected to MQTT (check web interface)
3. Ensure at least one code has been learned
4. Restart Home Assistant to force discovery
5. Check Home Assistant MQTT integration logs

### False Triggers

**Problem:** Trigger activates unexpectedly

**Cause:** Other 433MHz devices on same frequency

**Solutions:**
1. Learn a different button/transmitter
2. Move receiver away from interference sources
3. Use transmitters with longer/unique codes

### Weak Range

**Problem:** Only works when very close

**Solutions:**
1. Add 17.3cm wire antenna to receiver
2. Use 5V power instead of 3.3V
3. Move receiver away from ESP32 and WiFi router
4. Position receiver away from metal objects

## Advanced Configuration

### Change RF Receiver Pin

Edit `include/config.h`:
```cpp
#define RF_RECEIVER_PIN 22  // Change to your desired GPIO
```

Re-upload firmware after changes.

### Change Auto-Off Duration

Edit `include/config.h`:
```cpp
#define RF_TRIGGER_DURATION 5000  // 5 seconds instead of 2
```

### Increase Max RF Codes

Edit `include/config.h`:
```cpp
#define MAX_RF_CODES 20  // Increase from 10
```

## Use Cases

### 1. Doorbell Integration
- Learn your doorbell's RF signal
- Trigger Home Assistant notifications
- Turn on porch light automatically
- Record video from doorbell camera

### 2. Panic Button
- Use RF key fob as emergency alert
- Trigger security actions
- Send notifications to phone
- Turn on all lights

### 3. Remote Scene Control
- Press RF button to activate scene
- No need to open phone/dashboard
- Physical button convenience
- One button for multiple actions

### 4. Elderly Care
- Give elderly person RF pendant
- Monitor button presses
- Alert caregivers if help needed
- Check-in system

### 5. Garage Door Sensor
- Learn garage door opener signal
- Track door open/close events
- Automate lights when entering
- Security alerts

### 6. Motion Sensors
- Use RF PIR sensors
- Trigger lighting automations
- Security monitoring
- Presence detection

## Safety Notes

⚠️ **Important:**
- RF signals are NOT secure
- Do not use for critical security functions
- Anyone with same frequency transmitter can trigger
- Suitable for convenience, not security

## Configuration Summary

| Setting | Value | Location |
|---------|-------|----------|
| **GPIO Pin** | 22 | `config.h` |
| **Auto-Off Duration** | 2000ms (2 sec) | `config.h` |
| **Max RF Codes** | 10 | `config.h` |
| **Learning Timeout** | 30 seconds | Web interface |
| **Storage** | NVS Preferences | Persistent |
| **MQTT Topic** | `homeassistant/switch/esp32-rf/rf_X/state` | Automatic |

## Code Reference

### Main Functions

- `setupRFReceiver()` - Initialize receiver on configured GPIO
- `checkRFSignal()` - Check for incoming RF signals (called in loop)
- `publishRFTriggerState()` - Publish ON/OFF to MQTT
- `saveRFCodes()` - Save all codes to NVS
- `restoreRFCodes()` - Load codes from NVS on boot
- `addRFCode()` - Add new code to storage
- `deleteRFCode()` - Remove code from storage

### API Routes

- `/api/rf/status` - Get current RF status
- `/api/rf/codes` - Get all learned codes
- `/api/rf/learn` - Start learning mode
- `/api/rf/stop` - Stop learning mode
- `/api/rf/delete` - Delete specific code

---

**Version:** 2.0.0
**Last Updated:** 2025
**Status:** ✅ Production Ready
