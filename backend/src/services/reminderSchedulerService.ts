import { ReminderService, ReminderEvaluationReport } from './reminderService';

export interface SchedulerStatus {
  isRunning: boolean;
  intervalMinutes: number;
  lastRunTimestamp: string | null;
  lastRunReport: ReminderEvaluationReport | null;
  nextRunTimestamp: string | null;
  totalRunsCount: number;
  lastError: string | null;
}

export class ReminderSchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static intervalMinutes = 60; // Standard 1-hour scan frequency
  private static lastRunTimestamp: string | null = null;
  private static nextRunTimestamp: string | null = null;
  private static lastRunReport: ReminderEvaluationReport | null = null;
  private static totalRunsCount = 0;
  private static lastError: string | null = null;

  /**
   * Start the automated background reminder scheduler
   */
  public static start(intervalMinutes = 60) {
    if (this.isRunning) {
      console.log('⏰ [ReminderScheduler] Background scheduler is already running.');
      return;
    }

    this.intervalMinutes = intervalMinutes;
    this.isRunning = true;
    console.log(`⏰ [ReminderScheduler] Starting automated invoice reminder background scheduler (Interval: ${intervalMinutes}m)`);

    // 1. Immediate catch-up run on server boot (ensures zero lost reminders after restart)
    this.executeScan('SERVER_BOOT_CATCHUP').catch((err) => {
      console.warn('⚠️ [ReminderScheduler] Startup catch-up scan error:', err.message);
    });

    // 2. Periodic background interval
    const intervalMs = this.intervalMinutes * 60 * 1000;
    this.updateNextRun();

    this.timer = setInterval(() => {
      this.executeScan('SCHEDULED_INTERVAL').catch((err) => {
        console.warn('⚠️ [ReminderScheduler] Scheduled interval scan error:', err.message);
      });
    }, intervalMs);

    // Ensure timer doesn't keep Node process alive during exit
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  /**
   * Stop background scheduler
   */
  public static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.nextRunTimestamp = null;
    console.log('⏰ [ReminderScheduler] Background scheduler stopped.');
  }

  /**
   * Execute an automated scan now (on-demand or via scheduler)
   */
  public static async executeScan(triggerReason = 'MANUAL_TRIGGER', referenceDate?: Date): Promise<ReminderEvaluationReport> {
    const startedAt = new Date().toISOString();
    try {
      this.lastError = null;
      console.log(`🔍 [ReminderScheduler] Running invoice reminder scan [Trigger: ${triggerReason}]...`);
      const report = await ReminderService.evaluateAndGenerateReminders(referenceDate);

      this.lastRunTimestamp = startedAt;
      this.lastRunReport = report;
      this.totalRunsCount++;
      this.updateNextRun();

      console.log(
        `✅ [ReminderScheduler] Scan complete: ${report.generatedRemindersCount} generated, ${report.skippedDueToDeduplication} deduplicated, ${report.skippedDueToSettlement} settled/skipped.`
      );
      return report;
    } catch (err: any) {
      this.lastError = err.message || 'Unknown scan error';
      console.error('❌ [ReminderScheduler] Scan failed:', this.lastError);
      throw err;
    }
  }

  /**
   * Get current scheduler telemetry & health
   */
  public static getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      lastRunTimestamp: this.lastRunTimestamp,
      lastRunReport: this.lastRunReport,
      nextRunTimestamp: this.nextRunTimestamp,
      totalRunsCount: this.totalRunsCount,
      lastError: this.lastError,
    };
  }

  private static updateNextRun() {
    if (!this.isRunning) {
      this.nextRunTimestamp = null;
      return;
    }
    const next = new Date(Date.now() + this.intervalMinutes * 60 * 1000);
    this.nextRunTimestamp = next.toISOString();
  }
}
