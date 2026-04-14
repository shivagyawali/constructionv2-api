import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { WorkerLog, LogStatus } from "../../entities/WorkerLog.entity";
import { Worker } from "../../entities/Worker.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { success, created, error, paginate } from "../../utils/response";

export class WorkerLogsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const limit = Math.min(Number(req.query.limit) || 20, 200);
      const offset = Number(req.query.offset) || 0;
      const { projectId, workerId, status, from, to, logType } = req.query;

      const qb = repo.createQueryBuilder("wl")
        .leftJoinAndSelect("wl.worker", "worker")
        .leftJoinAndSelect("wl.project", "project")
        .leftJoinAndSelect("wl.task", "task");

      if (projectId) qb.andWhere("wl.projectId = :projectId", { projectId });
      if (workerId) qb.andWhere("wl.workerId = :workerId", { workerId });
      if (status) qb.andWhere("wl.status = :status", { status });
      if (logType) qb.andWhere("wl.logType = :logType", { logType });
      if (from) qb.andWhere("wl.logDate >= :from", { from });
      if (to) qb.andWhere("wl.logDate <= :to", { to });

      qb.orderBy("wl.logDate", "DESC").addOrderBy("wl.createdAt", "DESC")
        .skip(offset).take(limit);

      const [data, total] = await qb.getManyAndCount();
      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const workerRepo = AppDataSource.getRepository(Worker);

      const { workerId, projectId, taskId, logDate, startTime, endTime, hoursWorked, overtimeHours, logType, description, notes } = req.body;

      if (!workerId || !projectId || !logDate || hoursWorked === undefined) {
        return error(res, "workerId, projectId, logDate and hoursWorked are required");
      }

      // Snapshot the worker's current rate
      const worker = await workerRepo.findOne({ where: { id: workerId } });
      if (!worker) return error(res, "Worker not found", 404);

      const log = repo.create({
        workerId, projectId, taskId, logDate, startTime, endTime,
        hoursWorked: Number(hoursWorked),
        overtimeHours: Number(overtimeHours) || 0,
        logType,
        description, notes,
        hourlyRateSnapshot: worker.hourlyRate,
        overtimeRateSnapshot: worker.overtimeRate || Number(worker.hourlyRate) * 1.5,
        createdById: req.user!.id,
      });

      await repo.save(log);

      // Update task loggedHours if taskId provided
      if (taskId) {
        await AppDataSource.query(
          "UPDATE tasks SET loggedHours = loggedHours + ? WHERE id = ?",
          [Number(hoursWorked), taskId]
        );
      }

      const full = await repo.findOne({
        where: { id: log.id },
        relations: ["worker", "project", "task"],
      });
      return created(res, full);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({
        where: { id: req.params.id },
        relations: ["worker", "project", "task", "createdBy"],
      });
      if (!log) return error(res, "Worker log not found", 404);
      return success(res, log);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return error(res, "Worker log not found", 404);

      if (log.status === LogStatus.APPROVED || log.status === LogStatus.INVOICED) {
        return error(res, "Cannot edit an approved or invoiced log", 400);
      }

      const allowed = ["logDate", "startTime", "endTime", "hoursWorked", "overtimeHours", "logType", "description", "notes"];
      allowed.forEach((k) => { if (req.body[k] !== undefined) (log as any)[k] = req.body[k]; });
      log.calculateCost();

      await repo.save(log);
      return success(res, log, "Log updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return error(res, "Worker log not found", 404);
      if (log.status === LogStatus.INVOICED) {
        return error(res, "Cannot delete an invoiced log", 400);
      }
      await repo.remove(log);
      return success(res, null, "Log deleted");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  approve = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return error(res, "Worker log not found", 404);
      if (log.status === LogStatus.INVOICED) return error(res, "Log is already invoiced", 400);

      log.status = LogStatus.APPROVED;
      log.approvedById = req.user!.id;
      log.approvedAt = new Date();
      log.rejectedReason = "";
      await repo.save(log);
      return success(res, log, "Log approved");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  reject = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return error(res, "Worker log not found", 404);

      log.status = LogStatus.REJECTED;
      log.rejectedReason = req.body.reason || "No reason provided";
      log.approvedById = "";
      await repo.save(log);
      return success(res, log, "Log rejected");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  bulkCreate = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const workerRepo = AppDataSource.getRepository(Worker);
      const { logs } = req.body;

      if (!Array.isArray(logs) || logs.length === 0) {
        return error(res, "logs array is required");
      }

const saved: WorkerLog[] = [];
      for (const entry of logs) {
        const worker = await workerRepo.findOne({ where: { id: entry.workerId } });
        if (!worker) continue;

        const log :any= repo.create({
          ...entry,
          hoursWorked: Number(entry.hoursWorked),
          overtimeHours: Number(entry.overtimeHours) || 0,
          hourlyRateSnapshot: worker.hourlyRate,
          overtimeRateSnapshot: worker.overtimeRate || Number(worker.hourlyRate) * 1.5,
          createdById: req.user!.id,
        });
        await repo.save(log);
        saved.push(log);
      }

      return created(res, saved, `${saved.length} logs created`);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  bulkApprove = async (req: AuthRequest, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return error(res, "ids array is required");

      await AppDataSource.query(
        `UPDATE worker_logs SET status = 'approved', approvedById = ?, approvedAt = NOW()
         WHERE id IN (?) AND status = 'pending'`,
        [req.user!.id, ids]
      );

      return success(res, null, `${ids.length} logs approved`);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  summary = async (req: AuthRequest, res: Response) => {
    try {
      const { projectId, from, to, groupBy = "worker" } = req.query;
      const params: any[] = [];
      let where = "wl.status != 'rejected'";

      if (projectId) { where += " AND wl.projectId = ?"; params.push(projectId); }
      if (from) { where += " AND wl.logDate >= ?"; params.push(from); }
      if (to) { where += " AND wl.logDate <= ?"; params.push(to); }

      let groupSQL = "";
      let selectSQL = "";

      if (groupBy === "worker") {
        selectSQL = `w.id as workerId, CONCAT(w.firstName, ' ', w.lastName) as workerName, w.trade,`;
        groupSQL = "GROUP BY wl.workerId, w.id";
      } else if (groupBy === "project") {
        selectSQL = `p.id as projectId, p.name as projectName,`;
        groupSQL = "GROUP BY wl.projectId, p.id";
      } else if (groupBy === "date") {
        selectSQL = `wl.logDate as date,`;
        groupSQL = "GROUP BY wl.logDate";
      }

      const rows = await AppDataSource.query(
        `SELECT
          ${selectSQL}
          COUNT(*) as totalLogs,
          SUM(wl.hoursWorked) as totalHours,
          SUM(wl.overtimeHours) as totalOvertime,
          SUM(wl.totalCost) as totalCost,
          SUM(wl.status = 'pending') as pendingLogs,
          SUM(wl.status = 'approved') as approvedLogs,
          SUM(wl.status = 'invoiced') as invoicedLogs
        FROM worker_logs wl
        LEFT JOIN workers w ON w.id = wl.workerId
        LEFT JOIN projects p ON p.id = wl.projectId
        WHERE ${where}
        ${groupSQL}
        ORDER BY totalHours DESC`,
        params
      );

      const totals = await AppDataSource.query(
        `SELECT
          COUNT(*) as totalLogs,
          SUM(hoursWorked) as totalHours,
          SUM(overtimeHours) as totalOvertime,
          SUM(totalCost) as totalCost
        FROM worker_logs wl WHERE ${where}`,
        params
      );

      return success(res, { rows, totals: totals[0] });
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };
}
