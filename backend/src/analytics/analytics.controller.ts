import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Video metrics for monitoring (buffering, first frame, errors) */
interface VideoMetric {
  postId: string;
  bufferingStart?: number;
  bufferingEnd?: number;
  bufferingDurationMs?: number;
  firstFrameAt?: number;
  firstFrameLatencyMs?: number;
  error?: string;
  errorAt?: number;
  scrollToPlayLatencyMs?: number;
}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  @Post('video-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  recordVideoMetrics(
    @Body() body: { metrics?: VideoMetric[]; alerts?: { type: string; postId: string; value?: number }[] },
  ) {
    const { metrics, alerts } = body ?? {};
    if (process.env.NODE_ENV !== 'production') {
      if (Array.isArray(metrics) && metrics.length > 0) {
        console.log('[Analytics] video-metrics:', metrics.length, 'events');
      }
      if (Array.isArray(alerts) && alerts.length > 0) {
        console.log('[Analytics] alerts:', alerts);
      }
    }
    return { ok: true };
  }
}
