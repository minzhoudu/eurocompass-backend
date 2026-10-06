import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../user-role';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'email_address' })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'last_login' })
  lastLogin: string;

  @Column({ type: 'text', default: 'admin' })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Left out of normal reads on purpose: only the admin-management list asks
  // for it, so a database that does not have the column yet keeps working.
  @Column({
    name: 'last_active_at',
    type: 'timestamptz',
    nullable: true,
    select: false,
  })
  lastActiveAt: Date | null;

  // Login tokens issued before this moment are rejected.
  @Column({ name: 'tokens_valid_after', type: 'timestamptz', nullable: true })
  tokensValidAfter: Date | null;
}
