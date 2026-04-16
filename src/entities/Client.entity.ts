import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Project } from "./Project.entity";
import { Invoice } from "./Invoice.entity";

@Entity("clients")
export class Client {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() firstName!: string;
  @Column() lastName!: string;
  @Column({ unique: true }) email!: string;
  @Column({ nullable: true }) phone!: string;
  @Column({ nullable: true }) company!: string;
  @Column({ nullable: true }) address!: string;
  @Column({ nullable: true }) city!: string;
  @Column({ nullable: true }) province!: string;
  @Column({ nullable: true }) postalCode!: string;
  @Column({ nullable: true }) country!: string;
  @Column({ type: "text", nullable: true }) notes!: string;
  @Column({ default: true }) isActive!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @OneToMany(() => Project, (p) => p.client) projects!: Project[];
  @OneToMany(() => Invoice, (i) => i.client) invoices!: Invoice[];

  get fullName(): string { return `${this.firstName} ${this.lastName}`; }
}
