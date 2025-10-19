# WiFi Reconnection & AP Fallback System

## Overview
The ESP32 now has intelligent WiFi reconnection logic that automatically handles network disconnections and password changes.

## How It Works

### 1. **Normal Operation (WiFi Connected)**
- ESP32 checks WiFi connection status every **5 seconds**
- If connected, everything works normally (web server, MQTT, etc.)
- IP address and status are available via the web interface

### 2. **WiFi Disconnection Detected**
When the ESP32 loses WiFi connection (SSID changed, password changed, router offline, etc.):

**Step 1: Initial Reconnection Attempt**
- ESP32 immediately tries to reconnect to the saved network
- Waits up to 10 seconds for connection
- If successful → returns to normal operation
- If failed → proceeds to AP mode

**Step 2: AP Mode Activation**
- ESP32 starts Access Point (AP) mode
- **SSID:** `ESP32-Relay`
- **Password:** `RelayControl`
- **AP IP:** `192.168.4.1`
- Web interface remains accessible at `http://192.168.4.1`
- mDNS also works: `http://esp32-relay.local`

### 3. **Automatic Reconnection Attempts (While in AP Mode)**

**Without AP Clients:**
- Every **60 seconds**, ESP32 attempts to reconnect to the saved network
- Tries for 10 seconds
- If successful → exits AP mode and returns to normal operation
- If failed → stays in AP mode and tries again in 60 seconds

**With AP Clients Connected:**
- **Reconnection attempts are PAUSED**
- This prevents disrupting users who are connected to configure WiFi
- As soon as the last client disconnects, reconnection attempts resume

### 4. **Reconfiguring WiFi**

There are multiple ways to reconfigure WiFi:

#### Option A: Through WiFiManager Portal (Initial Setup)
1. On first boot, ESP32 creates AP: `ESP32-Relay`
2. Connect to it with password: `RelayControl`
3. Captive portal opens automatically
4. Select your WiFi network and enter credentials
5. Configure MQTT settings (optional)
6. Click Save

#### Option B: Through Web Interface (Anytime)
1. Access web interface: `http://192.168.1.108` or `http://esp32-relay.local`
2. Click "Reset WiFi Configuration"
3. ESP32 restarts and creates AP
4. Follow Option A steps

#### Option C: Via API (When in AP Mode)
```bash
# Check WiFi status
curl http://192.168.4.1/api/wifi/status

# Reconfigure WiFi
curl -X POST http://192.168.4.1/api/wifi/reconfigure \
  -H "Content-Type: application/json" \
  -d '{"ssid":"YourNetworkName","password":"YourPassword"}'
```

#### Option D: Reset WiFi Settings
```bash
# Via API
curl -X POST http://esp32-relay.local/api/reset
```

## Status Indicators

### Check WiFi Status via API:
```bash
curl http://esp32-relay.local/api/wifi/status
```

**Response:**
```json
{
  "connected": true,
  "ap_mode": false,
  "ssid": "Roy2",
  "ip": "192.168.1.108",
  "rssi": -45,
  "ap_ssid": "ESP32-Relay",
  "ap_ip": "192.168.4.1",
  "ap_clients": 0
}
```

### Serial Monitor Messages:
```
[WiFi] Connected!
[WiFi] IP: 192.168.1.108

// When disconnected:
[WiFi] Disconnected! Starting reconnection attempts...
[WiFi] Attempting to reconnect...
[WiFi] Failed to reconnect - starting AP mode
[WiFi] AP Mode Started
[WiFi] AP SSID: ESP32-Relay
[WiFi] AP Password: RelayControl
[WiFi] AP IP: 192.168.4.1

// Reconnection attempts:
[WiFi] No AP clients - attempting to reconnect to saved network...
[WiFi] Reconnected successfully!

// When clients are connected:
[WiFi] AP mode active with 1 client(s) - skipping reconnect
```

## Use Cases

### Scenario 1: Changed WiFi Password
1. ESP32 loses connection
2. Tries to reconnect → fails
3. Enters AP mode
4. Every 60 seconds, tries old credentials (in case router came back)
5. You connect to `ESP32-Relay` AP
6. Reconnection attempts pause while you're connected
7. You configure new WiFi credentials via web interface
8. ESP32 connects to new network

### Scenario 2: Router Temporarily Offline
1. ESP32 loses connection
2. Enters AP mode
3. Every 60 seconds, attempts to reconnect
4. When router comes back online, ESP32 automatically reconnects
5. No manual intervention needed

### Scenario 3: Changed SSID
1. ESP32 can't find saved network
2. Enters AP mode
3. Continues trying every 60 seconds (in case SSID was restored)
4. Connect to AP and configure new SSID
5. ESP32 connects to new network

## Key Features

✅ **Automatic Recovery**: Reconnects automatically when network is restored
✅ **User-Friendly**: Pauses reconnection when you're configuring
✅ **Non-Disruptive**: Web interface and MQTT work in AP mode
✅ **Persistent Settings**: WiFi credentials saved across reboots
✅ **Multiple Access Methods**: Web, API, and serial configuration
✅ **Smart Timing**: 60-second intervals prevent excessive reconnection attempts

## Network Modes

| Mode | WiFi Status | Web Access | MQTT | Reconnection |
|------|-------------|------------|------|--------------|
| **Normal** | Connected to network | Via network IP | Active | Not needed |
| **AP (no clients)** | AP active | Via 192.168.4.1 | Inactive | Every 60s |
| **AP (with clients)** | AP active | Via 192.168.4.1 | Inactive | Paused |

## Troubleshooting

**Q: ESP32 won't connect to WiFi after password change**
- Connect to `ESP32-Relay` AP
- Access `http://192.168.4.1`
- Enter new credentials

**Q: ESP32 keeps trying to reconnect every 60 seconds, disrupting my configuration**
- Stay connected to the AP - reconnection will pause automatically

**Q: How do I force AP mode manually?**
- Access web interface → Reset WiFi Configuration
- Or press BOOT button for 10 seconds (if implemented)

**Q: Can I disable automatic reconnection?**
- Not currently, but you can modify `RECONNECT_INTERVAL` in code

**Q: ESP32 is in AP mode but I want it to stop trying to reconnect**
- Connect to the AP - it will automatically pause attempts

## Configuration Options

In `src/main.cpp`, you can adjust these values:

```cpp
const unsigned long WIFI_CHECK_INTERVAL = 5000;   // Check WiFi every 5 seconds
const unsigned long RECONNECT_INTERVAL = 60000;   // Reconnect attempts every 60 seconds
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wifi/status` | GET | Get current WiFi status |
| `/api/wifi/reconfigure` | POST | Set new WiFi credentials |
| `/api/reset` | POST | Reset WiFi settings & restart |

---

**Last Updated:** October 2025  
**Firmware Version:** 1.0.0

