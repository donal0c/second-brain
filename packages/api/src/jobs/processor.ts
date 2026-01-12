// =============================================================================
// Background Processing Job
// =============================================================================
// Runs periodically to process new inbox items.

import { processBatch, recoverStaleProcessingItems, type ProcessResult } from "../services/processor.js";
import { hasLLMProvider } from "../llm/index.js";

// Job state
let jobTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

// Configuration
const DEFAULT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_BATCH_SIZE = 10;

export interface ProcessorJobConfig {
  intervalMs?: number;
  batchSize?: number;
  onProcessed?: (results: ProcessResult[]) => void;
  onError?: (error: Error) => void;
  logger?: {
    info: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
  };
}

/**
 * Run a single processing cycle
 */
export async function runProcessingCycle(config: ProcessorJobConfig = {}): Promise<{
  processed: number;
  results: ProcessResult[];
  error?: string;
}> {
  const logger = config.logger || console;
  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;

  if (!hasLLMProvider()) {
    logger.warn("Skipping processing cycle - LLM provider not configured");
    return { processed: 0, results: [], error: "LLM provider not configured" };
  }

  if (isRunning) {
    logger.warn("Processing cycle already in progress, skipping");
    return { processed: 0, results: [], error: "Already running" };
  }

  isRunning = true;

  try {
    // Recover any items stuck in 'processing' from previous crashes
    const recovered = await recoverStaleProcessingItems();
    if (recovered > 0) {
      logger.info("Recovered stale processing items", { recovered });
    }

    logger.info("Starting processing cycle", { batchSize });

    const { processed, results } = await processBatch(batchSize);

    logger.info("Processing cycle complete", {
      processed,
      filed: results.filter((r) => r.action === "filed").length,
      flagged: results.filter((r) => r.action === "flagged").length,
      clarify: results.filter((r) => r.action === "clarify").length,
    });

    config.onProcessed?.(results);

    return { processed, results };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error("Processing cycle failed", { error: errorObj.message });
    config.onError?.(errorObj);
    return { processed: 0, results: [], error: errorObj.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Start the background processing job
 */
export function startProcessorJob(config: ProcessorJobConfig = {}): void {
  const logger = config.logger || console;
  const intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;

  if (jobTimer) {
    logger.warn("Processor job already running");
    return;
  }

  if (!hasLLMProvider()) {
    logger.warn("Cannot start processor job - LLM provider not configured");
    return;
  }

  logger.info("Starting background processor job", { intervalMs });

  // Run immediately on start
  runProcessingCycle(config);

  // Schedule periodic runs
  jobTimer = setInterval(() => {
    runProcessingCycle(config);
  }, intervalMs);

  // Ensure timer doesn't prevent process exit
  jobTimer.unref();
}

/**
 * Stop the background processing job
 */
export function stopProcessorJob(logger?: { info: (msg: string) => void }): void {
  const log = logger || console;

  if (!jobTimer) {
    log.info("Processor job not running");
    return;
  }

  clearInterval(jobTimer);
  jobTimer = null;
  log.info("Processor job stopped");
}

/**
 * Check if the processor job is running
 */
export function isProcessorJobRunning(): boolean {
  return jobTimer !== null;
}

/**
 * Check if a processing cycle is currently in progress
 */
export function isProcessingCycleInProgress(): boolean {
  return isRunning;
}
