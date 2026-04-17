import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Worker } from "../../entities/Worker.entity";
import { WorkerLog } from "../../entities/WorkerLog.entity";
import { AuthRequest, assertSameCompany } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

export class WorkersController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const limit  = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { status, role, search } = req.query;

      const qb = AppDataSource.getRepository(Worker).createQueryBuilder("w");
      if (req.companyId) qb.where("w.companyId = :cid", { cid: req.companyId });
      if (status) qb.andWhere("w.status = :status", { status });
      if (role)   qb.andWhere("w.role = :role",     { role });
      if (search) qb.andWhere("(w.firstName LIKE :s OR w.lastName LIKE :s OR w.email LIKE :s)", { s: `%${search}%` });

      qb.orderBy("w.firstName", "ASC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.companyId) return sendError(res, "No company context", 400);

      // Check worker limit
      const company = await AppDataSource.query("SELECT maxWorkers FROM companies WHERE id = ?", [req.companyId]);
      if (company[0]) {
        const [[{ cnt }]] = await Promise.all([
          AppDataSource.query("SELECT COUNT(*) as cnt FROM workers WHERE companyId = ?", [req.companyId]),
        ]);
        if (Number(cnt) >= company[0].maxWorkers) {
          return sendError(res, `Worker limit reached (max ${company[0].maxWorkers}). Upgrade your plan.`, 403);
        }
      }

      const repo = AppDataSource.getRepository(Worker);
      const { firstName, lastName, email, phone, role, status, hourlyRate, overtimeRate, notes, emergencyContact, emergencyPhone, hiredAt } = req.body;

      // Email unique within company
      const exists = await repo.findOne({ where: { email, companyId: req.companyId } });
      if (exists) return sendError(res, "Worker email already exists in this company", 409);

      const worker = repo.create({
        companyId: req.companyId,
        firstName, lastName, email, phone, role, status,
        hourlyRate, overtimeRate, notes,
        emergencyContact, emergencyPhone, hiredAt,
      });
      await repo.save(worker);
      return sendCreated(res, worker);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id: req.params.id } });
      if (!worker) return sendError(res, "Worker not found", 404);
      if (!assertSameCompany(worker.companyId, req, res)) return;
      return sendSuccess(res, worker);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo   = AppDataSource.getRepository(Worker);
      const worker = await repo.findOne({ where: { id: req.params.id } });
      if (!worker) return sendError(res, "Worker not found", 404);
      if (!assertSameCompany(worker.companyId, req, res)) return;

      const fields = ["firstName","lastName","phone","role","status","hourlyRate","overtimeRate","notes","emergencyContact","emergencyPhone","hiredAt"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (worker as any)[k] = req.body[k]; });
      await repo.save(worker);
      return sendSuccess(res, worker, "Worker updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo   = AppDataSource.getRepository(Worker);
      const worker = await repo.findOne({ where: { id: req.params.id } });
      if (!worker) return sendError(res, "Worker not found", 404);
      if (!assertSameCompany(worker.companyId, req, res)) return;
      await repo.remove(worker);
      return sendSuccess(res, null, "Worker deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  stats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id } });
      if (!worker) return sendError(res, "Worker not found", 404);
      if (!assertSameCompany(worker.companyId, req, res)) return;

      const { from, to } = req.query;
      let dateClause = "";
      const params: any[] = [id];
      if (from) { dateClause += " AND logDate >= ?"; params.push(from); }
      if (to)   { dateClause += " AND logDate <= ?"; params.push(to);   }

      const [overall, byProject, recent] = await Promise.all([
        AppDataSource.query(
          `SELECT COUNT(*) as totalLogs,
           COALESCE(SUM(hoursWorked),0) as totalHours,
           COALESCE(SUM(overtimeHours),0) as totalOvertime,
           COALESCE(SUM(totalCost),0) as totalCost,
           COUNT(DISTINCT projectId) as projectCount
           FROM worker_logs WHERE workerId = ? AND status != 'rejected'${dateClause}`, params
        ),
        AppDataSource.query(
          `SELECT p.name as projectName, wl.projectId,
           SUM(wl.hoursWorked) as hours, SUM(wl.overtimeHours) as overtime,
           SUM(wl.totalCost) as cost, COUNT(*) as logs
           FROM worker_logs wl JOIN projects p ON p.id = wl.projectId
           WHERE wl.workerId = ? AND wl.status != 'rejected'${dateClause}
           GROUP BY wl.projectId, p.name ORDER BY hours DESC`, params
        ),
        AppDataSource.query(
          `SELECT wl.*, p.name as projectName FROM worker_logs wl
           JOIN projects p ON p.id = wl.projectId
           WHERE wl.workerId = ? ORDER BY wl.logDate DESC LIMIT 10`, [id]
        ),
      ]);

      return sendSuccess(res, {
        worker,
        summary: {
          totalLogs:     Number(overall[0].totalLogs),
          totalHours:    Number(overall[0].totalHours),
          totalOvertime: Number(overall[0].totalOvertime),
          totalCost:     Number(overall[0].totalCost),
          projectCount:  Number(overall[0].projectCount),
        },
        byProject,
        recentLogs: recent,
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  logs = async (req: AuthRequest, res: Response) => {
    try {
      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id: req.params.id } });
      if (!worker) return sendError(res, "Worker not found", 404);
      if (!assertSameCompany(worker.companyId, req, res)) return;

      const limit  = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const qb = AppDataSource.getRepository(WorkerLog)
        .createQueryBuilder("wl")
        .leftJoinAndSelect("wl.project", "project")
        .leftJoinAndSelect("wl.task",    "task")
        .where("wl.workerId = :id", { id: req.params.id });

      if (req.query.status) qb.andWhere("wl.status = :status", { status: req.query.status });
      if (req.query.from)   qb.andWhere("wl.logDate >= :from", { from: req.query.from });
      if (req.query.to)     qb.andWhere("wl.logDate <= :to",   { to: req.query.to });

      qb.orderBy("wl.logDate", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
