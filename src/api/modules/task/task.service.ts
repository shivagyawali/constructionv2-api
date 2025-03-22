import { AppDataSource } from "../../../config/db";
import { Task } from "../../../entity/Task";
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
import { Project } from "../../../entity/Project";
import { In } from "typeorm";
import { instanceToPlain } from "class-transformer";

export class TaskService {
  private taskRepository = AppDataSource.getRepository(Task);

  async createTask(req: any) {
  const { company, role } = req.user;
  const { title, description, projectId, userIds } = req.body;

  if (role !== UserRole.ROOT && role !== UserRole.CLIENT && !company) {
    throw new BadRequestError("You are not registered with any company yet.");
  }

  const project = await AppDataSource.getRepository(Project).findOne({
    where: { id: projectId },
  });
  if (!project) throw new BadRequestError("Invalid project ID.");

  const users = userIds
    ? await AppDataSource.getRepository(User).find({
        where: { id: In(userIds),role:UserRole.WORKER },
      })
    : null;

  const savedTask = await this.taskRepository.save({
    title,
    description: description || null,
    project,
    company: company || null,
    users,
  });

  return {
    id: savedTask.id,
    title: savedTask.title,
    description: savedTask.description,
    company: savedTask.company ? savedTask.company.name : null,
    users: savedTask.users
      ? savedTask.users.map((user) => ({ id: user.id, name: user.name }))
      : [],
  };
  }

  getAllTasks = async (
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

    const [results, count] = await this.taskRepository.findAndCount({
      where,
      relations: ["project", "company","users"],
      skip: (page - 1) * 10,
      take: 10,
      order: { createdAt: "DESC" },
    });
   
    return { ...paginate(page, count), results: instanceToPlain(results), count };
  };

  async updateTask(id: string, data: any): Promise<Task | null> {
    const { role, companyId } = data.user;
    const where = {
      id,
      ...(role === UserRole.CLIENT && { company: { id: companyId } }),
    };
    const task: any = await this.taskRepository.findOne({ where });
    if (!task && role !== UserRole.ROOT) {
      throw new NotFoundError("Task not found.");
    }
    Object.assign(task, data.body);
    return await this.taskRepository.save(task);
  }

  async deleteTask(id: string, user: any): Promise<void> {
    const where = {
      id,
      ...(user.role === UserRole.CLIENT && { company: { id: user.companyId } }),
    };
    const task = await this.taskRepository.findOne({ where });
    if (!task && user.role !== UserRole.ROOT) {
      throw new NotFoundError("Task not found.");
    }
    if (task) {
      await this.taskRepository.remove(task);
    }
  }
  async getOne(id: string, user: any): Promise<void> {
    const where = {
      id,
      ...(user.role === UserRole.CLIENT && { company: { id: user.companyId } }),
    };
    const task = await this.taskRepository.findOne({ where });
    if (!task && user.role !== UserRole.ROOT) {
      throw new NotFoundError("Task not found.");
    }
    await task;

  }
}
