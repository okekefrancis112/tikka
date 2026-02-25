import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raffle } from '../entities/raffle.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Raffle)
    private readonly raffleRepository: Repository<Raffle>,
  ) {}

  async search(query: string): Promise<Raffle[]> {
    const formattedQuery = query
      .trim()
      .split(/\s+/)
      .map(term => `${term}:*`)
      .join(' & ');

    // We use a simpler query first to ensure it works
    return await this.raffleRepository
      .createQueryBuilder('raffle')
      .where(
        `to_tsvector('english', coalesce(raffle.title, '') || ' ' || coalesce(raffle.description, '')) @@ to_tsquery('english', :q)`,
        { q: formattedQuery }
      )
      .getMany();
  }
}