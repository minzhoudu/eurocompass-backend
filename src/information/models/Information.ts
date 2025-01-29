import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Information {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'regular_price' })
  regularPrice: string;

  @Column({ name: 'roundtrip_price' })
  roundtripPrice: string;

  @Column({ name: 'important_info', type: 'varchar', array: true })
  importantInfo: string[];

  @Column({ name: 'starting_times_krusevac', type: 'varchar', array: true })
  startingTimesKrusevac: string[];

  @Column({ name: 'starting_times_beograd', type: 'varchar', array: true })
  startingTimesBeograd: string[];

  @Column({ name: 'saturday_beograd', type: 'varchar', array: true })
  saturdayBeograd: string[];
}
