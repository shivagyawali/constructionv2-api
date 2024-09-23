import { Request, Response } from "express";
import { ProjectService } from "./project.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";

const projectService = new ProjectService();

export class ProjectController {
  static createProject = asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.createProject(req.body);
    return res.status(201).json(project);
  });

  static getAllProjects = asyncHandler(async (req: Request, res: Response) => {
    const projects = await projectService.getAllProjects();
    return res.json(projects);
  });

  static updateProject = asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.updateProject(req.params.id, req.body);
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.json(project);
  });

  static deleteProject = asyncHandler(async (req: Request, res: Response) => {
    await projectService.deleteProject(req.params.id);
    return res.status(204).send();
  });
}
