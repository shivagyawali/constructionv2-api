import { AppDataSource } from "../../../config/db";
import { Project } from "../../../entity/Project";


export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);

  async createProject(data: Partial<Project>): Promise<Project> {
    const project = this.projectRepository.create(data);
    return await this.projectRepository.save(project);
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.projectRepository.find({ relations: ["tasks", "user"] });
  }

  async updateProject(
    id: string,
    data: Partial<Project>
  ): Promise<Project | null> {
    const project = await this.projectRepository.findOne({where:{id:id}});
    if (!project) return null;
    Object.assign(project, data);
    return await this.projectRepository.save(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.projectRepository.delete(id);
  }
}
