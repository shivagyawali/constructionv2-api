import { Router } from "express";
import { body } from "express-validator";
import { RolesController } from "./roles.controller";
import { authenticate, authorize, tenantScope } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new RolesController();

router.use(authenticate, tenantScope);

router.get("/",       ctrl.list);
router.get("/:role",  ctrl.getOne);

router.put("/bulk",   authorize("admin","superadmin"),
  validate([body("permissions").notEmpty()]),
  ctrl.bulkUpdate
);
router.put("/:role",  authorize("admin","superadmin"),
  validate([body("role").notEmpty(), body("allowedRoutes").isArray()]),
  ctrl.upsert
);
router.post("/reset", authorize("admin","superadmin"), ctrl.reset);

export default router;
