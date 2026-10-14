CREATE TABLE leve_community_foods (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  food jsonb NOT NULL CHECK (jsonb_typeof(food)='object' AND food ?& ARRAY['name','kcal'] AND jsonb_typeof(food->'name')='string' AND jsonb_typeof(food->'kcal')='number' AND (food->>'kcal')::numeric BETWEEN 0 AND 1000 AND length(food->>'name') BETWEEN 2 AND 120),
  normalized_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('private','pending','published','rejected','hidden')),
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX leve_food_public_unique ON leve_community_foods(normalized_key) WHERE status='published';
CREATE UNIQUE INDEX leve_food_owner_unique ON leve_community_foods(owner_id, normalized_key);
CREATE INDEX leve_food_status_date ON leve_community_foods(status, updated_at DESC, id);
CREATE TABLE leve_food_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  food_id uuid NOT NULL REFERENCES leve_community_foods(id),
  actor_id text NOT NULL,
  action text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leve_food_actor_events ON leve_food_events(actor_id, created_at);
CREATE TABLE leve_food_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES leve_community_foods(id),
  reporter_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('nutrition','name','source','other')),
  message text NOT NULL CHECK (length(message) BETWEEN 5 AND 500),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(food_id,reporter_id)
);
