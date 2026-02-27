/**
 * Real-time Video Monitoring — Metrics + Alerts
 *
 * Batch POST every 30s or on unmount.
 * Alerts: buffering > 2s, first frame > 1s, errors > 0.
 */
import api from '../api/client';

export interface VideoMetric {
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

const BUFFERING_ALERT_MS = 2000;
const FIRST_FRAME_ALERT_MS = 1000;

const metrics: VideoMetric[] = [];
const alerts: { type: string; postId: string; value?: number }[] = [];
const FLUSH_INTERVAL_MS = 30_000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => flushMetrics(), FLUSH_INTERVAL_MS);
}

function clearFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function onBufferingStart(postId: string): void {
  metrics.push({ postId, bufferingStart: Date.now() });
  ensureFlushTimer();
}

export function onBufferingEnd(postId: string): void {
  const m = metrics.find(
    (x) => x.postId === postId && x.bufferingStart && !x.bufferingEnd
  );
  if (m) {
    m.bufferingEnd = Date.now();
    m.bufferingDurationMs = m.bufferingEnd - (m.bufferingStart ?? 0);
    if (m.bufferingDurationMs > BUFFERING_ALERT_MS) {
      alerts.push({ type: 'buffering', postId, value: m.bufferingDurationMs });
    }
  }
  ensureFlushTimer();
}

export function onFirstFrame(postId: string, loadStartedAt?: number): void {
  const m = metrics.find((x) => x.postId === postId);
  const now = Date.now();
  const latency = loadStartedAt ? now - loadStartedAt : undefined;

  if (m) {
    m.firstFrameAt = now;
    m.firstFrameLatencyMs = latency;
  } else {
    metrics.push({ postId, firstFrameAt: now, firstFrameLatencyMs: latency });
  }

  if (latency != null && latency > FIRST_FRAME_ALERT_MS) {
    alerts.push({ type: 'first_frame', postId, value: latency });
  }
  ensureFlushTimer();
}

export function onError(postId: string, error: string): void {
  const m = metrics.find((x) => x.postId === postId);
  if (m) {
    m.error = error;
    m.errorAt = Date.now();
  } else {
    metrics.push({ postId, error, errorAt: Date.now() });
  }
  alerts.push({ type: 'error', postId });
  ensureFlushTimer();
}

export function onScrollToPlay(postId: string, scrollTimestamp: number): void {
  const m = metrics.find((x) => x.postId === postId);
  const now = Date.now();
  const latency = now - scrollTimestamp;
  if (m) {
    m.scrollToPlayLatencyMs = latency;
  } else {
    metrics.push({ postId, scrollToPlayLatencyMs: latency });
  }
  ensureFlushTimer();
}

export async function flushMetrics(): Promise<void> {
  if (metrics.length === 0 && alerts.length === 0) return;

  const toSendMetrics = [...metrics];
  const toSendAlerts = [...alerts];
  metrics.length = 0;
  alerts.length = 0;
  clearFlushTimer();

  try {
    await api.post('/analytics/video-metrics', {
      metrics: toSendMetrics,
      alerts: toSendAlerts,
    });
  } catch (e) {
    if (__DEV__) console.warn('[Monitoring] flush failed:', e);
  }
}
