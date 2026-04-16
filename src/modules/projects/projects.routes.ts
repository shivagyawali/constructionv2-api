import { Router } from "express";
import { body } from "express-validator";
import { ProjectsController } from "./projects.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new ProjectsController();

router.use(authenticate);

router.get("/", ctrl.list);
router.post("/",
  validate([
    body("name").notEmpty().withMessage("Project name is required"),
    body("clientId").isUUID().withMessage("Valid clientId is required"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.get("/:id/stats", ctrl.stats);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/workers", ctrl.assignWorker);
router.delete("/:id/workers/:workerId", ctrl.removeWorker);

export default router;
