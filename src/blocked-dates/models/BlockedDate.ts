import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('blocked_dates')
export class BlockedDate {
  @PrimaryGeneratedColumn()
  id: number;

  // Inclusive "YYYY-MM-DD" days.
  @Column({ name: 'starts_on', type: 'date' })
  startsOn: string;

  @Column({ name: 'ends_on', type: 'date' })
  endsOn: string;

  // null = every city / every departure.
  @Column({ type: 'text', nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  time: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
