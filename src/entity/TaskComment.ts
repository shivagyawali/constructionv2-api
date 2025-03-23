import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { Task } from "./Task";

@Entity({ name: "task_comments" })
export class TaskComment extends BaseEntity {
  @Column({ type: "text" })
  message: string; // Stores the comment text
  @ManyToOne(() => User, (user) => user.taskComments)
  @JoinColumn({ name: "userId" }) // Foreign key column
  user: User;

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" }) // Foreign key column
  task: Task;

  @ManyToOne(() => TaskComment, (comment) => comment.replies, {
    nullable: true,
  })
  @JoinColumn({ name: "parentCommentId" })
  parentComment: TaskComment | null;
  
  @OneToMany(() => TaskComment, (comment) => comment.parentComment)
  replies: TaskComment[];
}
