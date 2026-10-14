CREATE TABLE IF NOT EXISTS leve_journals (
  user_id text PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision > 0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  last_operation text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
