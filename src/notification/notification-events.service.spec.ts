import { MessageEvent } from '@nestjs/common';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter, take, toArray } from 'rxjs/operators';
import {
  NotificationEventsService,
  NotificationStreamEvent,
} from './notification-events.service';

describe('NotificationEventsService', () => {
  let service: NotificationEventsService;
  const subscriptions: Subscription[] = [];

  beforeEach(() => {
    service = new NotificationEventsService();
  });

  afterEach(() => {
    subscriptions.splice(0).forEach((s) => s.unsubscribe());
  });

  const payload = (data: MessageEvent) => data.data as NotificationStreamEvent;

  it('اولین رویداد هر اتصال connected است', async () => {
    const first = await firstValueFrom(service.streamFor('user-1'));
    expect(payload(first).type).toBe('connected');
  });

  it('رویداد فقط به کاربر خودش می‌رسد', async () => {
    // بدون connected، دو رویداد بعدی کاربر ۱ را جمع می‌کنیم
    const received = firstValueFrom(
      service.streamFor('user-1').pipe(
        filter((e) => payload(e).type !== 'connected'),
        take(2),
        toArray(),
      ),
    );
    // اتصال کاربر ۲ باز است ولی نباید رویداد کاربر ۱ را بگیرد
    const other: NotificationStreamEvent[] = [];
    subscriptions.push(
      service.streamFor('user-2').subscribe((e) => other.push(payload(e))),
    );

    service.emit('user-1', { type: 'notification', id: 'r1' });
    service.emit('user-2', { type: 'notification', id: 'r2' });
    service.emit('user-1', { type: 'read', id: 'r1' });

    const events = (await received).map(payload);
    expect(events.map((e) => e.type)).toEqual(['notification', 'read']);
    expect(events[0].id).toBe('r1');
    // کاربر ۲ فقط connected و رویداد خودش را دیده است
    expect(other.map((e) => e.id)).toEqual([undefined, 'r2']);
  });

  it('filterConnected فقط کاربران آنلاین را برمی‌گرداند و با قطع اتصال پاک می‌شود', () => {
    const sub = service.streamFor('user-1').subscribe();
    expect(service.filterConnected(['user-1', 'user-2'])).toEqual(['user-1']);
    expect(service.connectionCount).toBe(1);

    sub.unsubscribe();
    expect(service.filterConnected(['user-1', 'user-2'])).toEqual([]);
    expect(service.connectionCount).toBe(0);
  });

  it('چند تبِ یک کاربر همگی رویداد را می‌گیرند', () => {
    const tab1: NotificationStreamEvent[] = [];
    const tab2: NotificationStreamEvent[] = [];
    subscriptions.push(
      service.streamFor('user-1').subscribe((e) => tab1.push(payload(e))),
      service.streamFor('user-1').subscribe((e) => tab2.push(payload(e))),
    );

    service.emit('user-1', { type: 'read-all' });

    expect(service.connectionCount).toBe(2);
    expect(tab1.at(-1)?.type).toBe('read-all');
    expect(tab2.at(-1)?.type).toBe('read-all');
  });
});
