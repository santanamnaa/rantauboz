CREATE TABLE IF NOT EXISTS friend_device_shares (
 connection_id uuid NOT NULL REFERENCES friend_connections(id), owner_id text NOT NULL,
 session_id uuid NOT NULL, share_location boolean NOT NULL DEFAULT false,
 share_battery boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL,
 latitude double precision CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 accuracy double precision CHECK(accuracy BETWEEN 0 AND 100000), location_at timestamptz,
 battery_percent smallint CHECK(battery_percent BETWEEN 0 AND 100),
 battery_charging boolean, battery_at timestamptz, last_upload_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(connection_id,owner_id),
 CHECK((latitude IS NULL AND longitude IS NULL AND accuracy IS NULL AND location_at IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL AND accuracy IS NOT NULL AND location_at IS NOT NULL)),
 CHECK((battery_percent IS NULL AND battery_charging IS NULL AND battery_at IS NULL)
    OR (battery_percent IS NOT NULL AND battery_charging IS NOT NULL AND battery_at IS NOT NULL)),
 CHECK(share_location OR latitude IS NULL), CHECK(share_battery OR battery_percent IS NULL)
);
CREATE INDEX IF NOT EXISTS friend_device_shares_owner ON friend_device_shares(owner_id,expires_at);
INSERT INTO migration_log(id) VALUES('005_friend_devices') ON CONFLICT DO NOTHING;
