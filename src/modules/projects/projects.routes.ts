import { Router } from "express";
import { body } from "express-validator";
import { ProjectsController } from "./projects.controller";
import { authenticate, authorize, requireRouteAccess } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new ProjectsController();
const access = requireRouteAccess("/projects");

router.use(authenticate);

router.get("/", access, ctrl.list);
router.post("/", access, authorize("admin", "manager"),
  validate([
    body("name").notEmpty().withMessage("Name is required"),
    body("clientId").notEmpty().withMessage("Client is required"),
  ]),
  ctrl.create
);
router.get("/:id", access, ctrl.getOne);
router.patch("/:id", access, authorize("admin", "manager", "supervisor"), ctrl.update);
router.delete("/:id", access, authorize("admin", "manager"), ctrl.remove);
router.get("/:id/stats", access, ctrl.stats);
router.post("/:id/workers", access, authorize("admin", "manager", "supervisor"), ctrl.assignWorker);
router.delete("/:id/workers/:workerId", access, authorize("admin", "manager", "supervisor"), ctrl.removeWorker);

export default router;
