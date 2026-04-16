import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import clientsRoutes from "../modules/clients/clients.routes";
import projectsRoutes from "../modules/projects/projects.routes";
import tasksRoutes from "../modules/tasks/tasks.routes";
import workersRoutes from "../modules/workers/workers.routes";
import workerLogsRoutes from "../modules/worker-logs/worker-logs.routes";
import invoicesRoutes from "../modules/invoices/invoices.routes";
import invoicePeriodsRoutes from "../modules/invoice-periods/invoice-periods.routes";

const router = Router();

router.get("/health", (_, res) =>
  res.json({ success: true, message: "API is running", timestamp: new Date().toISOString() })
);

router.use("/auth", authRoutes);
router.use("/clients", clientsRoutes);
router.use("/projects", projectsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/workers", workersRoutes);
router.use("/worker-logs", workerLogsRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/invoice-periods", invoicePeriodsRoutes);

export default router;
