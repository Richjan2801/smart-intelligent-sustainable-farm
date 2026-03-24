# ─── flush_loop.py ────────────────────────────────────────────────────────────
# Runs on its own thread.
# Watches for a non-empty buffer + online network, then drains the buffer.

import time
from src import logger
from src.config      import FLUSH_INTERVAL
from src.buffer      import LocalBuffer
from src.mqtt_client import MqttClient
from src.network     import NetworkState


def run(buf: LocalBuffer, mqtt: MqttClient, network: NetworkState):
    """
    Buffer flush loop — intended to be run in a daemon thread.

    Behaviour:
      - Sleeps FLUSH_INTERVAL between checks.
      - When both online AND buffer has data: drain all readings in FIFO order.
      - If a send fails mid-flush, the failed item is put back and the loop
        stops for this cycle (avoids infinite retry hammering the broker).
    """
    while True:
        time.sleep(FLUSH_INTERVAL)

        if not network.is_online() or buf.is_empty():
            continue

        count = buf.size()
        logger.flushing(count)

        flushed = 0
        while not buf.is_empty():
            data = buf.pop()
            if data is None:
                break

            success = mqtt.publish(data)
            if success:
                flushed += 1
                time.sleep(0.2)  # small pacing delay — avoids flooding the broker
            else:
                buf.put_back(data)
                logger.flush_retry()
                break

        logger.flushed(flushed)