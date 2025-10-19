/**
 * Interfaces para el Motor de Recomendaciones Inteligente
 * Epic #34: Motor de Recomendaciones
 * US #35 y #36: Filtrado de seguridad y sugerencias relevantes
 */

import { SpicyLevel } from '../models/menuItem.model';

/**
 * Parámetros de entrada para generar recomendaciones
 */
export interface RecommendationParams {
  /** Alergias declaradas del cliente (CRÍTICO para seguridad) */
  allergies: string[];
  
  /** Restricciones dietarias (vegano, vegetariano, sin gluten, etc) */
  dietaryRestrictions: string[];
  
  /** Rango de presupuesto opcional */
  budget?: {
    min: number;
    max: number;
    currency?: string;
  };
  
  /** Preferencias del usuario */
  preferences: UserPreferences;
  
  /** Contexto conversacional opcional */
  context?: ConversationContext;
  
  /** Limitar número máximo de recomendaciones (default: 3) */
  maxRecommendations?: number;
}

/**
 * Preferencias del usuario para personalización
 */
export interface UserPreferences {
  /** Nivel de picante preferido */
  spicyLevel?: SpicyLevel;
  
  /** Tipo de comida preferida (entrada, principal, postre, bebida) */
  mealType?: string[];
  
  /** Ingredientes favoritos */
  favoriteIngredients?: string[];
  
  /** Ingredientes a evitar (no alergias, solo preferencias) */
  dislikedIngredients?: string[];
  
  /** Preferencia de categorías */
  preferredCategories?: string[];
  
  /** Historial de pedidos previos */
  previousOrders?: string[];
  
  /** Preferencias adicionales en texto libre */
  additionalNotes?: string;
}

/**
 * Contexto de la conversación actual
 */
export interface ConversationContext {
  /** Etapa de la conversación */
  stage: 'initial' | 'exploring' | 'deciding' | 'ordering';
  
  /** Estado emocional detectado */
  emotionalState?: string;
  
  /** Platos ya mencionados en la conversación */
  mentionedDishes?: string[];
  
  /** Intención principal del usuario */
  primaryIntent?: string;
  
  /** Urgencia de la decisión */
  urgency?: 'low' | 'medium' | 'high';
}

/**
 * Recomendación completa de un plato
 */
export interface Recommendation {
  /** Plato recomendado */
  dish: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    spicyLevel?: SpicyLevel;
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    allergens: string[];
    available: boolean;
  };
  
  /** Score total de relevancia (0-100) */
  score: number;
  
  /** Desglose detallado del score */
  scoreBreakdown: ScoreBreakdown;
  
  /** Justificación personalizada del por qué se recomienda */
  justification: string;
  
  /** Verificaciones de seguridad realizadas */
  safetyChecks: SafetyCheck[];
  
  /** Razones de match con preferencias */
  matchReasons: string[];
  
  /** Posición en el ranking (1, 2, 3) */
  rank: number;
}

/**
 * Desglose detallado del score de una recomendación
 */
export interface ScoreBreakdown {
  /** Score de seguridad alimentaria (100 si seguro, 0 si no) */
  safety: number;
  
  /** Score de match con restricciones dietarias (0-100) */
  dietaryMatch: number;
  
  /** Score de ajuste al presupuesto (0-100) */
  budgetFit: number;
  
  /** Score de match con preferencias declaradas (0-100) */
  preferencesMatch: number;
  
  /** Score semántico del LLM (0-100) */
  semanticScore: number;
  
  /** Score de disponibilidad (100 si disponible, 0 si no) */
  availability: number;
  
  /** Score total ponderado (0-100) */
  total: number;
  
  /** Pesos aplicados a cada componente */
  weights: {
    safety: number;
    dietaryMatch: number;
    budgetFit: number;
    preferencesMatch: number;
    semanticScore: number;
    availability: number;
  };
}

/**
 * Verificación de seguridad alimentaria
 */
export interface SafetyCheck {
  /** Tipo de verificación */
  type: 'allergen' | 'dietary_restriction' | 'availability';
  
  /** Resultado de la verificación */
  passed: boolean;
  
  /** Detalles de la verificación */
  details: string;
  
  /** Nivel de criticidad (para alergias) */
  severity?: 'critical' | 'high' | 'medium' | 'low';
  
  /** Timestamp de la verificación */
  checkedAt: Date;
}

/**
 * Resultado del filtrado de seguridad
 */
export interface SafetyFilterResult {
  /** Platos que pasaron el filtro de seguridad */
  safeDishes: any[];
  
  /** Platos rechazados por seguridad */
  rejected: RejectedDish[];
  
  /** Estadísticas del filtrado */
  stats: {
    total: number;
    safe: number;
    rejected: number;
    rejectionReasons: Record<string, number>;
  };
}

/**
 * Plato rechazado por filtro de seguridad
 */
export interface RejectedDish {
  /** ID del plato */
  dishId: string;
  
  /** Nombre del plato */
  dishName: string;
  
  /** Razón principal del rechazo */
  reason: 'allergen' | 'dietary_restriction' | 'unavailable';
  
  /** Detalles específicos */
  details: string[];
  
  /** Alérgenos conflictivos (si aplica) */
  conflictingAllergens?: string[];
  
  /** Restricciones conflictivas (si aplica) */
  conflictingRestrictions?: string[];
}

/**
 * Log de auditoría de recomendaciones
 */
export interface RecommendationLog {
  /** ID único del log */
  id: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Tipo de evento */
  eventType: 'filtering' | 'scoring' | 'ranking' | 'final_recommendations';
  
  /** Parámetros de entrada */
  inputParams: RecommendationParams;
  
  /** Resultado del filtrado de seguridad */
  safetyFilter?: SafetyFilterResult;
  
  /** Platos con scores */
  scoredDishes?: Array<{
    dishId: string;
    dishName: string;
    score: number;
    scoreBreakdown: ScoreBreakdown;
  }>;
  
  /** Recomendaciones finales */
  finalRecommendations?: Recommendation[];
  
  /** Tiempo de ejecución en ms */
  executionTime: number;
  
  /** Metadata adicional */
  metadata?: Record<string, any>;
}

/**
 * Opciones de configuración del servicio de recomendaciones
 */
export interface RecommendationServiceConfig {
  /** Número máximo de recomendaciones por defecto */
  maxRecommendations: number;
  
  /** Número mínimo de recomendaciones a intentar devolver */
  minRecommendations: number;
  
  /** Habilitar scoring semántico con LLM */
  enableSemanticScoring: boolean;
  
  /** Timeout para llamadas al LLM (ms) */
  llmTimeout: number;
  
  /** Habilitar logs de auditoría */
  enableAuditLogs: boolean;
  
  /** Pesos por defecto para el scoring */
  defaultWeights: ScoreBreakdown['weights'];
  
  /** Garantizar diversidad en recomendaciones */
  ensureDiversity: boolean;
  
  /** Penalización por categorías repetidas (0-1) */
  categoryRepetitionPenalty: number;
}

/**
 * Opciones para el algoritmo de diversidad
 */
export interface DiversityOptions {
  /** Priorizar diversidad sobre relevancia */
  prioritizeDiversity: boolean;
  
  /** Máximo de platos de la misma categoría */
  maxSameCategory: number;
  
  /** Rango de precio aceptable para diversidad */
  priceVariance: 'low' | 'medium' | 'high';
  
  /** Diversificar niveles de picante */
  diversifySpicyLevels: boolean;
}

/**
 * Resultado del algoritmo de ranking
 */
export interface RankingResult {
  /** Platos rankeados y con diversidad */
  rankedDishes: any[];
  
  /** Diversidad lograda */
  diversityMetrics: {
    uniqueCategories: number;
    priceRange: { min: number; max: number };
    spicyLevels: number;
    avgScore: number;
  };
  
  /** Platos descartados por diversidad */
  discardedForDiversity: Array<{
    dish: any;
    reason: string;
  }>;
}
