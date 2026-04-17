import { Router } from "express";
import { body } from "express-validator";
import { TasksController } from "./tasks.controller";
import { authenticate, authorize, requireRouteAccess } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new TasksController();
const access = requireRouteAccess("/tasks");

router.use(authenticate, access);

router.get("/project/:projectId", ctrl.listByProject);
router.post("/", authorize("admin", "manager", "supervisor"),
  validate([
    body("title").notEmpty().withMessage("Title is required"),
    body("projectId").notEmpty().withMessage("Project ID is required"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.patch("/:id", authorize("admin", "manager", "supervisor"), ctrl.update);
router.patch("/:id/progress", ctrl.updateProgress);
router.delete("/:id", authorize("admin", "manager"), ctrl.remove);
router.post("/:id/workers", authorize("admin", "manager", "supervisor"), ctrl.assignWorker);
router.delete("/:id/workers/:workerId", authorize("admin", "manager", "supervisor"), ctrl.removeWorker);

export default router;
