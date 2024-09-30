import { AppDataSource } from "../../config/db";
import { User } from "../../entity/User";
import bcrypt from "bcryptjs";
import { UserRole } from "../enum";
export const createUser = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const email = "ashish@gmail.com";
  const name = "ashish";
  const password = "ashish@123";
  const role = UserRole.CLIENT
  const checkIfExists = await userRepo.findOne({ where: { email: email } });
  if (!checkIfExists) {
    await userRepo
      .create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role
      })
      .save();
  }
};
