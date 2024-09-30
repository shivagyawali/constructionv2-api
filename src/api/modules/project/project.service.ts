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
  private userRepo = AppDataSource.getRepository(User);
  async createProject({
    body: { name, description },
    user: { id: userId },
  }: any) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["company"],
    });
    if (
      user?.role !== UserRole.ROOT &&
      user?.role !== UserRole.CLIENT &&
      !user?.company
    ) {
      throw new BadRequestError(
        "You are not yet registered with any company yet"
      );
    }
    const newProject = await this.projectRepository.save({
      name,
      description: description || null,
      company: user?.company || null,
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
    const { user: { role, companyId } = {} } = req || {};
    const where = {
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
}
