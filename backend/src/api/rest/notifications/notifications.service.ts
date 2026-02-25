import { Injectable } from '@nestjs/common';
import {
  NotificationService,
  CreateSubscriptionPayload,
  NotificationSubscription,
} from '../../../services/notification.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Subscribe user to raffle notifications
   */
  async subscribe(payload: CreateSubscriptionPayload): Promise<NotificationSubscription> {
    return this.notificationService.subscribe(payload);
  }

  /**
   * Unsubscribe user from raffle notifications
   */
  async unsubscribe(raffleId: number, userAddress: string): Promise<void> {
    return this.notificationService.unsubscribe(raffleId, userAddress);
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userAddress: string): Promise<NotificationSubscription[]> {
    return this.notificationService.getUserSubscriptions(userAddress);
  }

  /**
   * Check if user is subscribed to a raffle
   */
  async isSubscribed(raffleId: number, userAddress: string): Promise<boolean> {
    return this.notificationService.isSubscribed(raffleId, userAddress);
  }
}
