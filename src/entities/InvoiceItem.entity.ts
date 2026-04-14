import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, BeforeInsert, BeforeUpdate,
} from "typeorm";
import { Invoice } from "./Invoice.entity";

export enum ItemType {
  SERVICE = "service",
  MATERIAL = "material",
  LABOR = "labor",
  WORKER_LOG = "worker_log",
  OTHER = "other",
}

@Entity("invoice_items")
export class InvoiceItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  description: string;

  @Column({ type: "enum", enum: ItemType, default: ItemType.SERVICE })
  itemType: ItemType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  quantity: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  workerLogId: string;

  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invoiceId" })
  invoice: Invoice;

  @BeforeInsert()
  @BeforeUpdate()
  calculateTotal() {
    this.total = Number(this.quantity) * Number(this.unitPrice);
  }
}
