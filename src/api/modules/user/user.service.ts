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
export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async createUser(data: Partial<User>): Promise<User> {
    if (await this.userRepository.findOne({ where: { email: data.email } }))
      throw new DuplicateError("User already exists");
    const password = crypto.randomBytes(6).toString("hex");
    const user = this.userRepository.create({
      ...data,
      password: await bcrypt.hash(password, 10),
      role: data.role,
      isSubAccount: data && data.role===UserRole.CLIENT?true:false,
      isPasswordChangeRequired: true,
      isActive:true,
      company: data?.company,
    });
    await user.save();
    //send email with random password
    return user;
  }
  getAllUsers = async (
    req?: any,
    res?: Response,
    page: number = 1,
    filters: { [key: string]: any } = {}
  ) => {
    const { user } = req || {};
    const { role, companyId, isSubaccount } = user || {};

  let where: any = { ...constructWhereConditions(filters) };
  if (role === UserRole.CLIENT && !isSubaccount && companyId) {
    where = [
      { role: UserRole.CLIENT, company: { id: companyId } },
      { role: UserRole.WORKER, company: { id: companyId } },
    ];
  }

  const [results, count] = await this.userRepository.findAndCount({
    where,
    relations: ["company"],
    skip: (page - 1) * 10,
    take: 10,
    order: { createdAt: "DESC" },
  });

    return {
      ...paginate(page, count),
      results: instanceToPlain(results),
      count,
    };
  };

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: id } });
    if (!user) return null;
    Object.assign(user, data);
    return await this.userRepository.save(user);
  }

  async deleteUser(data: any) {
    const user = await this.userRepository.findOne({
      where: { id: data.id, isSubAccount: true, companyId: data.company.id },
    });
    if (!user) throw new NotFoundError("User not found");
    await this.userRepository.delete(data.id);
   return instanceToPlain(user);
  }
}
