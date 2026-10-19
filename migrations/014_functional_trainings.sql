CREATE TABLE IF NOT EXISTS functional_trainings (
  id bigserial PRIMARY KEY,
  team text NOT NULL,
  title text NOT NULL,
  link text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS functional_trainings_team_idx ON functional_trainings(team);
