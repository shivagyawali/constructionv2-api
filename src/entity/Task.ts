import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,

} from "typeorm";
import { User } from "./User";
import { Project } from "./Project";
import { BaseEntity } from "./BaseEntity";


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

  @ManyToOne(() => Project, (project) => project.tasks)
  project: Project;

  @ManyToMany(() => User, (user) => user.tasks)
  @JoinTable({
    name: "task_workers",
    joinColumn: { name: "taskId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "userId", referencedColumnName: "id" },
  })
  users: User[];
}
