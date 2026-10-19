import { Router } from "express";
import coursesRoutes from "../modules/courses/courses.module";
import syllabusRoutes from "../modules/courses/syllabus.module";
import levelsRoutes from "../modules/levels/levels.module";
import modulesRoutes from "../modules/modules/modules.module";
import topicsRoutes from "../modules/topics/topics.module";
import resourcesRoutes from "../modules/resources/resources.module";
import authRoutes from "../modules/auth/auth.module";
import usersRoutes from "../modules/users/users.module";
import teamPoliciesRoutes from "../modules/team_policies/team_policies.module";
import certificationsRoutes from "../modules/certifications/certifications.module";
import progressRoutes from "../modules/progress/progress.module";
import assessmentsRoutes from "../modules/assessments/assessments.module";
import functionalTrainingsRoutes from "../modules/functional_trainings/functional_trainings.module";
import functionalTrainingTopicsRoutes from "../modules/functional_training_topics/functional_training_topics.module";

/**
 * Aggregates every table module's router under /api.
 *
 * To add a new table:
 *   1. Create src/modules/<table>/<table>.module.ts:
 *        export const <table>Repository = new BaseRepository("<table>");
 *        export default createResourceRouter(<table>Repository, "<Name>");
 *   2. Import and mount it below with apiRouter.use("/<table>", ...).
 */
const apiRouter = Router();

apiRouter.use("/courses", syllabusRoutes);
apiRouter.use("/courses", coursesRoutes);
apiRouter.use("/levels", levelsRoutes);
apiRouter.use("/modules", modulesRoutes);
apiRouter.use("/topics", topicsRoutes);
apiRouter.use("/resources", resourcesRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/team_policies", teamPoliciesRoutes);
apiRouter.use("/certifications", certificationsRoutes);
apiRouter.use("/progress", progressRoutes);
apiRouter.use("/assessments", assessmentsRoutes);
apiRouter.use("/functional_trainings", functionalTrainingsRoutes);
apiRouter.use("/functional_training_topics", functionalTrainingTopicsRoutes);

export default apiRouter;
