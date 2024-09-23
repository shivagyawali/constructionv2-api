import { Request, Response } from "express";
import { UserService } from "./user.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";


const userService = new UserService();

export class UserController {
  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    return res.status(201).json(user);
  });

  static getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.getAllUsers();
    return res.json(users);
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  });

  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id);
    return res.status(204).send();
  });
}
