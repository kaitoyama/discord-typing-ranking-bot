import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Submission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @Column('float')
  score!: number;

  @Column('float')
  speed!: number;

  @Column('float')
  accuracy!: number;

  @Column('float')
  miss!: number;

  @Column('float')
  continuousMiss!: number;

  @Column()
  channelId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
