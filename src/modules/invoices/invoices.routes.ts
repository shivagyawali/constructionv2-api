import { Router } from "express";
import { body } from "express-validator";
import { InvoicesController } from "./invoices.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new InvoicesController();

router.use(authenticate);
router.get("/", ctrl.list);
router.post("/",
  validate([
    body("clientId").isUUID().withMessage("Valid clientId is required"),
    body("issueDate").isDate().withMessage("Valid issueDate is required"),
    body("dueDate").isDate().withMessage("Valid dueDate is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one line item is required"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/payments", ctrl.addPayment);
router.get("/:id/payments", ctrl.listPayments);
router.post("/:id/send", ctrl.markSent);
router.get("/:id/pdf", ctrl.downloadPdf);

export default router;
