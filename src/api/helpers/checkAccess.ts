import { Request, Response, NextFunction } from "express";
import { authorize } from "../middleware/authorization";

const actionMap: Record<string, string[]> = {
  get: ["list", "read", "view", "profile", "*"],
  post: ["create", "add", "start", "end"],
  put: ["edit"],
  delete: ["delete"],
};

// Extracts an action from the URL that matches known actions
const getActionFromUrl = (req: Request): string | null => {
  const urlParts = (req.originalUrl?.split("/") || [])
    .filter(Boolean)
    .map((part) => part.split("?")[0]);
  const allActions = Object.values(actionMap).flat();
  return urlParts.find((part) => allActions.includes(part)) || null;
};


export const checkAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const resource = req.originalUrl.split("/")[2]; // e.g. /api/users/123 => "users"
  const method = req.method.toLowerCase(); // "get", "post", etc.
  const possibleActions = actionMap[method] || [];
  const action = getActionFromUrl(req);    
  // If action is found in the actionMap for the method, allow it
  if (action && possibleActions.includes(action)) {
    authorize(resource, action)(req, res, next);
  }else{
    'here'
  }
};
