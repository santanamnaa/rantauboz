CREATE TABLE IF NOT EXISTS profile_photos (
 user_id text PRIMARY KEY,
 image bytea NOT NULL CHECK(octet_length(image) BETWEEN 4 AND 204800),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO migration_log(id) VALUES('002_profile_photos') ON CONFLICT DO NOTHING;
