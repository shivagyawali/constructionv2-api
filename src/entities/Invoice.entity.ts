import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
  Index, BeforeInsert,
} from "typeorm";
import { Client } from "./Client.entity";
import { Project } from "./Project.entity";
import { User } from "./User.entity";
import { InvoiceItem } from "./InvoiceItem.entity";
import { Payment } from "./Payment.entity";
import { Company } from "./Company.entity";

export enum InvoiceStatus {
  DRAFT         = "draft",
  SENT          = "sent",
  VIEWED        = "viewed",
  PARTIALLY_PAID = "partially_paid",
  PAID          = "paid",
  OVERDUE       = "overdue",
  CANCELLED     = "cancelled",
}

@Entity("invoices")
@Index(["companyId"])
@Index(["clientId"])
@Index(["projectId"])
@Index(["status"])
export class Invoice {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() companyId!: string;
  @Column({ unique: true }) invoiceNumber!: string;
  @Column({ type: "enum", enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;
  @Column({ type: "date" }) issueDate!: string;
  @Column({ type: "date" }) dueDate!: string;
  @Column({ nullable: true, type: "date" }) paidDate!: string;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) subtotal!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) taxAmount!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) discount!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) totalAmount!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) amountPaid!: number;
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 }) amountDue!: number;
  @Column({ type: "text", nullable: true }) notes!: string;
  @Column({ type: "text", nullable: true }) terms!: string;
  @Column({ nullable: true }) sentAt!: Date;
  @Column() clientId!: string;
  @Column({ nullable: true }) projectId!: string;
  @Column({ nullable: true }) createdById!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @ManyToOne(() => Company, (c) => c.invoices, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  companyRef!: Company;

  @ManyToOne(() => Client, (c) => c.invoices, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "clientId" }) client!: Client;

  @ManyToOne(() => Project, (p) => p.invoices, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "projectId" }) project!: Project;

  @ManyToOne(() => User, (u) => u.invoices, { nullable: true })
  @JoinColumn({ name: "createdById" }) createdBy!: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items!: InvoiceItem[];

  @OneToMany(() => Payment, (p) => p.invoice)
  payments!: Payment[];

  @BeforeInsert()
  generateInvoiceNumber() {
    if (!this.invoiceNumber) {
      const year  = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const rand  = Math.floor(Math.random() * 90000) + 10000;
      this.invoiceNumber = `INV-${year}${month}-${rand}`;
    }
  }

  recalculate() {
    this.subtotal    = (this.items ?? []).reduce((s, item) => s + Number(item.total), 0);
    this.totalAmount = this.subtotal + Number(this.taxAmount) - Number(this.discount);
    this.amountDue   = Math.max(0, Number(this.totalAmount) - Number(this.amountPaid));
  }
}
