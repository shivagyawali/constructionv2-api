import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Worker } from "../../entities/Worker.entity";
import { WorkerLog } from "../../entities/WorkerLog.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { success, created, error, paginate } from "../../utils/response";

export class WorkersController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Worker);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { status, trade, search } = req.query;

      const qb = repo.createQueryBuilder("w");
      if (status) qb.andWhere("w.status = :status", { status });
      if (trade) qb.andWhere("w.trade = :trade", { trade });
      if (search) {
        qb.andWhere("w.firstName LIKE :s OR w.lastName LIKE :s OR w.email LIKE :s", { s: `%${search}%` });
      }

      qb.orderBy("w.firstName", "ASC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Worker);
      const { firstName, lastName, email, phone, trade, hourlyRate, overtimeRate, licenseNumber, licenseExpiry, hiredAt, notes, emergencyContact, emergencyPhone } = req.body;

      if (!firstName || !lastName || !email) return error(res, "firstName, lastName and email are required");

      const exists = await repo.findOne({ where: { email } });
      if (exists) return error(res, "Email already registered", 409);

      const worker = repo.create({ firstName, lastName, email, phone, trade, hourlyRate, overtimeRate, licenseNumber, licenseExpiry, hiredAt, notes, emergencyContact, emergencyPhone });
      await repo.save(worker);
      return created(res, worker);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Worker);
      const worker = await repo.findOne({ where: { id: req.params.id } });
      if (!worker) return error(res, "Worker not found", 404);
      return success(res, worker);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Worker);
      const worker = await repo.findOne({ where: { id: req.params.id } });
      if (!worker) return error(res, "Worker not found", 404);

      const allowed = ["firstName", "lastName", "phone", "trade", "status", "hourlyRate", "overtimeRate", "licenseNumber", "licenseExpiry", "notes", "emergencyContact", "emergencyPhone"];
      allowed.forEach((k) => { if (req.body[k] !== undefined) (worker as any)[k] = req.body[k]; });
      await repo.save(worker);
      return success(res, worker, "Worker updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Worker);
      const worker = await repo.findOne({ where: { id: req.params.id } });
      if (!worker) return error(res, "Worker not found", 404);
      await repo.remove(worker);
      return success(res, null, "Worker deleted");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  stats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id } });
      if (!worker) return error(res, "Worker not found", 404);

      const { from, to } = req.query;
      let dateFilter = "";
      const params: any[] = [id];
      if (from) { dateFilter += " AND logDate >= ?"; params.push(from); }
      if (to) { dateFilter += " AND logDate <= ?"; params.push(to); }

      const [overall, byProject, recent] = await Promise.all([
        AppDataSource.query(
          `SELECT
            COUNT(*) as totalLogs,
            COALESCE(SUM(hoursWorked), 0) as totalHours,
            COALESCE(SUM(overtimeHours), 0) as totalOvertime,
            COALESCE(SUM(totalCost), 0) as totalCost,
            COUNT(DISTINCT projectId) as projectCount
          FROM worker_logs WHERE workerId = ? AND status != 'rejected'${dateFilter}`,
          params
        ),
        AppDataSource.query(
          `SELECT p.name as projectName, wl.projectId,
            SUM(wl.hoursWorked) as hours, SUM(wl.totalCost) as cost, COUNT(*) as logs
          FROM worker_logs wl
          JOIN projects p ON p.id = wl.projectId
          WHERE wl.workerId = ? AND wl.status != 'rejected'${dateFilter}
          GROUP BY wl.projectId, p.name ORDER BY hours DESC`,
          params
        ),
        AppDataSource.query(
          `SELECT wl.*, p.name as projectName
          FROM worker_logs wl
          JOIN projects p ON p.id = wl.projectId
          WHERE wl.workerId = ?
          ORDER BY wl.logDate DESC LIMIT 10`,
          [id]
        ),
      ]);

      return success(res, {
        worker,
        overall: {
          totalLogs: Number(overall[0].totalLogs),
          totalHours: Number(overall[0].totalHours),
          totalOvertime: Number(overall[0].totalOvertime),
          totalCost: Number(overall[0].totalCost),
          projectCount: Number(overall[0].projectCount),
        },
        byProject,
        recentLogs: recent,
      });
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  logs = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const qb = repo.createQueryBuilder("wl")
        .leftJoinAndSelect("wl.project", "project")
        .leftJoinAndSelect("wl.task", "task")
        .where("wl.workerId = :id", { id: req.params.id });

      if (req.query.status) qb.andWhere("wl.status = :status", { status: req.query.status });
      if (req.query.from) qb.andWhere("wl.logDate >= :from", { from: req.query.from });
      if (req.query.to) qb.andWhere("wl.logDate <= :to", { to: req.query.to });

      qb.orderBy("wl.logDate", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };
}
