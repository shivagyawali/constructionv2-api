import { AppDataSource } from "../../../config/db";
import { Project } from "../../../entity/Project";
import { User } from "../../../entity/User";
import { UserRole } from "../../enum";
import { paginate } from "../../helpers/Utils/paginate";
import { constructWhereConditions } from "../../helpers/Utils/constructWhereConditions";
import {
  ApiError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../helpers/Utils/ApiError";
import { StatusCodes } from "http-status-codes";

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  async createProject(req: any) {
     const { company, role } = req.user;
   
    if (
      role !== UserRole.ROOT &&
      role !== UserRole.CLIENT &&
      !company
    ) {
      throw new BadRequestError(
        "You are not yet registered with any company yet"
      );
    }
    const newProject = await this.projectRepository.save({
      name: req.body.name,
      status: "INPROGRESS",
      description: req.body.description || null,
      company: company || null,
    });

    return {
      id: newProject.id,
      name: newProject.name,
      description: newProject.description,
    };
  }

  getAllProjects = async (
    req?: any,
    res?: Response,
    page: number = 1,
    filters: { [key: string]: any } = {}
  ) => {
    const { user: { role,isSubAccount, companyId } = {} } = req || {};
      if (role !== UserRole.ROOT && role !== UserRole.CLIENT && isSubAccount) {
        throw new ForbiddenError(
          "You don't have access to view this page"
        );
      }
    let where = {
      ...constructWhereConditions(filters),
      ...(role === UserRole.CLIENT && { company: { id: companyId } }),
    };

    const [results, count] = await this.projectRepository.findAndCount({
      where,
      relations: ["tasks", "company"],
      skip: (page - 1) * 10,
      take: 10,
      order: { createdAt: "DESC" },
    });
    return { ...paginate(page, count), results, count };
  };

  async updateProject(id: string, data: any): Promise<Project | null> {
    const { role, companyId } = data.user;
    const where = {
      id,
      ...(role === UserRole.CLIENT && { company: { id: companyId } }),
    };
    const project: any = await this.projectRepository.findOne({ where });
    if (!project && role !== UserRole.ROOT) {
      throw new NotFoundError("Project not found.");
    }
    Object.assign(project, data.body);
    return await this.projectRepository.save(project);
  }

  async deleteProject(id: string, user: any): Promise<void> {
    const where = {
      id,
      ...(user.role === UserRole.CLIENT && { company: { id: user.companyId } }),
    };
    const project = await this.projectRepository.findOne({ where });
    if (!project && user.role !== UserRole.ROOT) {
      throw new NotFoundError("Project not found.");
    }
    if (project) {
      await this.projectRepository.remove(project);
    }
  }
  async getOneProject(id: string, user: any) {
    const where = {
      id,
      ...(user.role === UserRole.CLIENT && { company: { id: user.companyId } }),
    };
    const project = await this.projectRepository.findOne({
      where,
      relations: ["tasks", "company"],
    });
    if (!project && user.role !== UserRole.ROOT) {
      throw new NotFoundError("Project not found.");
    }
     return project
   
  }
}
