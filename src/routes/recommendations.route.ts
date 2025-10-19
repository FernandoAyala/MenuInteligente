/**
 * Router para el sistema de recomendaciones inteligentes
 * Epic #34: Motor de Recomendaciones
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationParams, UserPreferences } from '../interfaces/recommendation.interface';
import { SpicyLevel } from '../models/menuItem.model';

const router = Router();
const recommendationService = new RecommendationService();

// =============================================================================
// VALIDACIÓN CON ZOD
// =============================================================================

const UserPreferencesSchema = z.object({
  spicyLevel: z.nativeEnum(SpicyLevel).optional(),
  mealType: z.array(z.string()).optional(),
  favoriteIngredients: z.array(z.string()).optional(),
  dislikedIngredients: z.array(z.string()).optional(),
  preferredCategories: z.array(z.string()).optional(),
  previousOrders: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
});

const RecommendationRequestSchema = z.object({
  allergies: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).default([]),
  budget: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
    currency: z.string().optional(),
  }).optional(),
  preferences: UserPreferencesSchema.default({}),
  context: z.object({
    stage: z.enum(['initial', 'exploring', 'deciding', 'ordering']).optional(),
    emotionalState: z.string().optional(),
    mentionedDishes: z.array(z.string()).optional(),
    primaryIntent: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
  }).optional(),
  maxRecommendations: z.number().int().min(1).max(10).optional(),
});

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * POST /api/recommendations
 * 
 * Genera recomendaciones inteligentes de platos basadas en:
 * - Alergias del usuario (filtrado CRÍTICO)
 * - Restricciones dietarias
 * - Presupuesto
 * - Preferencias personales
 * - Contexto conversacional
 * 
 * @example
 * POST /api/recommendations
 * {
 *   "allergies": ["shellfish"],
 *   "dietaryRestrictions": ["vegetarian"],
 *   "budget": { "min": 1000, "max": 2500 },
 *   "preferences": {
 *     "mealType": ["main_course"],
 *     "favoriteIngredients": ["pasta", "tomato"]
 *   }
 * }
 * 
 * @returns Array de 2-3 recomendaciones con scores y justificaciones
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar request body con Zod
    const validatedData = RecommendationRequestSchema.parse(req.body);

    // Construir parámetros de recomendación
    const params: RecommendationParams = {
      allergies: validatedData.allergies,
      dietaryRestrictions: validatedData.dietaryRestrictions,
      budget: validatedData.budget,
      preferences: validatedData.preferences as UserPreferences,
      context: validatedData.context as any, // Cast para evitar conflictos de tipos opcionales
      maxRecommendations: validatedData.maxRecommendations,
    };

    // Generar recomendaciones
    const recommendations = await recommendationService.generateRecommendations(params);

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      meta: {
        timestamp: new Date().toISOString(),
        safetyFiltersApplied: {
          allergies: params.allergies.length > 0,
          dietaryRestrictions: params.dietaryRestrictions.length > 0,
          budget: !!params.budget,
        },
      },
    });
  } catch (error) {
    // Error de validación
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    // Error del servicio (ej: no hay platos disponibles)
    if (error instanceof Error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Error desconocido
    console.error('Unknown error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/recommendations/health
 * 
 * Health check del servicio de recomendaciones
 * Verifica que el servicio esté operativo y conectado a Firestore
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Intentar generar recomendaciones mínimas para verificar conectividad
    const testParams: RecommendationParams = {
      allergies: [],
      dietaryRestrictions: [],
      preferences: {},
      maxRecommendations: 1,
    };

    await recommendationService.generateRecommendations(testParams);

    res.status(200).json({
      success: true,
      service: 'RecommendationService',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'RecommendationService',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
