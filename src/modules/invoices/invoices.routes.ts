import { Router } from "express";
import { body } from "express-validator";
import { InvoicesController } from "./invoices.controller";
import { authenticate, authorize, requireRouteAccess, tenantScope } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new InvoicesController();
const access = requireRouteAccess("/invoices");

router.use(authenticate, tenantScope, access);

router.get("/",    ctrl.list);
router.post("/",   authorize("admin","manager"),
  validate([body("clientId").notEmpty(), body("issueDate").notEmpty(), body("dueDate").notEmpty()]),
  ctrl.create
);
router.get("/:id",              ctrl.getOne);
router.patch("/:id",            authorize("admin","manager"), ctrl.update);
router.delete("/:id",           authorize("admin","manager"), ctrl.remove);
router.post("/:id/payments",    authorize("admin","manager"), ctrl.addPayment);
router.get("/:id/payments",     ctrl.listPayments);
router.patch("/:id/send",       authorize("admin","manager"), ctrl.markSent);
router.get("/:id/pdf",          ctrl.downloadPdf);

export default router;
