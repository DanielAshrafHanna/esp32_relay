# ESP32 Relay Controller - User Guide

## Quick Start

This guide will help you set up your ESP32 relay controller, connect it to WiFi, and configure MQTT.

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
   - **WiFi Name (SSID):** `ESP32-Relay-Setup`
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
   http://esp32-relay.local
   ```

2. **Using IP Address:**
   - Check the serial monitor for the IP address
   - Example: `http://192.168.1.100`

---

## Step 4: Configure MQTT

### Default MQTT Settings

- **Server:** `192.168.68.100`
- **Port:** `1883`
- **Username:** `solacemqtt`
- **Password:** `solacepass`
- **Hostname:** `esp32-relay` (used for MQTT topics)

### Change MQTT Settings

You can change MQTT settings in two ways:

#### Option 1: Via Admin Page (Recommended)

1. Go to: `http://esp32-relay.local/solaceadmin`
2. **Login:**
   - **Username:** `admin`
   - **Password:** `Solacepass@123`
3. Click on "MQTT Settings"
4. Enter your new MQTT server details
5. Click "Save"
6. The device will restart automatically

#### Option 2: Via WiFi Portal

1. Reset WiFi settings (see "Reset WiFi" section below)
2. Connect to `ESP32-Relay-Setup` WiFi again
3. Enter new MQTT settings in the portal

---

## Step 5: Admin Settings

### Access Admin Page

- **URL:** `http://esp32-relay.local/solaceadmin`
- **Username:** `admin`
- **Password:** `Solacepass@123`

### What You Can Change in Admin:

1. **Active Relay Count**
   - Options: 8, 12, or 16 relays
   - Default: 16

2. **MQTT Settings**
   - Server IP address
   - Port number
   - Username
   - Password
   - Hostname (for MQTT topics - this is separate from mDNS hostname)

---

## All Usernames and Passwords

### WiFi Access Point (First Setup)
- **SSID:** `ESP32-Relay-Setup`
- **Password:** `12345678`

### Admin Web Interface
- **Username:** `admin`
- **Password:** `Solacepass@123`

### MQTT Broker (Default)
- **Server:** `192.168.68.100`
- **Port:** `1883`
- **Username:** `solacemqtt`
- **Password:** `solacepass`
- **Hostname:** `esp32-relay`

---

## Settings You Can Change

### Device Settings (in `config.h` file)

1. **Device Name**
   - Default: `ESP32-Relay`
   - Change: `#define DEVICE_NAME "YourName"`

2. **Access Point Name**
   - Default: `ESP32-Relay-Setup`
   - Change: `#define AP_NAME "YourAPName"`

3. **Access Point Password**
   - Default: `12345678`
   - Change: `#define AP_PASSWORD "YourPassword"`

4. **Number of Relays**
   - Default: `16`
   - Change: `#define NUM_RELAYS 16`

5. **Relay GPIO Pins**
   - Default pins: 13, 12, 14, 27, 26, 25, 33, 32, 2, 4, 16, 17, 18, 19, 21, 22
   - Change in: `RELAY_PINS` array

6. **Relay Names**
   - Default: "Relay 1", "Relay 2", etc.
   - Change in: `RELAY_NAMES` array

7. **mDNS Hostname**
   - Default: `esp32-relay`
   - Change: `#define MDNS_HOSTNAME "your-hostname"`
   - Access at: `http://your-hostname.local`

8. **Web Server Port**
   - Default: `80`
   - Change: `#define WEB_SERVER_PORT 80`

9. **Portal Timeout**
   - Default: `180` seconds (3 minutes)
   - Change: `#define PORTAL_TIMEOUT 180`

10. **RF Receiver Pin**
    - Default: `15`
    - Change: `#define RF_RECEIVER_PIN 15`

### Settings You Can Change via Web Interface

1. **Active Relay Count** (8, 12, or 16)
   - Via Admin page

2. **MQTT Server Settings**
   - Via Admin page or WiFi portal

3. **WiFi Network**
   - Via WiFi portal (reset WiFi to change)

---

## Reset WiFi Settings

If you need to change your WiFi network:

1. **Via Web Interface:**
   - Go to: `http://esp32-relay.local`
   - Click "Reset WiFi" button
   - Device will restart and create access point again

2. **Via Serial Monitor:**
   - Send command to reset (if available)

3. **Physical Reset:**
   - Hold the reset button on ESP32 (if available)

---

## Troubleshooting

### Cannot Connect to WiFi AP
- Make sure you're connecting to `ESP32-Relay-Setup`
- Password is: `12345678`
- Try restarting the ESP32

### Cannot Access Web Interface
- Check serial monitor for the IP address
- Try using IP address instead of `esp32-relay.local`
- Make sure you're on the same WiFi network

### MQTT Not Connecting
- Verify MQTT server IP is correct
- Check MQTT server is running
- Verify username and password are correct
- Check firewall allows port 1883

### Relays Not Working
- Check wiring connections
- Verify GPIO pins in `config.h` match your hardware
- Check relay module power supply

---

## Quick Reference

### Default URLs
- **Main Page:** `http://esp32-relay.local`
- **Admin Page:** `http://esp32-relay.local/solaceadmin`
- **Restart Page:** `http://esp32-relay.local/restart`

### Default Credentials Summary
- **WiFi AP:** `ESP32-Relay-Setup` / `12345678`
- **Admin:** `admin` / `Solacepass@123`
- **MQTT:** `solacemqtt` / `solacepass` @ `192.168.68.100:1883` (hostname: `esp32-relay`)

---

## Need Help?

- Check the serial monitor for error messages
- Review the other documentation files in this project
- Verify all settings match your network configuration

---

**That's it! Your ESP32 Relay Controller should now be set up and ready to use.**

