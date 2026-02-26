import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CacheService } from "../cache/cache.service";
import {
  RaffleEntity,
  RaffleStatus,
} from "../database/entities/raffle.entity";
import { RaffleEventEntity } from "../database/entities/raffle-event.entity";

@Injectable()
export class RaffleProcessor {
  private readonly logger = new Logger(RaffleProcessor.name);

  constructor(
    private dataSource: DataSource,
    private cacheService: CacheService,
  ) {}

  async handleRaffleCreated(
    raffleId: number,
    creator: string,
    params: {
      ticketPrice: string;
      asset: string;
      maxTickets: number;
      endTime: string;
      metadataCid?: string | null;
    },
    ledger: number,
    txHash: string,
  ) {
    this.logger.log(`Handling RaffleCreated for ${raffleId}`);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(RaffleEventEntity)
        .values({
          raffleId,
          eventType: "RaffleCreated",
          ledger,
          txHash,
          payloadJson: {
            raffle_id: raffleId,
            creator,
            params,
          },
        })
        .orIgnore()
        .execute();

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(RaffleEntity)
        .values({
          id: raffleId,
          creator,
          status: RaffleStatus.OPEN,
          ticketPrice: params.ticketPrice,
          asset: params.asset,
          maxTickets: params.maxTickets,
          endTime: params.endTime,
          createdLedger: ledger,
          finalizedLedger: null,
          metadataCid: params.metadataCid ?? null,
        })
        .orIgnore()
        .execute();

      await queryRunner.commitTransaction();
      await this.cacheService.invalidateActiveRaffles();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error processing RaffleCreated for txHash ${txHash}`,
        error as any,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async handleRaffleFinalized(
    raffleId: number,
    winner: string,
    winningTicketId: number,
    prizeAmount: string,
    ledger: number,
    txHash: string,
  ) {
    this.logger.log(`Handling RaffleFinalized for ${raffleId}`);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(RaffleEventEntity)
        .values({
          raffleId,
          eventType: "RaffleFinalized",
          ledger,
          txHash,
          payloadJson: {
            raffle_id: raffleId,
            winner,
            winning_ticket_id: winningTicketId,
            prize_amount: prizeAmount,
          },
        })
        .orIgnore()
        .execute();

      await queryRunner.manager
        .createQueryBuilder()
        .update(RaffleEntity)
        .set({
          status: RaffleStatus.FINALIZED,
          winner,
          prizeAmount,
          finalizedLedger: ledger,
        })
        .where("id = :raffleId", { raffleId })
        .execute();

      await queryRunner.commitTransaction();
      await this.cacheService.invalidateRaffleDetail(raffleId.toString());
      await this.cacheService.invalidateLeaderboard();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error processing RaffleFinalized for txHash ${txHash}`,
        error as any,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async handleRaffleCancelled(
    raffleId: number,
    reason: string,
    ledger: number,
    txHash: string,
  ) {
    this.logger.log(`Handling RaffleCancelled for ${raffleId}`);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(RaffleEventEntity)
        .values({
          raffleId,
          eventType: "RaffleCancelled",
          ledger,
          txHash,
          payloadJson: {
            raffle_id: raffleId,
            reason,
          },
        })
        .orIgnore()
        .execute();

      await queryRunner.manager
        .createQueryBuilder()
        .update(RaffleEntity)
        .set({
          status: RaffleStatus.CANCELLED,
          finalizedLedger: ledger,
        })
        .where("id = :raffleId", { raffleId })
        .execute();

      await queryRunner.commitTransaction();
      await this.cacheService.invalidateRaffleDetail(raffleId.toString());
      await this.cacheService.invalidateActiveRaffles();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error processing RaffleCancelled for txHash ${txHash}`,
        error as any,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
