import { Router } from "express";
import { body } from "express-validator";
import { InvoicePeriodsController } from "./invoice-periods.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new InvoicePeriodsController();

router.use(authenticate);
router.get("/", ctrl.list);
router.get("/summary", ctrl.summary);
router.post("/",
  validate([
    body("workerId").isUUID().withMessage("Valid workerId is required"),
    body("startDate").isDate().withMessage("Valid startDate is required"),
    body("endDate").isDate().withMessage("Valid endDate is required"),
    body("regularHours").isNumeric().withMessage("regularHours must be a number"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
