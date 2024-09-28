import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity";

@Entity("permissions")
export class Permission extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  resource: string;

  @Column("text")
  rolePermissions: string;
}
