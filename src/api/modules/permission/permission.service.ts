import { instanceToPlain, plainToClass } from "class-transformer";
import { AppDataSource } from "../../../config/db";
import { User } from "../../../entity/User";
import { constructWhereConditions } from "../../helpers/Utils/constructWhereConditions";
import { UserRole } from "../../enum";
import { paginate } from "../../helpers/Utils/paginate";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { DuplicateError, NotFoundError } from "../../helpers/Utils/ApiError";
import { sendSuccessResponse } from "../../helpers/Utils/response";
import { sendEmail } from "../../helpers/sendEmail";
import { Permission } from "../../../entity/Permission";
import { DataTypeNotSupportedError } from "typeorm";
export class PermissionService {
  private permissionRepo = AppDataSource.getRepository(Permission);

  async createPermission(data: Partial<Permission>) {
    const records = await this.permissionRepo.save({
      name: data.name,
      resource: data.resource,
      rolePermissions: data.rolePermissions,
    });

    return records;

  }
  getAllPermissions = async (
    req?: any,
    res?: Response,
    page: number = 1,
    filters: { [key: string]: any } = {}
  ) => {
    const results = await this.permissionRepo.findAndCount();
    return results;
  };

  async updatePermission(
    id: string,
    data: Partial<Permission>
  ){
    ///
  }

  async deleteUser(data: any) {
    ///
  }
  async getOneUser(data: any) {
    ///
  }
}
