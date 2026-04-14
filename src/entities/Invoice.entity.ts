import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, BeforeInsert,
} from "typeorm";
import { Client } from "./Client.entity";
import { Project } from "./Project.entity";
import { User } from "./User.entity";
import { InvoiceItem } from "./InvoiceItem.entity";
import { Payment } from "./Payment.entity";

export enum InvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  VIEWED = "viewed",
  PARTIALLY_PAID = "partially_paid",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum InvoiceType {
  STANDARD = "standard",
  WORKER_LOG = "worker_log",
  MIXED = "mixed",
}

@Entity("invoices")
@Index(["clientId", "projectId"])
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ type: "enum", enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: "enum", enum: InvoiceType, default: InvoiceType.STANDARD })
  invoiceType: InvoiceType;

  @Column({ type: "date" })
  issueDate: string;

  @Column({ type: "date" })
  dueDate: string;

  @Column({ nullable: true, type: "date" })
  paidDate: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  amountDue: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "text", nullable: true })
  terms: string;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  reminderSentAt: Date;

  @Column()
  clientId: string;

  @Column()
  projectId: string;

  @Column()
  createdById: string;

  @ManyToOne(() => Client, (client) => client.invoices, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "clientId" })
  client: Client;

  @ManyToOne(() => Project, (project) => project.invoices, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "projectId" })
  project: Project;

  @ManyToOne(() => User, (user) => user.invoices)
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];

  @BeforeInsert()
  async generateInvoiceNumber() {
    if (!this.invoiceNumber) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const random = Math.floor(Math.random() * 9000) + 1000;
      this.invoiceNumber = `INV-${year}${month}-${random}`;
    }
  }

  recalculate() {
    this.subtotal = this.items?.reduce((sum, item) => sum + Number(item.total), 0) ?? 0;
    this.taxAmount = (this.subtotal * Number(this.taxRate)) / 100;
    this.totalAmount = this.subtotal + this.taxAmount - Number(this.discount);
    this.amountDue = this.totalAmount - Number(this.amountPaid);
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
