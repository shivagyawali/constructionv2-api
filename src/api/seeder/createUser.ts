import { AppDataSource } from "../../config/db";
import { User } from "../../entity/User";
import bcrypt from "bcryptjs";
export const createUser = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const email = "admin@gmail.com";
  const name = "admin";
  const password = "admin@123";
  const checkIfExists = await userRepo.findOne({ where: { email: email } });
  if (!checkIfExists) {
    await userRepo
      .create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
      })
      .save();
  }
};
