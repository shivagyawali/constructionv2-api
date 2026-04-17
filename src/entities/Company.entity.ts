import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from "typeorm";
import { User } from "./User.entity";
import { Client } from "./Client.entity";
import { Project } from "./Project.entity";
import { Worker } from "./Worker.entity";
import { Invoice } from "./Invoice.entity";
import { InvoicePeriod } from "./InvoicePeriod.entity";
import { RolePermission } from "./RolePermission.entity";

export enum CompanyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  TRIAL = "trial",
  SUSPENDED = "suspended",
}

export enum CompanyPlan {
  FREE = "free",
  STARTER = "starter",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true }) name!: string;
  @Column({ unique: true }) slug!: string; // URL-safe identifier
  @Column({ nullable: true }) logo!: string;
  @Column({ nullable: true }) email!: string;
  @Column({ nullable: true }) phone!: string;
  @Column({ nullable: true }) address!: string;
  @Column({ nullable: true }) city!: string;
  @Column({ nullable: true }) province!: string;
  @Column({ nullable: true }) country!: string;
  @Column({ nullable: true }) postalCode!: string;
  @Column({ nullable: true }) website!: string;
  @Column({ nullable: true }) taxNumber!: string;
  @Column({ type: "text", nullable: true }) description!: string;

  @Column({ type: "enum", enum: CompanyStatus, default: CompanyStatus.TRIAL })
  status!: CompanyStatus;

  @Column({ type: "enum", enum: CompanyPlan, default: CompanyPlan.FREE })
  plan!: CompanyPlan;

  @Column({ type: "int", default: 5 }) maxUsers!: number;
  @Column({ type: "int", default: 10 }) maxProjects!: number;
  @Column({ type: "int", default: 20 }) maxWorkers!: number;

  @Column({ nullable: true }) trialEndsAt!: Date;
  @Column({ nullable: true }) subscriptionEndsAt!: Date;

  @Column({ nullable: true }) ownerId!: string; // admin user of this company

  @Column({ type: "json", nullable: true })
  settings!: Record<string, any>; // company-specific config

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @OneToMany(() => User, (u) => u.company) users!: User[];
  @OneToMany(() => Client, (c) => c.company) clients!: Client[];
  @OneToMany(() => Project, (p) => p.companyRef) // ← change here
  projects!: Project[];
  @OneToMany(() => Worker, (w) => w.companyRef) workers!: Worker[];
  @OneToMany(() => Invoice, (i) => i.companyRef) invoices!: Invoice[];
  @OneToMany(() => InvoicePeriod, (ip) => ip.companyRef)
  invoicePeriods!: InvoicePeriod[];
  @OneToMany(() => RolePermission, (rp) => rp.company)
  rolePermissions!: RolePermission[];

  @BeforeInsert()
  generateSlug() {
    if (!this.slug && this.name) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
  }
}
