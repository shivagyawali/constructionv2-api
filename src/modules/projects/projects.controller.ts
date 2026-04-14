import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Project, ProjectStatus } from "../../entities/Project.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { success, created, error, paginate } from "../../utils/response";

export class ProjectsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { status, clientId, priority, search } = req.query;

      const qb = repo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.client", "client");

      if (status) qb.andWhere("p.status = :status", { status });
      if (clientId) qb.andWhere("p.clientId = :clientId", { clientId });
      if (priority) qb.andWhere("p.priority = :priority", { priority });
      if (search) qb.andWhere("p.name LIKE :s OR p.description LIKE :s", { s: `%${search}%` });

      qb.orderBy("p.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();

      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const { name, description, clientId, budgetAmount, startDate, expectedEndDate, priority, address, notes } = req.body;

      if (!name || !clientId) return error(res, "name and clientId are required");

      const project = repo.create({ name, description, clientId, budgetAmount, startDate, expectedEndDate, priority, address, notes });
      await repo.save(project);

      const full = await repo.findOne({ where: { id: project.id }, relations: ["client"] });
      return created(res, full);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({
        where: { id: req.params.id },
        relations: ["client", "tasks", "invoices"],
      });
      if (!project) return error(res, "Project not found", 404);
      return success(res, project);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id: req.params.id } });
      if (!project) return error(res, "Project not found", 404);

      const allowed = ["name", "description", "status", "priority", "budgetAmount", "startDate", "expectedEndDate", "actualEndDate", "progress", "address", "notes"];
      allowed.forEach((k) => { if (req.body[k] !== undefined) (project as any)[k] = req.body[k]; });

      // Auto set completedAt
      if (req.body.status === ProjectStatus.COMPLETED && !project.actualEndDate) {
        project.actualEndDate = new Date();
      }

      await repo.save(project);
      return success(res, project, "Project updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id: req.params.id } });
      if (!project) return error(res, "Project not found", 404);
      await repo.remove(project);
      return success(res, null, "Project deleted");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  stats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const repo = AppDataSource.getRepository(Project);
      const project = await repo.findOne({ where: { id } });
      if (!project) return error(res, "Project not found", 404);

      const [taskStats, invoiceStats, workerLogStats] = await Promise.all([
        AppDataSource.query(
          `SELECT
            COUNT(*) as totalTasks,
            SUM(status = 'done') as completedTasks,
            SUM(status = 'in_progress') as inProgressTasks,
            SUM(status = 'todo') as todoTasks,
            COALESCE(SUM(loggedHours), 0) as totalLoggedHours
          FROM tasks WHERE projectId = ?`, [id]
        ),
        AppDataSource.query(
          `SELECT
            COUNT(*) as totalInvoices,
            COALESCE(SUM(totalAmount), 0) as totalBilled,
            COALESCE(SUM(amountPaid), 0) as totalPaid
          FROM invoices WHERE projectId = ?`, [id]
        ),
        AppDataSource.query(
          `SELECT
            COUNT(*) as totalLogs,
            COALESCE(SUM(hoursWorked), 0) as totalHours,
            COALESCE(SUM(totalCost), 0) as totalLaborCost,
            COUNT(DISTINCT workerId) as uniqueWorkers
          FROM worker_logs WHERE projectId = ? AND status != 'rejected'`, [id]
        ),
      ]);

      return success(res, {
        tasks: {
          total: Number(taskStats[0].totalTasks),
          completed: Number(taskStats[0].completedTasks),
          inProgress: Number(taskStats[0].inProgressTasks),
          todo: Number(taskStats[0].todoTasks),
          loggedHours: Number(taskStats[0].totalLoggedHours),
        },
        invoices: {
          total: Number(invoiceStats[0].totalInvoices),
          totalBilled: Number(invoiceStats[0].totalBilled),
          totalPaid: Number(invoiceStats[0].totalPaid),
          outstanding: Number(invoiceStats[0].totalBilled) - Number(invoiceStats[0].totalPaid),
        },
        workerLogs: {
          totalLogs: Number(workerLogStats[0].totalLogs),
          totalHours: Number(workerLogStats[0].totalHours),
          totalLaborCost: Number(workerLogStats[0].totalLaborCost),
          uniqueWorkers: Number(workerLogStats[0].uniqueWorkers),
        },
        budget: {
          allocated: Number(project.budgetAmount) || 0,
          spent: Number(project.spentAmount) || 0,
          remaining: (Number(project.budgetAmount) || 0) - (Number(project.spentAmount) || 0),
        },
      });
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };
}
