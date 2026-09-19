import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      businessGroups,
      reviewsPending,
      feedbackGroups,
      reportGroups,
      usersTotal,
    ] = await Promise.all([
      this.prisma.business.groupBy({ by: ['status'], _count: true }),
      this.prisma.businessReview.count({ where: { status: 'PENDING' } }),
      this.prisma.feedback.groupBy({ by: ['isRead'], _count: true }),
      this.prisma.businessReport.groupBy({
        by: ['status', 'isRead'],
        _count: true,
      }),
      this.prisma.user.count(),
    ]);

    const businessByStatus = Object.fromEntries(
      businessGroups.map((g) => [g.status, g._count]),
    );
    const feedbackUnread = feedbackGroups.find((g) => !g.isRead)?._count ?? 0;
    const feedbackTotal = feedbackGroups.reduce((sum, g) => sum + g._count, 0);

    const reportsTotal = reportGroups.reduce((sum, g) => sum + g._count, 0);
    const reportsUnread = reportGroups
      .filter((g) => !g.isRead)
      .reduce((sum, g) => sum + g._count, 0);
    const reportsPending = reportGroups
      .filter((g) => g.status === 'PENDING')
      .reduce((sum, g) => sum + g._count, 0);

    return {
      businesses: {
        total: businessGroups.reduce((sum, g) => sum + g._count, 0),
        pending: businessByStatus.PENDING ?? 0,
        approved: businessByStatus.APPROVED ?? 0,
        rejected: businessByStatus.REJECTED ?? 0,
      },
      reviews: { pending: reviewsPending },
      feedback: { total: feedbackTotal, unread: feedbackUnread },
      businessReports: {
        total: reportsTotal,
        unread: reportsUnread,
        pending: reportsPending,
      },
      users: { total: usersTotal },
    };
  }
}
