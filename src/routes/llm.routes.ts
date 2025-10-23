import { Router } from 'express';
import { LLMController } from '../controllers/llm.controller';

const router: Router = Router();

/**
 * Rutas para gestión de proveedores LLM
 */

// GET /api/llm/providers - Listar proveedores disponibles
router.get('/providers', LLMController.listProviders);

// GET /api/llm/provider/current - Obtener proveedor actual
router.get('/provider/current', LLMController.getCurrentProvider);

// POST /api/llm/test - Probar un proveedor específico
router.post('/test', LLMController.testProvider);

export default router;
