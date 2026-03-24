# ─── main.py ──────────────────────────────────────────────────────────────────
# Entry point for the SISF local buffer simulator.
# Wires all modules together and starts the interactive CLI.
#
# Usage:
#   python main.py
#
# CLI commands (type while running):
#   offline  — simulate network loss
#   online   — simulate network restore
#   status   — print current state
#   quit     — exit

import threading
from src.config      import SENSOR_INTERVAL, FLUSH_INTERVAL, THINGSBOARD_HOST
from src.buffer      import LocalBuffer
from src.mqtt_client import MqttClient
from src.network     import NetworkState
from src             import sensor_loop, flush_loop, logger


def main():
    print("=" * 45)
    print("   SISF Local Buffer Simulator (Python)")
    print("=" * 45)
    print(f"  Host           : {THINGSBOARD_HOST}")
    print(f"  Sensor interval: {SENSOR_INTERVAL}s")
    print(f"  Flush interval : {FLUSH_INTERVAL}s")
    print()
    print("  Commands: offline | online | status | quit")
    print("=" * 45 + "\n")

    # ── shared state ──────────────────────────────────────────────────────────
    buf     = LocalBuffer()
    mqtt    = MqttClient()
    network = NetworkState(initially_online=True)

    # ── connect MQTT ──────────────────────────────────────────────────────────
    if not mqtt.connect():
        logger.error("Could not connect to ThingsBoard. Check HOST and ACCESS_TOKEN.")

    # ── background threads ────────────────────────────────────────────────────
    threading.Thread(
        target=sensor_loop.run,
        args=(buf, mqtt, network),
        daemon=True,
        name="SensorLoop"
    ).start()

    threading.Thread(
        target=flush_loop.run,
        args=(buf, mqtt, network),
        daemon=True,
        name="FlushLoop"
    ).start()

    # ── interactive CLI ───────────────────────────────────────────────────────
    while True:
        try:
            cmd = input().strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if cmd == "offline":
            network.set_online(False)
            logger.control("Network set to OFFLINE — data will buffer locally")

        elif cmd == "online":
            network.set_online(True)
            logger.control("Network set to ONLINE — buffer will flush to ThingsBoard")

        elif cmd == "status":
            logger.status(network.is_online(), buf.size())

        elif cmd == "quit":
            print("Exiting.")
            break

        else:
            print("Unknown command. Use: offline | online | status | quit")


if __name__ == "__main__":
    main()