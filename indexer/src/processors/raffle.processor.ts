import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { DataSource } from 'typeorm';
import { UserProcessor } from './user.processor';

@Injectable()
export class RaffleProcessor {
  private readonly logger = new Logger(RaffleProcessor.name);

  constructor(
    private dataSource: DataSource,
    private cacheService: CacheService,
    private userProcessor: UserProcessor,
  ) {}

  /**
   * Called when a RaffleCreated event is indexed.
   * Invalidates active raffles list cache.
   */
  async handleRaffleCreated(raffleId: number, creator?: string, ledger?: number) {
    this.logger.log(`Handling RaffleCreated for ${raffleId}`);
    if (creator && typeof ledger === 'number') {
      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        await this.userProcessor.handleRaffleCreated(creator, ledger, runner);
        await runner.commitTransaction();
      } catch (e) {
        await runner.rollbackTransaction();
        throw e;
      } finally {
        await runner.release();
      }
    }
    
    // Invalidate caches
    await this.cacheService.invalidateActiveRaffles();
  }

  /**
   * Called when a RaffleFinalized event is indexed.
   * Invalidates raffle detail and leaderboard.
   */
  async handleRaffleFinalized(raffleId: number, winner?: string, prizeAmount?: string) {
    this.logger.log(`Handling RaffleFinalized for ${raffleId}`);
    if (winner) {
      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        await this.userProcessor.handleRaffleFinalized(
          raffleId,
          winner,
          prizeAmount ?? '0',
          runner,
        );
        await runner.commitTransaction();
      } catch (e) {
        await runner.rollbackTransaction();
        throw e;
      } finally {
        await runner.release();
      }
    }

    // Invalidate caches
    await this.cacheService.invalidateRaffleDetail(raffleId.toString());
    await this.cacheService.invalidateLeaderboard();
  }

  /**
   * Called when a RaffleCancelled event is indexed.
   * Invalidates raffle detail and active raffles list.
   */
  async handleRaffleCancelled(raffleId: string) {
    this.logger.log(`Handling RaffleCancelled for ${raffleId}`);
    // DB write logic would go here

    // Invalidate caches
    await this.cacheService.invalidateRaffleDetail(raffleId);
    await this.cacheService.invalidateActiveRaffles();
  }
}
