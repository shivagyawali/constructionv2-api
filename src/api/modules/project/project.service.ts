import { AppDataSource } from "../../../config/db";
import { Project } from "../../../entity/Project";
import { User } from "../../../entity/User";
import { UserRole } from "../../enum";
import { paginate } from "../../helpers/Utils/paginate";
import { constructWhereConditions } from "../../helpers/Utils/constructWhereConditions";


export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private userRepo = AppDataSource.getRepository(User);
  async createProject(data: any) {
    const { name, description } = data.body;
    const user = await this.userRepo.findOne({
      where: { id: data?.user?.id },
      relations: ["company"],
    });
    const newProject = new Project();
    newProject.name = name;
    newProject.description = description || null;
    if (user && user.company !== null) {
      newProject.company = user?.company;
    }
    const result = await this.projectRepository.save(newProject);
    // return {
    //   id: result.id,
    //   name: result.name,
    //   description: result.description,

    // };
    return result;
  }

  getAllProjects = async (
    req?: any,
    res?: Response,
    page: number = 1,
    filters: { [key: string]: any } = {}
  ) => {
    const { user: { role, companyId } = {} } = req || {};
    const where = {
      ...constructWhereConditions(filters),
      ...(role === UserRole.CLIENT && { company: { id: companyId } }),
    };

    const [results, count] = await this.projectRepository.findAndCount({
      where,
      relations: ["tasks", "company"],
      skip: (page - 1) * 10,
      take: 10,
      order: { createdAt: "DESC" },
    });

    return { ...paginate(page, count), results, count };
  };

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
