import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert, BeforeUpdate } from "typeorm";
import bcrypt from "bcryptjs";
import { Invoice } from "./Invoice.entity";

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  SUPERVISOR = "supervisor",
  WORKER = "worker",
  CONTRACTOR = "contractor",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() firstName!: string;
  @Column() lastName!: string;
  @Column({ unique: true }) email!: string;
  @Column({ select: false }) password!: string;
  @Column({ type: "enum", enum: UserRole, default: UserRole.CONTRACTOR }) role!: UserRole;
  @Column({ nullable: true }) phone!: string;
  @Column({ nullable: true }) company!: string;
  @Column({ default: true }) isActive!: boolean;
  @Column({ nullable: true, select: false }) refreshToken!: string;
  @Column({ nullable: true }) lastLoginAt!: Date;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @OneToMany(() => Invoice, (i) => i.createdBy)
  invoices!: Invoice[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith("$2")) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.password);
  }

  get fullName(): string { return `${this.firstName} ${this.lastName}`; }
}
