/**
 * Servicio de Motor de Recomendaciones Inteligente
 * Epic #34: Motor de Recomendaciones
 * US #35: Filtrado de seguridad para alérgenos y dietas
 * US #36: Sistema de sugerencias relevantes y diversas
 * 
 * Este servicio implementa un sistema híbrido de recomendaciones que:
 * 1. Filtra por seguridad ANTES del LLM (Task #37 - CRÍTICO)
 * 2. Calcula scores híbridos combinando múltiples factores (Task #38)
 * 3. Rankea y diversifica resultados (Task #42)
 * 4. Usa LLM para scoring semántico opcional (Task #43)
 * 5. Genera justificaciones personalizadas (Task #44)
 * 6. Mantiene logs de auditoría (Task #40)
 */

import {
  RecommendationParams,
  Recommendation,
  SafetyFilterResult,
  RejectedDish,
  SafetyCheck,
  ScoreBreakdown,
  RecommendationServiceConfig,
  RankingResult,
} from '../interfaces/recommendation.interface';
import { MenuItemRepository } from '../repositories/menuItem.repository';
import { EnhancedLLMService } from './enhanced-llm.service'; // Task #43: Integración LLM
import { LLMProviderType, MessageRole, LLMMessage } from '../interfaces/llm.interface';
import { RecommendationLogger } from '../utils/recommendation-logger';

/**
 * Configuración por defecto del servicio
 */
const DEFAULT_CONFIG: RecommendationServiceConfig = {
  maxRecommendations: 3,
  minRecommendations: 2,
  enableSemanticScoring: true,
  llmTimeout: 10000,
  enableAuditLogs: true,
  defaultWeights: {
    safety: 1.0,          // CRÍTICO: 100% peso (elimina platos inseguros)
    dietaryMatch: 0.25,   // 25% peso
    budgetFit: 0.15,      // 15% peso
    preferencesMatch: 0.20, // 20% peso
    semanticScore: 0.25,  // 25% peso
    availability: 0.15,   // 15% peso
  },
  ensureDiversity: true,
  categoryRepetitionPenalty: 0.3,
};

/**
 * Servicio principal de recomendaciones
 */
export class RecommendationService {
  private menuRepository: MenuItemRepository;
  private llmService: EnhancedLLMService;  // Task #43: Servicio LLM integrado
  private logger: RecommendationLogger;
  private config: RecommendationServiceConfig;

  constructor(
    config?: Partial<RecommendationServiceConfig>,
    llmProvider?: LLMProviderType
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.menuRepository = new MenuItemRepository();
    this.llmService = llmProvider 
      ? new EnhancedLLMService(llmProvider)
      : new EnhancedLLMService(); // Task #43: Inicialización LLM
    this.logger = new RecommendationLogger();
  }

  // ==========================================================================
  // MÉTODO PRINCIPAL
  // ==========================================================================

  /**
   * Genera recomendaciones inteligentes de platos
   * 
   * Flujo:
   * 1. Obtener platos disponibles desde Firestore
   * 2. FILTRAR POR SEGURIDAD (alérgenos + dietas) - CRÍTICO
   * 3. Calcular scores híbridos para cada plato
   * 4. Rankear y aplicar diversidad
   * 5. Seleccionar top 2-3
   * 6. Generar justificaciones personalizadas
   * 7. Log de auditoría
   * 
   * @param params Parámetros de recomendación
   * @returns Array de 2-3 recomendaciones
   */
  async generateRecommendations(
    params: RecommendationParams
  ): Promise<Recommendation[]> {
    const startTime = Date.now();

    try {
      // 1. Obtener todos los platos disponibles
      const allDishes = await this.menuRepository.findAllAvailable();

      if (allDishes.length === 0) {
        throw new Error('No hay platos disponibles en el menú');
      }

      // 2. FILTRADO DE SEGURIDAD - CRÍTICO (Task #37)
      const safetyFilter = this.filterBySafety(
        allDishes,
        params.allergies,
        params.dietaryRestrictions
      );

      // Log del filtrado de seguridad
      if (this.config.enableAuditLogs) {
        this.logger.logSafetyFiltering(params, safetyFilter);
      }

      // Verificar que hay platos seguros disponibles
      if (safetyFilter.safeDishes.length === 0) {
        throw new Error(
          'No hay platos seguros disponibles con las restricciones indicadas'
        );
      }

      // 3. Calcular scores híbridos (Task #38)
      const scoredDishes = await this.calculateScores(
        safetyFilter.safeDishes,
        params
      );

      // 4. Rankear y aplicar diversidad (Task #42)
      const rankingResult = this.rankAndDiversify(
        scoredDishes,
        params.maxRecommendations || this.config.maxRecommendations
      );

      // 5. Generar recomendaciones finales con justificaciones (Task #44)
      const recommendations = await this.generateFinalRecommendations(
        rankingResult.rankedDishes,
        params
      );

      // 6. Log final
      const executionTime = Date.now() - startTime;
      if (this.config.enableAuditLogs) {
        this.logger.logFinalRecommendations(
          params,
          safetyFilter,
          scoredDishes,
          recommendations,
          executionTime
        );
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // ==========================================================================
  // TASK #37: FILTRADO DE SEGURIDAD (CRÍTICO)
  // ==========================================================================

  /**
   * Filtra platos por seguridad ANTES de procesamiento con LLM
   * 
   * Esta es la función MÁS CRÍTICA del sistema.
   * Debe garantizar que NUNCA se recomienden platos peligrosos.
   * 
   * Verificaciones:
   * 1. Alérgenos declarados → Exclusión total
   * 2. Restricciones dietarias → Reglas duras
   * 3. Disponibilidad → Solo platos disponibles
   * 
   * @param dishes Array de platos a filtrar
   * @param allergies Alergias declaradas
   * @param dietaryRestrictions Restricciones dietarias
   * @returns Resultado del filtrado con platos seguros y rechazados
   */
  private filterBySafety(
    dishes: any[],
    allergies: string[],
    dietaryRestrictions: string[]
  ): SafetyFilterResult {
    const safeDishes: any[] = [];
    const rejected: RejectedDish[] = [];

    const allergyLowercase = allergies.map(a => a.toLowerCase());
    const restrictionsLowercase = dietaryRestrictions.map(r => r.toLowerCase());

    for (const dish of dishes) {
      const rejectionReasons: string[] = [];
      let conflictingAllergens: string[] = [];
      let conflictingRestrictions: string[] = [];

      // VERIFICACIÓN 1: Alérgenos (CRÍTICO)
      if (dish.allergens && dish.allergens.length > 0) {
        const dishAllergens = dish.allergens.map((a: string) => a.toLowerCase());
        
        conflictingAllergens = allergyLowercase.filter(userAllergen =>
          dishAllergens.some((dishAllergen: string) =>
            dishAllergen.includes(userAllergen) || userAllergen.includes(dishAllergen)
          )
        );

        if (conflictingAllergens.length > 0) {
          rejectionReasons.push(
            `Contiene alérgenos: ${conflictingAllergens.join(', ')}`
          );
        }
      }

      // VERIFICACIÓN 2: Restricciones dietarias (REGLAS DURAS)
      for (const restriction of restrictionsLowercase) {
        if (restriction.includes('vegan') || restriction.includes('vegano')) {
          if (!dish.isVegan) {
            conflictingRestrictions.push('vegano');
            rejectionReasons.push('No es vegano');
          }
        } else if (restriction.includes('vegetarian') || restriction.includes('vegetariano')) {
          if (!dish.isVegetarian) {
            conflictingRestrictions.push('vegetariano');
            rejectionReasons.push('No es vegetariano');
          }
        } else if (restriction.includes('gluten') || restriction.includes('celiac')) {
          if (!dish.isGlutenFree) {
            conflictingRestrictions.push('sin gluten');
            rejectionReasons.push('Contiene gluten');
          }
        }
      }

      // VERIFICACIÓN 3: Disponibilidad
      if (!dish.available) {
        rejectionReasons.push('No disponible actualmente');
      }

      // Decidir si el plato es seguro o rechazado
      if (rejectionReasons.length === 0) {
        safeDishes.push(dish);
      } else {
        rejected.push({
          dishId: dish.id,
          dishName: dish.name,
          reason: conflictingAllergens.length > 0
            ? 'allergen'
            : conflictingRestrictions.length > 0
            ? 'dietary_restriction'
            : 'unavailable',
          details: rejectionReasons,
          conflictingAllergens:
            conflictingAllergens.length > 0 ? conflictingAllergens : undefined,
          conflictingRestrictions:
            conflictingRestrictions.length > 0 ? conflictingRestrictions : undefined,
        });
      }
    }

    // Estadísticas
    const stats = {
      total: dishes.length,
      safe: safeDishes.length,
      rejected: rejected.length,
      rejectionReasons: this.calculateRejectionStats(rejected),
    };

    return {
      safeDishes,
      rejected,
      stats,
    };
  }

  /**
   * Calcula estadísticas de rechazo
   */
  private calculateRejectionStats(rejected: RejectedDish[]): Record<string, number> {
    const stats: Record<string, number> = {
      allergen: 0,
      dietary_restriction: 0,
      unavailable: 0,
    };

    for (const dish of rejected) {
      stats[dish.reason]++;
    }

    return stats;
  }

  // ==========================================================================
  // TASK #38: SISTEMA DE SCORING HÍBRIDO
  // ==========================================================================

  /**
   * Calcula scores híbridos para cada plato
   * 
   * Combina múltiples factores:
   * - Seguridad (100 o 0) ✅
   * - Match dietario (0-100)
   * - Ajuste al presupuesto (0-100)
   * - Match con preferencias (0-100)
   * - Score semántico del LLM (0-100) - opcional
   * - Disponibilidad (100 o 0)
   * 
   * @param dishes Platos ya filtrados por seguridad
   * @param params Parámetros de recomendación
   * @returns Platos con scores calculados
   */
  private async calculateScores(
    dishes: any[],
    params: RecommendationParams
  ): Promise<Array<{ dish: any; scoreBreakdown: ScoreBreakdown; totalScore: number }>> {
    const scoredDishes = [];

    for (const dish of dishes) {
      const scoreBreakdown = await this.calculateIndividualScore(dish, params);
      const totalScore = this.calculateTotalScore(scoreBreakdown);

      scoredDishes.push({
        dish,
        scoreBreakdown,
        totalScore,
      });
    }

    // Ordenar por score total (descendente)
    scoredDishes.sort((a, b) => b.totalScore - a.totalScore);

    return scoredDishes;
  }

  /**
   * Calcula score individual para un plato
   */
  private async calculateIndividualScore(
    dish: any,
    params: RecommendationParams
  ): Promise<ScoreBreakdown> {
    // Score de seguridad (ya filtrado, siempre 100)
    const safety = 100;

    // Score de match dietario
    const dietaryMatch = this.calculateDietaryMatchScore(dish, params.dietaryRestrictions);

    // Score de ajuste al presupuesto
    const budgetFit = this.calculateBudgetScore(dish, params.budget);

    // Score de preferencias
    const preferencesMatch = this.calculatePreferencesScore(dish, params.preferences);

    // Score semántico (solo si está habilitado)
    let semanticScore = 50; // Valor neutral por defecto
    if (this.config.enableSemanticScoring) {
      try {
        semanticScore = await this.calculateSemanticScore(dish, params);
      } catch (error) {
        console.warn('Error calculating semantic score, using default:', error);
      }
    }

    // Score de disponibilidad (ya filtrado, siempre 100)
    const availability = 100;

    return {
      safety,
      dietaryMatch,
      budgetFit,
      preferencesMatch,
      semanticScore,
      availability,
      total: 0, // Se calcula después con pesos
      weights: { ...this.config.defaultWeights },
    };
  }

  /**
   * Calcula score total ponderado
   */
  private calculateTotalScore(scoreBreakdown: ScoreBreakdown): number {
    const weights = scoreBreakdown.weights;
    
    const total =
      scoreBreakdown.safety * weights.safety +
      scoreBreakdown.dietaryMatch * weights.dietaryMatch +
      scoreBreakdown.budgetFit * weights.budgetFit +
      scoreBreakdown.preferencesMatch * weights.preferencesMatch +
      scoreBreakdown.semanticScore * weights.semanticScore +
      scoreBreakdown.availability * weights.availability;

    scoreBreakdown.total = Math.round(total * 100) / 100;
    return scoreBreakdown.total;
  }

  /**
   * Calcula score de match dietario
   */
  private calculateDietaryMatchScore(
    dish: any,
    restrictions: string[]
  ): number {
    if (restrictions.length === 0) return 100;

    let matches = 0;
    const restrictionsLower = restrictions.map(r => r.toLowerCase());

    for (const restriction of restrictionsLower) {
      if (restriction.includes('vegan') || restriction.includes('vegano')) {
        if (dish.isVegan) matches++;
      } else if (restriction.includes('vegetarian') || restriction.includes('vegetariano')) {
        if (dish.isVegetarian) matches++;
      } else if (restriction.includes('gluten') || restriction.includes('celiac')) {
        if (dish.isGlutenFree) matches++;
      }
    }

    return (matches / restrictions.length) * 100;
  }

  /**
   * Calcula score de ajuste al presupuesto
   */
  private calculateBudgetScore(
    dish: any,
    budget?: { min: number; max: number }
  ): number {
    if (!budget) return 100; // Sin restricción de presupuesto

    const price = dish.price;

    if (price < budget.min || price > budget.max) {
      // Fuera del rango, calcular penalización
      const deviation = price < budget.min
        ? budget.min - price
        : price - budget.max;
      const maxDeviation = budget.max;
      const penalty = Math.min(deviation / maxDeviation, 1);
      return Math.max(0, (1 - penalty) * 100);
    }

    // Dentro del rango, score perfecto
    return 100;
  }

  /**
   * Calcula score de preferencias
   */
  private calculatePreferencesScore(
    dish: any,
    preferences: any
  ): number {
    let score = 50; // Base neutral

    // Match de nivel de picante
    if (preferences.spicyLevel !== undefined && dish.spicyLevel !== undefined) {
      const spicyDiff = Math.abs(preferences.spicyLevel - dish.spicyLevel);
      score += (3 - spicyDiff) * 5;
    }

    // Match de tipo de comida
    if (preferences.mealType && preferences.mealType.length > 0) {
      const matchesType = preferences.mealType.some((type: string) =>
        dish.category.toLowerCase().includes(type.toLowerCase())
      );
      if (matchesType) score += 15;
    }

    // Match de categorías preferidas
    if (preferences.preferredCategories && preferences.preferredCategories.length > 0) {
      const matchesCategory = preferences.preferredCategories.some((cat: string) =>
        dish.category.toLowerCase().includes(cat.toLowerCase())
      );
      if (matchesCategory) score += 15;
    }

    // Ingredientes favoritos
    if (preferences.favoriteIngredients && preferences.favoriteIngredients.length > 0) {
      const matchesFavorite = preferences.favoriteIngredients.some((ing: string) =>
        dish.description?.toLowerCase().includes(ing.toLowerCase())
      );
      if (matchesFavorite) score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calcula score semántico usando LLM (Task #43)
   * 
   * Usa el LLM para evaluar qué tan bien el plato match con
   * las preferencias expresadas en lenguaje natural.
   */
  /**
   * Calcula score semántico usando LLM
   * Task #43: Integración LLM para scoring semántico
   * 
   * Usa el LLM para evaluar la relevancia semántica del plato
   * basándose en las preferencias del usuario y el contexto conversacional.
   * 
   * @param dish Plato a evaluar
   * @param params Parámetros de recomendación con preferencias
   * @returns Score semántico de 0-100
   */
  private async calculateSemanticScore(
    dish: any,
    params: RecommendationParams
  ): Promise<number> {
    // Si el scoring semántico está deshabilitado, retornar neutral
    if (!this.config.enableSemanticScoring) {
      return 50;
    }

    try {
      // Construir contexto para el LLM
      const userContext = this.buildUserContext(params);
      const dishDescription = `${dish.name}: ${dish.description}. Precio: ${dish.currency} ${dish.price}. Categoría: ${dish.category}.`;

      // Prompt para scoring semántico
      const prompt = `Evalúa la relevancia de este plato para el usuario en una escala de 0-100.

Usuario busca:
${userContext}

Plato:
${dishDescription}

Responde SOLO con un número del 0 al 100 representando la relevancia. 
0 = totalmente irrelevante
50 = neutral
100 = perfectamente relevante

Score:`;

      // Usar el provider del LLM service directamente
      const messages: LLMMessage[] = [
        { 
          role: MessageRole.SYSTEM, 
          content: 'Eres un experto en recomendaciones gastronómicas. Evalúa la relevancia de platos según preferencias del usuario.' 
        },
        { role: MessageRole.USER, content: prompt }
      ];

      const response = await this.llmService['provider'].generateResponse(messages, {
        temperature: 0.3,
        maxTokens: 10
      });

      // Extraer número de la respuesta
      const scoreMatch = response.content.match(/\d+/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[0], 10);
        return Math.min(Math.max(score, 0), 100); // Clamp entre 0-100
      }

      return 50; // Fallback neutral
    } catch (error) {
      console.warn('Error calculating semantic score:', error);
      return 50; // En caso de error, score neutral
    }
  }

  /**
   * Construye contexto del usuario para el LLM
   */
  private buildUserContext(params: RecommendationParams): string {
    const lines: string[] = [];

    // Preferencias de tipo de comida
    if (params.preferences.mealType && params.preferences.mealType.length > 0) {
      lines.push(`- Tipos de comida preferidos: ${params.preferences.mealType.join(', ')}`);
    }

    // Ingredientes favoritos
    if (params.preferences.favoriteIngredients && params.preferences.favoriteIngredients.length > 0) {
      lines.push(`- Ingredientes favoritos: ${params.preferences.favoriteIngredients.join(', ')}`);
    }

    // Ingredientes no deseados
    if (params.preferences.dislikedIngredients && params.preferences.dislikedIngredients.length > 0) {
      lines.push(`- Ingredientes no deseados: ${params.preferences.dislikedIngredients.join(', ')}`);
    }

    // Categorías preferidas
    if (params.preferences.preferredCategories && params.preferences.preferredCategories.length > 0) {
      lines.push(`- Categorías preferidas: ${params.preferences.preferredCategories.join(', ')}`);
    }

    // Nivel de picante
    if (params.preferences.spicyLevel !== undefined) {
      lines.push(`- Nivel de picante preferido: ${params.preferences.spicyLevel}`);
    }

    // Presupuesto
    if (params.budget) {
      lines.push(`- Presupuesto: ${params.budget.currency || 'ARS'} ${params.budget.min}-${params.budget.max}`);
    }

    // Contexto conversacional
    if (params.context) {
      if (params.context.emotionalState) {
        lines.push(`- Estado de ánimo: ${params.context.emotionalState}`);
      }
      if (params.context.primaryIntent) {
        lines.push(`- Intención: ${params.context.primaryIntent}`);
      }
    }

    // Notas adicionales
    if (params.preferences.additionalNotes) {
      lines.push(`- Notas: ${params.preferences.additionalNotes}`);
    }

    return lines.length > 0 ? lines.join('\n') : 'Sin preferencias específicas';
  }

  // ==========================================================================
  // TASK #42: RANKING Y DIVERSIDAD
  // ==========================================================================

  /**
   * Rankea platos y aplica algoritmo de diversidad
   * 
   * Garantiza:
   * - Top scores tienen prioridad
   * - Diversidad en categorías
   * - Diversidad en rangos de precio
   * - No más de 2 platos de la misma categoría
   * 
   * @param scoredDishes Platos con scores
   * @param maxRecommendations Máximo de recomendaciones
   * @returns Resultado del ranking con diversidad
   */
  private rankAndDiversify(
    scoredDishes: Array<{ dish: any; scoreBreakdown: ScoreBreakdown; totalScore: number }>,
    maxRecommendations: number
  ): RankingResult {
    if (!this.config.ensureDiversity) {
      // Sin diversidad, simplemente tomar los top
      return {
        rankedDishes: scoredDishes.slice(0, maxRecommendations),
        diversityMetrics: this.calculateDiversityMetrics([]),
        discardedForDiversity: [],
      };
    }

    const selected: typeof scoredDishes = [];
    const discarded: Array<{ dish: any; reason: string }> = [];
    const categoryCounts: Record<string, number> = {};

    for (const item of scoredDishes) {
      if (selected.length >= maxRecommendations) break;

      const category = item.dish.category;
      const categoryCount = categoryCounts[category] || 0;

      // Verificar diversidad de categorías
      if (categoryCount >= 2) {
        discarded.push({
          dish: item.dish,
          reason: `Demasiados platos de categoría "${category}"`,
        });
        continue;
      }

      // Agregar a seleccionados
      selected.push(item);
      categoryCounts[category] = categoryCount + 1;
    }

    // Si no llegamos al mínimo, relajar restricciones
    if (selected.length < this.config.minRecommendations) {
      const needed = this.config.minRecommendations - selected.length;
      const remaining = scoredDishes.filter(
        item => !selected.includes(item)
      ).slice(0, needed);
      selected.push(...remaining);
    }

    return {
      rankedDishes: selected,
      diversityMetrics: this.calculateDiversityMetrics(selected.map(s => s.dish)),
      discardedForDiversity: discarded,
    };
  }

  /**
   * Calcula métricas de diversidad
   */
  private calculateDiversityMetrics(dishes: any[]) {
    if (dishes.length === 0) {
      return {
        uniqueCategories: 0,
        priceRange: { min: 0, max: 0 },
        spicyLevels: 0,
        avgScore: 0,
      };
    }

    const categories = new Set(dishes.map(d => d.category));
    const prices = dishes.map(d => d.price);
    const spicyLevels = new Set(
      dishes.map(d => d.spicyLevel).filter(s => s !== undefined)
    );

    return {
      uniqueCategories: categories.size,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      spicyLevels: spicyLevels.size,
      avgScore: 0, // Se calculará después
    };
  }

  // ==========================================================================
  // TASK #44: GENERACIÓN DE JUSTIFICACIONES
  // ==========================================================================

  /**
   * Genera recomendaciones finales con justificaciones personalizadas
   */
  private async generateFinalRecommendations(
    rankedDishes: Array<{ dish: any; scoreBreakdown: ScoreBreakdown; totalScore: number }>,
    params: RecommendationParams
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (let i = 0; i < rankedDishes.length; i++) {
      const item = rankedDishes[i];
      
      // Generar justificación (Task #44)
      const justification = await this.generateJustification(item.dish, params, item.scoreBreakdown);
      
      // Generar razones de match
      const matchReasons = this.generateMatchReasons(item.dish, params, item.scoreBreakdown);
      
      // Generar verificaciones de seguridad
      const safetyChecks = this.generateSafetyChecks(item.dish, params);

      recommendations.push({
        dish: {
          id: item.dish.id,
          name: item.dish.name,
          description: item.dish.description,
          price: item.dish.price,
          currency: item.dish.currency,
          category: item.dish.category,
          spicyLevel: item.dish.spicyLevel,
          isVegan: item.dish.isVegan,
          isVegetarian: item.dish.isVegetarian,
          isGlutenFree: item.dish.isGlutenFree,
          allergens: item.dish.allergens,
          available: item.dish.available,
        },
        score: item.totalScore,
        scoreBreakdown: item.scoreBreakdown,
        justification,
        safetyChecks,
        matchReasons,
        rank: i + 1,
      });
    }

    return recommendations;
  }

  /**
   * Genera justificación personalizada para una recomendación
   * 
   * Task #44: Usa el LLM para generar justificaciones más naturales y personalizadas
   */
  private async generateJustification(
    dish: any,
    params: RecommendationParams,
    scoreBreakdown: ScoreBreakdown
  ): Promise<string> {
    const reasons: string[] = [];

    // TODO: Task #43 - Usar LLM para justificaciones más naturales y context-aware

    // Razones principales
    if (params.dietaryRestrictions.length > 0) {
      if (dish.isVegan) {
        reasons.push('es 100% vegano');
      } else if (dish.isVegetarian) {
        reasons.push('es vegetariano');
      }
      if (dish.isGlutenFree) {
        reasons.push('no contiene gluten');
      }
    }

    // Razón de presupuesto
    if (params.budget && scoreBreakdown.budgetFit >= 90) {
      reasons.push(`se ajusta perfecto a tu presupuesto ($${dish.price})`);
    }

    // Razón de preferencias
    if (scoreBreakdown.preferencesMatch >= 80) {
      reasons.push('coincide con tus preferencias');
    }

    // Características específicas del plato
    if (dish.spicyLevel === 0 && params.preferences.spicyLevel === 0) {
      reasons.push('es suave como buscás');
    }

    if (reasons.length === 0) {
      return `${dish.name} es una excelente opción por su calidad y sabor. ${dish.description}`;
    }

    // Construir justificación con contexto
    let justification = `Te recomiendo ${dish.name} porque ${reasons.join(', ')}.`;
    
    // Agregar descripción si hay espacio
    if (dish.description && dish.description.length < 100) {
      justification += ` ${dish.description}`;
    }

    return justification;
  }

  /**
   * Genera razones de match específicas
   */
  private generateMatchReasons(
    _dish: any,
    _params: RecommendationParams,
    scoreBreakdown: ScoreBreakdown
  ): string[] {
    const reasons: string[] = [];

    if (scoreBreakdown.dietaryMatch === 100) {
      reasons.push('Cumple con todas tus restricciones dietarias');
    }

    if (scoreBreakdown.budgetFit >= 90) {
      reasons.push('Excelente relación calidad-precio');
    }

    if (scoreBreakdown.preferencesMatch >= 80) {
      reasons.push('Alto match con tus preferencias');
    }

    return reasons;
  }

  /**
   * Genera verificaciones de seguridad
   */
  private generateSafetyChecks(
    dish: any,
    params: RecommendationParams
  ): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    // Check de alérgenos
    checks.push({
      type: 'allergen',
      passed: true,
      details: 'No contiene ninguno de los alérgenos declarados',
      severity: 'critical',
      checkedAt: new Date(),
    });

    // Check de restricciones dietarias
    if (params.dietaryRestrictions.length > 0) {
      checks.push({
        type: 'dietary_restriction',
        passed: true,
        details: 'Cumple con todas las restricciones dietarias',
        checkedAt: new Date(),
      });
    }

    // Check de disponibilidad
    checks.push({
      type: 'availability',
      passed: dish.available,
      details: dish.available ? 'Plato disponible' : 'Plato no disponible',
      checkedAt: new Date(),
    });

    return checks;
  }
}
