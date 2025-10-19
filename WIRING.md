# ESP32 Relay Module Wiring Guide

## Standard 4-Channel Relay Module

### Pin Connections

```
ESP32          →    Relay Module
─────────────────────────────────
GPIO 23        →    IN1 (Relay 1)
GPIO 22        →    IN2 (Relay 2)
GPIO 21        →    IN3 (Relay 3)
GPIO 19        →    IN4 (Relay 4)
GND            →    GND
3.3V or 5V*    →    VCC

* Check your relay module voltage requirement
```

### Visual Diagram

```
┌─────────────────┐                 ┌──────────────────────┐
│     ESP32       │                 │   4-Channel Relay    │
│                 │                 │                      │
│            GPIO23├────────────────┤IN1                   │
│            GPIO22├────────────────┤IN2                   │
│            GPIO21├────────────────┤IN3                   │
│            GPIO19├────────────────┤IN4                   │
│                 │                 │                      │
│              GND├────────────────┤GND                   │
│         3.3V/5V*├────────────────┤VCC                   │
│                 │                 │                      │
│     [USB Port]  │                 │ [COM/NO/NC x 4]      │
└─────────────────┘                 └──────────────────────┘
```

## Important Notes

### ⚠️ Voltage Considerations

1. **Signal Voltage**: ESP32 outputs 3.3V logic
   - Most relay modules work with 3.3V signal
   - Some require 5V signal (use level shifter)

2. **Module Power (VCC)**:
   - **Option A**: Power from ESP32 (3.3V or 5V pin)
     - ✅ Good for small relays
     - ❌ Limited current (~500mA)
   
   - **Option B**: Separate 5V power supply
     - ✅ Better for larger relay boards
     - ✅ More stable
     - Connect: GND to GND (common ground)

### 🔌 JD-VCC Jumper (if present)

Some relay modules have a JD-VCC jumper:

```
With Jumper (default):
VCC = JD-VCC = Relay coil power
Power everything from one source

Without Jumper (isolated):
VCC = Logic power (3.3V/5V from ESP32)
JD-VCC = Relay coil power (separate 5V supply)
```

**Recommended**: Remove jumper and use separate 5V for JD-VCC

### ⚡ Active High vs Active Low

**Active High Module** (default code):
- HIGH signal = Relay ON
- LOW signal = Relay OFF

**Active Low Module**:
- LOW signal = Relay ON  
- HIGH signal = Relay OFF
- **Fix**: Invert logic in code (see TROUBLESHOOTING.md)

## Alternative GPIO Pins

You can use different GPIO pins. Good options:

### ✅ Recommended GPIO Pins:
- GPIO 23, 22, 21, 19 (default)
- GPIO 18, 17, 16, 15
- GPIO 13, 12, 14, 27
- GPIO 26, 25, 33, 32

### ❌ Avoid These GPIO Pins:
- **GPIO 0**: Boot mode (used for programming)
- **GPIO 2**: Boot mode, onboard LED
- **GPIO 5**: Boot mode
- **GPIO 12**: Boot voltage selector
- **GPIO 15**: Boot mode
- **GPIO 34-39**: Input only (no output capability)

## Relay Output Connections

Each relay has 3 terminals:

```
COM (Common)  : Connect your power source or device
NO (Normally Open) : Closed when relay is ON
NC (Normally Closed) : Open when relay is ON
```

### Example: Controlling a Light

```
┌─────────┐
│ AC Power│
│ Source  │
└────┬────┘
     │
     │    ┌──────────┐
     └────┤COM    NO ├─────→ To Light
          │          │
          │ Relay  NC├─────→ Not used
          └──────────┘
```

### Example: Controlling DC Device (12V LED strip)

```
12V Supply (+)───┬────→ LED Strip (+)
                 │
                COM
                 │
                NO──── (switched to COM when relay ON)
                
GND ─────────────┴────→ LED Strip (-)
```

## Safety Warnings

### ⚠️ DANGER - High Voltage
- **AC mains voltage can kill**
- Only work with AC if you're qualified
- Use proper insulation
- Test with low voltage first

### 🔥 Current Ratings
- Check relay specifications
- Don't exceed rated current
- Use heat sinks for high current
- Add fuses for protection

### ⚡ Inductive Loads
For motors, solenoids, transformers:
- Add flyback diodes (DC loads)
- Add snubbers (AC loads)
- Prevents back-EMF damage

## Example Projects

### 1. Simple LED Control (Safe for Testing)

```
Components:
- ESP32
- 4-channel relay module
- 4 LEDs
- 4 resistors (220Ω)
- 5V power supply
- Breadboard

Wiring:
5V → COM (relay 1) → NO → LED → Resistor → GND
(Repeat for other relays)
```

### 2. Home Automation (Lights)

```
⚠️ AC VOLTAGE - Hire electrician if not qualified

Line (Hot) → Relay COM
Relay NO → Light fixture
Neutral → Light fixture
Ground → Light fixture ground
```

### 3. Garden Irrigation

```
12V DC Supply → Relay COM
Relay NO → Solenoid valve (+)
Solenoid valve (-) → GND
Add: Flyback diode across solenoid
```

### 4. Fan Control

```
⚠️ AC VOLTAGE

Line → Relay COM
Relay NO → Fan hot wire
Neutral → Fan neutral
Ground → Fan ground
```

## Power Supply Recommendations

### For Relay Module:
- **Voltage**: 5V DC
- **Current**: 500mA minimum (100mA per relay)
- **Recommended**: 1A for safety margin

### For ESP32:
- **Voltage**: 5V via USB or VIN pin
- **Current**: 500mA minimum
- **During WiFi**: Peaks to 500mA

### Total System:
- **Option 1**: USB power (5V 2A) for ESP32 + small relays
- **Option 2**: Dedicated 5V 3A supply for everything
- **Option 3**: Separate supplies (ESP32 on USB, relays on 5V PSU)

## Testing Procedure

### 1. Initial Setup (No Load)
```
1. Wire ESP32 to relay module
2. Power ESP32 via USB
3. Upload code
4. Check serial monitor
5. Verify relays click when controlled
```

### 2. Low Voltage Test (12V DC)
```
1. Connect 12V LED or bulb to relay output
2. Test via web interface
3. Verify switching works correctly
4. Check for any heat issues
```

### 3. AC Test (Only if qualified!)
```
1. Double-check all connections
2. Use proper enclosure
3. Test with meter (relay off)
4. Test switching with low-power load first
5. Monitor for issues
```

## Troubleshooting

### Relay doesn't click
- Check VCC power (measure voltage)
- Verify GPIO pin is correct
- Check if signal reaches relay (LED indicator)
- Test with jumper wire: IN to GND (should activate)

### Relay clicks but output doesn't work
- Check COM/NO/NC connections
- Verify load polarity (DC)
- Test with multimeter
- Check fuses if present

### Multiple relays trigger together
- Check for wiring shorts
- Verify GPIO pins in code match hardware
- Check common ground connection

### Relay stays on after ESP32 reboot
- GPIO floats during boot
- Add pull-down resistors (10kΩ to GND)
- Or use "active high" module with pull-downs

## Schematic Example

```
Complete 4-Relay System with Isolated Power:

   ┌─────────────┐
   │  5V Supply  │
   │   (ESP32)   │
   └──────┬──────┘
          │
   ┌──────▼──────────────┐
   │      ESP32          │
   │                     │
   │ 23 22 21 19     GND │
   └──┬──┬──┬──┬────────┬┘
      │  │  │  │        │
      │  │  │  │        │    ┌──────────────┐
      │  │  │  │        │    │ 5V Supply    │
      │  │  │  │        │    │ (Relays)     │
      │  │  │  │        │    └───┬──────┬───┘
      │  │  │  │        │        │      │
   ┌──▼──▼──▼──▼────────▼────────▼──────▼──┐
   │ IN1 IN2 IN3 IN4   GND    JD-VCC   VCC │
   │                                        │
   │        4-Channel Relay Module          │
   │                                        │
   │ [Relay 1] [Relay 2] [Relay 3] [Relay 4]│
   └─────────────────────────────────────────┘
```

## Additional Resources

- ESP32 Pinout: https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- Relay Module Guide: Check manufacturer datasheet
- Electrical Safety: Consult local electrical codes

**Remember**: When in doubt, start with low voltage testing!





