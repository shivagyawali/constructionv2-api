import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { In } from "typeorm";
import { Task, TaskStatus } from "../../entities/Task.entity";
import { Worker } from "../../entities/Worker.entity";
import { Project } from "../../entities/Project.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

export class TasksController {
  listByProject = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const { projectId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const { status, priority } = req.query;

      const qb = repo.createQueryBuilder("t")
        .leftJoinAndSelect("t.assignedWorkers", "assignedWorkers")
        .where("t.projectId = :projectId", { projectId });

      if (status) qb.andWhere("t.status = :status", { status });
      if (priority) qb.andWhere("t.priority = :priority", { priority });

      qb.orderBy("t.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const { projectId, title, description, priority, startDate, dueDate, estimatedHours, notes, assignedWorkerIds } = req.body;

      const task = repo.create({ projectId, title, description, priority, startDate, dueDate, estimatedHours, notes });

      // Assign workers if provided
      if (assignedWorkerIds?.length) {
        const workers = await AppDataSource.getRepository(Worker).findBy({ id: In(assignedWorkerIds) });
        task.assignedWorkers = workers;
      }

      await repo.save(task);
      const full = await repo.findOne({ where: { id: task.id }, relations: ["assignedWorkers"] });
      return sendCreated(res, full);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const task = await AppDataSource.getRepository(Task).findOne({
        where: { id: req.params.id },
        relations: ["project", "assignedWorkers"],
      });
      if (!task) return sendError(res, "Task not found", 404);
      return sendSuccess(res, task);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id }, relations: ["assignedWorkers"] });
      if (!task) return sendError(res, "Task not found", 404);

      const fields = ["title","description","status","priority","progress","startDate","dueDate","estimatedHours","notes"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (task as any)[k] = req.body[k]; });

      if (req.body.status === TaskStatus.DONE && !task.completedAt) {
        task.completedAt = new Date();
        task.progress = 100;
      }

      // Update worker assignments if provided
      if (req.body.assignedWorkerIds !== undefined) {
        if (req.body.assignedWorkerIds.length > 0) {
          task.assignedWorkers = await AppDataSource.getRepository(Worker).findBy({ id: In(req.body.assignedWorkerIds) });
        } else {
          task.assignedWorkers = [];
        }
      }

      await repo.save(task);
      await this.syncProjectProgress(task.projectId);
      const full = await repo.findOne({ where: { id: task.id }, relations: ["assignedWorkers"] });
      return sendSuccess(res, full, "Task updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  updateProgress = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) return sendError(res, "Task not found", 404);

      const progress = Number(req.body.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        return sendError(res, "Progress must be between 0 and 100");
      }

      task.progress = progress;
      if (progress === 100) { task.status = TaskStatus.DONE; task.completedAt = new Date(); }
      else if (progress > 0 && task.status === TaskStatus.TODO) task.status = TaskStatus.IN_PROGRESS;

      await repo.save(task);
      await this.syncProjectProgress(task.projectId);
      return sendSuccess(res, task, "Progress updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) return sendError(res, "Task not found", 404);
      const projectId = task.projectId;
      await repo.remove(task);
      await this.syncProjectProgress(projectId);
      return sendSuccess(res, null, "Task deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  assignWorker = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id }, relations: ["assignedWorkers"] });
      if (!task) return sendError(res, "Task not found", 404);

      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id: req.body.workerId } });
      if (!worker) return sendError(res, "Worker not found", 404);

      if (!task.assignedWorkers?.some((w) => w.id === worker.id)) {
        task.assignedWorkers = [...(task.assignedWorkers || []), worker];
        await repo.save(task);
      }
      return sendSuccess(res, task, "Worker assigned to task");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  removeWorker = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id }, relations: ["assignedWorkers"] });
      if (!task) return sendError(res, "Task not found", 404);

      task.assignedWorkers = (task.assignedWorkers || []).filter((w) => w.id !== req.params.workerId);
      await repo.save(task);
      return sendSuccess(res, null, "Worker removed from task");
    } catch (e: any) {
      return sendError(res, e.message, 500);
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
