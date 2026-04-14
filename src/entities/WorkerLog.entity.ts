import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate,
} from "typeorm";
import { Worker } from "./Worker.entity";
import { Project } from "./Project.entity";
import { Task } from "./Task.entity";
import { User } from "./User.entity";

export enum LogType {
  REGULAR = "regular",
  OVERTIME = "overtime",
  WEEKEND = "weekend",
  HOLIDAY = "holiday",
}

export enum LogStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  INVOICED = "invoiced",
}

@Entity("worker_logs")
@Index(["workerId"])
@Index(["projectId"])
@Index(["logDate"])
@Index(["status"])
export class WorkerLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  workerId!: string;

  @Column()
  projectId!: string;

  @Column({ nullable: true })
  taskId!: string;

  @Column({ type: "date" })
  logDate!: string;

  @Column({ nullable: true, type: "time" })
  startTime!: string;

  @Column({ nullable: true, type: "time" })
  endTime!: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  hoursWorked!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  overtimeHours!: number;

  @Column({ type: "enum", enum: LogType, default: LogType.REGULAR })
  logType!: LogType;

  @Column({ type: "enum", enum: LogStatus, default: LogStatus.PENDING })
  status!: LogStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  hourlyRateSnapshot!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  overtimeRateSnapshot!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalCost!: number;

  @Column({ type: "text", nullable: true })
  description!: string;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @Column({ nullable: true })
  approvedById!: string;

  @Column({ nullable: true })
  approvedAt!: Date;

  @Column({ nullable: true })
  rejectedReason!: string;

  @Column({ nullable: true })
  invoiceId!: string;

  @Column({ nullable: true })
  createdById!: string;

  @ManyToOne(() => Worker, (worker) => worker.logs, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "workerId" })
  worker!: Worker;

  @ManyToOne(() => Project, (project) => project.workerLogs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @ManyToOne(() => Task, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "taskId" })
  task!: Task;

  @ManyToOne(() => User, (user) => user.workerLogs, { nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  calculateCost() {
    const rate = this.hourlyRateSnapshot || 0;
    const overtimeRate = this.overtimeRateSnapshot || rate * 1.5;
    const regularCost = this.hoursWorked * rate;
    const overtimeCost = (this.overtimeHours || 0) * overtimeRate;
    this.totalCost = regularCost + overtimeCost;
  }
}
