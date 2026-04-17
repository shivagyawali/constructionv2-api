import { Router } from "express";
import { body } from "express-validator";
import { InvoicePeriodsController } from "./invoice-periods.controller";
import { authenticate, authorize, requireRouteAccess, tenantScope } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new InvoicePeriodsController();
const access = requireRouteAccess("/invoice-periods");

router.use(authenticate, tenantScope, access);

router.get("/",         ctrl.list);
router.post("/",        authorize("admin","manager"),
  validate([body("workerId").notEmpty(), body("startDate").notEmpty(), body("endDate").notEmpty()]),
  ctrl.create
);
router.get("/summary",  ctrl.summary);
router.get("/:id",      ctrl.getOne);
router.patch("/:id",    authorize("admin","manager"), ctrl.update);
router.delete("/:id",   authorize("admin","manager"), ctrl.remove);

export default router;
