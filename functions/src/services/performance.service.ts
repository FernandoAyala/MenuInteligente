/**
 * User Story #74: Experiencia fluida y confiable sin errores técnicos
 * Task #78: Optimización de performance
 * 
 * Servicio de profiling y monitoreo de performance:
 * - Medición de latencias por operación
 * - Detección de cuellos de botella
 * - Alertas automáticas si excede umbrales
 * - Métricas agregadas y percentiles
 */

import { logger } from '../utils/logger';

/**
 * Métrica de performance de una operación
 */
interface PerformanceMetric {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Estadísticas agregadas de una operación
 */
interface OperationStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number; // Mediana
  p95: number; // Percentil 95
  p99: number; // Percentil 99
  successCount: number;
  errorCount: number;
  successRate: number;
}

/**
 * Servicio de profiling de performance
 */
export class PerformanceProfiler {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number = 10000;
  private readonly performanceThresholds: Map<string, number> = new Map();

  constructor() {
    // Definir umbrales de performance (en ms)
    this.performanceThresholds.set('llm.generateResponse', 3000);
    this.performanceThresholds.set('llm.extractIntents', 2000);
    this.performanceThresholds.set('db.query', 500);
    this.performanceThresholds.set('db.write', 1000);
    this.performanceThresholds.set('chat.handleRequest', 3000);
    this.performanceThresholds.set('session.recovery', 1000);
  }

  /**
   * Inicia el tracking de una operación
   */
  startTracking(operationName: string, metadata?: Record<string, unknown>): () => void {
    const metric: PerformanceMetric = {
      operationName,
      startTime: Date.now(),
      success: true,
      metadata,
    };

    // Retornar función para finalizar tracking
    return (error?: Error) => {
      this.endTracking(metric, error);
    };
  }

  /**
   * Finaliza el tracking de una operación
   */
  private endTracking(metric: PerformanceMetric, error?: Error): void {
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    
    if (error) {
      metric.success = false;
      metric.error = error.message;
    }

    // Guardar métrica
    this.metrics.push(metric);

    // Limitar tamaño del array
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log y alertas
    this.logMetric(metric);
    this.checkThreshold(metric);
  }

  /**
   * Wrapper para funciones sync que trackea automáticamente
   */
  track<T>(operationName: string, fn: () => T, metadata?: Record<string, unknown>): T {
    const metric: PerformanceMetric = {
      operationName,
      startTime: Date.now(),
      success: true,
      metadata,
    };
    
    try {
      const result = fn();
      this.endTracking(metric);
      return result;
    } catch (error) {
      this.endTracking(metric, error as Error);
      throw error;
    }
  }

  /**
   * Wrapper para funciones async que trackea automáticamente
   */
  async trackAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const metric: PerformanceMetric = {
      operationName,
      startTime: Date.now(),
      success: true,
      metadata,
    };
    
    try {
      const result = await fn();
      this.endTracking(metric);
      return result;
    } catch (error) {
      this.endTracking(metric, error as Error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas agregadas de una operación
   */
  getOperationStats(operationName: string, lastNMinutes?: number): OperationStats | null {
    const cutoffTime = lastNMinutes 
      ? Date.now() - (lastNMinutes * 60 * 1000)
      : 0;

    const operationMetrics = this.metrics.filter(
      m => m.operationName === operationName && 
           m.startTime >= cutoffTime &&
           m.duration !== undefined
    );

    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    const successCount = operationMetrics.filter(m => m.success).length;
    const errorCount = operationMetrics.filter(m => !m.success).length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: operationMetrics.length,
      totalDuration,
      avgDuration: totalDuration / operationMetrics.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      successCount,
      errorCount,
      successRate: successCount / operationMetrics.length,
    };
  }

  /**
   * Obtiene todas las estadísticas
   */
  getAllStats(lastNMinutes?: number): Map<string, OperationStats> {
    const operationNames = new Set(this.metrics.map(m => m.operationName));
    const stats = new Map<string, OperationStats>();

    for (const name of operationNames) {
      const opStats = this.getOperationStats(name, lastNMinutes);
      if (opStats) {
        stats.set(name, opStats);
      }
    }

    return stats;
  }

  /**
   * Obtiene operaciones lentas (que exceden umbral)
   */
  getSlowOperations(lastNMinutes: number = 5): PerformanceMetric[] {
    const cutoffTime = Date.now() - (lastNMinutes * 60 * 1000);

    return this.metrics.filter(m => {
      if (!m.duration || m.startTime < cutoffTime) {
        return false;
      }

      const threshold = this.performanceThresholds.get(m.operationName);
      return threshold && m.duration > threshold;
    });
  }

  /**
   * Calcula percentil de un array ordenado
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Log de métrica
   */
  private logMetric(metric: PerformanceMetric): void {
    const logData = {
      operation: metric.operationName,
      duration: metric.duration,
      success: metric.success,
      ...metric.metadata,
    };

    if (metric.success) {
      logger.debug('Performance metric', logData);
    } else {
      logger.warn('Performance metric (failed)', {
        ...logData,
        error: metric.error,
      });
    }
  }

  /**
   * Verifica si una operación excedió su umbral
   */
  private checkThreshold(metric: PerformanceMetric): void {
    if (!metric.duration) return;

    const threshold = this.performanceThresholds.get(metric.operationName);
    if (threshold && metric.duration > threshold) {
      logger.warn('Performance threshold exceeded', {
        operation: metric.operationName,
        duration: metric.duration,
        threshold,
        exceedBy: metric.duration - threshold,
        metadata: metric.metadata,
      });
    }
  }

  /**
   * Limpia métricas antiguas
   */
  cleanup(olderThanMinutes: number = 60): number {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);
    const initialLength = this.metrics.length;

    this.metrics = this.metrics.filter(m => m.startTime >= cutoffTime);

    const removed = initialLength - this.metrics.length;
    if (removed > 0) {
      logger.info(`Cleaned ${removed} old performance metrics`);
    }

    return removed;
  }

  /**
   * Obtiene resumen de performance general
   */
  getSummary(lastNMinutes: number = 5): {
    totalOperations: number;
    slowOperations: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    topSlowOperations: Array<{name: string; avgDuration: number; count: number}>;
  } {
    const cutoffTime = Date.now() - (lastNMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.startTime >= cutoffTime);

    const durations = recentMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    const slowOps = this.getSlowOperations(lastNMinutes);
    const errorCount = recentMetrics.filter(m => !m.success).length;

    // Top operaciones lentas
    const statsByOp = this.getAllStats(lastNMinutes);
    const topSlow = Array.from(statsByOp.entries())
      .map(([name, stats]) => ({
        name,
        avgDuration: stats.avgDuration,
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      totalOperations: recentMetrics.length,
      slowOperations: slowOps.length,
      avgResponseTime: durations.length > 0 
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
        : 0,
      p95ResponseTime: this.percentile(durations, 0.95),
      errorRate: recentMetrics.length > 0 
        ? errorCount / recentMetrics.length 
        : 0,
      topSlowOperations: topSlow,
    };
  }

  /**
   * Resetea todas las métricas
   */
  reset(): void {
    this.metrics = [];
    logger.info('Performance metrics reset');
  }
}

/**
 * Instancia singleton del profiler
 */
export const performanceProfiler = new PerformanceProfiler();
