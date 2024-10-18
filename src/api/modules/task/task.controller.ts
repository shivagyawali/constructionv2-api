import { Request, Response } from "express";
import { TaskService } from "./task.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";
import { UserRole } from "../../enum";

const taskService = new TaskService();

export class TaskController {
  
  static createTask = asyncHandler(async (req: any, res: Response) => {
    const task = await taskService.createTask(req);
    return sendSuccessResponse(res, "Task Created Successful", 201, task);
  });

  static getAllTasks = asyncHandler(async (req: any, res:any) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const filters: any = req.query;
    delete filters.page;
    const tasks = await taskService.getAllTasks(
      req,
      res,
      page,
      filters
    );
    return sendSuccessResponse(res, tasks.count ===0 ? "No data found":"Data Fetched Successfully", 200, tasks);
  });

  static updateTask = asyncHandler(async (req: any, res: Response) => {
    const task = await taskService.updateTask(req.params.id, req);
    return sendSuccessResponse(res, "Task Updated", 200, task);
  });

  static deleteTask = asyncHandler(async (req: any, res: Response) => {
     const task = await taskService.deleteTask(req.params.id,req?.user);
    return sendSuccessResponse(res, "Task Deleted successfully", 200, task);
  });
}
