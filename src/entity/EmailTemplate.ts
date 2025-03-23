import { Column, DataSource, Entity} from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { IsString } from "class-validator";

@Entity({
  name: "email_templates",
})
export class EmailTemplate extends BaseEntity {
  @IsString()
  @Column({ nullable: false })
  subject: string;

  @IsString()
  @Column({ nullable: false })
  event: string;

  @Column("text", { nullable: false })
  htmlContent: string;
}
