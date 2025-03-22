import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class Invoice extends BaseEntity {

  @ManyToOne(() => User, (user) => user.invoices, { onDelete: "CASCADE" })
  user: User;

  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date" })
  endDate: Date;

  @Column({ type: "float", default: 0 })
  totalHours: number;

  @Column({ type: "float", default: 0 })
  totalEarnings: number;

  @Column({
    type: "enum",
    enum: ["PENDING", "PAID", "CANCELLED"],
    default: "PENDING",
  })
  status: "PENDING" | "PAID" | "CANCELLED";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
