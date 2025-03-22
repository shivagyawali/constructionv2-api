import {
  Entity,
  ManyToOne,
  Column,
} from "typeorm";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";


@Entity()
export class WorkLog extends BaseEntity {
  @ManyToOne(() => User, (user) => user.workLogs, { eager: true })
  user: User;

  @Column({ type: "timestamp", nullable: true })
  startTime: Date;

  @Column({ type: "timestamp", nullable: true })
  endTime: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  earnings: number;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  startLatitude: number;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  startLongitude: number;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  endLatitude: number;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  endLongitude: number;
}
