import { Router } from "express";
import { TaskController } from "./task.controller";
import { checkAccess } from "../../helpers/checkAccess";
const router = Router();
router.use(checkAccess);

router.post("/create", TaskController.createTask);
router.get("/list", TaskController.getAllTasks);
router.put("/:id", TaskController.updateTask);
router.delete("/:id", TaskController.deleteTask);

router.post("/:taskId/comments", TaskController.createCommentOnTask);

export default router;
