import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, OneToMany } from "typeorm";
import { WorkerLog } from "./WorkerLog.entity";

export enum WorkerStatus { ACTIVE = "active", INACTIVE = "inactive", ON_LEAVE = "on_leave" }
export enum WorkerRole {
  WORKER = "worker", FOREMAN = "foreman", SUPERVISOR = "supervisor",
  ENGINEER = "engineer", MANAGER = "manager", SUBCONTRACTOR = "subcontractor",
}

@Entity("workers")
export class Worker {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() firstName!: string;
  @Column() lastName!: string;
  @Column({ unique: true }) email!: string;
  @Column({ nullable: true }) phone!: string;
  @Column({ type: "enum", enum: WorkerRole, default: WorkerRole.WORKER }) role!: WorkerRole;
  @Column({ type: "enum", enum: WorkerStatus, default: WorkerStatus.ACTIVE }) status!: WorkerStatus;
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true }) hourlyRate!: number;
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true }) overtimeRate!: number;
  @Column({ nullable: true }) emergencyContact!: string;
  @Column({ nullable: true }) emergencyPhone!: string;
  @Column({ type: "text", nullable: true }) notes!: string;
  @Column({ nullable: true }) hiredAt!: Date;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @OneToMany(() => WorkerLog, (l) => l.worker) logs!: WorkerLog[];

  get fullName(): string { return `${this.firstName} ${this.lastName}`; }
}
