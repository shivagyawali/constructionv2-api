import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { InvoicePeriod } from "../../entities/InvoicePeriod.entity";
import { Worker } from "../../entities/Worker.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

export class InvoicePeriodsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(InvoicePeriod);
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const { workerId, from, to } = req.query;

      const qb = repo.createQueryBuilder("ip")
        .leftJoinAndSelect("ip.worker", "worker");

      if (workerId) qb.andWhere("ip.workerId = :workerId", { workerId });
      if (from) qb.andWhere("ip.startDate >= :from", { from });
      if (to) qb.andWhere("ip.endDate <= :to", { to });

      qb.orderBy("ip.startDate", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(InvoicePeriod);
      const { workerId, startDate, endDate, regularHours, overtimeHours, hourlyRate, overtimeRate, notes } = req.body;

      // Validate date range
      if (startDate > endDate) return sendError(res, "startDate must be before endDate");

      // If no rates provided, pull from worker
      let finalHourlyRate = Number(hourlyRate) || 0;
      let finalOvertimeRate = Number(overtimeRate) || 0;
      if (!finalHourlyRate || !finalOvertimeRate) {
        const worker = await AppDataSource.getRepository(Worker).findOne({ where: { id: workerId } });
        if (worker) {
          if (!finalHourlyRate) finalHourlyRate = Number(worker.hourlyRate) || 0;
          if (!finalOvertimeRate) finalOvertimeRate = Number(worker.overtimeRate) || finalHourlyRate * 1.5;
        }
      }

      const period = repo.create({
        workerId, startDate, endDate,
        regularHours: Number(regularHours) || 0,
        overtimeHours: Number(overtimeHours) || 0,
        hourlyRate: finalHourlyRate,
        overtimeRate: finalOvertimeRate,
        notes,
      });

      await repo.save(period);

      const full = await repo.findOne({ where: { id: period.id }, relations: ["worker"] });
      return sendCreated(res, full);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const period = await AppDataSource.getRepository(InvoicePeriod).findOne({
        where: { id: req.params.id },
        relations: ["worker"],
      });
      if (!period) return sendError(res, "Invoice period not found", 404);
      return sendSuccess(res, period);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(InvoicePeriod);
      const period = await repo.findOne({ where: { id: req.params.id } });
      if (!period) return sendError(res, "Invoice period not found", 404);

      const fields = ["startDate","endDate","regularHours","overtimeHours","hourlyRate","overtimeRate","notes"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (period as any)[k] = req.body[k]; });
      period.computeTotalPay();
      await repo.save(period);

      const full = await repo.findOne({ where: { id: period.id }, relations: ["worker"] });
      return sendSuccess(res, full, "Period updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(InvoicePeriod);
      const period = await repo.findOne({ where: { id: req.params.id } });
      if (!period) return sendError(res, "Invoice period not found", 404);
      await repo.remove(period);
      return sendSuccess(res, null, "Period deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  summary = async (req: AuthRequest, res: Response) => {
    try {
      const { from, to, workerId } = req.query;
      let clause = "1=1";
      const params: any[] = [];
      if (workerId) { clause += " AND workerId = ?"; params.push(workerId); }
      if (from) { clause += " AND startDate >= ?"; params.push(from); }
      if (to) { clause += " AND endDate <= ?"; params.push(to); }

      const [rows] = await Promise.all([
        AppDataSource.query(
          `SELECT workerId,
            SUM(regularHours) as totalRegular, SUM(overtimeHours) as totalOvertime,
            SUM(totalPay) as totalPay, COUNT(*) as periods
           FROM invoice_periods WHERE ${clause}
           GROUP BY workerId`, params
        ),
      ]);

      return sendSuccess(res, rows);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
