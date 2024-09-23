import { Request, Response } from "express";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { TaskService } from "./task.service";

const taskService = new TaskService();

export class TaskController {
  static createTask = asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.createTask(req.body);
    return res.status(201).json(task);
  });

  static getAllTasks = asyncHandler(async (req: Request, res: Response) => {
    const tasks = await taskService.getAllTasks();
    return res.json(tasks);
  });

  static updateTask = asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json(task);
  });

  static deleteTask = asyncHandler(async (req: Request, res: Response) => {
    await taskService.deleteTask(req.params.id);
    return res.status(204).send();
  });
}
