import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from "typeorm";
import { WorkerLog } from "./WorkerLog.entity";

export enum WorkerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ON_LEAVE = "on_leave",
}

export enum WorkerTrade {
  GENERAL = "general",
  ELECTRICIAN = "electrician",
  PLUMBER = "plumber",
  CARPENTER = "carpenter",
  MASON = "mason",
  PAINTER = "painter",
  WELDER = "welder",
  HVAC = "hvac",
  ROOFER = "roofer",
  OTHER = "other",
}

@Entity("workers")
export class Worker {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ type: "enum", enum: WorkerTrade, default: WorkerTrade.GENERAL })
  trade!: WorkerTrade;

  @Column({ type: "enum", enum: WorkerStatus, default: WorkerStatus.ACTIVE })
  status!: WorkerStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  hourlyRate!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  overtimeRate!: number;

  @Column({ nullable: true })
  emergencyContact!: string;

  @Column({ nullable: true })
  emergencyPhone!: string;

  @Column({ nullable: true })
  licenseNumber!: string;

  @Column({ nullable: true })
  licenseExpiry!: Date;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @Column({ nullable: true })
  hiredAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => WorkerLog, (log) => log.worker)
  logs!: WorkerLog[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
