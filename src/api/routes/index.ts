import express, { NextFunction } from "express";
import authRouter from '../modules/auth/auth.routes'
import userRouter from '../modules/user/user.routes'
import projectRouter from "../modules/project/project.routes";
import taskRouter from "../modules/task/task.routes";
import companyRouter from "../modules/company/company.routes";

const router = express.Router();
router.use("/auth", authRouter);
router.use("/companies", companyRouter);
router.use("/users", userRouter);
router.use("/projects", projectRouter);
router.use("/tasks", taskRouter);


export default router;
