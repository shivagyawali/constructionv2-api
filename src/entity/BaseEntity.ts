import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  BaseEntity as TypeORMBaseEntity,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";

export abstract class BaseEntity extends TypeORMBaseEntity {
  constructor() {
    super();
    this.id = uuidv4();
  }

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ type: "timestamp", nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", nullable: true })
  updatedAt: Date;
}
