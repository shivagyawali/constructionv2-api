import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,

} from "typeorm";
import { User } from "./User";
import { Project } from "./Project";
import { BaseEntity } from "./BaseEntity";
import { Company } from "./Company";


@Entity({
  name: "tasks",
})
export class Task extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "boolean", default: false })
  isCompleted: boolean;

  @Column({ type: "text", nullable: true })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: "projectId" })
  project: Project;

  @ManyToOne(() => Company, (company) => company.projects)
  @JoinColumn({ name: "companyId" })
  company: Company;

  @ManyToMany(() => User, (user) => user.tasks)
  @JoinTable({
    name: "task_workers",
    joinColumn: { name: "taskId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "userId", referencedColumnName: "id" },
  })
  users: User[] | null;
}
