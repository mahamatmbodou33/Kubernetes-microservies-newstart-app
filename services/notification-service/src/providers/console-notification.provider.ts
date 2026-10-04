import type { Logger } from '@newstart/shared-utils';
import type { Notification, NotificationProvider } from '@newstart/shared-events';

/**
 * Local NotificationProvider. "Delivers" a notification by writing a structured log
 * line to stdout. In production this seam is replaced by an email/SMS/push provider
 * (e.g. SES/SNS) without changing any business logic.
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  constructor(private readonly logger: Logger) {}

  async send(notification: Notification): Promise<void> {
    this.logger.info(
      {
        channel: 'console',
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
      },
      `Notification: ${notification.title}`,
    );
  }
}
