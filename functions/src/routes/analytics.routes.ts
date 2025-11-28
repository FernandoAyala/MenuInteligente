/**
 * Rutas para el análisis de órdenes con IA
 */

import express from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = express.Router();
const analyticsController = new AnalyticsController();

/**
 * POST /api/analytics/query
 * Procesa una consulta en lenguaje natural sobre estadísticas de órdenes
 */
router.post('/query', (req, res) => analyticsController.handleQuery(req, res));

/**
 * GET /api/analytics/export-excel
 * Exporta un reporte de análisis a Excel con las 8 preguntas sugeridas
 */
router.get('/export-excel', (req, res) => analyticsController.exportToExcel(req, res));

export default router;
