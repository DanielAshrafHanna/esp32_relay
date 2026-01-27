# ESP32 RF-to-MQTT Bridge - User Guide

## Quick Start

This guide will help you set up your ESP32 RF-to-MQTT bridge, connect it to WiFi, and configure MQTT for Home Assistant integration.

---

## Step 1: Initial Setup

### Upload the Code

1. **Install PlatformIO** (if not already installed)
   - Install VS Code
   - Install the PlatformIO IDE extension

2. **Upload the Filesystem** (Web Interface)
   ```bash
   pio run --target uploadfs
   ```

3. **Upload the Code**
   ```bash
   pio run --target upload
   ```

4. **Open Serial Monitor** (to see what's happening)
   ```bash
   pio device monitor
   ```

---

## Step 2: Connect to WiFi

### First Time Setup

1. **Power on your ESP32**
   - The device will create a WiFi access point

2. **Connect to the ESP32 WiFi Network**
   - **WiFi Name (SSID):** `ESP32-RF-Setup`
   - **Password:** `12345678`
   
3. **Configure Your Settings**
   - A configuration page should open automatically
   - If not, open your browser and go to: `http://192.168.4.1`

4. **Enter Your Information:**
   - **WiFi SSID:** Your home WiFi network name
   - **WiFi Password:** Your home WiFi password
   - **MQTT Server IP:** Your MQTT broker IP address (default: `192.168.68.100`)
   - **MQTT Port:** `1883` (default)
   - **MQTT Username:** `solacemqtt` (default)
   - **MQTT Password:** `solacepass` (default)

5. **Click "Save"**
   - The ESP32 will restart and connect to your WiFi

---

## Step 3: Access the Web Interface

After connecting to WiFi, you can access the device in two ways:

1. **Using mDNS (Easy):**
   ```
   http://esp32-rf.local
   ```

2. **Using IP Address:**
   - Check the serial monitor for the IP address
   - Example: `http://192.168.1.100`

---

## Step 4: Learn RF Codes

### Using the RF Manager

1. Go to: `http://esp32-rf.local/rf_manager.html`
   - Or click "RF Manager" from the main page

2. **Enter a name** for your RF device (e.g., "Doorbell", "Remote Button 1")

3. **Click "Start Learning Mode"**

4. **Press the button** on your RF transmitter within 30 seconds

5. **Success!** The code will be captured and saved automatically

### Multiple RF Codes

You can learn up to **10 different RF codes**. Each code:
- Has a custom name you choose
- Creates a separate binary sensor in Home Assistant
- Is stored persistently (survives reboots)

---

## Step 5: Configure MQTT

### Default MQTT Settings

- **Server:** `192.168.68.100`
- **Port:** `1883`
- **Username:** `solacemqtt`
- **Password:** `solacepass`
- **Hostname:** `esp32-rf` (used for MQTT topics)

### Change MQTT Settings

#### Option 1: Via Admin Page (Recommended)

1. Go to: `http://esp32-rf.local/solaceadmin`
2. **Login:**
   - **Username:** `admin`
   - **Password:** `Solacepass@123`
3. Click on "MQTT Settings"
4. Enter your new MQTT server details
5. Click "Save"
6. The device will restart automatically

#### Option 2: Via WiFi Portal

1. Reset WiFi settings (see "Reset WiFi" section below)
2. Connect to `ESP32-RF-Setup` WiFi again
3. Enter new MQTT settings in the portal

---

## Step 6: Home Assistant Integration

### Automatic Discovery

Once your RF codes are learned and MQTT is connected:

1. Open Home Assistant
2. Go to **Settings** → **Devices & Services** → **MQTT**
3. You should see **"ESP32-RF-Bridge"** device
4. Each learned RF code appears as a **binary sensor**

### Using RF Triggers in Automations

```yaml
automation:
  - alias: "Doorbell Notification"
    trigger:
      - platform: state
        entity_id: binary_sensor.rf_doorbell
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          message: "Someone is at the door!"
```

### RF Trigger Behavior

- Triggers turn **ON** when RF signal is received
- Automatically turn **OFF** after 2 seconds
- Perfect for momentary events (doorbells, button presses)

---

## All Usernames and Passwords

### WiFi Access Point (First Setup)
- **SSID:** `ESP32-RF-Setup`
- **Password:** `12345678`

### Admin Web Interface
- **Username:** `admin`
- **Password:** `Solacepass@123`

### MQTT Broker (Default)
- **Server:** `192.168.68.100`
- **Port:** `1883`
- **Username:** `solacemqtt`
- **Password:** `solacepass`
- **Hostname:** `esp32-rf`

---

## Settings You Can Change

### Device Settings (in `config.h` file)

1. **Device Name**
   - Default: `ESP32-RF-Bridge`
   - Change: `#define DEVICE_NAME "YourName"`

2. **Access Point Name**
   - Default: `ESP32-RF-Setup`
   - Change: `#define AP_NAME "YourAPName"`

3. **Access Point Password**
   - Default: `12345678`
   - Change: `#define AP_PASSWORD "YourPassword"`

4. **RF Receiver Pin**
   - Default: `22`
   - Change: `#define RF_RECEIVER_PIN 22`

5. **mDNS Hostname**
   - Default: `esp32-rf`
   - Change: `#define MDNS_HOSTNAME "your-hostname"`
   - Access at: `http://your-hostname.local`

6. **RF Trigger Duration**
   - Default: `2000` (2 seconds)
   - Change: `#define RF_TRIGGER_DURATION 2000`

---

## Reset WiFi Settings

If you need to change your WiFi network:

1. **Via Web Interface:**
   - Go to: `http://esp32-rf.local`
   - Click "Reset WiFi" button
   - Device will restart and create access point again

2. **Via Serial Monitor:**
   - Send command to reset (if available)

---

## Troubleshooting

### Cannot Connect to WiFi AP
- Make sure you're connecting to `ESP32-RF-Setup`
- Password is: `12345678`
- Try restarting the ESP32

### Cannot Access Web Interface
- Check serial monitor for the IP address
- Try using IP address instead of `esp32-rf.local`
- Make sure you're on the same WiFi network

### MQTT Not Connecting
- Verify MQTT server IP is correct
- Check MQTT server is running
- Verify username and password are correct
- Check firewall allows port 1883

### RF Code Not Capturing
- Check receiver wiring (DATA to GPIO 22)
- Verify power supply (3.3V or 5V)
- Move transmitter closer
- Try different buttons on the transmitter

### RF Trigger Not Appearing in Home Assistant
- Ensure MQTT is connected (check web interface)
- Verify a code has been learned
- Restart Home Assistant
- Check MQTT integration logs

---

## Quick Reference

### Default URLs
- **Main Page:** `http://esp32-rf.local`
- **Admin Page:** `http://esp32-rf.local/solaceadmin`
- **RF Manager:** `http://esp32-rf.local/rf_manager.html`

### Default Credentials Summary
- **WiFi AP:** `ESP32-RF-Setup` / `12345678`
- **Admin:** `admin` / `Solacepass@123`
- **MQTT:** `solacemqtt` / `solacepass` @ `192.168.68.100:1883` (hostname: `esp32-rf`)

---

## Use Cases

### Doorbell Integration
- Learn your doorbell's RF signal
- Trigger Home Assistant notifications
- Turn on porch light automatically

### Panic Button
- Use RF key fob as emergency alert
- Trigger security actions
- Send notifications to phone

### Remote Scene Control
- Press RF button to activate scene
- No need to open phone/dashboard
- Physical button convenience

### Garage Door Sensor
- Learn garage door opener signal
- Track door open/close events
- Automate lights when entering

---

## Need Help?

- Check the serial monitor for error messages
- Review the other documentation files in this project
- Verify all settings match your network configuration

---

**That's it! Your ESP32 RF-to-MQTT Bridge should now be set up and ready to use.**
