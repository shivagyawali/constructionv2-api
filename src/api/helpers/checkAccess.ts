import { Request, Response, NextFunction } from "express";
import { authorize } from "../middleware/authorization";

export const checkAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const resource = req.originalUrl.split("/")[2]; 
  const method = req.method.toLowerCase();
  const actionMap: any = {
    post: "create",
    put: "edit",
    delete: "delete",
  };
  let action = actionMap[method];
  if (method === "get") {
    const isSingleResource = req.originalUrl.split("/").length > 3;
    action = isSingleResource ? "read" : "view";
  }

  authorize(resource, action)(req, res, next);
};
