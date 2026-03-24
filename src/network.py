# ─── network.py ───────────────────────────────────────────────────────────────
# Manages the simulated network state.
# On real hardware: replace is_online() with a WiFi.status() check in firmware.

import threading


class NetworkState:
    def __init__(self, initially_online: bool = True):
        self._online = initially_online
        self._lock   = threading.Lock()

    def set_online(self, state: bool):
        with self._lock:
            self._online = state

    def is_online(self) -> bool:
        with self._lock:
            return self._online