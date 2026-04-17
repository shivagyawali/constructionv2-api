import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { RolePermission } from "../../entities/RolePermission.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin:      ["/dashboard","/clients","/projects","/tasks","/workers","/invoice-periods","/invoices"],
  manager:    ["/dashboard","/clients","/projects","/tasks","/workers","/invoice-periods","/invoices"],
  supervisor: ["/dashboard","/projects","/tasks"],
  worker:     ["/dashboard","/tasks"],
  contractor: ["/dashboard"],
};

export class RolesController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(RolePermission);
      const companyId = req.companyId;

      let rows = companyId
        ? await repo.find({ where: { companyId }, order: { role: "ASC" } })
        : await repo.find({ where: { companyId: undefined as any }, order: { role: "ASC" } });

      // Seed defaults if none exist
      if (rows.length === 0) {
        rows = await this.seedDefaults(companyId);
      }
      return sendSuccess(res, rows);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.companyId;
      const row = companyId
        ? await AppDataSource.getRepository(RolePermission).findOne({ where: { companyId, role: req.params.role } })
        : await AppDataSource.getRepository(RolePermission).findOne({ where: { companyId: undefined as any, role: req.params.role } });
      if (!row) return sendError(res, "Role not found", 404);
      return sendSuccess(res, row);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  upsert = async (req: AuthRequest, res: Response) => {
    try {
      const repo      = AppDataSource.getRepository(RolePermission);
      const companyId = req.companyId;
      const { role, allowedRoutes, customPermissions, description } = req.body;

      if (!role || !Array.isArray(allowedRoutes)) {
        return sendError(res, "role and allowedRoutes[] are required");
      }

      // Cannot restrict admin/superadmin
      if (role === "admin" || role === "superadmin") {
        return sendError(res, "Cannot restrict admin or superadmin roles", 403);
      }

      const routes = allowedRoutes.includes("/dashboard") ? allowedRoutes : ["/dashboard", ...allowedRoutes];

      let row = companyId
        ? await repo.findOne({ where: { companyId, role } })
        : await repo.findOne({ where: { companyId: undefined as any, role } });

      if (row) {
        row.allowedRoutes = routes;
        if (customPermissions !== undefined) row.customPermissions = customPermissions;
        if (description       !== undefined) row.description       = description;
      } else {
        row = repo.create({ companyId: companyId ?? undefined as any, role, allowedRoutes: routes, customPermissions, description });
      }

      await repo.save(row);
      return sendSuccess(res, row, "Role permissions updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  bulkUpdate = async (req: AuthRequest, res: Response) => {
    try {
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== "object") {
        return sendError(res, "permissions object is required");
      }

      const repo      = AppDataSource.getRepository(RolePermission);
      const companyId = req.companyId;
      const results:  RolePermission[] = [];

      for (const [role, routes] of Object.entries(permissions)) {
        if (role === "admin" || role === "superadmin") continue;

        const allowedRoutes = (routes as string[]).includes("/dashboard")
          ? (routes as string[])
          : ["/dashboard", ...(routes as string[])];

        let row = companyId
          ? await repo.findOne({ where: { companyId, role } })
          : await repo.findOne({ where: { companyId: undefined as any, role } });

        if (row) {
          row.allowedRoutes = allowedRoutes;
        } else {
          row = repo.create({ companyId: companyId ?? undefined as any, role, allowedRoutes });
        }
        await repo.save(row);
        results.push(row);
      }

      return sendSuccess(res, results, "All role permissions updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  reset = async (req: AuthRequest, res: Response) => {
    try {
      const repo      = AppDataSource.getRepository(RolePermission);
      const companyId = req.companyId;

      if (companyId) {
        await repo.delete({ companyId });
      } else {
        // Global reset (superadmin only)
        await repo.query("DELETE FROM role_permissions WHERE companyId IS NULL");
      }

      const rows = await this.seedDefaults(companyId);
      return sendSuccess(res, rows, "Permissions reset to defaults");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  private seedDefaults = async (companyId?: string): Promise<RolePermission[]> => {
    const repo  = AppDataSource.getRepository(RolePermission);
    const rows: RolePermission[] = [];
    for (const [role, allowedRoutes] of Object.entries(DEFAULT_PERMISSIONS)) {
      const existing = companyId
        ? await repo.findOne({ where: { companyId, role } })
        : await repo.findOne({ where: { companyId: undefined as any, role } });
      if (!existing) {
        const row = repo.create({ companyId: companyId ?? undefined as any, role, allowedRoutes });
        await repo.save(row);
        rows.push(row);
      } else {
        rows.push(existing);
      }
    }
    return rows;
  };
}
