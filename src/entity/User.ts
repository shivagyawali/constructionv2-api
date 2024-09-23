import { Entity, Column, ManyToOne, ManyToMany, OneToMany } from "typeorm";
import { IsEmail, IsString } from "class-validator";
import { Company } from "./Company";
import { Task } from "./Task";
import { Project } from "./Project";
import { BaseEntity } from "./BaseEntity";
@Entity({
  name: "users",
})
export class User extends BaseEntity {
  @IsEmail()
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @IsString()
  @Column()
  password: string;

  @IsString()
  @Column()
  role: string;

  @Column({default:0})
  isVerified: boolean;

  @Column({default:0})
  isActive: boolean;

  @Column({default:0})
  isPasswordChangeRequired: boolean;

  @ManyToOne(() => Company, (company) => company.users)
  company: Company;

  @ManyToMany(() => Task, (task) => task.users)
  tasks: Task[];

  @OneToMany(() => Project, (project) => project.user)
  projects: Project[];
}
