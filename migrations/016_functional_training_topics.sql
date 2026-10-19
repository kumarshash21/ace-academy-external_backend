CREATE TABLE IF NOT EXISTS functional_training_topics (
  id bigserial PRIMARY KEY,
  team text NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS functional_training_topics_team_idx ON functional_training_topics(team);
