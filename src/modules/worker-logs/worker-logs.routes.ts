import { Router } from "express";
import { body } from "express-validator";
import { WorkerLogsController } from "./worker-logs.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new WorkerLogsController();

router.use(authenticate);

router.get("/", ctrl.list);
router.post("/",
  validate([
    body("workerId").isUUID().withMessage("Valid workerId is required"),
    body("projectId").isUUID().withMessage("Valid projectId is required"),
    body("logDate").isDate().withMessage("Valid logDate is required"),
    body("hoursWorked").isNumeric().withMessage("hoursWorked must be a number"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.delete("/:id", authorize("admin", "manager", "supervisor"), ctrl.remove);
router.post("/bulk/approve", authorize("admin", "manager", "supervisor"), ctrl.bulkApprove);
router.post("/:id/approve", authorize("admin", "manager", "supervisor"), ctrl.approve);
router.post("/:id/reject", authorize("admin", "manager", "supervisor"), ctrl.reject);

export default router;
