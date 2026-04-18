CREATE TABLE IF NOT EXISTS devices (
    dev_id      SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id          SERIAL PRIMARY KEY,
    dev_id      INTEGER      NOT NULL REFERENCES devices(dev_id),
    dev_status  VARCHAR(10)  NOT NULL CHECK (dev_status IN ('online', 'offline')),
    tem         NUMERIC(5,2),
    hum         NUMERIC(5,2),
    recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sensor_data_dev_id     ON sensor_data (dev_id);
CREATE INDEX idx_sensor_data_recorded_at ON sensor_data (recorded_at DESC);

-- Default device
INSERT INTO devices (dev_id, name) VALUES (1, 'ESP32-SISF-01')
ON CONFLICT DO NOTHING;