import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Client } from "../../entities/Client.entity";
import { AuthRequest, assertSameCompany } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

export class ClientsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const limit  = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { search, isActive } = req.query;

      const qb = AppDataSource.getRepository(Client).createQueryBuilder("c");

      // Tenant isolation
      if (req.companyId) {
        qb.where("c.companyId = :cid", { cid: req.companyId });
      }

      if (search) {
        qb.andWhere("(c.firstName LIKE :s OR c.lastName LIKE :s OR c.email LIKE :s OR c.company LIKE :s)", { s: `%${search}%` });
      }
      if (isActive !== undefined) {
        qb.andWhere("c.isActive = :isActive", { isActive: isActive === "true" });
      }

      qb.orderBy("c.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.companyId) return sendError(res, "No company context", 400);
      const repo = AppDataSource.getRepository(Client);
      const { firstName, lastName, email, phone, company, address, city, province, postalCode, country, notes } = req.body;

      // Email unique within company
      const exists = await repo.findOne({ where: { email, companyId: req.companyId } });
      if (exists) return sendError(res, "Client email already exists in this company", 409);

      const client = repo.create({
        companyId: req.companyId,
        firstName, lastName, email, phone, company, address, city, province, postalCode, country, notes,
      });
      await repo.save(client);
      return sendCreated(res, client);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const client = await AppDataSource.getRepository(Client).findOne({
        where: { id: req.params.id },
        relations: ["projects", "invoices"],
      });
      if (!client) return sendError(res, "Client not found", 404);
      if (!assertSameCompany(client.companyId, req, res)) return;
      return sendSuccess(res, client);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo   = AppDataSource.getRepository(Client);
      const client = await repo.findOne({ where: { id: req.params.id } });
      if (!client) return sendError(res, "Client not found", 404);
      if (!assertSameCompany(client.companyId, req, res)) return;

      const fields = ["firstName","lastName","phone","company","address","city","province","postalCode","country","notes","isActive"];
      fields.forEach((k) => { if (req.body[k] !== undefined) (client as any)[k] = req.body[k]; });
      await repo.save(client);
      return sendSuccess(res, client, "Client updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo   = AppDataSource.getRepository(Client);
      const client = await repo.findOne({ where: { id: req.params.id } });
      if (!client) return sendError(res, "Client not found", 404);
      if (!assertSameCompany(client.companyId, req, res)) return;
      await repo.remove(client);
      return sendSuccess(res, null, "Client deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  stats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const client = await AppDataSource.getRepository(Client).findOne({ where: { id } });
      if (!client) return sendError(res, "Client not found", 404);
      if (!assertSameCompany(client.companyId, req, res)) return;

      const [projectStats, invoiceStats, recentProjects] = await Promise.all([
        AppDataSource.query("SELECT COUNT(*) as count FROM projects WHERE clientId = ? AND companyId = ?", [id, client.companyId]),
        AppDataSource.query(
          "SELECT COUNT(*) as count, COALESCE(SUM(totalAmount),0) as total, COALESCE(SUM(amountPaid),0) as paid FROM invoices WHERE clientId = ? AND companyId = ?",
          [id, client.companyId]
        ),
        AppDataSource.query(
          "SELECT id, name, status, expectedEndDate FROM projects WHERE clientId = ? AND companyId = ? ORDER BY createdAt DESC LIMIT 5",
          [id, client.companyId]
        ),
      ]);

      return sendSuccess(res, {
        totalProjects: Number(projectStats[0].count),
        totalInvoices: Number(invoiceStats[0].count),
        totalBilled:   Number(invoiceStats[0].total),
        totalPaid:     Number(invoiceStats[0].paid),
        outstanding:   Number(invoiceStats[0].total) - Number(invoiceStats[0].paid),
        recentProjects,
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
