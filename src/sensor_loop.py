# ─── sensor_loop.py ───────────────────────────────────────────────────────────
# Runs on its own thread.
# Reads sensors at every SENSOR_INTERVAL, then decides: send or buffer.

import time
from src import sensor, logger
from src.config      import SENSOR_INTERVAL
from src.buffer      import LocalBuffer
from src.mqtt_client import MqttClient
from src.network     import NetworkState


def run(buf: LocalBuffer, mqtt: MqttClient, network: NetworkState):
    """
    Main sensor loop — intended to be run in a daemon thread.

    Decision logic:
      1. Read sensor data.
      2. If network is online → try to send directly.
         - On success  → log SENT.
         - On failure  → fall back to buffer.
      3. If network is offline → push to buffer immediately.
    """
    while True:
        data = sensor.read()

        if network.is_online():
            success = mqtt.publish(data)
            if success:
                logger.sent(data)
            else:
                buf.push(data)
                logger.buffered(data, buf.size(), reason="send failed")
        else:
            buf.push(data)
            logger.buffered(data, buf.size(), reason="offline")

        time.sleep(SENSOR_INTERVAL)