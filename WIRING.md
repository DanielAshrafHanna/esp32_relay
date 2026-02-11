# ESP32 RF Repeater Wiring

## Overview

This project uses two RF modules:

- Receiver module on `GPIO 22` (`D22`)
- Transmitter module on `GPIO 21` (`D21`)

## Connections

```text
RF Receiver (SYN480R compatible) -> ESP32
-----------------------------------------
VCC  -> 3.3V or 5V (module-dependent)
GND  -> GND
DATA -> GPIO 22 (D22)

RF Transmitter -> ESP32
-----------------------
VCC  -> 3.3V or 5V (module-dependent)
GND  -> GND
DATA -> GPIO 21 (D21)
```

## Basic Diagram

```text
           +----------------------+
           |        ESP32         |
           |                      |
Receiver ->| GPIO22 (D22)         |
TX Module ->| GPIO21 (D21)        |
           | GND -----------------+---- shared ground
           | 3V3/5V ---- power ---+---- module VCCs
           +----------------------+
```

## Power Notes

- Many receiver/transmitter boards can use 5V VCC for better range.
- ESP32 GPIO is 3.3V logic; verify your RF module output is safe for ESP32 input.
- Always use a common ground between ESP32 and both RF modules.

## Antenna Notes

- For 433MHz, a ~17.3 cm wire antenna typically improves range.
- Keep antennas away from USB cable noise and metal surfaces.

## Verification Checklist

1. Boot device and open serial monitor.
2. Confirm logs show:
   - receiver initialized on GPIO 22
   - transmitter initialized on GPIO 21
3. Learn a signal in RF Manager.
4. Trigger learned remote button and verify retransmit log appears.

## If It Does Not Work

- Recheck DATA wires (`D22` receive, `D21` transmit)
- Recheck shared GND
- Move remote close for initial learning
- Confirm the incoming signal is one of the saved codes
