import { Router } from "express";
import { body } from "express-validator";
import { RolesController } from "./roles.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new RolesController();

router.use(authenticate);

router.get("/", ctrl.list);
router.get("/:role", ctrl.getOne);

// Admin only mutations
router.put("/bulk", authorize("admin"),
  validate([body("permissions").notEmpty().withMessage("permissions object required")]),
  ctrl.bulkUpdate
);
router.put("/:role", authorize("admin"),
  validate([
    body("role").notEmpty(),
    body("allowedRoutes").isArray().withMessage("allowedRoutes must be array"),
  ]),
  ctrl.upsert
);
router.post("/reset", authorize("admin"), ctrl.reset);

export default router;
