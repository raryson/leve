CREATE TABLE IF NOT EXISTS leve_photo_usage (
  usage_date date NOT NULL,
  scope text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_attempt timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, scope)
);
