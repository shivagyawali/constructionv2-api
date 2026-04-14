import { Router } from "express";
import { WorkerLogsController } from "./worker-logs.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
const ctrl = new WorkerLogsController();

router.use(authenticate);

// CRUD
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/summary", ctrl.summary);
router.get("/:id", ctrl.getOne);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

// Workflow
router.patch("/:id/approve", ctrl.approve);
router.patch("/:id/reject", ctrl.reject);

// Bulk
router.post("/bulk", ctrl.bulkCreate);
router.post("/bulk-approve", ctrl.bulkApprove);

export default router;
