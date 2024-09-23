import { AppDataSource } from "../../../config/db";
import { Task } from "../../../entity/Task";


export class TaskService {
  private taskRepository = AppDataSource.getRepository(Task);

  async createTask(data: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create(data);
    return await this.taskRepository.save(task);
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.taskRepository.find({ relations: ["project"] });
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
    const task = await this.taskRepository.findOne({where:{id:id}});
    if (!task) return null;
    Object.assign(task, data);
    return await this.taskRepository.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.taskRepository.delete(id);
  }
}
