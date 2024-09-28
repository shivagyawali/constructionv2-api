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

@Entity({
  name: "projects",
})
export class Project extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({nullable:true})
  userId: string;
}
