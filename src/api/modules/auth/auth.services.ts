import { AppDataSource } from "../../../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../../../entity/User";
import { defaultConfig } from "../../../config/defaultConfig";
import { createUser } from "../../seeder/createUser";
import { seedPermissions } from "../../seeder/permission";
import { Permission } from "../../../entity/Permission";
import { InvalidCredentialsError } from "../../helpers/Utils/ApiError";

export class AuthService {

  static async login(email: string, password: string) {
    const userRepo = AppDataSource.getRepository(User);
    const permissionRepo = AppDataSource.getRepository(Permission);
    //await createUser();
    //await seedPermissions();
    const user = await userRepo.findOne({
      where: { email },
      relations: ["company"],
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
     throw new InvalidCredentialsError("Email and password doesn't match")
    }
      const allPermissions = await permissionRepo.find();
      const permissionsByResource:any = {};
      allPermissions.forEach((permission) => {
        const rolePermissions = JSON.parse(permission.rolePermissions);
        const userRolePermissions = rolePermissions.find(
          (rolePerm:any) => rolePerm.role === user.role
        );
        if (userRolePermissions) {
          permissionsByResource[permission.name] =
            userRolePermissions.permissions;
        } else {
          permissionsByResource[permission.resource] = [];
        }
      });

    const expiresIn = "1h";
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      defaultConfig.secret,
      { expiresIn }
    );
    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60;

     return {
       token,
       expiresAt: new Date(expirationTime * 1000).toISOString(),
       user: {
         name: user.name,
         email: user.email,
         role: user.role,
         isVerified: user.isVerified,
         isActive: user.isActive,
         isPasswordChangeRequired: user.isPasswordChangeRequired,
         permissions: await user.fetchPermissionsByRole(),
       },
     };
  }
}
