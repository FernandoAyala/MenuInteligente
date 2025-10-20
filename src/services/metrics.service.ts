/**
 * Epic #60: API Conversacional y Orquestación
 * Task #71: Servicio de Métricas
 * 
 * Servicio para recolectar y analizar métricas del sistema:
 * - Contadores de requests (total, exitosos, fallidos, cacheados)
 * - Latencias con percentiles (p50, p95, p99)
 * - Métricas por minuto (requests/min, cache hit rate)
 * - Métricas del sistema (memoria, CPU)
 * 
 * Las métricas se almacenan en memoria y pueden ser exportadas
 * para monitoreo externo (Prometheus, Grafana, etc.)
 */

import { logger } from '../utils/logger';
import {
  SystemMetrics,
  LatencyStats,
  MetricEvent
} from '../interfaces/chat.interface';

/**
 * Tipo de métrica
 */
export enum MetricType {
  REQUEST = 'request',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  LLM_CALL = 'llm_call',
  DB_QUERY = 'db_query',
  ERROR = 'error'
}

/**
 * Configuración del servicio de métricas
 */
interface MetricsConfig {
  enabled: boolean;
  maxLatencyRecords: number;  // Máximo de latencias a guardar para cálculo de percentiles
  aggregationWindow: number;   // Ventana de agregación en milisegundos (1 min por defecto)
}

/**
 * Registro de latencia
 */
interface LatencyRecord {
  timestamp: number;
  duration: number;
  type: MetricType;
  metadata?: Record<string, unknown>;
}

/**
 * Contadores de métricas
 */
interface MetricCounters {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedResponses: number;
  llmCalls: number;
  dbQueries: number;
  errors: Record<string, number>;  // Errores por tipo
}

/**
 * Servicio de métricas del sistema
 */
export class MetricsService {
  private config: MetricsConfig;
  private counters: MetricCounters;
  private latencies: LatencyRecord[];
  private windowStart: number;
  private requestsInWindow: number;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxLatencyRecords: config.maxLatencyRecords ?? 1000,
      aggregationWindow: config.aggregationWindow ?? 60000 // 1 minuto
    };

    this.counters = this.initCounters();
    this.latencies = [];
    this.windowStart = Date.now();
    this.requestsInWindow = 0;

    logger.info('MetricsService initialized', {
      enabled: this.config.enabled,
      maxLatencyRecords: this.config.maxLatencyRecords,
      aggregationWindow: this.config.aggregationWindow
    });
  }

  /**
   * Inicializa los contadores
   */
  private initCounters(): MetricCounters {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      llmCalls: 0,
      dbQueries: 0,
      errors: {}
    };
  }

  /**
   * Registra un request
   */
  public recordRequest(success: boolean, cached = false): void {
    if (!this.config.enabled) return;

    this.counters.totalRequests++;
    this.requestsInWindow++;

    if (success) {
      this.counters.successfulRequests++;
    } else {
      this.counters.failedRequests++;
    }

    if (cached) {
      this.counters.cachedResponses++;
    }
  }

  /**
   * Registra una llamada al LLM
   */
  public recordLLMCall(): void {
    if (!this.config.enabled) return;
    this.counters.llmCalls++;
  }

  /**
   * Registra una consulta a BD
   */
  public recordDBQuery(): void {
    if (!this.config.enabled) return;
    this.counters.dbQueries++;
  }

  /**
   * Registra un error por tipo
   */
  public recordError(errorType: string): void {
    if (!this.config.enabled) return;

    this.counters.errors[errorType] = (this.counters.errors[errorType] || 0) + 1;
    
    logger.warn('Error recorded in metrics', {
      errorType,
      count: this.counters.errors[errorType]
    });
  }

  /**
   * Registra una latencia
   */
  public recordLatency(
    type: MetricType,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return;

    const record: LatencyRecord = {
      timestamp: Date.now(),
      duration,
      type,
      metadata
    };

    this.latencies.push(record);

    // Limitar el tamaño del array de latencias
    if (this.latencies.length > this.config.maxLatencyRecords) {
      // Remover el 20% más antiguo
      const removeCount = Math.floor(this.config.maxLatencyRecords * 0.2);
      this.latencies.splice(0, removeCount);
    }

    logger.debug('Latency recorded', {
      type,
      duration,
      metadata
    });
  }

  /**
   * Calcula las estadísticas de latencia
   */
  public getLatencyStats(type?: MetricType): LatencyStats {
    const relevantLatencies = type
      ? this.latencies.filter(l => l.type === type)
      : this.latencies;

    if (relevantLatencies.length === 0) {
      return {
        count: 0,
        total: 0,
        mean: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const durations = relevantLatencies.map(l => l.duration).sort((a, b) => a - b);
    const count = durations.length;
    const total = durations.reduce((sum, d) => sum + d, 0);
    const mean = total / count;

    return {
      count,
      total,
      mean,
      min: durations[0],
      max: durations[count - 1],
      p50: this.calculatePercentile(durations, 0.5),
      p95: this.calculatePercentile(durations, 0.95),
      p99: this.calculatePercentile(durations, 0.99)
    };
  }

  /**
   * Calcula un percentil de un array ordenado
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Calcula el cache hit rate
   */
  public getCacheHitRate(): number {
    if (this.counters.totalRequests === 0) return 0;
    return this.counters.cachedResponses / this.counters.totalRequests;
  }

  /**
   * Calcula requests por minuto
   */
  public getRequestsPerMinute(): number {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;
    
    if (windowElapsed === 0) return 0;
    
    // Si ha pasado la ventana de agregación, resetear
    if (windowElapsed > this.config.aggregationWindow) {
      this.windowStart = now;
      const rpm = this.requestsInWindow / (windowElapsed / 60000);
      this.requestsInWindow = 0;
      return rpm;
    }
    
    return this.requestsInWindow / (windowElapsed / 60000);
  }

  /**
   * Obtiene las métricas completas del sistema
   */
  public getSystemMetrics(): SystemMetrics {
    const endpointLatency = this.getLatencyStats(MetricType.REQUEST);
    const llmLatency = this.getLatencyStats(MetricType.LLM_CALL);
    const dbLatency = this.getLatencyStats(MetricType.DB_QUERY);
    
    return {
      totalRequests: this.counters.totalRequests,
      successfulRequests: this.counters.successfulRequests,
      failedRequests: this.counters.failedRequests,
      cachedResponses: this.counters.cachedResponses,
      cacheHitRate: this.getCacheHitRate(),
      requestsPerMinute: this.getRequestsPerMinute(),
      errorsPerMinute: this.calculateErrorsPerMinute(),
      endpointLatency,
      llmProcessingTime: llmLatency,
      dbQueryTime: dbLatency,
      cacheSize: 0, // Se actualizará desde CacheService
      activeSessions: 0, // Se actualizará desde SessionService
      lastUpdated: new Date()
    };
  }

  /**
   * Calcula errores por minuto
   */
  private calculateErrorsPerMinute(): number {
    const totalErrors = Object.values(this.counters.errors)
      .reduce((sum, count) => sum + count, 0);
    
    const now = Date.now();
    const windowElapsed = now - this.windowStart;
    
    if (windowElapsed === 0) return 0;
    
    return totalErrors / (windowElapsed / 60000);
  }

  /**
   * Obtiene un resumen de métricas para logging
   */
  public getMetricsSummary(): Record<string, unknown> {
    const metrics = this.getSystemMetrics();
    const memoryUsage = process.memoryUsage();
    
    return {
      requests: {
        total: metrics.totalRequests,
        successful: metrics.successfulRequests,
        failed: metrics.failedRequests,
        cached: metrics.cachedResponses,
        cacheHitRate: (metrics.cacheHitRate * 100).toFixed(2) + '%',
        rpm: metrics.requestsPerMinute.toFixed(2)
      },
      latency: {
        mean: metrics.endpointLatency.mean.toFixed(2) + 'ms',
        p50: metrics.endpointLatency.p50.toFixed(2) + 'ms',
        p95: metrics.endpointLatency.p95.toFixed(2) + 'ms',
        p99: metrics.endpointLatency.p99.toFixed(2) + 'ms'
      },
      system: {
        memory: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
        uptime: process.uptime().toFixed(0) + 's'
      },
      errors: this.counters.errors
    };
  }

  /**
   * Resetea todas las métricas
   */
  public reset(): void {
    this.counters = this.initCounters();
    this.latencies = [];
    this.windowStart = Date.now();
    this.requestsInWindow = 0;
    
    logger.info('Metrics reset');
  }

  /**
   * Crea un evento de métrica para logging
   */
  public createMetricEvent(
    name: string,
    value: number,
    unit?: string,
    tags?: Record<string, string>
  ): MetricEvent {
    return {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };
  }

  /**
   * Helper para medir el tiempo de ejecución de una función
   */
  public async measureAsync<T>(
    type: MetricType,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordLatency(type, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordLatency(type, duration, {
        ...metadata,
        error: true
      });
      throw error;
    }
  }

  /**
   * Helper para medir el tiempo de ejecución de una función síncrona
   */
  public measure<T>(
    type: MetricType,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const start = Date.now();
    
    try {
      const result = fn();
      const duration = Date.now() - start;
      this.recordLatency(type, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordLatency(type, duration, {
        ...metadata,
        error: true
      });
      throw error;
    }
  }

  /**
   * Exporta métricas en formato Prometheus (para futuro)
   */
  public exportPrometheus(): string {
    const metrics = this.getSystemMetrics();
    const memoryUsage = process.memoryUsage();
    const lines: string[] = [];

    // Formato Prometheus básico
    lines.push(`# TYPE chat_requests_total counter`);
    lines.push(`chat_requests_total ${metrics.totalRequests}`);
    
    lines.push(`# TYPE chat_requests_successful counter`);
    lines.push(`chat_requests_successful ${metrics.successfulRequests}`);
    
    lines.push(`# TYPE chat_requests_failed counter`);
    lines.push(`chat_requests_failed ${metrics.failedRequests}`);
    
    lines.push(`# TYPE chat_cache_hit_rate gauge`);
    lines.push(`chat_cache_hit_rate ${metrics.cacheHitRate}`);
    
    lines.push(`# TYPE chat_latency_p95 gauge`);
    lines.push(`chat_latency_p95 ${metrics.endpointLatency.p95}`);
    
    lines.push(`# TYPE chat_latency_p99 gauge`);
    lines.push(`chat_latency_p99 ${metrics.endpointLatency.p99}`);
    
    lines.push(`# TYPE chat_memory_usage_mb gauge`);
    lines.push(`chat_memory_usage_mb ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}`);

    return lines.join('\n');
  }
}

/**
 * Instancia singleton del servicio de métricas
 */
export const metricsService = new MetricsService();
