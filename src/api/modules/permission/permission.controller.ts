import { Request, Response } from "express";

import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";
import { UserRole } from "../../enum";
import { ForbiddenError } from "../../helpers/Utils/ApiError";
import { instanceToPlain } from "class-transformer";
import { PermissionService } from "./permission.service";
import { Permission } from "../../../entity/Permission";

const permissionService = new PermissionService();

export class PermissionController {
  static createPermission = asyncHandler(async (req: any, res: Response) => {
      const record = await permissionService.createPermission(req.body);
        return sendSuccessResponse(
          res,
          "Permission Created Successful",
          201,
          record
        );
  });

  static getAllPermissions = asyncHandler(async (req: Request, res: any) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const filters: any = req.query;
    delete filters.page;
    const [data, count] = await permissionService.getAllPermissions(
      req,
      res,
      page,
      filters
    );
    return sendSuccessResponse(
      res,
      count === 0 ? "No data found" : "Data Fetched Successfully",
      200,
      data
    );
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {});

  static deleteUser = asyncHandler(async (req: any, res: Response) => {});
  static getOne = asyncHandler(async (req: any, res: Response) => {});
  static profile = asyncHandler(async (req: any, res: Response) => {
    const user = req.user;
    return sendSuccessResponse(res, "User fetch Successfully", 200, user);
  });
}
