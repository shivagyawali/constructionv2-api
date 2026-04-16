import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/User.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError } from "../../utils/response";
import { env } from "../../config/env";

const signTokens = (userId: string) => ({
  accessToken: jwt.sign({ sub: userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as jwt.SignOptions),
  refreshToken: jwt.sign({ sub: userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions),
});

const sanitize = (user: User) => {
  const { password, refreshToken, ...safe } = user as any;
  return safe;
};

export class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { firstName, lastName, email, password, role } = req.body;

      const exists = await repo.findOne({ where: { email } });
      if (exists) return sendError(res, "Email already registered", 409);

      const user = repo.create({ firstName, lastName, email, password, role });
      await repo.save(user);

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      user.lastLoginAt = new Date();
      await repo.save(user);

      return sendCreated(res, { user: sanitize(user), ...tokens }, "Registered successfully");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { email, password } = req.body;

      const user = await repo
        .createQueryBuilder("u")
        .addSelect("u.password")
        .where("u.email = :email AND u.isActive = 1", { email })
        .getOne();

      if (!user || !(await user.comparePassword(password))) {
        return sendError(res, "Invalid credentials", 401);
      }

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      user.lastLoginAt = new Date();
      await repo.save(user);

      return sendSuccess(res, { user: sanitize(user), ...tokens }, "Login successful");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return sendError(res, "Refresh token required");

      const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { sub: string };
      const user = await AppDataSource.getRepository(User)
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

  logout = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      if (!req.user) return sendError(res, "Unauthorized", 401);
      const user = await repo.createQueryBuilder("u").addSelect("u.refreshToken").where("u.id = :id", { id: req.user.id }).getOne();
      if (user) { user.refreshToken = ""; await repo.save(user); }
      return sendSuccess(res, null, "Logged out");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getProfile = async (req: AuthRequest, res: Response) => {
    return sendSuccess(res, sanitize(req.user!));
  };

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

  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { oldPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return sendError(res, "New password must be at least 8 characters");
      }

      const user = await repo.createQueryBuilder("u").addSelect("u.password").where("u.id = :id", { id: req.user!.id }).getOne();
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
