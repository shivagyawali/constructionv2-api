import { AppDataSource } from "../../../config/db";
import { Project } from "../../../entity/Project";
import { User } from "../../../entity/User";


export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private userRepo = AppDataSource.getRepository(User);
  async createProject(data: any) {
    const { name, description } = data.body;
    const user = await this.userRepo.findOneBy({ id: data?.user?.id });
    const newProject = new Project();
    newProject.name = name;
    newProject.description = description || null;
   if(user){
     newProject.user = user;
     newProject.userId = data?.user?.id ;
   }
    return await this.projectRepository.save(newProject);
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.projectRepository.find({ relations: ["tasks", "user"] });
  }

  async updateProject(
    id: string,
    data: Partial<Project>
  ): Promise<Project | null> {
    const project = await this.projectRepository.findOne({ where: { id: id } });
    if (!project) return null;
    Object.assign(project, data);
    return await this.projectRepository.save(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.projectRepository.delete(id);
  }
}
