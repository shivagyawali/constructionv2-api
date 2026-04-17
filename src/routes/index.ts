import { Router } from "express";
import authRoutes           from "../modules/auth/auth.routes";
import usersRoutes          from "../modules/users/users.routes";
import rolesRoutes          from "../modules/roles/roles.routes";
import clientsRoutes        from "../modules/clients/clients.routes";
import projectsRoutes       from "../modules/projects/projects.routes";
import tasksRoutes          from "../modules/tasks/tasks.routes";
import workersRoutes        from "../modules/workers/workers.routes";
import workerLogsRoutes     from "../modules/worker-logs/worker-logs.routes";
import invoicesRoutes       from "../modules/invoices/invoices.routes";
import invoicePeriodsRoutes from "../modules/invoice-periods/invoice-periods.routes";
import dashboardRoutes      from "../modules/dashboard/dashboard.routes";
import companiesRoutes      from "../modules/companies/companies.routes";
import superadminRoutes     from "../modules/superadmin/superadmin.routes";

const router = Router();

router.get("/health", (_, res) =>
  res.json({ success: true, message: "Buildersoft Multi-Tenant API v3.0", timestamp: new Date().toISOString() })
);

router.use("/auth",             authRoutes);
router.use("/users",            usersRoutes);
router.use("/role-permissions", rolesRoutes);
router.use("/dashboard",        dashboardRoutes);
router.use("/clients",          clientsRoutes);
router.use("/projects",         projectsRoutes);
router.use("/tasks",            tasksRoutes);
router.use("/workers",          workersRoutes);
router.use("/worker-logs",      workerLogsRoutes);
router.use("/invoices",         invoicesRoutes);
router.use("/invoice-periods",  invoicePeriodsRoutes);
router.use("/companies",        companiesRoutes);
router.use("/superadmin",       superadminRoutes);

export default router;
