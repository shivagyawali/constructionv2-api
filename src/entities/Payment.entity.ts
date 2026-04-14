import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from "typeorm";
import { Invoice } from "./Invoice.entity";

export enum PaymentMethod {
  CASH = "cash",
  CHEQUE = "cheque",
  BANK_TRANSFER = "bank_transfer",
  CREDIT_CARD = "credit_card",
  E_TRANSFER = "e_transfer",
  OTHER = "other",
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  invoiceId: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "enum", enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
  method: PaymentMethod;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "date" })
  paidAt: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invoiceId" })
  invoice: Invoice;

  @CreateDateColumn()
  createdAt: Date;
}
