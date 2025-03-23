import { Entity, Column, ManyToOne, ManyToMany, OneToMany, BeforeInsert, } from "typeorm";
import { IsEmail, IsString } from "class-validator";
import { Company } from "./Company";
import { Task } from "./Task";
import { Project } from "./Project";
import { BaseEntity } from "./BaseEntity";
import { AppDataSource } from "../config/db";
import { Permission } from "./Permission";
import { UserRole } from "../api/enum";
import { Exclude } from "class-transformer";
import { WorkLog } from "./WorkLog";
import { Invoice } from "./Invoice";
import { TaskComment } from "./TaskComment";
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

  @Exclude()
  @IsString()
  @Column()
  password: string;

  @Column({ default: UserRole.WORKER })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: true })
  isSubAccount: boolean;

  @Column({ default: false })
  isPasswordChangeRequired: boolean;

  @ManyToOne(() => Company, (company) => company.users)
  company: Company;

  @Column({ nullable: true })
  companyId: string;

  @Column({ nullable: true, default: 8 })
  hourlyRate: string;

  @ManyToMany(() => Task, (task) => task.users)
  tasks: Task[];
  async fetchPermissionsByRole() {
    const permissionRepo = AppDataSource.getRepository(Permission);
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

  @OneToMany(() => WorkLog, (workLog) => workLog.user)
  workLogs: WorkLog[];

  @OneToMany(() => WorkLog, (workLog) => workLog.user)
  invoices: Invoice[];

  @OneToMany(() => TaskComment, (comment) => comment.user)
  taskComments: TaskComment[];
}
