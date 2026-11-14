CREATE TABLE IF NOT EXISTS accounts (
 id uuid PRIMARY KEY, user_id text NOT NULL, name varchar(60) NOT NULL CHECK(length(trim(name))>0),
 kind text NOT NULL CHECK(kind IN ('bank','ewallet','cash')), archived boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_name_user ON accounts(user_id,lower(name)) WHERE archived=false;
CREATE TABLE IF NOT EXISTS categories (
 id uuid PRIMARY KEY,user_id text NOT NULL,name varchar(60) NOT NULL CHECK(length(trim(name))>0),
 photo text NOT NULL DEFAULT 'glass' CHECK(photo IN ('glass','food','transport','leisure','shopping','home')),
 archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,user_id)
);
CREATE TABLE IF NOT EXISTS budgets (
 id uuid PRIMARY KEY,user_id text NOT NULL,category_id uuid NOT NULL,account_id uuid NOT NULL,
 month date NOT NULL CHECK(EXTRACT(day FROM month)=1),name varchar(60) NOT NULL,account_name varchar(60) NOT NULL,
 amount bigint NOT NULL CHECK(amount>0 AND amount<=999999999999),
 cadence text NOT NULL DEFAULT 'monthly' CHECK(cadence IN ('monthly','weekly','daily')),
 guide bigint NOT NULL DEFAULT 0 CHECK(guide>=0 AND guide<=999999999999),photo text NOT NULL DEFAULT 'glass',
 archived boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(category_id,user_id) REFERENCES categories(id,user_id),FOREIGN KEY(account_id,user_id) REFERENCES accounts(id,user_id),
 UNIQUE(user_id,category_id,month),UNIQUE(id,user_id),CHECK(cadence='monthly' OR guide>0)
);
CREATE UNIQUE INDEX IF NOT EXISTS budgets_name_month ON budgets(user_id,month,lower(name)) WHERE archived=false;
CREATE INDEX IF NOT EXISTS budgets_user_month ON budgets(user_id,month);
CREATE TABLE IF NOT EXISTS expenses (
 id uuid PRIMARY KEY,user_id text NOT NULL,budget_id uuid NOT NULL,account_id uuid NOT NULL,
 account_name varchar(60) NOT NULL,amount bigint NOT NULL CHECK(amount>0 AND amount<=999999999999),
 date date NOT NULL CHECK(date BETWEEN '2000-01-01' AND '2100-12-31'),note varchar(180) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(budget_id,user_id) REFERENCES budgets(id,user_id),FOREIGN KEY(account_id,user_id) REFERENCES accounts(id,user_id),UNIQUE(id,user_id)
);
CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses(user_id,date DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS expenses_budget ON expenses(user_id,budget_id);
CREATE TABLE IF NOT EXISTS migration_log (id text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO migration_log(id) VALUES('001_initial') ON CONFLICT DO NOTHING;
