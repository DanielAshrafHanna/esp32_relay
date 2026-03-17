# ESP32 RF Bin Monitor

ESP32 firmware for a waste-bin monitoring system that receives 433 MHz RF signals and reports bin state to:

- the hosted trash monitoring web app by webhook
- MQTT / Home Assistant for future automation and integration

This README is the current source of truth for how the firmware works, how it is configured, and how to set up a new device.

## What This Project Does

Each trash bin uses:
- one RF transmitter for `FULL`
- one RF transmitter for `NORMAL` / empty
- one ESP32 with a 433 MHz RF receiver

The ESP32:
- learns exactly 2 RF signals total
  - one signal labeled `FULL`
  - one signal labeled `NORMAL`
- detects those signals through the RF receiver
- sends a webhook to the online dashboard
- still publishes MQTT states so Home Assistant can be used later
- stores all settings in ESP32 preferences so they survive reboot

## Current System Architecture

Bin sensor/transmitter flow:

1. Full sensor triggers RF transmitter A
2. Empty sensor triggers RF transmitter B
3. ESP32 receives RF
4. ESP32 maps the RF code to either `FULL` or `NORMAL`
5. ESP32 sends a webhook to the hosted app
6. ESP32 also publishes MQTT state topics

Hosted web app:
- Repo: `trash-monitor-web`
- Production URL: [https://trash-monitor-web.vercel.app](https://trash-monitor-web.vercel.app)
- Webhook endpoint: [https://trash-monitor-web.vercel.app/api/bin-event](https://trash-monitor-web.vercel.app/api/bin-event)

## Current Firmware Behavior

### RF behavior

- Supports exactly 2 learned RF codes
- One code is assigned to `FULL`
- One code is assigned to `NORMAL`
- Re-learning a state replaces the previously stored code for that same state
- RF noise filtering is enabled:
  - minimum bit length filter
  - receive tolerance tightening
  - cooldown to reduce repeated triggers

### Webhook behavior

When a known RF code is received, the ESP32 sends:

```json
{
  "deviceId": "esp32-bin-01",
  "fullnessPercent": "FULL"
}
```

or

```json
{
  "deviceId": "esp32-bin-01",
  "fullnessPercent": "NORMAL"
}
```

Notes:
- `deviceId` is configurable from the ESP admin page
- `deviceId` is automatically normalized to lowercase with spaces converted to hyphens
- `fullnessPercent` is intentionally used as the current web app field name, but its actual values are now `FULL` or `NORMAL`
- if `Webhook Secret` is configured, the firmware sends it in the `x-webhook-secret` header

### MQTT behavior

MQTT is still active.

On RF trigger:
- the matching MQTT state topic is published `ON`
- after the configured trigger duration it is published `OFF`

This preserves Home Assistant compatibility for future use.

## Hardware

Minimum device hardware:
- ESP32 development board
- 433 MHz RF receiver module such as SYN480R
- power supply for the ESP32
- 2 RF transmitters per trash bin

Example RF receiver wiring:

```text
SYN480R Receiver -> ESP32
VCC              -> 3.3V or 5V
GND              -> GND
DATA             -> GPIO 22
```

The RF input pin is controlled by [include/config.h](C:\Users\danie\Desktop\RF module\esp32_relay\include\config.h).

## Important Files

- [src/main.cpp](C:\Users\danie\Desktop\RF module\esp32_relay\src\main.cpp)
  Main firmware logic
- [include/config.h](C:\Users\danie\Desktop\RF module\esp32_relay\include\config.h)
  Compile-time defaults
- [data/admin.html](C:\Users\danie\Desktop\RF module\esp32_relay\data\admin.html)
  Admin configuration UI
- [data/rf_manager.html](C:\Users\danie\Desktop\RF module\esp32_relay\data\rf_manager.html)
  RF learning UI
- [platformio.ini](C:\Users\danie\Desktop\RF module\esp32_relay\platformio.ini)
  Build config

## Configurable Settings

### Compile-time defaults

Defined in [include/config.h](C:\Users\danie\Desktop\RF module\esp32_relay\include\config.h):

- `DEVICE_NAME`
- `AP_NAME`
- `AP_PASSWORD`
- `MDNS_HOSTNAME`
- `RF_RECEIVER_PIN`
- `RF_TRIGGER_DURATION`
- `RF_COOLDOWN_TIME`
- `RF_MIN_BIT_LENGTH`
- `DEFAULT_WEBHOOK_URL`
- `DEFAULT_WEBHOOK_SECRET`

### Runtime settings stored in preferences

Configured from the ESP web UI and saved in NVS:

- WiFi credentials
- MQTT server
- MQTT port
- MQTT username
- MQTT password
- MQTT hostname
- Webhook URL
- Webhook Device ID
- Webhook Secret
- Learned RF codes and their state mapping

## Web UI

After WiFi setup, the ESP serves a local web interface.

Main URLs:

```text
Main page:      http://esp32-rf.local
Admin page:     http://esp32-rf.local/solaceadmin
RF manager:     http://esp32-rf.local/rf_manager.html
```

You can also use the device IP address instead of `.local`.

### Admin page

The admin page is used to configure:
- MQTT connection details
- MQTT hostname
- Webhook URL
- Webhook Device ID
- Webhook Secret

Current default webhook URL is already prefilled:

```text
https://trash-monitor-web.vercel.app/api/bin-event
```

### RF Manager page

The RF Manager is used to learn exactly 2 signals:
- `FULL`
- `NORMAL`

You no longer need to manually name RF signals.

Internally the firmware labels them as:
- `Full Sensor`
- `Empty Sensor`

## First-Time Setup

### 1. Build requirements

You need:
- PlatformIO
- USB serial drivers for your ESP32 board

### 2. Upload order

This project requires two uploads:

1. Filesystem upload
2. Firmware upload

If you forget the filesystem upload, the web pages will not work.

### 3. Upload commands

If `pio` is available:

```bash
pio run --target uploadfs
pio run --target upload
pio device monitor --baud 115200
```

If you are using the Python-installed PlatformIO:

```powershell
& 'C:\Users\danie\AppData\Local\Programs\Python\Python312\python.exe' -m platformio run --target uploadfs
& 'C:\Users\danie\AppData\Local\Programs\Python\Python312\python.exe' -m platformio run --target upload
& 'C:\Users\danie\AppData\Local\Programs\Python\Python312\python.exe' -m platformio device monitor --baud 115200
```

### 4. WiFi setup

On first boot or after reset:
- the ESP creates an access point
- connect to the AP
- use the captive portal to configure WiFi and initial settings

Default AP settings:

```text
SSID: ESP32-RF-Setup
Password: 12345678
```

### 5. Admin page setup

Open the admin page and configure:

- MQTT settings
- `Webhook URL`
- `Webhook Device ID`
- `Webhook Secret` if required

Recommended values:

```text
Webhook URL:       https://trash-monitor-web.vercel.app/api/bin-event
Webhook Device ID: esp32-bin-01
```

Important:
- `Webhook Device ID` must match a real `deviceId` in the web app database
- if you type spaces in the ESP admin page, the firmware saves the value in normalized form
- example: `Dany Test` becomes `dany-test`
- if the web app has `WEBHOOK_SECRET` enabled, the same value must be entered in `Webhook Secret` on the device

### 6. Learn RF codes

Open the RF Manager page and do this:

1. Select `FULL`
2. Start learning
3. Trigger the full transmitter
4. Wait for success
5. Select `NORMAL`
6. Start learning
7. Trigger the empty transmitter
8. Wait for success

After that, the ESP knows which RF code means which bin state.

## End-to-End Test Procedure

### Test the hosted web app first

Make sure the hosted app is reachable:
- [https://trash-monitor-web.vercel.app](https://trash-monitor-web.vercel.app)

### Test webhook manually

Example `FULL` test:

```powershell
curl.exe -X POST "https://trash-monitor-web.vercel.app/api/bin-event" -H "Content-Type: application/json" -d "{\"deviceId\":\"esp32-bin-02\",\"fullnessPercent\":\"FULL\"}"
```

Example `NORMAL` test:

```powershell
curl.exe -X POST "https://trash-monitor-web.vercel.app/api/bin-event" -H "Content-Type: application/json" -d "{\"deviceId\":\"esp32-bin-02\",\"fullnessPercent\":\"NORMAL\"}"
```

If the webhook secret is enabled again later:

```powershell
curl.exe -X POST "https://trash-monitor-web.vercel.app/api/bin-event" -H "Content-Type: application/json" -H "x-webhook-secret: YOUR_SECRET" -d "{\"deviceId\":\"esp32-bin-02\",\"fullnessPercent\":\"FULL\"}"
```

### Re-enable secured webhooks

If webhook authentication is re-enabled on the hosted app:

1. Add `WEBHOOK_SECRET` in Vercel
2. Redeploy the web app
3. Open each device admin page
4. Enter the same value in `Webhook Secret`
5. Save the settings
6. Test one `FULL` and one `NORMAL` event

If the secret does not match, the hosted app will reject the request with:

```json
{"error":"Unauthorized"}
```

### Test from RF

After learning both RF codes:

1. Trigger `FULL` transmitter
2. Watch the dashboard update to `FULL`
3. Trigger `NORMAL` transmitter
4. Watch the dashboard update to `NORMAL`

## Webhook and Backend Notes

The ESP does not create new bins automatically in the web app.

This means:
- changing `Webhook Device ID` on the ESP does not create a new dashboard entity by itself
- a matching record must already exist in the hosted app database

The hosted app updates an existing bin by:
- `deviceId`

## API Endpoints Exposed by the ESP

### General

- `GET /api/wifi`
- `GET /api/mqtt`
- `GET /api/mdns/status`
- `POST /api/reset`
- `POST /api/restart`
- `POST /api/mdns/restart`
- `POST /api/mqtt/rediscover`

### Admin

- `GET /api/admin/config`
- `POST /api/admin/mqtt`

Admin endpoints use HTTP Basic Auth:

```text
Username: admin
Password: Solacepass@123
```

### RF

- `GET /api/rf/codes`
- `GET /api/rf/status`
- `POST /api/rf/learn`
- `POST /api/rf/stop`
- `POST /api/rf/delete`
- `POST /api/rf/clear`

## MQTT Topics

The current firmware still publishes MQTT topics like:

```text
homeassistant/switch/<mqtt_hostname>/availability
homeassistant/switch/<mqtt_hostname>/rf_0/state
homeassistant/switch/<mqtt_hostname>/rf_1/state
```

Home Assistant discovery is still published for the learned RF entries.

## Current Defaults and Credentials

### Access point

```text
SSID: ESP32-RF-Setup
Password: 12345678
```

### Admin page

```text
Username: admin
Password: Solacepass@123
```

### Hardcoded MQTT defaults

These are only defaults and should normally be changed from the admin page:

```text
Server:   192.168.68.100
Port:     1883
User:     solacemqtt
Password: solacepass
Hostname: esp32-rf
```

### Default webhook

```text
Webhook URL: https://trash-monitor-web.vercel.app/api/bin-event
```

## Known Limitations

- Flash usage is high, around 91%, so feature expansion should be done carefully
- The firmware currently sends webhook state immediately on RF trigger, but it does not queue failed webhook deliveries for retry
- MQTT support is still present even though the device is now primarily used for webhook reporting
- The admin page still contains some wording from older relay-oriented versions and may be worth cleaning further if this becomes a production-facing maintenance tool

## Troubleshooting

### Web interface does not load

Most common cause: filesystem was not uploaded.

Typical error:

```text
[E][vfs_api.cpp:105] open(): /littlefs/index.html does not exist
```

Fix:

```bash
pio run --target uploadfs
```

### RF signal is not detected

Check:
- receiver wiring
- power supply
- correct GPIO in config
- transmitter range
- transmitter battery

### Dashboard does not update

Check:
- WiFi connected
- webhook URL correct
- `Webhook Device ID` matches a record in the web app
- `Webhook Secret` matches the `WEBHOOK_SECRET` value in Vercel if auth is enabled
- hosted web app is online

### MQTT is not connecting

Check:
- broker IP / hostname
- port
- username and password
- same network reachability

### Learned wrong RF signal

Use RF Manager:
- delete the wrong entry
- relearn the correct state

Because there are only 2 RF slots now, relearning `FULL` replaces the old `FULL` signal, and relearning `NORMAL` replaces the old `NORMAL` signal.

## Recommended Deployment Pattern

For each physical trash bin:

1. Prepare one ESP32 receiver unit
2. Configure unique values:
   - `Webhook Device ID`
3. Learn:
   - one `FULL` transmitter
   - one `NORMAL` transmitter
4. Test both transitions against the hosted app

Example:

```text
Webhook Device ID: esp32-bin-07
RF signal 1:       FULL
RF signal 2:       NORMAL
```

## Useful Repos

Firmware repo:
- this project

Hosted dashboard repo:
- `trash-monitor-web`

Production dashboard:
- [https://trash-monitor-web.vercel.app](https://trash-monitor-web.vercel.app)

## Maintenance Notes

If someone continues this project later, the most important current assumptions are:

- one ESP32 handles one physical bin
- one bin uses two RF transmitters
- webhook reporting is the main operational path
- MQTT remains enabled for future Home Assistant integration
- the hosted app expects existing bin/device records and does not auto-create them from the ESP

## Build Verification

The current firmware state in this workspace was compiled successfully with PlatformIO after the webhook and FULL/NORMAL RF changes.
