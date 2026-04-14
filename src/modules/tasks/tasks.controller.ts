import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Task, TaskStatus } from "../../entities/Task.entity";
import { Project } from "../../entities/Project.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { success, created, error, paginate } from "../../utils/response";

export class TasksController {
  listByProject = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const { projectId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const { status, priority } = req.query;

      const qb = repo.createQueryBuilder("t").where("t.projectId = :projectId", { projectId });
      if (status) qb.andWhere("t.status = :status", { status });
      if (priority) qb.andWhere("t.priority = :priority", { priority });

      qb.orderBy("t.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();

      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const { projectId, title, description, priority, startDate, dueDate, estimatedHours, notes } = req.body;

      if (!projectId || !title) return error(res, "projectId and title are required");

      const task = repo.create({ projectId, title, description, priority, startDate, dueDate, estimatedHours, notes });
      await repo.save(task);
      return created(res, task);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id }, relations: ["project"] });
      if (!task) return error(res, "Task not found", 404);
      return success(res, task);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) return error(res, "Task not found", 404);

      const allowed = ["title", "description", "status", "priority", "progress", "startDate", "dueDate", "estimatedHours", "notes"];
      allowed.forEach((k) => { if (req.body[k] !== undefined) (task as any)[k] = req.body[k]; });

      if (req.body.status === TaskStatus.DONE && !task.completedAt) {
        task.completedAt = new Date();
        task.progress = 100;
      }

      await repo.save(task);
      await this.syncProjectProgress(task.projectId);
      return success(res, task, "Task updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  updateProgress = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) return error(res, "Task not found", 404);

      const progress = Number(req.body.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        return error(res, "Progress must be between 0 and 100");
      }

      task.progress = progress;
      if (progress === 100) { task.status = TaskStatus.DONE; task.completedAt = new Date(); }
      else if (progress > 0 && task.status === TaskStatus.TODO) task.status = TaskStatus.IN_PROGRESS;

      await repo.save(task);
      await this.syncProjectProgress(task.projectId);
      return success(res, task, "Progress updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) return error(res, "Task not found", 404);
      const projectId = task.projectId;
      await repo.remove(task);
      await this.syncProjectProgress(projectId);
      return success(res, null, "Task deleted");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  private syncProjectProgress = async (projectId: string) => {
    try {
      const result = await AppDataSource.query(
        "SELECT AVG(progress) as avg FROM tasks WHERE projectId = ? AND status != 'cancelled'",
        [projectId]
      );
      const avg = Math.round(Number(result[0]?.avg) || 0);
      await AppDataSource.getRepository(Project).update({ id: projectId }, { progress: avg });
    } catch { /* silent */ }
  };
}
