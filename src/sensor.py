# Simulates ESP32 sensor readings.
# On real hardware: replace read() with actual DHT / TDS library calls.

import time
import random


def read() -> dict:
    """
    Returns one sensor reading as a dict.

    Keys:
      ts          – UNIX timestamp in milliseconds (ThingsBoard format)
      temperature – °C  (DHT22 range: ~0–50°C)
      humidity    – %   (DHT22 range: 0–100%)
      tds         – ppm (typical freshwater: 50–500 ppm)
    """
    return {
        "ts":          int(time.time() * 1000),
        "temperature": round(random.uniform(24.0, 35.0), 2),
        "humidity":    round(random.uniform(55.0, 85.0), 2),
        "tds":         round(random.uniform(150.0, 600.0), 2),
    }