/**
 * User Story #74: Experiencia fluida y confiable sin errores técnicos
 * Task #79: Monitoring básico de salud del sistema
 * 
 * Servicio de monitoreo de salud del sistema:
 * - Health checks de componentes críticos
 * - Alertas automáticas
 * - Métricas de sistema
 */

import { getFirestore } from '../config/firebase.config';
import { logger } from '../utils/logger';
import { performanceProfiler } from './performance.service';

/**
 * Estado de salud
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Resultado de health check
 */
export interface HealthCheckResult {
  component: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Reporte completo de salud
 */
export interface HealthReport {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  checks: HealthCheckResult[];
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    slowOperations: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * Servicio de monitoreo de salud
 */
export class HealthMonitorService {
  private startTime: number = Date.now();
  private lastHealthCheck?: HealthReport;
  private alertThresholds = {
    errorRate: 0.05, // 5%
    avgResponseTime: 3000, // 3s
    p95ResponseTime: 5000, // 5s
    memoryUsagePercent: 90, // 90%
  };

  /**
   * Ejecuta todos los health checks
   */
  async checkHealth(): Promise<HealthReport> {
    const checks: HealthCheckResult[] = [];

    // Check de base de datos
    checks.push(await this.checkDatabase());

    // Check de performance
    const perfSummary = performanceProfiler.getSummary(5);
    checks.push({
      component: 'performance',
      status: this.getPerformanceStatus(perfSummary),
      latency: perfSummary.avgResponseTime,
      details: perfSummary,
      timestamp: Date.now(),
    });

    // Check de memoria
    const memoryCheck = this.checkMemory();
    checks.push(memoryCheck);

    // Determinar estado general
    const overallStatus = this.determineOverallStatus(checks);

    const report: HealthReport = {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      checks,
      performance: {
        avgResponseTime: perfSummary.avgResponseTime,
        p95ResponseTime: perfSummary.p95ResponseTime,
        errorRate: perfSummary.errorRate,
        slowOperations: perfSummary.slowOperations,
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    this.lastHealthCheck = report;

    // Generar alertas si es necesario
    this.checkAlerts(report);

    return report;
  }

  /**
   * Health check de base de datos
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Intentar leer configuración básica
      const db = getFirestore();
      const testDoc = db.collection('_health').doc('test');
      await testDoc.set({ timestamp: Date.now() }, { merge: true });
      await testDoc.get();

      const latency = Date.now() - startTime;

      return {
        component: 'database',
        status: latency < 1000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        message: `Database responsive in ${latency}ms`,
        latency,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      
      return {
        component: 'database',
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : 'Database check failed',
        latency: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Health check de memoria
   */
  private checkMemory(): HealthCheckResult {
    const usage = process.memoryUsage();
    const totalHeap = usage.heapTotal;
    const usedHeap = usage.heapUsed;
    const percentUsed = (usedHeap / totalHeap) * 100;

    let status: HealthStatus;
    if (percentUsed < 70) {
      status = HealthStatus.HEALTHY;
    } else if (percentUsed < 90) {
      status = HealthStatus.DEGRADED;
    } else {
      status = HealthStatus.UNHEALTHY;
    }

    return {
      component: 'memory',
      status,
      message: `Heap usage: ${percentUsed.toFixed(1)}%`,
      details: {
        heapUsed: usedHeap,
        heapTotal: totalHeap,
        percentUsed: percentUsed.toFixed(2),
        rss: usage.rss,
        external: usage.external,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Determina estado de performance
   */
  private getPerformanceStatus(perfSummary: ReturnType<typeof performanceProfiler.getSummary>): HealthStatus {
    if (perfSummary.errorRate > 0.1) {
      return HealthStatus.UNHEALTHY;
    }
    
    if (perfSummary.avgResponseTime > 5000 || perfSummary.errorRate > 0.05) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Determina estado general del sistema
   */
  private determineOverallStatus(checks: HealthCheckResult[]): HealthStatus {
    const hasUnhealthy = checks.some(c => c.status === HealthStatus.UNHEALTHY);
    const hasDegraded = checks.some(c => c.status === HealthStatus.DEGRADED);

    if (hasUnhealthy) {
      return HealthStatus.UNHEALTHY;
    }
    
    if (hasDegraded) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Verifica si se deben generar alertas
   */
  private checkAlerts(report: HealthReport): void {
    const alerts: string[] = [];

    // Alert por error rate alto
    if (report.performance.errorRate > this.alertThresholds.errorRate) {
      alerts.push(
        `High error rate: ${(report.performance.errorRate * 100).toFixed(2)}% ` +
        `(threshold: ${this.alertThresholds.errorRate * 100}%)`
      );
    }

    // Alert por response time alto
    if (report.performance.avgResponseTime > this.alertThresholds.avgResponseTime) {
      alerts.push(
        `High average response time: ${report.performance.avgResponseTime.toFixed(0)}ms ` +
        `(threshold: ${this.alertThresholds.avgResponseTime}ms)`
      );
    }

    if (report.performance.p95ResponseTime > this.alertThresholds.p95ResponseTime) {
      alerts.push(
        `High P95 response time: ${report.performance.p95ResponseTime.toFixed(0)}ms ` +
        `(threshold: ${this.alertThresholds.p95ResponseTime}ms)`
      );
    }

    // Alert por memoria alta
    const memoryCheck = report.checks.find(c => c.component === 'memory');
    if (memoryCheck?.status === HealthStatus.UNHEALTHY) {
      alerts.push(`Critical memory usage: ${memoryCheck.message}`);
    }

    // Alert por componentes unhealthy
    const unhealthyComponents = report.checks
      .filter(c => c.status === HealthStatus.UNHEALTHY)
      .map(c => c.component);

    if (unhealthyComponents.length > 0) {
      alerts.push(`Unhealthy components: ${unhealthyComponents.join(', ')}`);
    }

    // Log alerts
    if (alerts.length > 0) {
      logger.warn('Health alerts detected', {
        alerts,
        status: report.status,
        timestamp: report.timestamp,
      });
    }
  }

  /**
   * Obtiene último reporte de salud
   */
  getLastHealthCheck(): HealthReport | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Obtiene uptime del sistema
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Obtiene estadísticas de sistema
   */
  getSystemStats(): {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  } {
    return {
      uptime: this.getUptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }

  /**
   * Configura umbrales de alerta
   */
  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = {
      ...this.alertThresholds,
      ...thresholds,
    };

    logger.info('Alert thresholds updated', { thresholds: this.alertThresholds });
  }

  /**
   * Reset del sistema
   */
  reset(): void {
    this.startTime = Date.now();
    this.lastHealthCheck = undefined;
    logger.info('Health monitor reset');
  }
}

/**
 * Instancia singleton del health monitor
 */
export const healthMonitor = new HealthMonitorService();
