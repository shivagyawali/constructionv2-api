import { Request, Response } from "express";
import { CompanyService } from "./company.services";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";

export class CompanyController {
  static registerCompany = asyncHandler(async (req: Request, res: Response) => {
    const { name, companyName,companyEmail, email, password } = req.body;
    const data = await CompanyService.registerCompany(
      res,
      name,
      companyName,
      companyEmail,
      email,
      password
    );
   return sendSuccessResponse(res, "Company Created Successfully", 200, data);
  });

}
