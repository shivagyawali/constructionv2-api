import { Router } from "express";
import { WorkLogController } from "./worklog.controller";
import { checkAccess } from "../../helpers/checkAccess";
const router = Router();
router.use(checkAccess);
router.post("/start", WorkLogController.startWork);
router.post("/end", WorkLogController.endWork);
router.get("/list", WorkLogController.getWorkLogs);

export default router;
