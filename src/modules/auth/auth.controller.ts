import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../config/data-source";
import { User, UserRole } from "../../entities/User.entity";
import { Company, CompanyStatus } from "../../entities/Company.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError } from "../../utils/response";
import { env } from "../../config/env";

const signTokens = (userId: string) => ({
  accessToken:  jwt.sign({ sub: userId }, env.jwt.secret,        { expiresIn: env.jwt.expiresIn }        as jwt.SignOptions),
  refreshToken: jwt.sign({ sub: userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions),
});

const sanitize = (user: User) => {
  const { password, refreshToken, ...safe } = user as any;
  return safe;
};

export class AuthController {
  // ── Register user under a specific company ────────────────────────────────
  register = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { firstName, lastName, email, password, role, companyId, inviteCode } = req.body;

      const exists = await repo.findOne({ where: { email } });
      if (exists) return sendError(res, "Email already registered", 409);

      // Validate company if provided
      let resolvedCompanyId: string | undefined;
      if (companyId) {
        const company = await AppDataSource.getRepository(Company).findOne({ where: { id: companyId } });
        if (!company) return sendError(res, "Company not found", 404);
        if (company.status === CompanyStatus.SUSPENDED) {
          return sendError(res, "Company account is suspended", 403);
        }
        resolvedCompanyId = company.id;

        // Check user limit
        const [[{ cnt }]] = await Promise.all([
          AppDataSource.query("SELECT COUNT(*) as cnt FROM users WHERE companyId = ?", [companyId]),
        ]);
        if (Number(cnt) >= company.maxUsers) {
          return sendError(res, `User limit reached for this company (max ${company.maxUsers})`, 403);
        }
      }

      // Never allow self-registering as superadmin
      const safeRole = role === UserRole.SUPERADMIN ? UserRole.CONTRACTOR : (role ?? UserRole.CONTRACTOR);

      const user = repo.create({
        firstName, lastName, email, password,
        role: safeRole,
        companyId: resolvedCompanyId ?? undefined as any,
        isActive: true,
      });
      await repo.save(user);

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      user.lastLoginAt  = new Date();
      await repo.save(user);

      return sendCreated(res, { user: sanitize(user), ...tokens }, "Registered successfully");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  login = async (req: Request, res: Response) => {
    try {
      const repo  = AppDataSource.getRepository(User);
      const { email, password } = req.body;

      const user = await repo
        .createQueryBuilder("u")
        .addSelect("u.password")
        .leftJoinAndSelect("u.companyRef", "company")
        .where("u.email = :email AND u.isActive = 1", { email })
        .getOne();

      if (!user || !(await user.comparePassword(password))) {
        return sendError(res, "Invalid credentials", 401);
      }

      // Block login if company is suspended (except superadmin)
      if (user.companyId && user.role !== UserRole.SUPERADMIN) {
        const company = await AppDataSource.getRepository(Company).findOne({
          where: { id: user.companyId },
        });
        if (company?.status === CompanyStatus.SUSPENDED) {
          return sendError(res, "Your company account has been suspended. Please contact support.", 403);
        }
      }

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      user.lastLoginAt  = new Date();
      await repo.save(user);

      return sendSuccess(res, { user: sanitize(user), ...tokens }, "Login successful");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Refresh token ─────────────────────────────────────────────────────────
  refresh = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return sendError(res, "Refresh token required");

      const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { sub: string };
      const user    = await AppDataSource.getRepository(User)
        .createQueryBuilder("u")
        .addSelect("u.refreshToken")
        .where("u.id = :id", { id: payload.sub })
        .getOne();

      if (!user || user.refreshToken !== refreshToken) {
        return sendError(res, "Invalid refresh token", 401);
      }

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      await AppDataSource.getRepository(User).save(user);

      return sendSuccess(res, tokens, "Token refreshed");
    } catch {
      return sendError(res, "Invalid refresh token", 401);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  logout = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return sendError(res, "Unauthorized", 401);
      const repo = AppDataSource.getRepository(User);
      const user = await repo.createQueryBuilder("u").addSelect("u.refreshToken")
        .where("u.id = :id", { id: req.user.id }).getOne();
      if (user) { user.refreshToken = ""; await repo.save(user); }
      return sendSuccess(res, null, "Logged out");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Get profile ───────────────────────────────────────────────────────────
  getProfile = async (req: AuthRequest, res: Response) => {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.user!.id },
      relations: ["companyRef"],
    });
    return sendSuccess(res, sanitize(user ?? req.user!));
  };

  // ── Update profile ────────────────────────────────────────────────────────
  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { phone, company, firstName, lastName } = req.body;
      Object.assign(req.user!, { phone, company, firstName, lastName });
      await repo.save(req.user!);
      return sendSuccess(res, sanitize(req.user!), "Profile updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { oldPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return sendError(res, "New password must be at least 8 characters");
      }

      const user = await repo.createQueryBuilder("u").addSelect("u.password")
        .where("u.id = :id", { id: req.user!.id }).getOne();
      if (!user || !(await user.comparePassword(oldPassword))) {
        return sendError(res, "Current password is incorrect", 400);
      }

      user.password = newPassword;
      await repo.save(user);
      return sendSuccess(res, null, "Password changed successfully");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
