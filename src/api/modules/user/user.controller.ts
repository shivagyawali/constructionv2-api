import { Request, Response } from "express";
import { UserService } from "./user.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";
import { UserRole } from "../../enum";
import { ForbiddenError } from "../../helpers/Utils/ApiError";
import { instanceToPlain } from "class-transformer";


const userService = new UserService();

export class UserController {
  static createUser = asyncHandler(async (req: any, res: Response) => {
    const role = req.user.role;
    const isSubAccount = req.user.isSubAccount;
    if (
      (isSubAccount && role === UserRole.CLIENT) ||
      role === UserRole.WORKER
    ) {
      throw new ForbiddenError(
        "You dont have permission to perform this action"
      );
    }
    if (role === UserRole.CLIENT && !isSubAccount) {
      req.body.company = req.user.company;
    }
    const user = instanceToPlain(await userService.createUser(req.body));
    return sendSuccessResponse(res, "User created Successfully", 200, user);
  });

  static getAllUsers = asyncHandler(async (req: Request, res: any) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const filters: any = req.query;
    delete filters.page;
    const users = await userService.getAllUsers(req, res, page, filters);
    return sendSuccessResponse(
      res,
      users.count === 0 ? "No data found" : "Data Fetched Successfully",
      200,
      users
    );
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: "User not found" });
    return sendSuccessResponse(
      res,
     "Data Updated Successfully",
      200,
      user
    );
  });

  static deleteUser = asyncHandler(async (req: any, res: Response) => {
    const { role, isSubAccount, company } = req.user;

    if (
      (isSubAccount && role === UserRole.CLIENT) ||
      role === UserRole.WORKER
    ) {
      throw new ForbiddenError(
        "You don't have permission to perform this action"
      );
    }
    const user = await userService.deleteUser({ id: req.params.id, company });
     return sendSuccessResponse(res, "User deleted Successfully", 200, user);
  });
  static getOne = asyncHandler(async (req: any, res: Response) => {
    const { role, isSubAccount, company } = req.user;

    if (
      (!isSubAccount && role === UserRole.CLIENT) ||
      role === UserRole.ROOT
    ) {
      throw new ForbiddenError(
        "You don't have permission to perform this action"
      );
    }
    const user = await userService.getOneUser({ id: req.params.id, company });
     return sendSuccessResponse(res, "User fetch Successfully", 200, user);
  });
  static profile = asyncHandler(async (req: any, res: Response) => {
    const user = req.user;
     return sendSuccessResponse(res, "User fetch Successfully", 200, user);
  });
}
