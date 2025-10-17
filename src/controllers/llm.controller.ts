import { Request, Response } from 'express';
import { LLMService } from '../services/llm.service';
import { LLMProviderType } from '../interfaces/llm.interface';

/**
 * Controlador para manejar endpoints relacionados con LLM y configuración
 */
export class LLMController {
  /**
   * GET /api/llm/providers
   * Lista los proveedores de LLM disponibles
   */
  static async listProviders(_req: Request, res: Response): Promise<void> {
    try {
      const availableProviders = LLMService.getAvailableProviders();
      
      res.json({
        success: true,
        data: {
          providers: availableProviders,
          count: availableProviders.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al listar proveedores',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/llm/provider/current
   * Obtiene el proveedor actualmente configurado
   */
  static async getCurrentProvider(_req: Request, res: Response): Promise<void> {
    try {
      const llmService = new LLMService();
      const currentProvider = llmService.getCurrentProvider();
      const isAvailable = llmService.isProviderAvailable();

      res.json({
        success: true,
        data: {
          provider: currentProvider,
          isAvailable,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener proveedor actual',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/llm/test
   * Prueba la conexión con un proveedor específico
   */
  static async testProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider, message } = req.body;

      if (!provider || !Object.values(LLMProviderType).includes(provider)) {
        res.status(400).json({
          success: false,
          error: 'Proveedor inválido',
          message: `Proveedores válidos: ${Object.values(LLMProviderType).join(', ')}`,
        });
        return;
      }

      const llmService = new LLMService(provider as LLMProviderType);
      const testMessage = message || '¿Estás funcionando correctamente?';

      const startTime = Date.now();
      const response = await llmService.generateConversationalResponse(
        testMessage,
        {}
      );
      const latency = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          provider: llmService.getCurrentProvider(),
          testMessage,
          response,
          latency: `${latency}ms`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al probar proveedor',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
