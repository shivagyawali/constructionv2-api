import { Router } from "express";
import { InvoicesController } from "./invoices.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
const ctrl = new InvoicesController();

router.use(authenticate);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.post("/from-worker-logs", ctrl.generateFromWorkerLogs);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/payments", ctrl.addPayment);
router.get("/:id/payments", ctrl.listPayments);
router.get("/:id/pdf", ctrl.downloadPdf);
router.patch("/:id/send", ctrl.markSent);

export default router;
