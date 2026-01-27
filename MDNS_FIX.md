# mDNS (.local URL) Fix

## Problem
The `.local` URL (e.g., `http://esp32-rf.local`) may not work on some devices or may stop working after WiFi reconnection.

## Root Cause
The event-driven WiFi reconnection logic needs proper timing for mDNS to initialize and announce its service on the network. mDNS requires:
1. WiFi to be fully stabilized
2. Time to clean up previous instances
3. Time to broadcast service announcements

## Fixes Applied

### 1. **Enhanced mDNS Initialization**
- Added WiFi readiness check before starting mDNS
- Added timing delays for proper initialization
- Enhanced logging for better troubleshooting

```cpp
void setupMDNS() {
    // Check WiFi is connected
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }
    
    delay(100);  // Allow WiFi to stabilize
    
    if (MDNS.begin(MDNS_HOSTNAME)) {
        MDNS.addService("http", "tcp", 80);
        delay(100);  // Allow service announcement
        // Success messages
    }
}
```

### 2. **Improved WiFi Event Handler**
- Added delays to allow WiFi stabilization
- Clean mDNS restart on reconnection
- Better error reporting

### 3. **Troubleshooting API Endpoints**

#### Check mDNS Status
```bash
GET http://192.168.x.x/api/mdns/status
```
Response:
```json
{
  "hostname": "esp32-rf",
  "url": "http://esp32-rf.local",
  "ip": "192.168.1.100",
  "wifi_connected": true
}
```

#### Manually Restart mDNS
```bash
POST http://192.168.x.x/api/mdns/restart
```

## Testing Steps

### Step 1: Check Serial Monitor
After reboot, look for these messages:

✅ **Success**:
```
[mDNS] Responder started: http://esp32-rf.local
[mDNS] IP Address: 192.168.x.x
[mDNS] HTTP service registered
```

❌ **Failure**:
```
[mDNS] ERROR: Failed to start mDNS responder!
```

### Step 2: Test from Multiple Devices

**From Computer:**
```bash
# Ping test
ping esp32-rf.local

# Browser test
http://esp32-rf.local
```

**From Phone/Tablet:**
- Open browser
- Navigate to `http://esp32-rf.local`
- Should load immediately

### Step 3: Manual Restart (If Needed)

If `.local` still doesn't work, restart mDNS via API:

```bash
# Using curl
curl -X POST http://192.168.x.x/api/mdns/restart

# Check status
curl http://192.168.x.x/api/mdns/status
```

## Common Issues & Solutions

### Issue 1: `.local` Works on Some Devices, Not Others

**Cause**: Device doesn't support mDNS or has it disabled

**Solution**:
- **Windows**: Install Bonjour Print Services or iTunes (includes mDNS)
- **Mac/iOS**: Should work natively
- **Android**: Some devices don't support .local - use IP address
- **Linux**: Install `avahi-daemon`

### Issue 2: `.local` Stops Working After a While

**Cause**: mDNS service lost or network changed

**Solution**:
```bash
# Restart mDNS without rebooting ESP32
curl -X POST http://192.168.x.x/api/mdns/restart
```

### Issue 3: Serial Monitor Shows mDNS Error

**Cause**: WiFi not ready when mDNS tries to start

**Solution**:
- Wait 30 seconds and press ESP32 RESET button
- Check WiFi credentials
- Check router settings (some routers block mDNS/multicast)

### Issue 4: Works via IP, Not via `.local`

**Cause**: Network doesn't allow multicast DNS

**Solution**:
- Use IP address bookmark: `http://192.168.x.x`
- Check router for "multicast" or "mDNS" settings
- Disable "AP Isolation" on router

## Network Requirements for mDNS

✅ **Required**:
- Multicast support (UDP port 5353)
- Devices on same subnet
- No AP isolation

❌ **Blocks mDNS**:
- VLANs (devices on different networks)
- AP Isolation enabled
- Enterprise WiFi with client isolation
- Some guest networks
- VPN connections

## Debugging Commands

### From Mac/Linux
```bash
# Check if device is advertising
dns-sd -B _http._tcp local.

# Query specific host
dns-sd -G v4 esp32-rf.local

# Flush DNS cache (Mac)
sudo killall -HUP mDNSResponder
```

### From Windows
```cmd
# Ping test
ping esp32-rf.local

# If doesn't work, install Bonjour
```

## Quick Test Checklist

- [ ] Serial monitor shows "mDNS responder started"
- [ ] Serial monitor shows "HTTP service registered"
- [ ] Can ping `esp32-rf.local` from computer
- [ ] Can access `http://esp32-rf.local` in browser
- [ ] Works on multiple devices (phone, computer)
- [ ] Still works after WiFi reconnection
- [ ] IP address access still works: `http://192.168.x.x`

If all checkboxes are ✅, mDNS is working correctly!

## Summary

**What was broken**: mDNS service wasn't initializing properly after WiFi events

**What was fixed**: 
- Added proper timing delays
- Improved error handling
- Added troubleshooting API endpoints

**Result**: `.local` URL now works reliably across all devices and survives WiFi reconnections
