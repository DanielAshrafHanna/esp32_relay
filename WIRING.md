# ESP32 RF-to-MQTT Bridge Wiring Guide

## RF Receiver Module (SYN480R or Compatible)

### Pin Connections

```
SYN480R Receiver → ESP32
─────────────────────────
VCC              → 3.3V or 5V
GND              → GND  
DATA             → GPIO 22
```

### Visual Diagram

```
┌─────────────────┐                 ┌──────────────────────┐
│     ESP32       │                 │   SYN480R Receiver   │
│                 │                 │                      │
│            GPIO22├────────────────┤DATA                  │
│                 │                 │                      │
│              GND├────────────────┤GND                   │
│         3.3V/5V*├────────────────┤VCC                   │
│                 │                 │                      │
│     [USB Port]  │                 │  [Antenna]           │
└─────────────────┘                 └──────────────────────┘
```

## Important Notes

### ⚠️ Voltage Considerations

1. **Signal Voltage**: ESP32 GPIO is 3.3V tolerant
   - Most SYN480R modules work with both 3.3V and 5V VCC
   - Data output is typically 3.3V compatible

2. **Module Power (VCC)**:
   - **3.3V**: Lower power consumption, shorter range
   - **5V**: Better sensitivity, longer range (recommended)

### 📡 Antenna Considerations

For best RF reception:

1. **Wire Antenna**: 
   - 433MHz wavelength ≈ 69cm
   - Quarter-wave antenna ≈ **17.3cm** of wire
   - Solder to ANT pad on receiver

2. **Coil Antenna**:
   - Some modules come with coil antennas
   - Works but shorter range than wire

3. **External Antenna**:
   - Use SMA connector if module supports it
   - Best for long range applications

### 🔌 Recommended GPIO Pins

The default is GPIO 22, but you can use other pins:

#### ✅ Recommended GPIO Pins:
- GPIO 22 (default)
- GPIO 23, 21, 19, 18
- GPIO 17, 16, 15
- GPIO 13, 12, 14, 27
- GPIO 26, 25, 33, 32

#### ❌ Avoid These GPIO Pins:
- **GPIO 0**: Boot mode (used for programming)
- **GPIO 2**: Boot mode, onboard LED
- **GPIO 5**: Boot mode
- **GPIO 12**: Boot voltage selector
- **GPIO 34-39**: Input only (but work for RF receiver)

## Changing the RF Pin

If you need to use a different GPIO pin:

1. Edit `include/config.h`:
   ```cpp
   #define RF_RECEIVER_PIN 22  // Change to your desired GPIO
   ```

2. Re-upload firmware:
   ```bash
   pio run --target upload
   ```

## Power Supply Recommendations

### For ESP32:
- **Voltage**: 5V via USB or VIN pin
- **Current**: 500mA minimum
- **During WiFi**: Peaks to 500mA

### For RF Receiver:
- **Voltage**: 5V recommended for best sensitivity
- **Current**: ~10-20mA typical

### Total System:
- **USB Power**: 5V 1A is sufficient
- **External PSU**: 5V 1A or higher

## Testing Procedure

### 1. Initial Setup (No Transmitter)
```
1. Wire RF receiver to ESP32
2. Power ESP32 via USB
3. Upload firmware
4. Check serial monitor for:
   "[RF] Receiver initialized on GPIO 22"
```

### 2. RF Signal Test
```
1. Open web interface RF Manager
2. Click "Start Learning Mode"
3. Press button on RF transmitter
4. Serial monitor should show:
   "[RF] Code learned: XXXXXX (bit: XX, protocol: X)"
```

### 3. Verify in Home Assistant
```
1. Check MQTT connection status
2. Verify binary sensor appears
3. Press RF transmitter
4. Sensor should briefly turn ON then OFF
```

## Troubleshooting

### RF receiver not detecting signals

**Check wiring:**
- Verify VCC has power (LED on module if present)
- Verify GND is connected
- Verify DATA is connected to correct GPIO

**Check GPIO pin:**
- Ensure the GPIO pin is correctly defined in config.h
- Avoid pins used during boot

**Check transmitter:**
- Verify transmitter has battery
- Try pressing different buttons
- Move transmitter closer

### Weak RF range

**Improve antenna:**
- Add 17.3cm wire antenna
- Keep antenna away from metal
- Position receiver away from ESP32

**Power supply:**
- Use 5V instead of 3.3V for receiver
- Ensure stable power supply

**Interference:**
- Move away from WiFi router
- Separate from other electronics
- Try different location

### False triggers

**Causes:**
- Other 433MHz devices nearby
- Electrical noise
- Poor antenna connection

**Solutions:**
- Learn a different button/transmitter
- Add shielding around receiver
- Use transmitters with longer codes

## Schematic

```
Complete RF Bridge System:

   ┌─────────────┐
   │  5V USB     │
   │  Power      │
   └──────┬──────┘
          │
   ┌──────▼──────────────┐
   │      ESP32          │
   │                     │
   │   22           GND  │
   └──┬──────────────┬───┘
      │              │
      │              │     ┌────────────┐
      │              │     │ 5V Supply  │
      │              │     │ (optional) │
      │              │     └────┬───────┘
      │              │          │
   ┌──▼──────────────▼──────────▼─┐
   │ DATA          GND         VCC │
   │                                │
   │      SYN480R RF Receiver       │
   │                                │
   │           [ANT]                │
   │             │                  │
   │         17.3cm wire            │
   └────────────────────────────────┘
```

## Additional Resources

- ESP32 Pinout: https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- RCSwitch Library: https://github.com/sui77/rc-switch
- 433MHz Antenna Calculator: https://www.changpuak.ch/electronics/calc_12.php

**Remember**: For best results, use a proper wire antenna and power the receiver with 5V!
