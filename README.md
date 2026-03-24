# SISF Local Buffer Simulator

A development simulation tool for the **Smart Intelligent Sustainable Farming (SISF)** capstone project. Simulates the local buffering mechanism of an ESP32 device — storing sensor readings during network outages and flushing them to ThingsBoard once connectivity is restored — without requiring physical hardware.

Two implementations are provided and functionally identical: one in **Python**, one in **Node.js**.

---

## Table of Contents

- [Background](#background)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [ThingsBoard](#1-thingsboard)
  - [Python](#2a-python-setup)
  - [Node.js](#2b-nodejs-setup)
- [Configuration](#configuration)
- [Running the Simulator](#running-the-simulator)
- [CLI Commands](#cli-commands)
- [Simulated Sensor Data](#simulated-sensor-data)
- [Module Reference](#module-reference)
- [Replacing Simulation with Real Hardware](#replacing-simulation-with-real-hardware)
- [Python vs Node.js](#python-vs-nodejs)

---

## Background

In real agricultural environments, internet connectivity is not always stable. The SISF system addresses this with a **local buffering mechanism**: the ESP32 microcontroller stores sensor readings in memory when the network is unavailable, then transmits all buffered data to ThingsBoard (in the correct chronological order) once the connection is restored.

This simulator replicates that behaviour in software so the ThingsBoard dashboard, MQTT pipeline, and buffer logic can all be developed and tested before the physical ESP32 and sensors are available.

---

## How It Works

```
Sensor read (every 5s)
        │
        ▼
  Network online? ──── YES ──► Publish to ThingsBoard via MQTT
        │
       NO
        │
        ▼
  Push to local buffer
        │
        ▼
  Flush loop (every 3s) ── network back online? ── YES ──► Drain buffer → ThingsBoard
```

Two loops run concurrently:

- **Sensor loop** — reads simulated sensor data every `SENSOR_INTERVAL` seconds. Sends directly if online, otherwise pushes to the local buffer.
- **Flush loop** — checks every `FLUSH_INTERVAL` seconds. When the network is online and the buffer is non-empty, it drains all queued readings to ThingsBoard in FIFO order, preserving the original timestamps.

Each reading carries a `ts` field (UNIX timestamp in milliseconds). ThingsBoard uses this to record the measurement at its *original* time, not the time it arrived — so data collected during an outage appears correctly on the historical chart after flushing.

---

## Project Structure

Both implementations share the same module layout:

```
sisf-simulator-python/              sisf-simulator-nodejs/
├── main.py                         ├── main.js
├── requirements.txt                ├── package.json
└── src/                            └── src/
    ├── __init__.py                     ├── config.js
    ├── config.py       ◄─────────►     ├── sensor.js
    ├── sensor.py                       ├── buffer.js
    ├── buffer.py                       ├── mqttClient.js
    ├── mqtt_client.py                  ├── network.js
    ├── network.py                      ├── sensorLoop.js
    ├── sensor_loop.py                  ├── flushLoop.js
    └── flush_loop.py                   └── logger.js
    └── logger.py
```

Each file has exactly one responsibility. See [Module Reference](#module-reference) for details.

---

## Prerequisites

| Requirement | Python version | Node.js version |
|---|---|---|
| Runtime | Python 3.10+ | Node.js 18+ |
| Package manager | pip | npm |
| MQTT library | paho-mqtt 2.1.0 | mqtt 5.x |
| ThingsBoard account | either version | either version |

---

## Setup

### 1. ThingsBoard

You need a ThingsBoard instance before running either simulator.

**Option A — ThingsBoard Cloud (recommended for development):**

1. Register a free account at [https://thingsboard.cloud](https://thingsboard.cloud).
2. Go to **Devices** → click **"+"** → **Add new device** → name it `SISF-Simulator`.
3. Open the device → **Manage credentials** → copy the **Access Token**.

**Option B — Local Docker install (fully offline):**

```bash
docker run -it -p 9090:9090 -p 1883:1883 thingsboard/tb-postgres
```

Open `http://localhost:9090`. Default credentials: `tenant@thingsboard.org` / `tenant`. Then follow steps 2–3 above, and set `THINGSBOARD_HOST` to `"localhost"` in the config file.

**Dashboard setup:**

1. Go to **Dashboards** → **"+"** → **Create new dashboard** → name it `SISF Monitor`.
2. Open the dashboard → **Edit mode** → **Add widget**.
3. Add a **Time series chart** widget — select your device, add keys: `temperature`, `humidity`, `tds`.
4. Optionally add a **Latest values** card with the same keys for a live readout.

---

### 2a. Python Setup

```bash
cd sisf-simulator-python

# Install dependency
pip install -r requirements.txt

# Set your Access Token (see Configuration section)
# Edit src/config.py
```

---

### 2b. Node.js Setup

```bash
cd sisf-simulator-nodejs

# Install dependency
npm install

# Set your Access Token (see Configuration section)
# Edit src/config.js
```

---

## Configuration

All settings are in a single config file. Edit this before running.

**Python** → `src/config.py`  
**Node.js** → `src/config.js`

| Parameter | Default | Description |
|---|---|---|
| `THINGSBOARD_HOST` | `"thingsboard.cloud"` | ThingsBoard server hostname. Use `"localhost"` for Docker. |
| `THINGSBOARD_PORT` | `1883` | MQTT broker port. |
| `ACCESS_TOKEN` | `"YOUR_DEVICE_ACCESS_TOKEN_HERE"` | Device access token from ThingsBoard. **Must be set before running.** |
| `SENSOR_INTERVAL` | `5` (Python: seconds) / `5000` (Node.js: ms) | How often sensors are read. |
| `FLUSH_INTERVAL` | `3` (Python: seconds) / `3000` (Node.js: ms) | How often the buffer flush loop runs. |
| `BUFFER_MAX_SIZE` | `500` | Maximum readings held in buffer. Oldest are dropped if exceeded. |

---

## Running the Simulator

**Python:**
```bash
cd sisf-simulator-python
python main.py
```

**Node.js:**
```bash
cd sisf-simulator-nodejs
node main.js
# or: npm start
```

Expected output on startup:
```
=============================================
   SISF Local Buffer Simulator (Python)
=============================================
  Host           : thingsboard.cloud
  Sensor interval: 5s
  Flush interval : 3s

  Commands: offline | online | status | quit
=============================================

[MQTT] connected
[10:42:01] SENT      temp=28.45°C  humidity=67.12%  tds=312.88 ppm
[10:42:06] SENT      temp=31.02°C  humidity=72.50%  tds=421.34 ppm
```

---

## CLI Commands

Type any of these commands while the simulator is running:

| Command | Effect |
|---|---|
| `offline` | Simulates network loss. New readings go to the local buffer instead of ThingsBoard. |
| `online` | Simulates network restoration. The flush loop drains the buffer to ThingsBoard. |
| `status` | Prints current network state and buffer size. |
| `quit` | Exits the simulator. |

**Testing the buffer — step by step:**

```
1. Start the simulator. Confirm SENT messages appear.
2. Type: offline
3. Wait 20–30 seconds. Observe BUFFERED messages accumulating.
4. Check ThingsBoard dashboard — the chart should have stopped updating.
5. Type: online
6. Observe FLUSH messages — all buffered readings are sent in order.
7. Check ThingsBoard — the gap in the chart is filled with the correct timestamps.
```

---

## Simulated Sensor Data

The `sensor` module generates randomised readings within realistic agricultural ranges:

| Field | Type | Range | Unit | Real sensor |
|---|---|---|---|---|
| `ts` | integer | current UNIX time | milliseconds | — |
| `temperature` | float | 24.0 – 35.0 | °C | DHT22 |
| `humidity` | float | 55.0 – 85.0 | % | DHT22 |
| `tds` | float | 150.0 – 600.0 | ppm | TDS sensor |

Each reading is published as a single JSON object:

```json
{
  "ts": 1742345600000,
  "temperature": 28.45,
  "humidity": 67.12,
  "tds": 312.88
}
```

---

## Module Reference

### `config` — Central configuration
All tunable constants. The only file that needs editing for environment-specific settings (host, token, timing). No business logic.

### `sensor` — Sensor simulation
Single function `read()` that returns one data packet. **This is the only module that changes when moving to real hardware** — replace the random number generation with actual DHT22 and TDS library calls.

### `buffer` — Local FIFO queue
Thread-safe (Python: `queue.Queue`) / single-threaded-safe (Node.js: plain array) queue with `push`, `pop`, and `put_back`. `put_back` re-inserts a failed reading at the front so ordering is preserved on mid-flush failures. Drops oldest readings silently when `BUFFER_MAX_SIZE` is reached.

### `mqtt_client` / `mqttClient` — MQTT connection
Wraps `paho-mqtt` (Python) or the `mqtt` npm package (Node.js). Exposes only `connect()` and `publish(data)`. All ThingsBoard-specific details (topic name, auth format) are contained here — nothing else in the project knows about them.

### `network` — Network state
A single boolean flag with a thread-safe getter/setter. Represents whether the simulated network is currently available. On real hardware, replace `is_online()` with a `WiFi.status()` check.

### `sensor_loop` / `sensorLoop` — Sensor read loop
Runs every `SENSOR_INTERVAL`. Calls `sensor.read()`, then decides: publish directly if online, otherwise push to buffer. Contains the core send-or-buffer decision logic.

### `flush_loop` / `flushLoop` — Buffer flush loop
Runs every `FLUSH_INTERVAL`. When both online and buffer is non-empty, drains the queue one item at a time with a 200ms pacing delay. If a publish fails mid-flush, the item is put back and the cycle stops to avoid hammering the broker.

### `logger` — Console output
Colour-coded log functions (`sent`, `buffered`, `flushing`, `flushed`, `status`, `error`). Centralised here so the output format can be changed in one place — or swapped for a file logger — without touching any other module.

### `main` — Entry point
Instantiates all shared state (`LocalBuffer`, `MqttClient`, `NetworkState`), connects MQTT, starts both loops, and runs the interactive CLI. No business logic — wiring only.

---

## Replacing Simulation with Real Hardware

When the ESP32, DHT22, and TDS sensor are available, only two things need to change in this simulator (or its firmware equivalent):

**1. Replace `sensor.py` / `sensor.js`**

```python
# Current (simulation):
def read() -> dict:
    return {
        "ts":          int(time.time() * 1000),
        "temperature": round(random.uniform(24.0, 35.0), 2),
        "humidity":    round(random.uniform(55.0, 85.0), 2),
        "tds":         round(random.uniform(150.0, 600.0), 2),
    }

# Replace with (real hardware, Arduino/MicroPython):
def read() -> dict:
    temperature, humidity = dht_sensor.read()   # DHT22 library call
    tds = tds_sensor.read()                      # TDS library call
    return {
        "ts":          int(time.time() * 1000),
        "temperature": temperature,
        "humidity":    humidity,
        "tds":         tds,
    }
```

**2. Replace `network.py` / `network.js`**

```python
# Current (simulation — manual toggle):
def is_online(self) -> bool:
    return self._online

# Replace with (real hardware):
def is_online(self) -> bool:
    import network as wifi
    return wifi.WLAN(wifi.STA_IF).isconnected()
```

All other modules — buffer, MQTT client, sensor loop, flush loop, logger — work identically on real hardware.

---

## Python vs Node.js

Both implementations are functionally identical. The choice affects only developer ergonomics and future team workflow.

| Concern | Python | Node.js |
|---|---|---|
| Concurrency model | OS threads (`threading.Thread`) | Single-threaded event loop (`setInterval` + `async/await`) |
| Buffer thread safety | Requires `queue.Queue` (has built-in mutex) | Plain array is safe (no concurrent access possible) |
| AI/ML integration | Native — `scikit-learn`, `tensorflow`, `pandas` all Python | Requires calling out to Python or a REST API |
| Async syntax | `time.sleep()` in threads | `async/await` throughout |
| ESP32 firmware similarity | Moderate | Higher — single-threaded cooperative model matches ESP32 |
| Setup complexity | `pip install -r requirements.txt` | `npm install` |

**Recommendation for SISF: use Python.** The AI prediction phase of the project (May–June per the timeline) depends entirely on Python libraries. Keeping the simulator, data pipeline, and AI model in the same language avoids a hard boundary in the middle of the stack and lets all three team members (IoT, Cyber Security, AI) share utilities and tooling.

Use Node.js only if a real-time web dashboard is added later — in that case, Python handles the device simulator and AI layer while Node.js serves only the dashboard API.

---

## Team

| Name | Student ID | Role |
|---|---|---|
| Richly Harald Januar | 001202300033 | Hardware, local buffer implementation |
| Aurick Ruli Ananta | 001202300127 | Communication protocol, security |
| Nicholas Rezon Tayus | 001202300114 | AI feature, data analysis |

**Advisor:** Williem, M.Sc. — Faculty of Computer Science, President University