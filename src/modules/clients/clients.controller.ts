import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Client } from "../../entities/Client.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { success, created, error, paginate } from "../../utils/response";

export class ClientsController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const search = req.query.search as string;
      const isActive = req.query.isActive;

      const qb = repo.createQueryBuilder("c");

      if (search) {
        qb.where(
          "c.firstName LIKE :s OR c.lastName LIKE :s OR c.email LIKE :s OR c.company LIKE :s",
          { s: `%${search}%` }
        );
      }
      if (isActive !== undefined) {
        qb.andWhere("c.isActive = :isActive", { isActive: isActive === "true" });
      }

      qb.orderBy("c.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();

      return paginate(res, data, total, limit, offset);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const { firstName, lastName, email, phone, company, address, city, province, postalCode, country, notes } = req.body;

      if (!firstName || !lastName || !email) {
        return error(res, "firstName, lastName and email are required");
      }

      const exists = await repo.findOne({ where: { email } });
      if (exists) return error(res, "Email already registered", 409);

      const client = repo.create({ firstName, lastName, email, phone, company, address, city, province, postalCode, country, notes });
      await repo.save(client);
      return created(res, client);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const client = await repo.findOne({
        where: { id: req.params.id },
        relations: ["projects", "invoices"],
      });
      if (!client) return error(res, "Client not found", 404);
      return success(res, client);
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const client = await repo.findOne({ where: { id: req.params.id } });
      if (!client) return error(res, "Client not found", 404);

      const allowed = ["firstName", "lastName", "phone", "company", "address", "city", "province", "postalCode", "country", "notes", "isActive"];
      allowed.forEach((k) => { if (req.body[k] !== undefined) (client as any)[k] = req.body[k]; });

      await repo.save(client);
      return success(res, client, "Client updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Client);
      const client = await repo.findOne({ where: { id: req.params.id } });
      if (!client) return error(res, "Client not found", 404);
      await repo.remove(client);
      return success(res, null, "Client deleted");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  stats = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const clientRepo = AppDataSource.getRepository(Client);
      const client = await clientRepo.findOne({ where: { id } });
      if (!client) return error(res, "Client not found", 404);

      const [projectCount, invoiceData, recentProjects] = await Promise.all([
        AppDataSource.query(
          "SELECT COUNT(*) as count FROM projects WHERE clientId = ?", [id]
        ),
        AppDataSource.query(
          "SELECT COUNT(*) as count, COALESCE(SUM(totalAmount),0) as total, COALESCE(SUM(amountPaid),0) as paid FROM invoices WHERE clientId = ?", [id]
        ),
        AppDataSource.query(
          "SELECT id, name, status, expectedEndDate FROM projects WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5", [id]
        ),
      ]);

      return success(res, {
        totalProjects: Number(projectCount[0].count),
        totalInvoices: Number(invoiceData[0].count),
        totalBilled: Number(invoiceData[0].total),
        totalPaid: Number(invoiceData[0].paid),
        recentProjects,
      });
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };
}
