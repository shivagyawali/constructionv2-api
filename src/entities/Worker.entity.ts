import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToMany, OneToMany, ManyToOne, JoinColumn, Index,
} from "typeorm";
import { WorkerLog } from "./WorkerLog.entity";
import { Company } from "./Company.entity";

export enum WorkerStatus {
  ACTIVE   = "active",
  INACTIVE = "inactive",
  ON_LEAVE = "on_leave",
}

export enum WorkerRole {
  WORKER       = "worker",
  FOREMAN      = "foreman",
  SUPERVISOR   = "supervisor",
  ENGINEER     = "engineer",
  MANAGER      = "manager",
  SUBCONTRACTOR = "subcontractor",
}

@Entity("workers")
@Index(["companyId"])
export class Worker {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() companyId!: string;
  @Column() firstName!: string;
  @Column() lastName!: string;
  @Column() email!: string;
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

  @ManyToOne(() => Company, (c) => c.workers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  companyRef!: Company;

  @OneToMany(() => WorkerLog, (l) => l.worker) logs!: WorkerLog[];

  get fullName(): string { return `${this.firstName} ${this.lastName}`; }
}
