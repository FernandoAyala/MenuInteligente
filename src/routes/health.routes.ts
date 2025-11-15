/**
 * User Story #74: Experiencia fluida y confiable sin errores técnicos
 * Task #79: Monitoring básico de salud del sistema
 * 
 * Rutas para health checks y métricas:
 * - GET /health - Health check básico
 * - GET /health/detailed - Reporte detallado
 * - GET /metrics - Métricas de performance
 * - GET /metrics/performance - Stats de performance
 */

import { Request, Response, Router } from 'express';
import { healthMonitor, HealthStatus } from '../services/health-monitor.service';
import { performanceProfiler } from '../services/performance.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check básico
 * GET /health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const healthReport = await healthMonitor.checkHealth();

    // Determinar código HTTP según estado
    let statusCode = 200;
    if (healthReport.status === HealthStatus.DEGRADED) {
      statusCode = 200; // Sigue funcionando
    } else if (healthReport.status === HealthStatus.UNHEALTHY) {
      statusCode = 503; // Service Unavailable
    }

    res.status(statusCode).json({
      status: healthReport.status,
      timestamp: healthReport.timestamp,
      uptime: healthReport.uptime,
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: HealthStatus.UNHEALTHY,
      error: 'Health check failed',
    });
  }
});

/**
 * Health check detallado
 * GET /health/detailed
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  try {
    const healthReport = await healthMonitor.checkHealth();

    res.json({
      status: healthReport.status,
      timestamp: healthReport.timestamp,
      uptime: healthReport.uptime,
      checks: healthReport.checks,
      performance: healthReport.performance,
      system: {
        memory: {
          heapUsed: healthReport.system.memoryUsage.heapUsed,
          heapTotal: healthReport.system.memoryUsage.heapTotal,
          rss: healthReport.system.memoryUsage.rss,
          external: healthReport.system.memoryUsage.external,
        },
        cpu: healthReport.system.cpuUsage,
      },
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error });
    res.status(500).json({
      status: HealthStatus.UNHEALTHY,
      error: 'Detailed health check failed',
    });
  }
});

/**
 * Métricas generales
 * GET /metrics
 */
router.get('/metrics', (_req: Request, res: Response) => {
  try {
    const systemStats = healthMonitor.getSystemStats();
    const perfSummary = performanceProfiler.getSummary(5);
    const lastHealth = healthMonitor.getLastHealthCheck();

    res.json({
      uptime: systemStats.uptime,
      memory: {
        heapUsed: systemStats.memory.heapUsed,
        heapTotal: systemStats.memory.heapTotal,
        heapPercent: ((systemStats.memory.heapUsed / systemStats.memory.heapTotal) * 100).toFixed(2),
        rss: systemStats.memory.rss,
      },
      cpu: systemStats.cpu,
      performance: perfSummary,
      lastHealthCheck: lastHealth ? {
        status: lastHealth.status,
        timestamp: lastHealth.timestamp,
      } : null,
    });
  } catch (error) {
    logger.error('Metrics retrieval failed', { error });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * Métricas de performance detalladas
 * GET /metrics/performance
 * 
 * Query params:
 * - minutes: Ventana de tiempo en minutos (default: 5)
 */
router.get('/metrics/performance', (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 5;

    // Validar parámetro
    if (minutes < 1 || minutes > 60) {
      res.status(400).json({
        error: 'Invalid minutes parameter (must be between 1 and 60)',
      });
      return;
    }

    const allStats = performanceProfiler.getAllStats(minutes);
    const slowOps = performanceProfiler.getSlowOperations(minutes);
    const summary = performanceProfiler.getSummary(minutes);

    // Convertir Map a objeto
    const statsObject: Record<string, unknown> = {};
    allStats.forEach((stats, operationName) => {
      statsObject[operationName] = stats;
    });

    res.json({
      timeWindow: `${minutes} minutes`,
      summary,
      operationStats: statsObject,
      slowOperations: slowOps.map(op => ({
        operation: op.operationName,
        duration: op.duration,
        timestamp: op.startTime,
        metadata: op.metadata,
      })),
    });
  } catch (error) {
    logger.error('Performance metrics retrieval failed', { error });
    res.status(500).json({ error: 'Failed to retrieve performance metrics' });
  }
});

/**
 * Obtiene operaciones lentas
 * GET /metrics/slow-operations
 * 
 * Query params:
 * - minutes: Ventana de tiempo en minutos (default: 5)
 */
router.get('/metrics/slow-operations', (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 5;

    if (minutes < 1 || minutes > 60) {
      res.status(400).json({
        error: 'Invalid minutes parameter (must be between 1 and 60)',
      });
      return;
    }

    const slowOps = performanceProfiler.getSlowOperations(minutes);

    res.json({
      timeWindow: `${minutes} minutes`,
      count: slowOps.length,
      operations: slowOps.map(op => ({
        operation: op.operationName,
        duration: op.duration,
        timestamp: op.startTime,
        success: op.success,
        error: op.error,
        metadata: op.metadata,
      })),
    });
  } catch (error) {
    logger.error('Slow operations retrieval failed', { error });
    res.status(500).json({ error: 'Failed to retrieve slow operations' });
  }
});

/**
 * Reset de métricas de performance
 * POST /metrics/reset
 * 
 * NOTA: Usar solo para testing o limpieza manual
 */
router.post('/metrics/reset', (_req: Request, res: Response) => {
  try {
    performanceProfiler.reset();
    
    logger.info('Performance metrics reset via API');
    
    res.json({
      message: 'Performance metrics reset successfully',
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Metrics reset failed', { error });
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

export default router;
