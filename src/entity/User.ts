import { Entity, Column, ManyToOne, ManyToMany, OneToMany, BeforeInsert, } from "typeorm";
import { IsEmail, IsString } from "class-validator";
import { Company } from "./Company";
import { Task } from "./Task";
import { Project } from "./Project";
import { BaseEntity } from "./BaseEntity";
import { AppDataSource } from "../config/db";
import { Permission } from "./Permission";
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
  @BeforeInsert()
  setDefaultAvatar() {
    if (!this.avatar) {
      this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        this.name
      )}&format=svg&background=F9C235`;
    }
  }

  @IsString()
  @Column()
  password: string;

  @IsString()
  @Column({ default: "worker" })
  role: string;

  @Column({ default: 0 })
  isVerified: boolean;

  @Column({ default: 0 })
  isActive: boolean;

  @Column({ default: 0 })
  isPasswordChangeRequired: boolean;

  @ManyToOne(() => Company, (company) => company.users)
  company: Company;

  @ManyToMany(() => Task, (task) => task.users)
  tasks: Task[];
  async fetchPermissionsByRole() {
    const permissionRepo =AppDataSource.getRepository(Permission);
    const allPermissions = await permissionRepo.find();
    const permissionsByResource: any = {};
    allPermissions.forEach((permission) => {
      const rolePermissions = JSON.parse(permission.rolePermissions); 
      const userRolePermissions = rolePermissions.find(
        (rolePerm: any) => rolePerm.role === this.role
      );
      if (userRolePermissions) {
        permissionsByResource[permission.name] =
          userRolePermissions.permissions;
      } else {
        permissionsByResource[permission.name] = [];
      }
    });

    return permissionsByResource;
  }
}
