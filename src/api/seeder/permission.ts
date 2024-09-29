import { AppDataSource } from "../../config/db";
import { Permission } from "../../entity/Permission";
import { UserRole } from "../enum";

export const seedPermissions = async () => {
  const repo = AppDataSource.getRepository(Permission);
  const permissionData = {
    name: "companies",
    resource: "create,read,update,delete,view,edit,list",
    rolePermissions: JSON.stringify([
      {
        role: UserRole.ROOT,
        permissions: [
          "create",
          "delete",
          "edit",
          "list",
          "read",
          "view",
          "update",
          "*",
        ],
      },
      {
        role: UserRole.CLIENT,
        permissions: [
          "read",
          "view"
        ],
      },
      {
        role: UserRole.ADMIN,
        permissions: ["read", "view",],
      },
      {
        role: UserRole.WORKER,
        permissions: ["read"],
      },
    ]),
  };

  try {
    const newPermission = repo.create(permissionData);
    await repo.save(newPermission);
    console.log("Permission added successfully!");
  } catch (error) {
    console.error("Error adding permission:", error);
  }
};

