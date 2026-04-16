import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate,
} from "typeorm";
import { Worker } from "./Worker.entity";

@Entity("invoice_periods")
@Index(["workerId"])
@Index(["startDate"])
export class InvoicePeriod {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() workerId!: string;
  @Column({ type: "date" }) startDate!: string;
  @Column({ type: "date" }) endDate!: string;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) regularHours!: number;
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) overtimeHours!: number;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) hourlyRate!: number;
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 }) overtimeRate!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) totalPay!: number;
  @Column({ type: "text", nullable: true }) notes!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @ManyToOne(() => Worker, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "workerId" }) worker!: Worker;

  @BeforeInsert()
  @BeforeUpdate()
  computeTotalPay() {
    const reg = Number(this.regularHours) * Number(this.hourlyRate);
    const ot = Number(this.overtimeHours) * (Number(this.overtimeRate) || Number(this.hourlyRate) * 1.5);
    this.totalPay = reg + ot;
  }
}
