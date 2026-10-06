import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const NOTICE_SEVERITIES = ['info', 'warning', 'danger'] as const;

export type NoticeSeverity = (typeof NOTICE_SEVERITIES)[number];

@Entity('notices')
export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', default: 'info' })
  severity: NoticeSeverity;

  @Column({ name: 'starts_on', type: 'date', nullable: true })
  startsOn: string | null;

  @Column({ name: 'ends_on', type: 'date', nullable: true })
  endsOn: string | null;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
