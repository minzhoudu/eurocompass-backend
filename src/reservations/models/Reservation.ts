import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ name: 'starting_location' })
  startingLocation: string;

  @Column({ name: 'travel_date', type: 'date' })
  travelDate: string;

  @Column({ name: 'travel_time' })
  travelTime: string;

  @Column({ name: 'number_of_tickets', type: 'int' })
  numberOfTickets: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
