import { Request, Response } from "express";
import { WorkLogService } from "./worklog.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";
import { instanceToPlain } from "class-transformer";
const workLogService = new WorkLogService();

export class WorkLogController {
  static startWork = asyncHandler(async (req: any, res: Response) => {
    const { latitude, longitude } = req.body;
    const workLog = instanceToPlain(await workLogService.startWork(
      req.user.id,
      latitude,
      longitude
    ));
   return sendSuccessResponse(res, "Work Log started", 200, workLog);
  });

  static endWork = asyncHandler(async (req: any, res: any) => {
    const { latitude, longitude } = req.body;
    const workLog = instanceToPlain(await workLogService.endWork(
      req.user.id,
      latitude,
      longitude
    ));
    return sendSuccessResponse(res, "Work Log ended", 200, workLog);
  });


  static getWorkLogs = asyncHandler(async (req: any, res: Response) => {
   const workLogs =instanceToPlain(await workLogService.getWorkLogs(req.user.id));
  return sendSuccessResponse(res, "Work Log fetched", 200, workLogs);
  });
}
