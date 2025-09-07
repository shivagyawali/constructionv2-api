import { Response } from "express";
import { UserRole } from "../../enum";
import { ForbiddenError } from "../../helpers/Utils/ApiError";
import { paginate } from "../../helpers/Utils/paginate";
import { constructWhereConditions } from "../../helpers/Utils/constructWhereConditions";
import { AppDataSource } from "../../../config/db";
import { Project } from "../../../entity/Project";


export class EventService {

  private projectRepository = AppDataSource.getRepository(Project);
  getAllEvents = async (
    req?: any,
    res?: Response,
    page: number = 1,
    filters: { [key: string]: any } = {}
  ) => {
    const { user: { role, isSubAccount, companyId } = {} } = req || {};

    // ✅ Permission check
    if (role !== UserRole.ROOT && role !== UserRole.CLIENT && isSubAccount) {
      throw new ForbiddenError("You don't have access to view this page");
    }

    // ✅ Filters
    let where = {
      ...constructWhereConditions(filters),
      ...(role === UserRole.CLIENT && { company: { id: companyId } }),
    };

    // ✅ Fetch projects (with tasks & company)
    const [projects, count] = await this.projectRepository.findAndCount({
      where,
      relations: ["tasks", "company"],
      skip: (page - 1) * 10,
      take: 10,
      order: { createdAt: "DESC" },
    });

    // ✅ Convert projects + tasks → events
    const events = projects.flatMap((p:any) => {
      const projectEvent = {
        id: p.id,
        title: p.name,
        description: p.description,
        startDate: p.createdAt,
        endDate: p.updatedAt,
        status: p.status,
        color: getStatusColor(p.status),
        type: "PROJECT" as const,
        companyId: p.company?.id,
      };

      const taskEvents = p.tasks.map((t:any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        startDate: t.createdAt,
        endDate: t.updatedAt,
        status: t.isCompleted ? "COMPLETED" : "INPROGRESS",
        color: t.isCompleted ? "#16A34A" : "#3B82F6",
        type: "TASK" as const,
        projectId: p.id,
        companyId: p.company?.id,
      }));

      return [projectEvent, ...taskEvents];
    });

    // ✅ Return in same format as getAllProjects
    return { ...paginate(page, count), results: events, count };
  };
}

// helper for colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "#F97316";
    case "INPROGRESS":
      return "#3B82F6";
    case "ONHOLD":
      return "#EAB308";
    case "COMPLETED":
      return "#16A34A";
    default:
      return "#6B7280";
  }
};
