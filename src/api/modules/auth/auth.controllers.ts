import { Request, Response } from "express";
import { AuthService } from "./auth.services";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";

export class AuthController {
static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const data = await AuthService.login(email, password);
    return sendSuccessResponse(res, "LoggedIn Successful", 200, data);
  });
}
