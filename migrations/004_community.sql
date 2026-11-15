CREATE TABLE IF NOT EXISTS contribution_managers (
 user_id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contribution_requests (
 id uuid PRIMARY KEY, name varchar(80) NOT NULL,
 email varchar(254) NOT NULL DEFAULT '', kind text NOT NULL CHECK(kind IN ('developer','designer','feedback')),
 topic varchar(60) NOT NULL, portfolio varchar(400) NOT NULL DEFAULT '',
 message varchar(2000) NOT NULL, status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','contacted','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS contribution_requests_recent ON contribution_requests(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS contribution_requests_status ON contribution_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS contribution_limits (
 key_hash text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS community_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), support_url varchar(400),
 updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1
);
INSERT INTO community_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
INSERT INTO migration_log(id) VALUES('004_community') ON CONFLICT DO NOTHING;
