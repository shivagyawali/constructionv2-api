import { AppDataSource } from "../../config/db";
import { User } from "../../entity/User";
import bcrypt from "bcryptjs";
export const createUser = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const email = "iamshivagyawali@gmail.com";
  const name = "iloveDATA@123";
  const password = "iloveDATA@123";
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
