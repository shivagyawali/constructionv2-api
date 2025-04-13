import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Task } from "./Task";
import { BaseEntity } from "./BaseEntity";
import { Company } from "./Company";

@Entity({
  name: "projects",
})
export class Project extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "INPROGRESS","ONHOLD", "COMPLETED"],
    default: "PENDING",
  })
  status: "PENDING"| "INPROGRESS"|"ONHOLD"| "COMPLETED";

  @Column({ type: "text", nullable: true })
  description: string;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @ManyToOne(() => Company, (company) => company.projects)
  @JoinColumn({ name: "companyId" })
  company: Company;
}
