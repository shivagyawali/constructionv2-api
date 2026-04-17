import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from "typeorm";
import { Company } from "./Company.entity";

@Entity("role_permissions")
@Index(["companyId", "role"], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ nullable: true }) companyId!: string;     // null = global default (superadmin managed)
  @Column() role!: string;
  @Column({ type: "json" }) allowedRoutes!: string[];
  @Column({ type: "json", nullable: true }) customPermissions!: Record<string, boolean>;
  @Column({ nullable: true }) description!: string;
  @Column({ default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @ManyToOne(() => Company, (c) => c.rolePermissions, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  company!: Company;
}
