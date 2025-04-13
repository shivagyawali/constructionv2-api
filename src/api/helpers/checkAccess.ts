import { Request, Response, NextFunction } from "express";
import { authorize } from "../middleware/authorization";

export const checkAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const resource = req.originalUrl.split("/")[2]; // Extracts the resource from URL
  const method = req.method.toLowerCase();

  const actionMap: Record<string, string[]> = {
    get: ["list", "read", "view","profile"],
    post: ["create", "add", "start", "end"],
    put: ["edit"],
    delete: ["delete"],
  };

  let actions: any =  Array.isArray(actionMap[method]) ?actionMap[method][0] : null;
  authorize(resource, actions)(req, res, next);
};
const getActionFromUrl = (req:any) => {
  const urlParts = req && req.originalUrl && req.originalUrl.split("/");
  const actions = ["*", "list", "read", "view"];

  return urlParts.find((part:any) => actions.includes(part)) || null;
};
