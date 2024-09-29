import { AppDataSource } from "../../config/db";
import { User } from "../../entity/User";
import bcrypt from "bcryptjs";
export const createUser = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const email = "admin2@gmail.com";
  const name = "admin2";
  const password = "admin2@123";
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
