ALTER TABLE friend_device_shares ADD COLUMN IF NOT EXISTS battery_mode text NOT NULL DEFAULT 'auto' CHECK (battery_mode IN ('auto','manual'));
INSERT INTO migration_log(id) VALUES('006_manual_battery') ON CONFLICT DO NOTHING;
