import { Router } from "express";
import { BaseRepository } from "../../core/BaseRepository";
import { asyncHandler } from "../../core/asyncHandler";
import { ApiError } from "../../core/ApiError";
import { query } from "../../db/query";

/**
 * `functional_training_topics` table — the "topic" layer between a team and
 * its individual training links (`functional_trainings`, the modules).
 */
export const functionalTrainingTopicsRepository = new BaseRepository("functional_training_topics");

const router = Router();

type TopicRow = { id: number; team: string; title: string; sort_order: number };
type ModuleRow = { id: number; topic_id: number; title: string; link: string; sort_order: number };

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await functionalTrainingTopicsRepository.findAll(req.query as Record<string, unknown>);
    res.json(result);
  })
);

/**
 * GET /api/functional_training_topics/tree?team=<team>
 *
 * Registered before GET /:id — a bare "/tree" would otherwise match the
 * generic :id route and be treated as an id lookup.
 *
 * Returns every topic (optionally scoped to one team) with its modules
 * nested inside, ordered by sort_order. Powers both the learner-facing
 * Functional Training page (team-scoped) and the manageprogram admin tab
 * (unscoped — every team at once).
 */
router.get(
  "/tree",
  asyncHandler(async (req, res) => {
    const team = typeof req.query.team === "string" ? req.query.team : undefined;

    const topics = team
      ? await query<TopicRow>(
          `SELECT id, team, title, sort_order FROM functional_training_topics WHERE team = $1 ORDER BY sort_order, id`,
          [team]
        )
      : await query<TopicRow>(
          `SELECT id, team, title, sort_order FROM functional_training_topics ORDER BY team, sort_order, id`
        );

    const topicIds = topics.map((t) => t.id);
    const modules = topicIds.length
      ? await query<ModuleRow>(
          `SELECT id, topic_id, title, link, sort_order FROM functional_trainings WHERE topic_id = ANY($1) ORDER BY sort_order, id`,
          [topicIds]
        )
      : [];

    const modulesByTopic = new Map<number, ModuleRow[]>();
    for (const m of modules) {
      const list = modulesByTopic.get(m.topic_id) ?? [];
      list.push(m);
      modulesByTopic.set(m.topic_id, list);
    }

    const data = topics.map((t) => ({
      id: t.id,
      team: t.team,
      title: t.title,
      sort_order: t.sort_order,
      modules: (modulesByTopic.get(t.id) ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        link: m.link,
        sort_order: m.sort_order,
      })),
    }));

    res.json({ data });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await functionalTrainingTopicsRepository.findById(req.params.id);
    if (!row) throw ApiError.notFound(`Functional training topic ${req.params.id} not found`);
    res.json({ data: row });
  })
);

type TopicBody = {
  team?: string;
  title?: string;
  sortOrder?: number;
};

/**
 * POST /api/functional_training_topics
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as TopicBody;
    const { team, title } = body;

    if (!team?.trim() || !title?.trim()) {
      throw ApiError.badRequest("team and title are required.");
    }

    const row = await functionalTrainingTopicsRepository.insert({
      team: team.trim(),
      title: title.trim(),
      sort_order: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });

    res.status(201).json({ data: row });
  })
);

/**
 * PATCH /api/functional_training_topics/:id
 */
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as TopicBody;

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (typeof body.team === "string" && body.team.trim()) updates.team = body.team.trim();
    if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.sortOrder === "number") updates.sort_order = body.sortOrder;

    if (Object.keys(updates).length === 1) {
      throw ApiError.badRequest("No valid fields to update (team, title, or sortOrder).");
    }

    const row = await functionalTrainingTopicsRepository.update(req.params.id, updates);
    if (!row) throw ApiError.notFound(`Functional training topic ${req.params.id} not found`);
    res.json({ data: row });
  })
);

/**
 * DELETE /api/functional_training_topics/:id
 *
 * Cascades to delete every module (functional_trainings row) under it.
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await functionalTrainingTopicsRepository.remove(req.params.id);
    if (!deleted) throw ApiError.notFound(`Functional training topic ${req.params.id} not found`);
    res.json({ ok: true, id: req.params.id });
  })
);

export default router;
