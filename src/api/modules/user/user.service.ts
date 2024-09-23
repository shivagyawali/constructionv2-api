
import { AppDataSource } from "../../../config/db";
import { User } from "../../../entity/User";


export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return await this.userRepository.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({ relations: ["projects"] });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOne({where:{id:id}});
    if (!user) return null;
    Object.assign(user, data);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
