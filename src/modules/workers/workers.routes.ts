import { Router } from "express";
import { body } from "express-validator";
import { WorkersController } from "./workers.controller";
import { authenticate, authorize, requireRouteAccess, tenantScope } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new WorkersController();
const access = requireRouteAccess("/workers");

router.use(authenticate, tenantScope, access);

router.get("/",   ctrl.list);
router.post("/",  authorize("admin","manager"),
  validate([body("firstName").notEmpty(), body("lastName").notEmpty(), body("email").isEmail()]),
  ctrl.create
);
router.get("/:id",         ctrl.getOne);
router.patch("/:id",       authorize("admin","manager"), ctrl.update);
router.delete("/:id",      authorize("admin"), ctrl.remove);
router.get("/:id/stats",   ctrl.stats);
router.get("/:id/logs",    ctrl.logs);

export default router;
