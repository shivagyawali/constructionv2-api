import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { RolePermission } from "../../entities/RolePermission.entity";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendCreated, sendError } from "../../utils/response";

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin:      ["/dashboard", "/clients", "/projects", "/tasks", "/workers", "/invoice-periods", "/invoices"],
  manager:    ["/dashboard", "/clients", "/projects", "/tasks", "/workers", "/invoice-periods", "/invoices"],
  supervisor: ["/dashboard", "/projects", "/tasks"],
  worker:     ["/dashboard", "/tasks"],
};

export class RolesController {
  list = async (_req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(RolePermission);
      let rows = await repo.find({ order: { role: "ASC" } });

      // Seed defaults if empty
      if (rows.length === 0) {
        const seeds = await this.seedDefaults();
        return sendSuccess(res, seeds);
      }
      return sendSuccess(res, rows);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  getOne = async (req: AuthRequest, res: Response) => {
    try {
      const row = await AppDataSource.getRepository(RolePermission).findOne({ where: { role: req.params.role } });
      if (!row) return sendError(res, "Role not found", 404);
      return sendSuccess(res, row);
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  upsert = async (req: AuthRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(RolePermission);
      const { role, allowedRoutes, customPermissions, description } = req.body;

      if (!role || !Array.isArray(allowedRoutes)) {
        return sendError(res, "role and allowedRoutes[] are required");
      }

      // Enforce dashboard always on
      const routes = allowedRoutes.includes("/dashboard") ? allowedRoutes : ["/dashboard", ...allowedRoutes];

      let row = await repo.findOne({ where: { role } });
      if (row) {
        row.allowedRoutes = routes;
        if (customPermissions !== undefined) row.customPermissions = customPermissions;
        if (description !== undefined) row.description = description;
      } else {
        row = repo.create({ role, allowedRoutes: routes, customPermissions, description });
      }

      await repo.save(row);
      return sendSuccess(res, row, "Role permissions updated");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  bulkUpdate = async (req: AuthRequest, res: Response) => {
    try {
      const { permissions } = req.body; // { admin: [...], manager: [...], ... }
      if (!permissions || typeof permissions !== "object") {
        return sendError(res, "permissions object is required");
      }

      const repo = AppDataSource.getRepository(RolePermission);
      const results: RolePermission[] = [];

      for (const [role, routes] of Object.entries(permissions)) {
        const allowedRoutes = (routes as string[]).includes("/dashboard")
          ? (routes as string[])
          : ["/dashboard", ...(routes as string[])];

        let row = await repo.findOne({ where: { role } });
        if (row) {
          row.allowedRoutes = allowedRoutes;
        } else {
          row = repo.create({ role, allowedRoutes });
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
      const repo = AppDataSource.getRepository(RolePermission);
      await repo.delete({});
      const rows = await this.seedDefaults();
      return sendSuccess(res, rows, "Permissions reset to defaults");
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  private seedDefaults = async (): Promise<RolePermission[]> => {
    const repo = AppDataSource.getRepository(RolePermission);
    const rows: RolePermission[] = [];
    for (const [role, allowedRoutes] of Object.entries(DEFAULT_PERMISSIONS)) {
      const row = repo.create({ role, allowedRoutes });
      await repo.save(row);
      rows.push(row);
    }
    return rows;
  };
}
