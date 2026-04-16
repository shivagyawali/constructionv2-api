import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { WorkerLog, LogStatus } from "../../entities/WorkerLog.entity";
import { Worker } from "../../entities/Worker.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

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

      qb.orderBy("wl.logDate", "DESC").addOrderBy("wl.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const { workerId, projectId, taskId, logDate, startTime, endTime, hoursWorked, overtimeHours, logType, description, notes } = req.body;

      const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id: workerId } });
      if (!worker) return sendError(res, "Worker not found", 404);

      const log = repo.create({
        workerId, projectId, taskId, logDate, startTime, endTime,
        hoursWorked: Number(hoursWorked),
        overtimeHours: Number(overtimeHours) || 0,
        logType, description, notes,
        hourlyRateSnapshot: worker.hourlyRate,
        overtimeRateSnapshot: worker.overtimeRate || Number(worker.hourlyRate) * 1.5,
        createdById: req.user!.id,
      });

      await repo.save(log);

      if (taskId) {
        await AppDataSource.query("UPDATE tasks SET loggedHours = loggedHours + ? WHERE id = ?", [Number(hoursWorked), taskId]);
      }

      const full = await repo.findOne({ where: { id: log.id }, relations: ["worker", "project", "task"] });
      return sendCreated(res, full);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const log = await AppDataSource.getRepository(WorkerLog).findOne({
        where: { id: req.params.id },
        relations: ["worker", "project", "task", "createdBy"],
      });
      if (!log) return sendError(res, "Worker log not found", 404);
      return sendSuccess(res, log);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return sendError(res, "Worker log not found", 404);
      if ([LogStatus.APPROVED, LogStatus.INVOICED].includes(log.status)) {
        return sendError(res, "Cannot edit an approved or invoiced log", 400);
      }

      const fields = ["logDate","startTime","endTime","hoursWorked","overtimeHours","logType","description","notes"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (log as any)[k] = req.body[k]; });
      log.calculateCost();
      await repo.save(log);
      return sendSuccess(res, log, "Log updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return sendError(res, "Worker log not found", 404);
      if (log.status === LogStatus.INVOICED) return sendError(res, "Cannot delete an invoiced log", 400);
      await repo.remove(log);
      return sendSuccess(res, null, "Log deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  approve = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return sendError(res, "Log not found", 404);
      if (log.status === LogStatus.INVOICED) return sendError(res, "Log is already invoiced", 400);
      log.status = LogStatus.APPROVED;
      log.approvedById = req.user!.id;
      log.approvedAt = new Date();
      log.rejectedReason = "";
      await repo.save(log);
      return sendSuccess(res, log, "Log approved");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  reject = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(WorkerLog);
      const log = await repo.findOne({ where: { id: req.params.id } });
      if (!log) return sendError(res, "Log not found", 404);
      log.status = LogStatus.REJECTED;
      log.rejectedReason = req.body.reason || "No reason provided";
      await repo.save(log);
      return sendSuccess(res, log, "Log rejected");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  bulkApprove = async (req: AuthRequest, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return sendError(res, "ids array is required");
      await AppDataSource.query(
        `UPDATE worker_logs SET status = 'approved', approvedById = ?, approvedAt = NOW()
         WHERE id IN (?) AND status = 'pending'`,
        [req.user!.id, ids]
      );
      return sendSuccess(res, null, `${ids.length} logs approved`);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
