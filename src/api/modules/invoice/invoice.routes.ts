import { Router } from "express";
import { InvoiceController } from "./invoice.controller";


const router = Router();

router.post("/create", InvoiceController.createInvoice);
router.get("/:userId", InvoiceController.getAllInvoices);
router.put("/:invoiceId/pay", InvoiceController.markAsPaid);
router.put("/:invoiceId/cancel", InvoiceController.cancelInvoice);

export default router;
