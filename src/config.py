# ─── config.py ────
# Central configuration for the SISF simulator.
# All tunable parameters live here — no magic numbers scattered across modules.

# ThingsBoard connection
THINGSBOARD_HOST = "thingsboard.cloud"   # use "localhost" for local Docker install
THINGSBOARD_PORT = 1883
ACCESS_TOKEN     = "hUinijcHvortyNK4HoeR"

# Timing (seconds)
SENSOR_INTERVAL  = 5    # how often sensors are "read"
FLUSH_INTERVAL   = 3    # how often the buffer tries to flush when online

# Buffer
BUFFER_MAX_SIZE  = 500  # max readings to hold; oldest are dropped if exceeded