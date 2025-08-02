import express, { NextFunction } from "express";
import authRouter from '../modules/auth/auth.routes'
import userRouter from '../modules/user/user.routes'
import workLogRouter from '../modules/worklogs/worklog.routes'
import projectRouter from "../modules/project/project.routes";
import taskRouter from "../modules/task/task.routes";
import invoiceRouter from "../modules/invoice/invoice.routes";
import companyRouter from "../modules/company/company.routes";
import permissionRouter from "../modules/permission/permission.routes";
import { isAuthorized } from "../middleware/authorization";

const router = express.Router();
router.use("/auth", authRouter);
router.use("/projects",isAuthorized, projectRouter);
router.use("/tasks", isAuthorized, taskRouter);
router.use("/companies", isAuthorized, companyRouter);
router.use("/users", isAuthorized, userRouter);
router.use("/worklogs", isAuthorized, workLogRouter);
router.use("/invoices", isAuthorized, invoiceRouter);
router.use("/permissions", isAuthorized, permissionRouter);




export default router;
 