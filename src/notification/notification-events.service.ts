import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, merge, of } from 'rxjs';
import { filter, finalize, map } from 'rxjs/operators';

/** رویدادی که روی کانال SSE برای کاربر فرستاده می‌شود */
export interface NotificationStreamEvent {
  /**
   * connected: اتصال برقرار شد | notification: اعلان جدید |
   * read: یک اعلان خوانده شد | read-all: همه خوانده شدند | ping: ضربان نگه‌دارنده
   */
  type: 'connected' | 'notification' | 'read' | 'read-all' | 'ping';
  /** شناسه‌ی ردیف گیرنده (همان id که برای markRead لازم است) */
  id?: string;
  notificationId?: string;
  notificationType?: string;
  title?: string;
  body?: string;
  businessId?: string | null;
  data?: unknown;
  createdAt?: Date;
  at?: number;
}

/** فاصله‌ی ضربانِ نگه‌دارنده‌ی اتصال (میلی‌ثانیه) */
const HEARTBEAT_MS = Number(process.env.NOTIFICATION_SSE_HEARTBEAT_MS ?? 25_000);
/** سقف اتصال هم‌زمان هر کاربر (چند تب / چند دستگاه) */
const MAX_CONNECTIONS_PER_USER = Number(
  process.env.NOTIFICATION_SSE_MAX_PER_USER ?? 5,
);

/**
 * باس رویداد اعلان‌ها روی SSE.
 *
 * چرا این‌طور: کلاینت به‌جای poll کردن `notifications/me`، یک اتصال باز
 * نگه می‌دارد و هر اعلان جدید بلافاصله push می‌شود. باس **درون‌پروسه‌ای**
 * است (یک Subject)، پس فقط تا وقتی درست کار می‌کند که برنامه یک instance
 * باشد — همان محدودیتی که worker پیامک هم دارد.
 *
 * برای اینکه پخش گروهی بی‌خود هزینه ندهد، `filterConnected` می‌گوید کدام
 * کاربرها همین حالا آنلاین‌اند تا فقط برای همان‌ها ردیف گیرنده خوانده شود.
 */
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);
  private readonly stream = new Subject<{
    userId: string;
    payload: NotificationStreamEvent;
  }>();
  /** userId → تعداد اتصال باز */
  private readonly connections = new Map<string, number>();

  /** کانال SSE یک کاربر؛ با قطع اتصال، خودش پاک‌سازی می‌شود */
  streamFor(userId: string): Observable<MessageEvent> {
    if ((this.connections.get(userId) ?? 0) >= MAX_CONNECTIONS_PER_USER) {
      // اتصال‌های قدیمی بسته نمی‌شوند؛ فقط جلوی انباشت اتصال گرفته می‌شود
      this.logger.warn(`SSE connection limit reached for user ${userId}`);
    }
    this.addConnection(userId);

    const events$ = this.stream.asObservable().pipe(
      filter((e) => e.userId === userId),
      map((e) => this.toMessage(e.payload)),
    );

    // بعضی پروکسی‌ها اتصال بی‌ترافیک را می‌بندند؛ ping آن را زنده نگه می‌دارد
    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => this.toMessage({ type: 'ping', at: Date.now() })),
    );

    const hello$ = of(this.toMessage({ type: 'connected', at: Date.now() }));

    return merge(hello$, events$, heartbeat$).pipe(
      finalize(() => this.removeConnection(userId)),
    );
  }

  /** ارسال یک رویداد به کاربر — اگر آنلاین نباشد بی‌اثر است */
  emit(userId: string, payload: NotificationStreamEvent) {
    this.stream.next({ userId, payload });
  }

  /** کدام‌یک از این کاربرها همین حالا اتصال باز دارند */
  filterConnected(userIds: string[]): string[] {
    return userIds.filter((id) => this.connections.has(id));
  }

  /** تعداد اتصال‌های باز — برای پایش */
  get connectionCount(): number {
    let total = 0;
    for (const count of this.connections.values()) total += count;
    return total;
  }

  private toMessage(payload: NotificationStreamEvent): MessageEvent {
    return { data: payload, type: payload.type };
  }

  private addConnection(userId: string) {
    this.connections.set(userId, (this.connections.get(userId) ?? 0) + 1);
  }

  private removeConnection(userId: string) {
    const next = (this.connections.get(userId) ?? 1) - 1;
    if (next <= 0) this.connections.delete(userId);
    else this.connections.set(userId, next);
  }
}
