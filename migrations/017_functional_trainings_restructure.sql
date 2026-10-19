-- Restructures functional_trainings from a flat (team, title, link) list into
-- team -> topic -> module: old free-text labels (TAC-RTP, CM, CD, ...) become
-- a canonical team + topic, and each existing row becomes a module under it.

ALTER TABLE functional_trainings ADD COLUMN IF NOT EXISTS topic_id bigint
  REFERENCES functional_training_topics(id) ON DELETE CASCADE;

INSERT INTO functional_training_topics (team, title, sort_order)
SELECT canonical_team, topic_title, MIN(old_sort_order)
FROM (
  SELECT
    CASE team
      WHEN 'IM/PM' THEN 'IM'
      WHEN 'CM' THEN 'Change Management'
      WHEN 'CAC' THEN 'CAC'
      WHEN 'TAC-RTP' THEN 'TAC'
      WHEN 'TAC-RTP (2)' THEN 'TAC'
      WHEN 'TAC-RMS' THEN 'TAC'
      WHEN 'CEM' THEN 'CEM'
      WHEN 'CD' THEN 'Client Director'
      ELSE team
    END AS canonical_team,
    CASE team
      WHEN 'IM/PM' THEN 'IM/PM'
      WHEN 'TAC-RTP' THEN 'RTP'
      WHEN 'TAC-RTP (2)' THEN 'RTP'
      WHEN 'TAC-RMS' THEN 'RMS'
      ELSE 'General'
    END AS topic_title,
    sort_order AS old_sort_order
  FROM functional_trainings
) mapped
GROUP BY canonical_team, topic_title;

UPDATE functional_trainings ft
SET topic_id = ftt.id
FROM functional_training_topics ftt
WHERE ftt.team = CASE ft.team
      WHEN 'IM/PM' THEN 'IM'
      WHEN 'CM' THEN 'Change Management'
      WHEN 'CAC' THEN 'CAC'
      WHEN 'TAC-RTP' THEN 'TAC'
      WHEN 'TAC-RTP (2)' THEN 'TAC'
      WHEN 'TAC-RMS' THEN 'TAC'
      WHEN 'CEM' THEN 'CEM'
      WHEN 'CD' THEN 'Client Director'
      ELSE ft.team
    END
  AND ftt.title = CASE ft.team
      WHEN 'IM/PM' THEN 'IM/PM'
      WHEN 'TAC-RTP' THEN 'RTP'
      WHEN 'TAC-RTP (2)' THEN 'RTP'
      WHEN 'TAC-RMS' THEN 'RMS'
      ELSE 'General'
    END;

ALTER TABLE functional_trainings ALTER COLUMN topic_id SET NOT NULL;
DROP INDEX IF EXISTS functional_trainings_team_idx;
ALTER TABLE functional_trainings DROP COLUMN team;
CREATE INDEX IF NOT EXISTS functional_trainings_topic_id_idx ON functional_trainings(topic_id);
