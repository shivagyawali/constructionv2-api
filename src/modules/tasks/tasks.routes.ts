import { Router } from "express";
import { TasksController } from "./tasks.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
const ctrl = new TasksController();

router.use(authenticate);
router.get("/project/:projectId", ctrl.listByProject);
router.post("/", ctrl.create);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.patch("/:id/progress", ctrl.updateProgress);
router.delete("/:id", ctrl.remove);

export default router;
