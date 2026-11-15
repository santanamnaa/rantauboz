CREATE TABLE IF NOT EXISTS friend_connections (
 id uuid PRIMARY KEY, low_user text NOT NULL, high_user text NOT NULL,
 low_name varchar(60) NOT NULL, high_name varchar(60) NOT NULL,
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(low_user<high_user), UNIQUE(low_user,high_user)
);
CREATE INDEX IF NOT EXISTS friend_connections_low ON friend_connections(low_user) WHERE active;
CREATE INDEX IF NOT EXISTS friend_connections_high ON friend_connections(high_user) WHERE active;
CREATE TABLE IF NOT EXISTS friend_shares (
 connection_id uuid NOT NULL REFERENCES friend_connections(id), owner_id text NOT NULL,
 mode text NOT NULL CHECK(mode IN ('off','progress','summary','selected')),
 from_month date NOT NULL CHECK(extract(day FROM from_month)=1),
 category_ids uuid[] NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(connection_id,owner_id)
);
CREATE TABLE IF NOT EXISTS friend_invites (
 id uuid PRIMARY KEY, inviter_id text NOT NULL, inviter_name varchar(60) NOT NULL,
 token_hash text NOT NULL UNIQUE, mode text NOT NULL CHECK(mode IN ('off','progress','summary','selected')),
 from_month date NOT NULL CHECK(extract(day FROM from_month)=1), category_ids uuid[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 accepted_by text, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
CREATE INDEX IF NOT EXISTS friend_invites_owner ON friend_invites(inviter_id,created_at DESC);
CREATE TABLE IF NOT EXISTS friend_rate_limits (
 user_id text NOT NULL, action text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 1, PRIMARY KEY(user_id,action)
);
INSERT INTO migration_log(id) VALUES('003_friends') ON CONFLICT DO NOTHING;
