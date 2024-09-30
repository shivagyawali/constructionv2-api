import { Entity, Column, OneToMany, BeforeInsert } from "typeorm";
import { IsEmail, IsString } from "class-validator";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";
import { Project } from "./Project";
import { CompanyStatus } from "../api/enum";
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

  @Column({ nullable: true })
  logo: string;
  @BeforeInsert()
  setDefaultAvatar() {
    if (!this.logo) {
      this.logo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        this.name
      )}&format=svg&background=F9C235`;
    }
  }

  @Column({ default: CompanyStatus.INACTIVE })
  role: CompanyStatus;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Project, (project) => project.company)
  projects: Project[];
}
