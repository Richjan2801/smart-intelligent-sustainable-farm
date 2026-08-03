CREATE TABLE IF NOT EXISTS devices (
    dev_id     SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id          SERIAL PRIMARY KEY,
    dev_id      INTEGER     NOT NULL REFERENCES devices(dev_id),
    dev_status  VARCHAR(10) NOT NULL CHECK (dev_status IN ('online', 'offline')),
    tem         NUMERIC(5,2),
    hum         NUMERIC(5,2),
    pump_on     BOOLEAN     NOT NULL DEFAULT false,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_dev_id      ON sensor_data (dev_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_recorded_at ON sensor_data (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email             ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username          ON users (username);

INSERT INTO devices (dev_id, name) VALUES (1, 'ESP32-SISF-01')
ON CONFLICT DO NOTHING;