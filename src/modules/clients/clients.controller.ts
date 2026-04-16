import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Client } from "../../entities/Client.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

export class ClientsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { search, isActive } = req.query;

      const qb = repo.createQueryBuilder("c");
      if (search) {
        qb.where("c.firstName LIKE :s OR c.lastName LIKE :s OR c.email LIKE :s OR c.company LIKE :s", { s: `%${search}%` });
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
      const repo = AppDataSource.getRepository(Client);
      const { firstName, lastName, email, phone, company, address, city, province, postalCode, country, notes } = req.body;

      const exists = await repo.findOne({ where: { email } });
      if (exists) return sendError(res, "Email already registered", 409);

      const client = repo.create({ firstName, lastName, email, phone, company, address, city, province, postalCode, country, notes });
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
      return sendSuccess(res, client);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const client = await repo.findOne({ where: { id: req.params.id } });
      if (!client) return sendError(res, "Client not found", 404);

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
      const repo = AppDataSource.getRepository(Client);
      const client = await repo.findOne({ where: { id: req.params.id } });
      if (!client) return sendError(res, "Client not found", 404);
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

      const [projectStats, invoiceStats, recentProjects] = await Promise.all([
        AppDataSource.query("SELECT COUNT(*) as count FROM projects WHERE clientId = ?", [id]),
        AppDataSource.query(
          "SELECT COUNT(*) as count, COALESCE(SUM(totalAmount),0) as total, COALESCE(SUM(amountPaid),0) as paid FROM invoices WHERE clientId = ?", [id]
        ),
        AppDataSource.query(
          "SELECT id, name, status, expectedEndDate FROM projects WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5", [id]
        ),
      ]);

      return sendSuccess(res, {
        totalProjects: Number(projectStats[0].count),
        totalInvoices: Number(invoiceStats[0].count),
        totalBilled: Number(invoiceStats[0].total),
        totalPaid: Number(invoiceStats[0].paid),
        outstanding: Number(invoiceStats[0].total) - Number(invoiceStats[0].paid),
        recentProjects,
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
