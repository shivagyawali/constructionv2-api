import { instanceToPlain, plainToClass } from "class-transformer";
import { AppDataSource } from "../../../config/db";
import { User } from "../../../entity/User";
import { constructWhereConditions } from "../../helpers/Utils/constructWhereConditions";
import { UserRole } from "../../enum";
import { paginate } from "../../helpers/Utils/paginate";
import bcrypt from "bcryptjs";
import { DuplicateError, NotFoundError } from "../../helpers/Utils/ApiError";
import { sendEmail } from "../../helpers/sendEmail";
import { In, Not } from "typeorm";
export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async createUser(data: Partial<User>): Promise<User> {
    if (await this.userRepository.findOne({ where: { email: data.email } }))
      throw new DuplicateError("User already exists");
    const password = this.generateRandomString();
    const user = this.userRepository.create({
      ...data,
      password: await bcrypt.hash(password, 10),
      role: data.role,
      isSubAccount: true,
      isPasswordChangeRequired: true,
      isActive: true,
      company: data?.company,
    });

    //send email with random password
    await sendEmail("DEFAULT_PASSWORD", data.email, {
      name: data.name,
      password: password,
    });
    await user.save();
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
     where = {
       email: Not(user.email),
       role: In([UserRole.CLIENT, UserRole.WORKER]),
       company: { id: companyId },
     };
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
  async getOneUser(data: any) {
    const user = await this.userRepository.findOne({
      where: { id: data.id, companyId: data.company.id },
    });
    if (!user) throw new NotFoundError("User not found");

    return instanceToPlain(user);
  }
 generateRandomString(length: number = 6){
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
}
