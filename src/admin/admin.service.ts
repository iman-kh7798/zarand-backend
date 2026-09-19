import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      businessesTotal,
      businessesPending,
      businessesApproved,
      businessesRejected,
      reviewsPending,
      feedbackTotal,
      feedbackUnread,
      reportsTotal,
      reportsUnread,
      reportsPending,
      usersTotal,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({ where: { status: 'PENDING' } }),
      this.prisma.business.count({ where: { status: 'APPROVED' } }),
      this.prisma.business.count({ where: { status: 'REJECTED' } }),
      this.prisma.businessReview.count({ where: { status: 'PENDING' } }),
      this.prisma.feedback.count(),
      this.prisma.feedback.count({ where: { isRead: false } }),
      this.prisma.businessReport.count(),
      this.prisma.businessReport.count({ where: { isRead: false } }),
      this.prisma.businessReport.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count(),
    ]);

    return {
      businesses: {
        total: businessesTotal,
        pending: businessesPending,
        approved: businessesApproved,
        rejected: businessesRejected,
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
