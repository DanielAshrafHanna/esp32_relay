# PC .local URL Troubleshooting

## Problem
The `.local` URL works on phone but not on PC.

## Root Cause
**Your ESP32 is working correctly!** The issue is that your PC doesn't have mDNS support or it's misconfigured.

---

## Quick Fixes by Operating System

### 🍎 For Mac

**Step 1: Flush DNS Cache**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Step 2: Test**
```bash
ping esp32-rf.local
```

If ping works but browser doesn't:
- Try Safari (best mDNS support)
- Clear browser cache
- Try incognito/private mode
- Restart browser

---

### 🪟 For Windows

**Step 1: Install Bonjour**

Download and install one of these:
- **Option A**: [Bonjour Print Services](https://support.apple.com/kb/DL999) (Recommended)
- **Option B**: Install iTunes (includes Bonjour)

**Step 2: Restart PC**

**Step 3: Test**
```cmd
ping esp32-rf.local
```

---

### 🐧 For Linux

**Step 1: Install Avahi**
```bash
sudo apt-get update
sudo apt-get install avahi-daemon avahi-utils libnss-mdns
```

**Step 2: Enable and Start Service**
```bash
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

**Step 3: Configure NSS**
Edit `/etc/nsswitch.conf`:
```
hosts: files mdns4_minimal [NOTFOUND=return] dns mdns4
```

**Step 4: Test**
```bash
ping esp32-rf.local
avahi-browse -a
```

---

## Why Phone Works but PC Doesn't

| Device | mDNS Support | Notes |
|--------|--------------|-------|
| **iPhone/iPad** | ✅ Built-in | Always works |
| **Android** | ⚠️ Varies | Some versions need app |
| **Mac** | ✅ Built-in | Usually works |
| **Windows** | ❌ Not built-in | Needs Bonjour |
| **Linux** | ❌ Not built-in | Needs Avahi |

---

## Still Not Working?

### Use IP Address Instead

Find your ESP32's IP address:
1. Check serial monitor output
2. Check your router's DHCP client list
3. Use: `http://192.168.x.x` (replace with actual IP)

### Check Network Requirements

mDNS requires:
- ✅ Devices on same subnet
- ✅ Multicast traffic allowed
- ❌ No VPN active
- ❌ No "AP Isolation" on router

### Router Settings to Check

Some routers block mDNS:
- Disable "AP Isolation" or "Client Isolation"
- Enable "Multicast Support"
- Check for "mDNS" or "Bonjour" settings
- Ensure WiFi and Ethernet are bridged (if applicable)

---

## Debugging Commands

### Windows
```cmd
# Check Bonjour service
sc query "Bonjour Service"

# DNS lookup
nslookup esp32-rf.local

# Check network
ipconfig /all
```

### Mac
```bash
# Check mDNS
dns-sd -G v4 esp32-rf.local

# Browse services
dns-sd -B _http._tcp local.

# Flush DNS
sudo killall -HUP mDNSResponder
```

### Linux
```bash
# Check Avahi
systemctl status avahi-daemon

# Browse mDNS
avahi-browse -a

# Resolve hostname
avahi-resolve -n esp32-rf.local
```

---

## Common Issues

### "Could not resolve host"
- Bonjour/Avahi not installed
- Service not running
- Firewall blocking UDP 5353

### Works sometimes, then stops
- DNS cache issue
- Network change
- Flush DNS cache and retry

### Works on one browser, not another
- Browser-specific mDNS handling
- Try different browser
- Try incognito mode

---

## Summary

| Problem | Solution |
|---------|----------|
| Windows no .local | Install Bonjour |
| Linux no .local | Install Avahi |
| Mac not working | Flush DNS cache |
| None of above work | Use IP address |

---

## Quick Test Checklist

- [ ] Bonjour/Avahi installed?
- [ ] Service running?
- [ ] Can ping `esp32-rf.local`?
- [ ] Same network as ESP32?
- [ ] No VPN active?
- [ ] Router allows multicast?

If all else fails, just use the IP address - it always works!
