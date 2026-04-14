import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Invoice, InvoiceStatus, InvoiceType } from "../../entities/Invoice.entity";
import { InvoiceItem, ItemType } from "../../entities/InvoiceItem.entity";
import { Payment } from "../../entities/Payment.entity";
import { WorkerLog, LogStatus } from "../../entities/WorkerLog.entity";
import { Project } from "../../entities/Project.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { success, created, error, paginate } from "../../utils/response";
import { generateInvoicePDF } from "../../utils/pdf.generator";

export class InvoicesController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { status, clientId, projectId, from, to } = req.query;

      const qb = repo.createQueryBuilder("inv")
        .leftJoinAndSelect("inv.client", "client")
        .leftJoinAndSelect("inv.project", "project");

      if (status) qb.andWhere("inv.status = :status", { status });
      if (clientId) qb.andWhere("inv.clientId = :clientId", { clientId });
      if (projectId) qb.andWhere("inv.projectId = :projectId", { projectId });
      if (from) qb.andWhere("inv.issueDate >= :from", { from });
      if (to) qb.andWhere("inv.issueDate <= :to", { to });

      qb.orderBy("inv.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const itemRepo = AppDataSource.getRepository(InvoiceItem);

      const { clientId, projectId, issueDate, dueDate, taxRate, discount, notes, terms, items = [] } = req.body;

      if (!clientId || !projectId || !issueDate || !dueDate) {
        return error(res, "clientId, projectId, issueDate and dueDate are required");
      }

      const invoice = repo.create({
        clientId, projectId, issueDate, dueDate,
        taxRate: Number(taxRate) || 0,
        discount: Number(discount) || 0,
        notes, terms,
        createdById: req.user!.id,
      });
      await repo.save(invoice);

      // Create items
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const item = itemRepo.create({
          invoiceId: invoice.id,
          description: it.description,
          itemType: it.itemType || ItemType.SERVICE,
          quantity: Number(it.quantity),
          unit: it.unit,
          unitPrice: Number(it.unitPrice),
          sortOrder: i,
        });
        item.calculateTotal();
        await itemRepo.save(item);
      }

      // Reload and recalculate
      const full = await repo.findOne({ where: { id: invoice.id }, relations: ["items", "client", "project"] });
      full!.recalculate();
      await repo.save(full!);

      return created(res, full);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  generateFromWorkerLogs = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const itemRepo = AppDataSource.getRepository(InvoiceItem);
      const logRepo = AppDataSource.getRepository(WorkerLog);

      const { projectId, clientId, issueDate, dueDate, logIds, groupBy = "worker", taxRate, discount, notes, terms } = req.body;

      if (!projectId || !clientId || !issueDate || !dueDate) {
        return error(res, "projectId, clientId, issueDate and dueDate are required");
      }

      // Fetch approved logs
      const qb = logRepo.createQueryBuilder("wl")
        .leftJoinAndSelect("wl.worker", "worker")
        .where("wl.projectId = :projectId", { projectId })
        .andWhere("wl.status = :status", { status: LogStatus.APPROVED });

      if (logIds?.length) qb.andWhere("wl.id IN (:...logIds)", { logIds });

      const logs = await qb.orderBy("wl.logDate", "ASC").getMany();

      if (logs.length === 0) {
        return error(res, "No approved worker logs found for this project", 404);
      }

      // Create the invoice
      const invoice = repo.create({
        clientId, projectId, issueDate, dueDate,
        invoiceType: InvoiceType.WORKER_LOG,
        taxRate: Number(taxRate) || 0,
        discount: Number(discount) || 0,
        notes, terms,
        createdById: req.user!.id,
      });
      await repo.save(invoice);

      // Group logs into line items
      if (groupBy === "worker") {
        // One line per worker — aggregate hours and cost
        const workerMap = new Map<string, { worker: any; hours: number; overtime: number; cost: number; logIds: string[] }>();
        for (const log of logs) {
          const key = log.workerId;
          if (!workerMap.has(key)) {
            workerMap.set(key, { worker: log.worker, hours: 0, overtime: 0, cost: 0, logIds: [] });
          }
          const entry = workerMap.get(key)!;
          entry.hours += Number(log.hoursWorked);
          entry.overtime += Number(log.overtimeHours);
          entry.cost += Number(log.totalCost);
          entry.logIds.push(log.id);
        }

        let sortOrder = 0;
        for (const [, entry] of workerMap) {
          const item = itemRepo.create({
            invoiceId: invoice.id,
            itemType: ItemType.LABOR,
            description: `Labour – ${entry.worker.fullName ?? entry.worker.firstName + " " + entry.worker.lastName} (${entry.worker.trade})`,
            quantity: entry.hours,
            unit: "hrs",
            unitPrice: entry.cost / entry.hours,
            sortOrder: sortOrder++,
          });
          item.calculateTotal();
          await itemRepo.save(item);
        }
      } else if (groupBy === "day") {
        // One line per date
        const dateMap = new Map<string, { date: string; hours: number; cost: number }>();
        for (const log of logs) {
          if (!dateMap.has(log.logDate)) {
            dateMap.set(log.logDate, { date: log.logDate, hours: 0, cost: 0 });
          }
          const entry = dateMap.get(log.logDate)!;
          entry.hours += Number(log.hoursWorked);
          entry.cost += Number(log.totalCost);
        }

        let sortOrder = 0;
        for (const [, entry] of dateMap) {
          const item = itemRepo.create({
            invoiceId: invoice.id,
            itemType: ItemType.LABOR,
            description: `Labour – ${entry.date}`,
            quantity: entry.hours,
            unit: "hrs",
            unitPrice: entry.hours > 0 ? entry.cost / entry.hours : 0,
            sortOrder: sortOrder++,
          });
          item.calculateTotal();
          await itemRepo.save(item);
        }
      } else {
        // One line per log entry
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];
          const workerName = log.worker?.firstName + " " + log.worker?.lastName;
          const item = itemRepo.create({
            invoiceId: invoice.id,
            itemType: ItemType.LABOR,
            workerLogId: log.id,
            description: `${workerName} – ${log.logDate}${log.description ? ": " + log.description : ""}`,
            quantity: Number(log.hoursWorked),
            unit: "hrs",
            unitPrice: Number(log.hourlyRateSnapshot),
            sortOrder: i,
          });
          item.calculateTotal();
          await itemRepo.save(item);

          // Overtime line if applicable
          if (Number(log.overtimeHours) > 0) {
            const otItem = itemRepo.create({
              invoiceId: invoice.id,
              itemType: ItemType.LABOR,
              workerLogId: log.id,
              description: `${workerName} – ${log.logDate} (Overtime)`,
              quantity: Number(log.overtimeHours),
              unit: "hrs",
              unitPrice: Number(log.overtimeRateSnapshot),
              sortOrder: i + 0.5,
            });
            otItem.calculateTotal();
            await itemRepo.save(otItem);
          }
        }
      }

      // Reload, recalculate and save
      const full = await repo.findOne({
        where: { id: invoice.id },
        relations: ["items", "client", "project"],
      });
      full!.recalculate();
      await repo.save(full!);

      // Mark logs as invoiced
      await logRepo.createQueryBuilder()
        .update(WorkerLog)
        .set({ status: LogStatus.INVOICED, invoiceId: invoice.id })
        .where("id IN (:...ids)", { ids: logs.map((l) => l.id) })
        .execute();

      return created(res, full, `Invoice generated from ${logs.length} worker logs`);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({
        where: { id: req.params.id },
        relations: ["client", "project", "items", "payments", "createdBy"],
      });
      if (!invoice) return error(res, "Invoice not found", 404);
      return success(res, invoice);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({ where: { id: req.params.id }, relations: ["items"] });
      if (!invoice) return error(res, "Invoice not found", 404);

      if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
        return error(res, "Cannot edit a paid or cancelled invoice", 400);
      }

      const allowed = ["issueDate", "dueDate", "taxRate", "discount", "notes", "terms", "status"];
      allowed.forEach((k) => { if (req.body[k] !== undefined) (invoice as any)[k] = req.body[k]; });

      invoice.recalculate();
      await repo.save(invoice);
      return success(res, invoice, "Invoice updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({ where: { id: req.params.id } });
      if (!invoice) return error(res, "Invoice not found", 404);
      if (invoice.status === InvoiceStatus.PAID) {
        return error(res, "Cannot delete a paid invoice", 400);
      }
      await repo.remove(invoice);
      return success(res, null, "Invoice deleted");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  addPayment = async (req: AuthRequest, res: Response) => {
    try {
      const invoiceRepo = AppDataSource.getRepository(Invoice);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const invoice = await invoiceRepo.findOne({
        where: { id: req.params.id },
        relations: ["items"],
      });
      if (!invoice) return error(res, "Invoice not found", 404);
      if (invoice.status === InvoiceStatus.CANCELLED) {
        return error(res, "Cannot add payment to a cancelled invoice", 400);
      }

      const { amount, method, reference, notes } = req.body;
      if (!amount || Number(amount) <= 0) return error(res, "Valid amount is required");

      const payment = paymentRepo.create({
        invoiceId: invoice.id,
        amount: Number(amount),
        method,
        reference,
        notes,
        paidAt: new Date().toISOString().slice(0, 10),
      });
      await paymentRepo.save(payment);

      // Update invoice
      invoice.amountPaid = Number(invoice.amountPaid) + Number(amount);
      invoice.amountDue = Number(invoice.totalAmount) - Number(invoice.amountPaid);

      if (invoice.amountDue <= 0) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = new Date().toISOString().slice(0, 10);
      } else if (Number(invoice.amountPaid) > 0) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }

      await invoiceRepo.save(invoice);

      return created(res, { payment, invoice }, "Payment recorded");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  listPayments = async (req: AuthRequest, res: Response) => {
    try {
      const payments = await AppDataSource.getRepository(Payment).find({
        where: { invoiceId: req.params.id },
        order: { createdAt: "DESC" },
      });
      return success(res, payments);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  downloadPdf = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({
        where: { id: req.params.id },
        relations: ["client", "project", "items"],
      });
      if (!invoice) return error(res, "Invoice not found", 404);

      // Mark as viewed if sent
      if (invoice.status === InvoiceStatus.SENT) {
        invoice.status = InvoiceStatus.VIEWED;
        await repo.save(invoice);
      }

      await generateInvoicePDF(invoice, res);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  markSent = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({ where: { id: req.params.id } });
      if (!invoice) return error(res, "Invoice not found", 404);

      invoice.status = InvoiceStatus.SENT;
      invoice.sentAt = new Date();
      await repo.save(invoice);
      return success(res, invoice, "Invoice marked as sent");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };
}
