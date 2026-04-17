import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User.entity";
import { RolePermission } from "../entities/RolePermission.entity";
import { env } from "../config/env";

export interface AuthRequest extends Request {
  user?: User;
  companyId?: string;   // resolved tenant scope
}

// ── Token verification ────────────────────────────────────────────────────────
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const token   = authHeader.split(" ")[1];
    const payload = jwt.verify(token, env.jwt.secret) as { sub: string };

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) return res.status(401).json({ success: false, message: "User not found or inactive" });

    req.user      = user;
    req.companyId = user.companyId ?? undefined;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ── Role guard ────────────────────────────────────────────────────────────────
export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }
    next();
  };

// ── Superadmin guard ──────────────────────────────────────────────────────────
export const superadminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== UserRole.SUPERADMIN) {
    return res.status(403).json({ success: false, message: "Superadmin access required" });
  }
  next();
};

// ── Tenant isolation: inject companyId from token, block cross-tenant access ──
export const tenantScope = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  // Superadmin can specify any companyId via query/body/header, or see all
  if (req.user.role === UserRole.SUPERADMIN) {
    const override = (req.query.companyId ?? req.body?.companyId ?? req.headers["x-company-id"]) as string | undefined;
    req.companyId  = override ?? undefined;
    return next();
  }

  // Normal users must belong to a company
  if (!req.user.companyId) {
    return res.status(403).json({ success: false, message: "User is not associated with any company" });
  }

  req.companyId = req.user.companyId;
  next();
};

// ── DB-stored route permission check (per company) ───────────────────────────
export const requireRouteAccess = (route: string) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Superadmin bypasses all route checks
    if (req.user.role === UserRole.SUPERADMIN) return next();
    // Company admin bypasses (full access within tenant)
    if (req.user.role === UserRole.ADMIN) return next();

    try {
      const repo = AppDataSource.getRepository(RolePermission);

      // Try company-specific permission first, fall back to global
      let perm = req.user.companyId
        ? await repo.findOne({ where: { companyId: req.user.companyId, role: req.user.role } })
        : null;

      if (!perm) {
        perm = await repo.findOne({ where: { companyId: undefined as any, role: req.user.role } });
      }

      if (!perm || !perm.allowedRoutes.includes(route)) {
        return res.status(403).json({
          success: false,
          message: "Access to this section is not permitted for your role",
        });
      }
      next();
    } catch {
      next(); // fail open on DB error
    }
  };

// ── Ensure resource belongs to same company ───────────────────────────────────
export const assertSameCompany = (resourceCompanyId: string, req: AuthRequest, res: Response): boolean => {
  if (req.user?.role === UserRole.SUPERADMIN) return true;
  if (resourceCompanyId !== req.companyId) {
    res.status(403).json({ success: false, message: "Access denied: resource belongs to another company" });
    return false;
  }
  return true;
};
