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
ping esp32-relay.local
```

If ping works but browser doesn't:
- Try Safari (best mDNS support)
- Clear browser cache
- Try incognito/private mode
- Restart browser

**Step 3: If still not working**
```bash
# Restart mDNS service
sudo launchctl unload -w /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist
sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist
```

### 🪟 For Windows

Windows **doesn't include mDNS by default**. You need to install it:

**Option 1: Install iTunes** (Recommended)
- Download from https://www.apple.com/itunes/download/
- iTunes includes Bonjour (Apple's mDNS service)
- Restart PC after installation

**Option 2: Bonjour Print Services** (Lighter)
- Search Google for "Bonjour Print Services for Windows"
- Download from Apple's support site
- Install and restart

**Option 3: Use Chrome Built-in mDNS**
- Chrome has some built-in mDNS support
- May work without Bonjour

**After Installation:**
```cmd
# Test from Command Prompt
ping esp32-relay.local

# If that works, try browser
http://esp32-relay.local
```

### 🐧 For Linux

Most Linux distributions need Avahi:

```bash
# Ubuntu/Debian
sudo apt-get install avahi-daemon avahi-utils
sudo systemctl start avahi-daemon
sudo systemctl enable avahi-daemon

# Fedora/RHEL
sudo dnf install avahi avahi-tools
sudo systemctl start avahi-daemon
sudo systemctl enable avahi-daemon

# Arch
sudo pacman -S avahi nss-mdns
sudo systemctl start avahi-daemon
sudo systemctl enable avahi-daemon

# Test
avahi-browse -a
ping esp32-relay.local
```

---

## Browser-Specific Issues

### Chrome/Edge
- Clear browsing data (Ctrl+Shift+Delete)
- Clear DNS cache: `chrome://net-internals/#dns` → "Clear host cache"
- Try incognito mode
- Restart browser

### Firefox
- Clear cache
- Try private window
- Settings → Privacy & Security → Clear Data
- Restart browser

### Safari (Mac)
- Usually works best with mDNS
- Clear cache if issues
- Try: Develop → Empty Caches

---

## Testing Steps

### 1. Verify ESP32 is Broadcasting
From a device where it works (your phone), check:
```
http://192.168.x.x/api/mdns/status
```

Should return:
```json
{
  "hostname": "esp32-relay",
  "url": "http://esp32-relay.local",
  "ip": "192.168.x.x",
  "wifi_connected": true
}
```

### 2. Test PC's mDNS Resolution

**Mac/Linux:**
```bash
# Test 1: Basic ping
ping esp32-relay.local

# Test 2: DNS lookup
nslookup esp32-relay.local

# Test 3: mDNS query (Mac)
dns-sd -G v4 esp32-relay.local

# Test 4: mDNS query (Linux)
avahi-resolve -n esp32-relay.local
```

**Windows (with Bonjour):**
```cmd
# Basic ping
ping esp32-relay.local

# If ping works, browser should too
```

### 3. Test from Browser
```
http://esp32-relay.local
```

---

## Common Issues & Solutions

### Issue: "Could not resolve host"
**Cause**: mDNS service not running or not installed

**Solution**:
- **Mac**: Restart mDNSResponder
- **Windows**: Install Bonjour (iTunes or Print Services)
- **Linux**: Install and start avahi-daemon

### Issue: Ping works, browser doesn't
**Cause**: Browser DNS cache

**Solution**:
```
1. Clear browser cache
2. Clear DNS cache (see OS-specific instructions above)
3. Restart browser
4. Try incognito/private mode
5. Try different browser
```

### Issue: Worked before, stopped working
**Cause**: mDNS service crashed or PC DNS cache stale

**Solution**:
```
# Restart mDNS service (see OS-specific instructions)
# Clear DNS cache
# Restart router if necessary
```

### Issue: Works on some PCs, not others
**Cause**: Inconsistent mDNS support

**Solution**:
- Check which PCs have mDNS installed
- Windows PCs need Bonjour installed on each
- Firewall may be blocking UDP port 5353

---

## Network Requirements

For `.local` URLs to work, your network must support:

✅ **Required**:
- Multicast DNS (UDP port 5353)
- Same subnet for all devices
- No AP isolation

❌ **Blocks mDNS**:
- Corporate/enterprise WiFi with client isolation
- Guest networks with device isolation
- VLANs (separate network segments)
- Some routers with "AP Isolation" enabled
- VPN connections

---

## Workaround: Use IP Address

If you can't get `.local` working:

1. **Find ESP32's IP address**:
   - Check serial monitor
   - Check router's DHCP list
   - From phone: visit any ESP32 page, check URL bar

2. **Bookmark the IP**:
   ```
   http://192.168.1.100
   ```

3. **Set static IP** (optional):
   - Configure in your router's DHCP settings
   - Reserve IP for ESP32's MAC address
   - This ensures IP never changes

---

## Firewall Issues

### Windows Firewall
```
1. Control Panel → Windows Defender Firewall
2. Advanced Settings → Inbound Rules
3. Allow UDP port 5353
4. Allow "Bonjour Service"
```

### Mac Firewall
```
System Preferences → Security & Privacy → Firewall
→ Firewall Options
→ Ensure mDNSResponder is allowed
```

### Linux Firewall (UFW)
```bash
sudo ufw allow 5353/udp
sudo ufw reload
```

---

## Verification Checklist

### ESP32 Side (All should be ✅)
- [ ] Serial monitor shows "mDNS Responder started"
- [ ] Works from phone/tablet
- [ ] `/api/mdns/status` returns correct info
- [ ] IP address access works

### PC Side
- [ ] mDNS service installed (Bonjour/Avahi)
- [ ] Can ping `esp32-relay.local`
- [ ] Firewall allows UDP 5353
- [ ] Same network as ESP32
- [ ] No VPN active
- [ ] DNS cache cleared

---

## Summary

| Platform | mDNS Support | Action Needed |
|----------|--------------|---------------|
| **Mac** | Built-in ✅ | Flush DNS cache |
| **Windows** | Not included ❌ | Install Bonjour/iTunes |
| **Linux** | Install needed ⚠️ | Install Avahi |
| **iOS/Android** | Built-in ✅ | Just works |

**The ESP32 is working correctly - your PC just needs mDNS support!**

---

## Quick Command Reference

### Mac
```bash
# Flush DNS
sudo killall -HUP mDNSResponder

# Test
ping esp32-relay.local
dns-sd -G v4 esp32-relay.local
```

### Windows
```cmd
# After installing Bonjour
ping esp32-relay.local
ipconfig /flushdns
```

### Linux
```bash
# Install
sudo apt-get install avahi-daemon

# Test
avahi-resolve -n esp32-relay.local
ping esp32-relay.local
```

---

## Still Not Working?

If you've tried everything:

1. **Use the IP address** instead (perfectly fine!)
2. **Check if on same network** (not guest WiFi)
3. **Disable VPN** temporarily to test
4. **Check router settings** for AP isolation
5. **Try from a different PC** to isolate the issue

**Remember**: The IP address works perfectly fine and is actually more reliable than `.local` URLs in many cases!

