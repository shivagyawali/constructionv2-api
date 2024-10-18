import express, { NextFunction } from "express";
import authRouter from '../modules/auth/auth.routes'
import userRouter from '../modules/user/user.routes'
import projectRouter from "../modules/project/project.routes";
import taskRouter from "../modules/task/task.routes";
import companyRouter from "../modules/company/company.routes";
import { isAuthorized } from "../middleware/authorization";

const router = express.Router();
router.use("/auth", authRouter);
router.use("/projects",isAuthorized, projectRouter);
router.use("/tasks", isAuthorized, taskRouter);
router.use("/companies", isAuthorized, companyRouter);
router.use("/users", userRouter);




export default router;
 