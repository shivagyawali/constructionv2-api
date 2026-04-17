import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity("role_permissions")
export class RolePermission {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true }) role!: string;
  @Column({ type: "json" }) allowedRoutes!: string[];
  @Column({ type: "json", nullable: true }) customPermissions!: Record<string, boolean>;
  @Column({ nullable: true }) description!: string;
  @Column({ default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
