import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Invoice, InvoiceStatus } from "../../entities/Invoice.entity";
import { InvoiceItem } from "../../entities/InvoiceItem.entity";
import { Payment } from "../../entities/Payment.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";
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
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const itemRepo = AppDataSource.getRepository(InvoiceItem);
      const { clientId, projectId, issueDate, dueDate, taxAmount, discount, notes, terms, items = [] } = req.body;

      const invoice = repo.create({
        clientId,
        projectId: projectId || undefined,
        issueDate, dueDate,
        taxAmount: Number(taxAmount) || 0,
        discount: Number(discount) || 0,
        notes, terms,
        createdById: req.user!.id,
      });
      await repo.save(invoice);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const item = itemRepo.create({
          invoiceId: invoice.id,
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          unit: it.unit,
          sortOrder: i,
        });
        item.calculateTotal();
        await itemRepo.save(item);
      }

      const full = await repo.findOne({ where: { id: invoice.id }, relations: ["items", "client", "project"] });
      full!.recalculate();
      await repo.save(full!);

      return sendCreated(res, full);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const invoice = await AppDataSource.getRepository(Invoice).findOne({
        where: { id: req.params.id },
        relations: ["client", "project", "items", "payments", "createdBy"],
      });
      if (!invoice) return sendError(res, "Invoice not found", 404);
      return sendSuccess(res, invoice);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({ where: { id: req.params.id }, relations: ["items"] });
      if (!invoice) return sendError(res, "Invoice not found", 404);
      if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(invoice.status)) {
        return sendError(res, "Cannot edit a paid or cancelled invoice", 400);
      }

      const fields = ["issueDate","dueDate","taxAmount","discount","notes","terms","status"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (invoice as any)[k] = req.body[k]; });
      invoice.recalculate();
      await repo.save(invoice);
      return sendSuccess(res, invoice, "Invoice updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({ where: { id: req.params.id } });
      if (!invoice) return sendError(res, "Invoice not found", 404);
      if (invoice.status === InvoiceStatus.PAID) {
        return sendError(res, "Cannot delete a paid invoice", 400);
      }
      await repo.remove(invoice);
      return sendSuccess(res, null, "Invoice deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  addPayment = async (req: AuthRequest, res: Response) => {
    try {
      const invoiceRepo = AppDataSource.getRepository(Invoice);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const invoice = await invoiceRepo.findOne({ where: { id: req.params.id }, relations: ["items"] });
      if (!invoice) return sendError(res, "Invoice not found", 404);
      if (invoice.status === InvoiceStatus.CANCELLED) {
        return sendError(res, "Cannot add payment to a cancelled invoice", 400);
      }

      const { amount, method, reference, notes } = req.body;
      if (!amount || Number(amount) <= 0) return sendError(res, "Valid amount is required");

      const payment = paymentRepo.create({
        invoiceId: invoice.id,
        amount: Number(amount),
        method, reference, notes,
        paidAt: new Date().toISOString().slice(0, 10),
      });
      await paymentRepo.save(payment);

      invoice.amountPaid = Number(invoice.amountPaid) + Number(amount);
      invoice.amountDue = Math.max(0, Number(invoice.totalAmount) - Number(invoice.amountPaid));

      if (invoice.amountDue <= 0) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = new Date().toISOString().slice(0, 10);
      } else if (Number(invoice.amountPaid) > 0) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }

      await invoiceRepo.save(invoice);
      return sendCreated(res, { payment, invoice }, "Payment recorded");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  listPayments = async (req: AuthRequest, res: Response) => {
    try {
      const payments = await AppDataSource.getRepository(Payment).find({
        where: { invoiceId: req.params.id },
        order: { createdAt: "DESC" },
      });
      return sendSuccess(res, payments);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  markSent = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({ where: { id: req.params.id } });
      if (!invoice) return sendError(res, "Invoice not found", 404);
      invoice.status = InvoiceStatus.SENT;
      invoice.sentAt = new Date();
      await repo.save(invoice);
      return sendSuccess(res, invoice, "Invoice marked as sent");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  downloadPdf = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Invoice);
      const invoice = await repo.findOne({
        where: { id: req.params.id },
        relations: ["client", "project", "items"],
      });
      if (!invoice) return sendError(res, "Invoice not found", 404);
      if (invoice.status === InvoiceStatus.SENT) {
        invoice.status = InvoiceStatus.VIEWED;
        await repo.save(invoice);
      }
      await generateInvoicePDF(invoice, res);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
