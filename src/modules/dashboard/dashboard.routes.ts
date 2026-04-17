import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { authenticate, tenantScope } from "../../middleware/auth.middleware";

const router = Router();
const ctrl   = new DashboardController();

router.use(authenticate, tenantScope);
router.get("/overview", ctrl.overview);
router.get("/labor",    ctrl.laborSummary);

export default router;
