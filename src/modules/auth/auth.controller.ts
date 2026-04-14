import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/User.entity";
import { success, created, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth.middleware";
import jwt from "jsonwebtoken";

const signTokens = (userId: string) => {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
};

const sanitizeUser = (user: User) => {
  const { password, refreshToken, ...safe } = user as any;
  return safe;
};

export class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { firstName, lastName, email, password, role } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return error(res, "firstName, lastName, email and password are required");
      }

      const exists = await repo.findOne({ where: { email } });
      if (exists) return error(res, "Email already registered", 409);

      const user = repo.create({ firstName, lastName, email, password, role });
      await repo.save(user);

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      user.lastLoginAt = new Date();
      await repo.save(user);

      return created(res, { user: sanitizeUser(user), ...tokens }, "Registered successfully");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { email, password } = req.body;

      if (!email || !password) return error(res, "Email and password required");

      const user = await repo
        .createQueryBuilder("u")
        .addSelect("u.password")
        .where("u.email = :email AND u.isActive = 1", { email })
        .getOne();

      if (!user || !(await user.comparePassword(password))) {
        return error(res, "Invalid credentials", 401);
      }

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      user.lastLoginAt = new Date();
      await repo.save(user);

      return success(res, { user: sanitizeUser(user), ...tokens }, "Login successful");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return error(res, "Refresh token required");

      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: payload.sub } });

      if (!user || user.refreshToken !== refreshToken) {
        return error(res, "Invalid refresh token", 401);
      }

      const tokens = signTokens(user.id);
      user.refreshToken = tokens.refreshToken;
      await repo.save(user);

      return success(res, tokens, "Token refreshed");
    } catch {
      return error(res, "Invalid refresh token", 401);
    }
  };

logout = async (req: any, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(User);

    if (!req.user) {
      return error(res, "User not found", 401);
    }
    req.user.refreshToken = "";
    await repo.save(req.user);

    return success(res, null, "Logged out");
  } catch (e: any) {
    return error(res, e.message, 500);
  }
};

  getProfile = async (req: AuthRequest, res: Response) => {
    return success(res, sanitizeUser(req.user!));
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { phone, company, firstName, lastName } = req.body;
      Object.assign(req.user!, { phone, company, firstName, lastName });
      await repo.save(req.user!);
      return success(res, sanitizeUser(req.user!), "Profile updated");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };

  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const { oldPassword, newPassword } = req.body;

      const user = await repo
        .createQueryBuilder("u")
        .addSelect("u.password")
        .where("u.id = :id", { id: req.user!.id })
        .getOne();

      if (!user || !(await user.comparePassword(oldPassword))) {
        return error(res, "Current password is incorrect", 400);
      }

      user.password = newPassword;
      await repo.save(user);
      return success(res, null, "Password changed successfully");
    } catch (e: any) {
      return error(res, e.message, 500);
    }
  };
}
