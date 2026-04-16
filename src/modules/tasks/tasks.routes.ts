import { Router } from "express";
import { body } from "express-validator";
import { TasksController } from "./tasks.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new TasksController();

router.use(authenticate);

router.get("/project/:projectId", ctrl.listByProject);
router.post("/",
  validate([
    body("projectId").isUUID().withMessage("Valid projectId is required"),
    body("title").notEmpty().withMessage("Title is required"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.patch("/:id/progress", ctrl.updateProgress);
router.delete("/:id", ctrl.remove);
router.post("/:id/workers", ctrl.assignWorker);
router.delete("/:id/workers/:workerId", ctrl.removeWorker);

export default router;
