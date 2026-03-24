# ─── mqtt_client.py ───────────────────────────────────────────────────────────
# Wraps paho-mqtt with a simple connect / publish interface.
# All ThingsBoard-specific MQTT details (topic, auth) are isolated here.

import json
import paho.mqtt.client as mqtt
from src.config import THINGSBOARD_HOST, THINGSBOARD_PORT, ACCESS_TOKEN

TELEMETRY_TOPIC = "v1/devices/me/telemetry"


class MqttClient:
    def __init__(self):
        self._client = mqtt.Client()
        self._client.username_pw_set(ACCESS_TOKEN)
        self._connected = False

        self._client.on_connect    = self._on_connect
        self._client.on_disconnect = self._on_disconnect

    # ── callbacks ─────────────────────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        self._connected = (rc == 0)
        status = "connected" if self._connected else f"failed (rc={rc})"
        print(f"[MQTT] {status}")

    def _on_disconnect(self, client, userdata, rc):
        self._connected = False
        print(f"[MQTT] Disconnected (rc={rc})")

    # ── public API ─────────────────────────────────────────────────────────────

    def connect(self) -> bool:
        """Try to establish a connection. Returns True if successful."""
        try:
            self._client.connect(THINGSBOARD_HOST, THINGSBOARD_PORT, keepalive=60)
            self._client.loop_start()
            return True
        except Exception as e:
            print(f"[MQTT] Connection error: {e}")
            return False

    def publish(self, data: dict) -> bool:
        """
        Send one telemetry payload to ThingsBoard.
        Returns True on success.
        """
        if not self._connected:
            return False
        try:
            result = self._client.publish(
                topic=TELEMETRY_TOPIC,
                payload=json.dumps(data),
                qos=1
            )
            return result.rc == mqtt.MQTT_ERR_SUCCESS
        except Exception:
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected