import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { defaultConfig } from "../../config/defaultConfig";
import { User } from "../../entity/User";
import { AppDataSource } from "../../config/db";
import { asyncHandler } from "../helpers/Utils/AsyncHandler";
import { sendErrorResponse } from "../helpers/Utils/response";
import { StatusCodes } from "http-status-codes";

export const isAuthorized = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer token

    if (!token) {
       return sendErrorResponse(
         res,
         StatusCodes.UNAUTHORIZED,
         "UNAUTHORIZED",
         "Please provide a valid credential to access this resource."
       );
    }
    const decodedToken: any = jwt.verify(token, defaultConfig.secret);
    const userRepo = AppDataSource.getRepository(User);
    const user: any = await userRepo.findOne({
      where: { id: decodedToken.userId },
      relations: ["company"],
    });

    if (!user) {
     return sendErrorResponse(
       res,
       StatusCodes.UNAUTHORIZED,
       "UNAUTHORIZED",
       "The token you provided is not valid. Please log in again."
     );
    }
    req.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      companyId: user?.company?.id,
      permissions: await user.fetchPermissionsByRole(),
    };

    next();
  }
);


export const authorize = (resource: string, action: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "UNAUTHORIZED",
        "The token you provided is not valid. Please log in again."
      );
     
    }
    const permissions = req.user.permissions;   
    if (permissions[resource] && permissions[resource].includes(action)) {
      return next();
    }
    return sendErrorResponse(
      res,
      StatusCodes.FORBIDDEN,
      `Access denied. You don't have permission to ${action} ${resource}.`,
       "FORBIDDEN",
    );
  };
};
