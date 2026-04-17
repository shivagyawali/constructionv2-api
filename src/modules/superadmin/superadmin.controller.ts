import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Company } from "../../entities/Company.entity";
import { User, UserRole } from "../../entities/User.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";

export class SuperadminController {
  // ── Platform overview dashboard ────────────────────────────────────────────
  overview = async (_req: AuthRequest, res: Response) => {
    try {
      const [
        companyStats, userStats, projectStats,
        invoiceStats, workerStats, recentCompanies,
        topCompanies, monthlyGrowth,
      ] = await Promise.all([
        AppDataSource.query(`
          SELECT COUNT(*) as total,
            SUM(status='active')    as active,
            SUM(status='trial')     as trial,
            SUM(status='suspended') as suspended,
            SUM(status='inactive')  as inactive,
            SUM(plan='free')        as free,
            SUM(plan='starter')     as starter,
            SUM(plan='pro')         as pro,
            SUM(plan='enterprise')  as enterprise
          FROM companies
        `),
        AppDataSource.query(`
          SELECT COUNT(*) as total,
            SUM(isActive=1)          as active,
            SUM(role='admin')        as admins,
            SUM(role='manager')      as managers,
            SUM(role='supervisor')   as supervisors,
            SUM(role='worker')       as workers,
            SUM(role='superadmin')   as superadmins
          FROM users
        `),
        AppDataSource.query(`
          SELECT COUNT(*) as total,
            SUM(status='active')    as active,
            SUM(status='completed') as completed,
            SUM(status='planning')  as planning,
            SUM(status='on_hold')   as on_hold
          FROM projects
        `),
        AppDataSource.query(`
          SELECT COUNT(*) as total,
            COALESCE(SUM(totalAmount),0) as totalBilled,
            COALESCE(SUM(CASE WHEN status='paid' THEN totalAmount ELSE 0 END),0) as totalPaid,
            COALESCE(SUM(CASE WHEN status IN ('sent','viewed','partially_paid') THEN amountDue ELSE 0 END),0) as outstanding,
            COALESCE(SUM(CASE WHEN status='overdue' THEN amountDue ELSE 0 END),0) as overdue
          FROM invoices
        `),
        AppDataSource.query("SELECT COUNT(*) as total, SUM(status='active') as active FROM workers"),
        AppDataSource.query(`
          SELECT c.id, c.name, c.status, c.plan, c.createdAt,
            COUNT(DISTINCT u.id) as userCount,
            COUNT(DISTINCT p.id) as projectCount
          FROM companies c
          LEFT JOIN users u ON u.companyId = c.id
          LEFT JOIN projects p ON p.companyId = c.id
          GROUP BY c.id
          ORDER BY c.createdAt DESC LIMIT 8
        `),
        AppDataSource.query(`
          SELECT c.id, c.name, c.plan,
            COUNT(DISTINCT p.id) as projectCount,
            COALESCE(SUM(i.totalAmount),0) as totalBilled
          FROM companies c
          LEFT JOIN projects p ON p.companyId = c.id
          LEFT JOIN invoices i ON i.companyId = c.id AND i.status='paid'
          GROUP BY c.id
          ORDER BY totalBilled DESC LIMIT 10
        `),
        AppDataSource.query(`
          SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as newCompanies
          FROM companies
          WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY month ORDER BY month ASC
        `),
      ]);

      return sendSuccess(res, {
        companies: {
          total:     Number(companyStats[0].total),
          active:    Number(companyStats[0].active),
          trial:     Number(companyStats[0].trial),
          suspended: Number(companyStats[0].suspended),
          byPlan: {
            free:       Number(companyStats[0].free),
            starter:    Number(companyStats[0].starter),
            pro:        Number(companyStats[0].pro),
            enterprise: Number(companyStats[0].enterprise),
          },
        },
        users: {
          total:       Number(userStats[0].total),
          active:      Number(userStats[0].active),
          admins:      Number(userStats[0].admins),
          managers:    Number(userStats[0].managers),
          supervisors: Number(userStats[0].supervisors),
          workers:     Number(userStats[0].workers),
        },
        projects: {
          total:     Number(projectStats[0].total),
          active:    Number(projectStats[0].active),
          completed: Number(projectStats[0].completed),
          planning:  Number(projectStats[0].planning),
          on_hold:   Number(projectStats[0].on_hold),
        },
        invoices: {
          total:       Number(invoiceStats[0].total),
          totalBilled: Number(invoiceStats[0].totalBilled),
          totalPaid:   Number(invoiceStats[0].totalPaid),
          outstanding: Number(invoiceStats[0].outstanding),
          overdue:     Number(invoiceStats[0].overdue),
        },
        workers: {
          total:  Number(workerStats[0].total),
          active: Number(workerStats[0].active),
        },
        recentCompanies,
        topCompanies,
        monthlyGrowth,
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── All users across platform ──────────────────────────────────────────────
  listAllUsers = async (req: AuthRequest, res: Response) => {
    try {
      const limit  = Math.min(Number(req.query.limit) || 20, 200);
      const offset = Number(req.query.offset) || 0;
      const { companyId, role, isActive, search } = req.query;

      const qb = AppDataSource.getRepository(User)
        .createQueryBuilder("u")
        .leftJoinAndSelect("u.companyRef", "company");

      if (companyId) qb.andWhere("u.companyId = :companyId", { companyId });
      if (role)      qb.andWhere("u.role = :role",           { role });
      if (isActive !== undefined) {
        qb.andWhere("u.isActive = :isActive", { isActive: isActive === "true" });
      }
      if (search) {
        qb.andWhere("(u.firstName LIKE :s OR u.lastName LIKE :s OR u.email LIKE :s)", { s: `%${search}%` });
      }

      qb.orderBy("u.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data.map(({ password, refreshToken, ...u }: any) => u), total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Create superadmin user ─────────────────────────────────────────────────
  createSuperadmin = async (req: AuthRequest, res: Response) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      const repo = AppDataSource.getRepository(User);

      const exists = await repo.findOne({ where: { email } });
      if (exists) return sendError(res, "Email already registered", 409);

      const user = repo.create({
        firstName, lastName, email, password,
        role:      UserRole.SUPERADMIN,
        companyId: undefined as any,
        isActive:  true,
      });
      await repo.save(user);

      const { password: _p, refreshToken: _r, ...safe } = user as any;
      return sendCreated(res, safe, "Superadmin created");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Update any user (role, status) ────────────────────────────────────────
  updateUser = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: req.params.id } });
      if (!user) return sendError(res, "User not found", 404);

      const { role, isActive, companyId, firstName, lastName, phone } = req.body;
      if (role      !== undefined) user.role      = role;
      if (isActive  !== undefined) user.isActive  = isActive;
      if (companyId !== undefined) user.companyId = companyId;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName  !== undefined) user.lastName  = lastName;
      if (phone     !== undefined) user.phone     = phone;

      await repo.save(user);
      const { password: _p, refreshToken: _r, ...safe } = user as any;
      return sendSuccess(res, safe, "User updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Reset any user's password ──────────────────────────────────────────────
  resetPassword = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.createQueryBuilder("u")
        .addSelect("u.password")
        .where("u.id = :id", { id: req.params.id })
        .getOne();
      if (!user) return sendError(res, "User not found", 404);

      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return sendError(res, "Password must be at least 8 characters");
      }

      user.password = newPassword;
      await repo.save(user);
      return sendSuccess(res, null, "Password reset");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Platform stats by company (for reporting) ─────────────────────────────
  companyReport = async (req: AuthRequest, res: Response) => {
    try {
      const { from, to } = req.query;
      let dateClause = "1=1";
      const params: any[] = [];
      if (from) { dateClause += " AND i.issueDate >= ?"; params.push(from); }
      if (to)   { dateClause += " AND i.issueDate <= ?"; params.push(to);   }

      const rows = await AppDataSource.query(`
        SELECT
          c.id as companyId, c.name as companyName, c.plan, c.status,
          COUNT(DISTINCT u.id)  as userCount,
          COUNT(DISTINCT p.id)  as projectCount,
          COUNT(DISTINCT w.id)  as workerCount,
          COUNT(DISTINCT cl.id) as clientCount,
          COALESCE(SUM(i.totalAmount),0)                                              as totalBilled,
          COALESCE(SUM(CASE WHEN i.status='paid' THEN i.totalAmount ELSE 0 END),0)   as totalPaid
        FROM companies c
        LEFT JOIN users u    ON u.companyId    = c.id
        LEFT JOIN projects p ON p.companyId    = c.id
        LEFT JOIN workers w  ON w.companyId    = c.id
        LEFT JOIN clients cl ON cl.companyId   = c.id
        LEFT JOIN invoices i ON i.companyId    = c.id AND ${dateClause}
        GROUP BY c.id
        ORDER BY totalBilled DESC
      `, params);

      return sendSuccess(res, rows);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}

// local helper to avoid circular import
function sendPaginated(res: Response, data: any[], total: number, limit: number, offset: number) {
  return res.status(200).json({
    success: true, message: "Success", data,
    meta: {
      total, limit, offset,
      pages:       Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1,
    },
  });
}

function sendCreated(res: Response, data: any, message = "Created") {
  return res.status(201).json({ success: true, message, data });
}
