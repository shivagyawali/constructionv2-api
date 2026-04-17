import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
  ManyToMany, JoinTable,
} from "typeorm";
import { Client } from "./Client.entity";
import { Task } from "./Task.entity";
import { Invoice } from "./Invoice.entity";
import { WorkerLog } from "./WorkerLog.entity";
import { Worker } from "./Worker.entity";
import { Company } from "./Company.entity";

export enum ProjectStatus {
  PLANNING   = "planning",
  ACTIVE     = "active",
  ON_HOLD    = "on_hold",
  COMPLETED  = "completed",
  CANCELLED  = "cancelled",
}

export enum ProjectPriority {
  LOW    = "low",
  MEDIUM = "medium",
  HIGH   = "high",
  URGENT = "urgent",
}

@Entity("projects")
@Index(["companyId"])
@Index(["clientId"])
export class Project {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() companyId!: string;
  @Column() name!: string;
  @Column({ type: "text", nullable: true }) description!: string;
  @Column({ type: "enum", enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status!: ProjectStatus;
  @Column({ type: "enum", enum: ProjectPriority, default: ProjectPriority.MEDIUM })
  priority!: ProjectPriority;
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true }) budgetAmount!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) spentAmount!: number;
  @Column({ nullable: true }) startDate!: Date;
  @Column({ nullable: true }) expectedEndDate!: Date;
  @Column({ nullable: true }) actualEndDate!: Date;
  @Column({ type: "int", default: 0 }) progress!: number;
  @Column({ type: "text", nullable: true }) address!: string;
  @Column({ nullable: true }) location!: string;
  @Column({ nullable: true }) type!: string;
  @Column({ type: "text", nullable: true }) notes!: string;
  @Column() clientId!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @ManyToOne(() => Company, (c) => c.projects, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  companyRef!: Company;

  @ManyToOne(() => Client, (c) => c.projects, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @OneToMany(() => Task, (t) => t.project) tasks!: Task[];
  @OneToMany(() => Invoice, (i) => i.project) invoices!: Invoice[];
  @OneToMany(() => WorkerLog, (l) => l.project) workerLogs!: WorkerLog[];

  @ManyToMany(() => Worker)
  @JoinTable({
    name: "project_workers",
    joinColumn: { name: "projectId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "workerId", referencedColumnName: "id" },
  })
  workers!: Worker[];
}
