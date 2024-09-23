import { AppDataSource } from "../../../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../../../entity/User";

export class AuthService {

  static async login(email: string, password: string) {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { email },
      relations: ["company"],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      "SECRET_KEY"
    );
     return {
       token,
       user: {
         name: user.name,
         email: user.email,
         role: user.role,
         isVerified: user.isVerified,
         isActive: user.isActive,
       },
     };
  }
}
