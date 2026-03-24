# ─── buffer.py ────────────────────────────────────────────────────────────────
# Thread-safe local buffer that stores sensor readings during network outages.
# Mirrors the in-memory queue that would live on the ESP32's heap in firmware.

import queue
from src.config import BUFFER_MAX_SIZE


class LocalBuffer:
    def __init__(self):
        self._q = queue.Queue(maxsize=BUFFER_MAX_SIZE)

    def push(self, data: dict) -> bool:
        """
        Add a reading to the buffer.
        Returns False (and drops the item) if the buffer is full.
        """
        try:
            self._q.put_nowait(data)
            return True
        except queue.Full:
            return False

    def pop(self) -> dict | None:
        """Remove and return one reading. Returns None if empty."""
        try:
            return self._q.get_nowait()
        except queue.Empty:
            return None

    def put_back(self, data: dict):
        """Re-insert a reading that failed to send (front of logical queue)."""
        # Python's Queue doesn't support front-insert, so we rebuild.
        # This is called rarely (only on mid-flush failure), so the cost is fine.
        temp = [data]
        while not self._q.empty():
            try:
                temp.append(self._q.get_nowait())
            except queue.Empty:
                break
        for item in temp:
            try:
                self._q.put_nowait(item)
            except queue.Full:
                break  # drop oldest items if somehow over capacity

    def is_empty(self) -> bool:
        return self._q.empty()

    def size(self) -> int:
        return self._q.qsize()