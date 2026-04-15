import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from "typeorm";
import { Client } from "./Client.entity";
import { Task } from "./Task.entity";
import { Invoice } from "./Invoice.entity";
import { WorkerLog } from "./WorkerLog.entity";

export enum ProjectStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ProjectPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

@Entity("projects")
@Index(["clientId"])
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string;

  @Column({ type: "enum", enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status!: ProjectStatus;

  @Column({ type: "enum", enum: ProjectPriority, default: ProjectPriority.MEDIUM })
  priority!: ProjectPriority;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  budgetAmount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  spentAmount!: number;

  @Column({ nullable: true })
  startDate!: Date;

  @Column({ nullable: true })
  expectedEndDate!: Date;

  @Column({ nullable: true })
  actualEndDate!: Date;

  @Column({ type: "int", default: 0 })
  progress!: number;

  @Column({ type: "text", nullable: true })
  address!: string;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @Column()
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.projects, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @OneToMany(() => Task, (task) => task.project)
  tasks!: Task[];

  @OneToMany(() => Invoice, (invoice) => invoice.project)
  invoices!: Invoice[];

  @OneToMany(() => WorkerLog, (log) => log.project)
  workerLogs!: WorkerLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
