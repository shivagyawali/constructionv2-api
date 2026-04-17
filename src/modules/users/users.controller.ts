import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { User, UserRole } from "../../entities/User.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";

const sanitize = (user: User) => {
  const { password, refreshToken, ...safe } = user as any;
  return safe;
};

export class UsersController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const limit  = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const { role, isActive, search } = req.query;

      const qb = AppDataSource.getRepository(User).createQueryBuilder("u");

      // Company admin sees only their own company's users; superadmin sees all
      if (req.companyId) {
        qb.where("u.companyId = :cid", { cid: req.companyId });
      }

      if (role)     qb.andWhere("u.role = :role", { role });
      if (isActive !== undefined) qb.andWhere("u.isActive = :isActive", { isActive: isActive === "true" });
      if (search)   qb.andWhere("(u.firstName LIKE :s OR u.lastName LIKE :s OR u.email LIKE :s)", { s: `%${search}%` });

      qb.orderBy("u.createdAt", "DESC").skip(offset).take(limit);
      const [data, total] = await qb.getManyAndCount();
      return sendPaginated(res, data.map(sanitize), total, limit, offset);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const user = await AppDataSource.getRepository(User).findOne({ where: { id: req.params.id } });
      if (!user) return sendError(res, "User not found", 404);

      // Company admin can only see users in their company
      if (req.user!.role !== UserRole.SUPERADMIN && user.companyId !== req.companyId) {
        return sendError(res, "Access denied", 403);
      }
      return sendSuccess(res, sanitize(user));
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { firstName, lastName, email, password, role, phone, company } = req.body;

      const exists = await repo.findOne({ where: { email } });
      if (exists) return sendError(res, "Email already registered", 409);

      // Prevent creating superadmins through this endpoint
      if (role === UserRole.SUPERADMIN && req.user!.role !== UserRole.SUPERADMIN) {
        return sendError(res, "Only superadmins can create superadmin accounts", 403);
      }

      const user = repo.create({
        firstName, lastName, email, password, role, phone,
        company,
        companyId: req.companyId ?? undefined as any,
      });
      await repo.save(user);
      return sendCreated(res, sanitize(user), "User created");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: req.params.id } });
      if (!user) return sendError(res, "User not found", 404);

      if (req.user!.role !== UserRole.SUPERADMIN && user.companyId !== req.companyId) {
        return sendError(res, "Access denied", 403);
      }

      const { firstName, lastName, phone, company, role, isActive } = req.body;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName  !== undefined) user.lastName  = lastName;
      if (phone     !== undefined) user.phone     = phone;
      if (company   !== undefined) user.company   = company;
      if (role      !== undefined && role !== UserRole.SUPERADMIN) user.role = role;
      if (isActive  !== undefined) user.isActive  = isActive;

      await repo.save(user);
      return sendSuccess(res, sanitize(user), "User updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  updateRole = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: req.params.id } });
      if (!user) return sendError(res, "User not found", 404);

      if (req.user!.role !== UserRole.SUPERADMIN && user.companyId !== req.companyId) {
        return sendError(res, "Access denied", 403);
      }

      const { role } = req.body;
      if (!Object.values(UserRole).includes(role)) {
        return sendError(res, `Invalid role. Must be one of: ${Object.values(UserRole).join(", ")}`);
      }
      if (role === UserRole.SUPERADMIN && req.user!.role !== UserRole.SUPERADMIN) {
        return sendError(res, "Only superadmins can assign superadmin role", 403);
      }

      user.role = role;
      await repo.save(user);
      return sendSuccess(res, sanitize(user), "User role updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  toggleActive = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: req.params.id } });
      if (!user) return sendError(res, "User not found", 404);

      if (req.user!.role !== UserRole.SUPERADMIN && user.companyId !== req.companyId) {
        return sendError(res, "Access denied", 403);
      }
      if (user.id === req.user!.id) return sendError(res, "Cannot deactivate yourself", 400);

      user.isActive = !user.isActive;
      await repo.save(user);
      return sendSuccess(res, sanitize(user), `User ${user.isActive ? "activated" : "deactivated"}`);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  resetPassword = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.createQueryBuilder("u").addSelect("u.password")
        .where("u.id = :id", { id: req.params.id }).getOne();
      if (!user) return sendError(res, "User not found", 404);

      if (req.user!.role !== UserRole.SUPERADMIN && user.companyId !== req.companyId) {
        return sendError(res, "Access denied", 403);
      }

      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return sendError(res, "Password must be at least 8 characters");
      user.password = newPassword;
      await repo.save(user);
      return sendSuccess(res, null, "Password reset successfully");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: req.params.id } });
      if (!user) return sendError(res, "User not found", 404);

      if (req.user!.role !== UserRole.SUPERADMIN && user.companyId !== req.companyId) {
        return sendError(res, "Access denied", 403);
      }
      if (user.id === req.user!.id) return sendError(res, "Cannot delete yourself", 400);

      await repo.remove(user);
      return sendSuccess(res, null, "User deleted");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
