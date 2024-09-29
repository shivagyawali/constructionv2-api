import { Entity, Column, OneToMany } from "typeorm";
import { IsEmail, IsString } from "class-validator";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";
import { Project } from "./Project";
@Entity({
  name: "companies",
})
export class Company extends BaseEntity {
  @IsString()
  @Column({ nullable: false })
  name: string;

  @IsString()
  @Column({ unique: true })
  email: string;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Project, (project) => project.company)
  projects: Project[];
}
