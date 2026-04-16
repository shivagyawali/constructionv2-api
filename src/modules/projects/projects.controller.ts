import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Project, ProjectStatus } from "../../entities/Project.entity";
import { Worker } from "../../entities/Worker.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

export class ProjectsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { status, clientId, priority, search } = req.query;

      const qb = repo.createQueryBuilder("p").leftJoinAndSelect("p.client", "client");
      if (status) qb.andWhere("p.status = :status", { status });
      if (clientId) qb.andWhere("p.clientId = :clientId", { clientId });
      if (priority) qb.andWhere("p.priority = :priority", { priority });
      if (search) qb.andWhere("(p.name LIKE :s OR p.description LIKE :s)", { s: `%${search}%` });

      qb.orderBy("p.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const { name, clientId, description, budgetAmount, startDate, expectedEndDate, priority, status, address, notes } = req.body;

      const project = repo.create({ name, clientId, description, budgetAmount, startDate, expectedEndDate, priority, status, address, notes });
      await repo.save(project);

      const full = await repo.findOne({ where: { id: project.id }, relations: ["client"] });
      return sendCreated(res, full);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const project = await AppDataSource.getRepository(Project).findOne({
        where: { id: req.params.id },
        relations: ["client", "tasks", "workers"],
      });
      if (!project) return sendError(res, "Project not found", 404);
      return sendSuccess(res, project);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id: req.params.id } });
      if (!project) return sendError(res, "Project not found", 404);

      const fields = ["name","description","status","priority","budgetAmount","startDate","expectedEndDate","actualEndDate","progress","address","notes"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (project as any)[k] = req.body[k]; });

      if (req.body.status === ProjectStatus.COMPLETED && !project.actualEndDate) {
        project.actualEndDate = new Date();
      }

      await repo.save(project);
      const full = await repo.findOne({ where: { id: project.id }, relations: ["client"] });
      return sendSuccess(res, full, "Project updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id: req.params.id } });
      if (!project) return sendError(res, "Project not found", 404);
      await repo.remove(project);
      return sendSuccess(res, null, "Project deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  stats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const project = await AppDataSource.getRepository(Project).findOne({ where: { id } });
      if (!project) return sendError(res, "Project not found", 404);

      const [taskStats, invoiceStats, laborStats] = await Promise.all([
        AppDataSource.query(
          `SELECT COUNT(*) as totalTasks, SUM(status='done') as completedTasks,
           SUM(status='in_progress') as inProgressTasks, SUM(status='todo') as todoTasks
           FROM tasks WHERE projectId = ?`, [id]
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as total, COALESCE(SUM(totalAmount),0) as billed,
           COALESCE(SUM(amountPaid),0) as paid FROM invoices WHERE projectId = ?`, [id]
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as logs, COALESCE(SUM(hoursWorked),0) as hours,
           COALESCE(SUM(totalCost),0) as cost, COUNT(DISTINCT workerId) as workers
           FROM worker_logs WHERE projectId = ? AND status != 'rejected'`, [id]
        ),
      ]);

      return sendSuccess(res, {
        totalTasks: Number(taskStats[0].totalTasks),
        completedTasks: Number(taskStats[0].completedTasks),
        inProgressTasks: Number(taskStats[0].inProgressTasks),
        todoTasks: Number(taskStats[0].todoTasks),
        invoices: {
          total: Number(invoiceStats[0].total),
          totalBilled: Number(invoiceStats[0].billed),
          totalPaid: Number(invoiceStats[0].paid),
          outstanding: Number(invoiceStats[0].billed) - Number(invoiceStats[0].paid),
        },
        labor: {
          totalLogs: Number(laborStats[0].logs),
          totalHours: Number(laborStats[0].hours),
          totalCost: Number(laborStats[0].cost),
          uniqueWorkers: Number(laborStats[0].workers),
        },
        budget: {
          allocated: Number(project.budgetAmount) || 0,
          spent: Number(project.spentAmount) || 0,
          remaining: (Number(project.budgetAmount) || 0) - (Number(project.spentAmount) || 0),
        },
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  assignWorker = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id: req.params.id }, relations: ["workers"] });
      if (!project) return sendError(res, "Project not found", 404);

      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id: req.body.workerId } });
      if (!worker) return sendError(res, "Worker not found", 404);

      const already = project.workers?.some((w) => w.id === worker.id);
      if (!already) {
        project.workers = [...(project.workers || []), worker];
        await repo.save(project);
      }

      return sendSuccess(res, project, "Worker assigned");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  removeWorker = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id: req.params.id }, relations: ["workers"] });
      if (!project) return sendError(res, "Project not found", 404);

      project.workers = (project.workers || []).filter((w) => w.id !== req.params.workerId);
      await repo.save(project);
      return sendSuccess(res, null, "Worker removed from project");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
