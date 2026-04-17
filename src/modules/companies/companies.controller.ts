import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Company, CompanyStatus } from "../../entities/Company.entity";
import { User, UserRole } from "../../entities/User.entity";
import { RolePermission } from "../../entities/RolePermission.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin:      ["/dashboard","/clients","/projects","/tasks","/workers","/invoice-periods","/invoices"],
  manager:    ["/dashboard","/clients","/projects","/tasks","/workers","/invoice-periods","/invoices"],
  supervisor: ["/dashboard","/projects","/tasks"],
  worker:     ["/dashboard","/tasks"],
  contractor: ["/dashboard"],
};

export class CompaniesController {
  // ── List all companies (superadmin) ────────────────────────────────────────
  list = async (req: AuthRequest, res: Response) => {
    try {
      const limit  = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { status, plan, search } = req.query;

      const qb = AppDataSource.getRepository(Company)
        .createQueryBuilder("c")
        .loadRelationCountAndMap("c.userCount",    "c.users")
        .loadRelationCountAndMap("c.projectCount", "c.projects")
        .loadRelationCountAndMap("c.workerCount",  "c.workers");

      if (status) qb.andWhere("c.status = :status", { status });
      if (plan)   qb.andWhere("c.plan = :plan",     { plan });
      if (search) qb.andWhere("(c.name LIKE :s OR c.email LIKE :s)", { s: `%${search}%` });

      qb.orderBy("c.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data, total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Get one company ────────────────────────────────────────────────────────
  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const company = await AppDataSource.getRepository(Company).findOne({
        where: { id: req.params.id },
      });
      if (!company) return sendError(res, "Company not found", 404);

      // Non-superadmin can only see their own company
      if (req.user!.role !== UserRole.SUPERADMIN && company.id !== req.user!.companyId) {
        return sendError(res, "Access denied", 403);
      }

      // Attach stats
      const [[userCount],[projectCount],[workerCount],[clientCount],[invoiceStats]] = await Promise.all([
        AppDataSource.query("SELECT COUNT(*) as cnt FROM users WHERE companyId = ?", [company.id]),
        AppDataSource.query("SELECT COUNT(*) as cnt FROM projects WHERE companyId = ?", [company.id]),
        AppDataSource.query("SELECT COUNT(*) as cnt FROM workers WHERE companyId = ?", [company.id]),
        AppDataSource.query("SELECT COUNT(*) as cnt FROM clients WHERE companyId = ?", [company.id]),
        AppDataSource.query(
          "SELECT COALESCE(SUM(totalAmount),0) as totalBilled, COALESCE(SUM(CASE WHEN status='paid' THEN totalAmount ELSE 0 END),0) as totalPaid FROM invoices WHERE companyId = ?",
          [company.id]
        ),
      ]);

      return sendSuccess(res, {
        ...company,
        stats: {
          users:       Number(userCount.cnt),
          projects:    Number(projectCount.cnt),
          workers:     Number(workerCount.cnt),
          clients:     Number(clientCount.cnt),
          totalBilled: Number(invoiceStats.totalBilled),
          totalPaid:   Number(invoiceStats.totalPaid),
        },
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Create company (superadmin only) ───────────────────────────────────────
  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Company);
      const {
        name, slug, email, phone, address, city, province, country,
        postalCode, website, taxNumber, description, plan, maxUsers,
        maxProjects, maxWorkers,
        // Owner fields
        ownerFirstName, ownerLastName, ownerEmail, ownerPassword,
      } = req.body;

      // Check unique name/slug
      const existing = await repo.findOne({ where: [{ name }, { slug: slug ?? name }] });
      if (existing) return sendError(res, "Company name or slug already exists", 409);

      const company = repo.create({
        name, slug, email, phone, address, city, province, country,
        postalCode, website, taxNumber, description,
        plan:        plan ?? "free",
        maxUsers:    maxUsers ?? 5,
        maxProjects: maxProjects ?? 10,
        maxWorkers:  maxWorkers ?? 20,
        status:      CompanyStatus.ACTIVE,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      await repo.save(company);

      // Create admin owner if provided
      let owner: User | null = null;
      if (ownerEmail && ownerPassword && ownerFirstName) {
        const userRepo = AppDataSource.getRepository(User);
        const exists   = await userRepo.findOne({ where: { email: ownerEmail } });
        if (!exists) {
          owner = userRepo.create({
            firstName: ownerFirstName,
            lastName:  ownerLastName ?? "",
            email:     ownerEmail,
            password:  ownerPassword,
            role:      UserRole.ADMIN,
            companyId: company.id,
            isActive:  true,
          });
          await userRepo.save(owner);
          company.ownerId = owner.id;
          await repo.save(company);
        }
      }

      // Seed default role permissions for this company
      await this.seedRolePermissions(company.id);

      return sendCreated(res, { company, owner: owner ? { id: owner.id, email: owner.email } : null });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Update company ─────────────────────────────────────────────────────────
  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo    = AppDataSource.getRepository(Company);
      const company = await repo.findOne({ where: { id: req.params.id } });
      if (!company) return sendError(res, "Company not found", 404);

      // Company admin can only update their own
      if (req.user!.role !== UserRole.SUPERADMIN && company.id !== req.user!.companyId) {
        return sendError(res, "Access denied", 403);
      }

      const allowedFields = [
        "name","email","phone","address","city","province","country",
        "postalCode","website","taxNumber","description","settings","logo",
      ];
      // Superadmin can also change plan/status/limits
      if (req.user!.role === UserRole.SUPERADMIN) {
        allowedFields.push("plan","status","maxUsers","maxProjects","maxWorkers","trialEndsAt","subscriptionEndsAt");
      }

      allowedFields.forEach((k) => {
        if (req.body[k] !== undefined) (company as any)[k] = req.body[k];
      });

      await repo.save(company);
      return sendSuccess(res, company, "Company updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Suspend / activate ────────────────────────────────────────────────────
  toggleStatus = async (req: AuthRequest, res: Response) => {
    try {
      const repo    = AppDataSource.getRepository(Company);
      const company = await repo.findOne({ where: { id: req.params.id } });
      if (!company) return sendError(res, "Company not found", 404);

      company.status = company.status === CompanyStatus.ACTIVE
        ? CompanyStatus.SUSPENDED
        : CompanyStatus.ACTIVE;

      await repo.save(company);
      return sendSuccess(res, company, `Company ${company.status}`);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Delete company (superadmin) ────────────────────────────────────────────
  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo    = AppDataSource.getRepository(Company);
      const company = await repo.findOne({ where: { id: req.params.id } });
      if (!company) return sendError(res, "Company not found", 404);
      await repo.remove(company);
      return sendSuccess(res, null, "Company and all its data deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── List users of a company ────────────────────────────────────────────────
  listUsers = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.params.id;

      if (req.user!.role !== UserRole.SUPERADMIN && req.user!.companyId !== companyId) {
        return sendError(res, "Access denied", 403);
      }

      const users = await AppDataSource.getRepository(User).find({
        where: { companyId },
        order: { createdAt: "DESC" },
      });

      return sendSuccess(res, users.map(({ password, refreshToken, ...u }: any) => u));
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Invite / create user in company ───────────────────────────────────────
  createUser = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.params.id;

      if (req.user!.role !== UserRole.SUPERADMIN && req.user!.companyId !== companyId) {
        return sendError(res, "Access denied", 403);
      }

      const company = await AppDataSource.getRepository(Company).findOne({ where: { id: companyId } });
      if (!company) return sendError(res, "Company not found", 404);
      if (company.status === CompanyStatus.SUSPENDED) {
        return sendError(res, "Company is suspended", 403);
      }

      // Check user limit
      const [[{ cnt }]] = await Promise.all([
        AppDataSource.query("SELECT COUNT(*) as cnt FROM users WHERE companyId = ?", [companyId]),
      ]);
      if (Number(cnt) >= company.maxUsers) {
        return sendError(res, `User limit reached (max ${company.maxUsers}). Upgrade your plan.`, 403);
      }

      const { firstName, lastName, email, password, role, phone } = req.body;
      const userRepo = AppDataSource.getRepository(User);

      const exists = await userRepo.findOne({ where: { email } });
      if (exists) return sendError(res, "Email already registered", 409);

      // Don't allow creating superadmin through company endpoint
      if (role === UserRole.SUPERADMIN) {
        return sendError(res, "Cannot create superadmin users through company endpoint", 403);
      }

      const user = userRepo.create({
        firstName, lastName, email, password,
        role:      role ?? UserRole.WORKER,
        companyId, phone,
        isActive:  true,
      });
      await userRepo.save(user);

      const { password: _p, refreshToken: _r, ...safe } = user as any;
      return sendCreated(res, safe, "User created and added to company");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Get company's role permissions ─────────────────────────────────────────
  getRolePermissions = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.params.id;
      if (req.user!.role !== UserRole.SUPERADMIN && req.user!.companyId !== companyId) {
        return sendError(res, "Access denied", 403);
      }

      let perms = await AppDataSource.getRepository(RolePermission).find({
        where: { companyId },
        order: { role: "ASC" },
      });

      // If none yet, seed defaults
      if (!perms.length) {
        await this.seedRolePermissions(companyId);
        perms = await AppDataSource.getRepository(RolePermission).find({
          where: { companyId },
          order: { role: "ASC" },
        });
      }

      return sendSuccess(res, perms);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Update company role permissions ───────────────────────────────────────
  updateRolePermissions = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.params.id;
      if (req.user!.role !== UserRole.SUPERADMIN && req.user!.companyId !== companyId) {
        return sendError(res, "Access denied", 403);
      }

      const { permissions } = req.body; // { manager: [...], supervisor: [...] }
      if (!permissions || typeof permissions !== "object") {
        return sendError(res, "permissions object is required");
      }

      const repo    = AppDataSource.getRepository(RolePermission);
      const results: RolePermission[] = [];

      for (const [role, routes] of Object.entries(permissions)) {
        if (role === "admin" || role === "superadmin") continue; // can't restrict these

        const allowedRoutes = (routes as string[]).includes("/dashboard")
          ? (routes as string[])
          : ["/dashboard", ...(routes as string[])];

        let row = await repo.findOne({ where: { companyId, role } });
        if (row) {
          row.allowedRoutes = allowedRoutes;
        } else {
          row = repo.create({ companyId, role, allowedRoutes });
        }
        await repo.save(row);
        results.push(row);
      }

      return sendSuccess(res, results, "Role permissions updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Private: seed role permissions ────────────────────────────────────────
  private seedRolePermissions = async (companyId: string) => {
    const repo = AppDataSource.getRepository(RolePermission);
    for (const [role, allowedRoutes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const exists = await repo.findOne({ where: { companyId, role } });
      if (!exists) {
        const row = repo.create({ companyId, role, allowedRoutes });
        await repo.save(row);
      }
    }
  };
}
