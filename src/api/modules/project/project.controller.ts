import { Request, Response } from "express";
import { ProjectService } from "./project.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";
import { UserRole } from "../../enum";

const projectService = new ProjectService();

export class ProjectController {
  static createProject = asyncHandler(async (req: any, res: Response) => {
    const project = await projectService.createProject(req);
    return sendSuccessResponse(res, "Project Created Successful", 201, project);
  });

  static getAllProjects = asyncHandler(async (req: any, res:any) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const filters: any = req.query;
    delete filters.page;
    const projects = await projectService.getAllProjects(
      req,
      res,
      page,
      filters
    );
    return sendSuccessResponse(res, projects.count ===0 ? "No data found":"Data Fetched Successfully", 200, projects);
  });

  static updateProject = asyncHandler(async (req: any, res: Response) => {
    const project = await projectService.updateProject(req.params.id, req);
    return sendSuccessResponse(res, "Project Updated", 200, project);
  });

  static deleteProject = asyncHandler(async (req: any, res: Response) => {
     const project = await projectService.deleteProject(req.params.id,req?.user);
    return sendSuccessResponse(res, "Project Deleted successfully", 200, project);
  });
}
