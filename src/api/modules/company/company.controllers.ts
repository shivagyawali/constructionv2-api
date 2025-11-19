import { Request, Response } from "express";
import { CompanyService } from "./company.services";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";

const companyService = new CompanyService();
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

  static getAllCompanies = asyncHandler(async (req: any, res:any) => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const filters: any = req.query;
      delete filters.page;
      const projects = await companyService.getAllCompanies(
        req,
        res,
        page,
        filters
      );
      return sendSuccessResponse(res, projects.count ===0 ? "No data found":"Data Fetched Successfully", 200, projects);
    });

}
