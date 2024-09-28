import { AppDataSource } from "../../config/db";
import { Permission } from "../../entity/Permission";

export const seedPermissions = async () => {
  const repo = AppDataSource.getRepository(Permission);
  const permissionData = {
    name: "Project",
    resource: "create,read,update,delete,view,edit,list",
    rolePermissions: JSON.stringify([
      {
        role: "root",
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
        role: "company",
        permissions: [
          "create",
          "delete",
          "edit",
          "list",
          "read",
          "view",
          "update",
        ],
      },
      {
        role: "admin",
        permissions: ["list", "read", "view", "edit", "update", "create"],
      },

      {
        role: "worker",
        permissions: ["read", "list", "view"],
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

