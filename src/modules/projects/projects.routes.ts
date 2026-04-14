import { Router } from "express";
import { ProjectsController } from "./projects.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
const ctrl = new ProjectsController();

router.use(authenticate);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/:id/stats", ctrl.stats);

export default router;
