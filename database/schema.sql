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

-- ═══════════════════════════════════════════════
-- RBAC TABLES
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS roles (
    role_id   SERIAL PRIMARY KEY,
    name      VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    name          VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'admin' REFERENCES roles(name) ON UPDATE CASCADE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_dev_id      ON sensor_data (dev_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_recorded_at ON sensor_data (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email             ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username          ON users (username);

INSERT INTO devices (dev_id, name) VALUES (1, 'ESP32-SISF-01')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RBAC SEED DATA
INSERT INTO roles (name) VALUES ('farmer'), ('researcher'), ('admin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name) VALUES
    ('view_dashboard'),
    ('view_device_status'),
    ('trigger_pump'),
    ('export_data'),
    ('view_raw_logs'),
    ('manage_devices'),
    ('manage_users'),
    ('manage_rbac'),
    ('edit_config')
ON CONFLICT (name) DO NOTHING;

-- All roles: view_dashboard, view_device_status, trigger_pump
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE p.name IN ('view_dashboard', 'view_device_status', 'trigger_pump')
ON CONFLICT DO NOTHING;

-- Researcher + Admin: export_data, view_raw_logs
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('researcher', 'admin')
  AND p.name IN ('export_data', 'view_raw_logs')
ON CONFLICT DO NOTHING;

-- Admin only: manage_devices, manage_users, manage_rbac, edit_config
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN ('manage_devices', 'manage_users', 'manage_rbac', 'edit_config')
ON CONFLICT DO NOTHING;