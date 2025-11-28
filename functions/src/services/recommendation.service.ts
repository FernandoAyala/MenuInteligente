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

import { LLMProviderType } from '../interfaces/llm.interface';
import {
    RankingResult,
    Recommendation,
    RecommendationParams,
    RecommendationServiceConfig,
    RejectedDish,
    SafetyCheck,
    SafetyFilterResult,
    ScoreBreakdown,
} from '../interfaces/recommendation.interface';
import { MenuItemRepository } from '../repositories/menuItem.repository';
import { RecommendationLogger } from '../utils/recommendation-logger';

/**
 * Configuración por defecto del servicio
 */
const DEFAULT_CONFIG: RecommendationServiceConfig = {
  maxRecommendations: 3,
  minRecommendations: 0,      // No autocompletar, mostrar solo lo que pase filtros
  llmTimeout: 10000,
  enableAuditLogs: true,
  defaultWeights: {
    safety: 1.0,              // CRÍTICO (Alerginos): [nueces, mariscos, ...]
    dietaryMatch: 0.35,       // 35% peso [vegetariano, vegano, sin-gluten, sin-lactosa]
    budgetFit: 0.20,          // 20% peso [min, max]
    preferencesMatch: 0.40,   // 40% peso [tags, mealType, spicyLevel, favoriteIngredients]
    availability: 0.05,       // 5% peso [Disponible]
  },
  ensureDiversity: true,      // Activar diversidad por defecto
  categoryRepetitionPenalty: 0.15, // 15% penalización por cada plato adicional de misma categoría (excepto mealType)
};

/**
 * Servicio principal de recomendaciones
 */
export class RecommendationService {
  private menuRepository: MenuItemRepository;
  private logger: RecommendationLogger;
  private config: RecommendationServiceConfig;

  constructor(
    config?: Partial<RecommendationServiceConfig>,
    llmProvider?: LLMProviderType
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.menuRepository = new MenuItemRepository();
    this.logger = new RecommendationLogger();
    
    // Evitar warning de parámetro no usado
    void llmProvider;
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
   * 2.5. FILTRAR POR MEALTYPE (si especificado) - ESTRICTO
   * 3. Calcular scores híbridos para cada plato
   * 4. Rankear y aplicar diversidad
   * 5. Seleccionar top resultados (sin autocompletar)
   * 6. Generar justificaciones personalizadas
   * 7. Log de auditoría
   * 
   * @param params Parámetros de recomendación
   * @returns Array de recomendaciones (cantidad variable según disponibilidad)
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

      // 2.5. FILTRADO POR MEALTYPE - Si el usuario especificó tipo de comida
      let filteredDishes = safetyFilter.safeDishes;
      if (params.preferences.mealType && params.preferences.mealType.length > 0) {
        filteredDishes = this.filterByMealType(
          safetyFilter.safeDishes,
          params.preferences.mealType
        );

        // Si no hay platos del mealType solicitado, informar
        if (filteredDishes.length === 0) {
          throw new Error(
            `No hay ${params.preferences.mealType.join(' o ')} disponibles con tus restricciones`
          );
        }
      }

      // 3. Calcular scores híbridos (Task #38)
      const scoredDishes = await this.calculateScores(
        filteredDishes,
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
      const conflictingAllergens: string[] = [];
      const conflictingRestrictions: string[] = [];

      // VERIFICACIÓN 1: Alérgenos (CRÍTICO)
      if (dish.allergens && dish.allergens.length > 0) {
        const dishAllergens = dish.allergens.map((a: string) => a.toLowerCase());
        
        const foundAllergens = allergyLowercase.filter(userAllergen =>
          dishAllergens.some((dishAllergen: string) =>
            dishAllergen.includes(userAllergen) || userAllergen.includes(dishAllergen)
          )
        );

        if (foundAllergens.length > 0) {
          conflictingAllergens.push(...foundAllergens);
          rejectionReasons.push(
            `Contiene alérgenos: ${foundAllergens.join(', ')}`
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
        } else if (restriction.includes('lactose') || restriction.includes('lactosa')) {
          if (!dish.isLactoseFree) {
            conflictingRestrictions.push('sin lactosa');
            rejectionReasons.push('Contiene lactosa');
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

  /**
   * Filtra platos por tipo de comida (mealType)
   * 
   * Cuando el usuario especifica "postres", "entradas", "principales", etc.
   * solo se deben mostrar platos de ese tipo específico.
   * 
   * Compara mealType con el campo category del MenuItem que usa MenuCategory enum.
   * 
   * @param dishes Platos ya filtrados por seguridad
   * @param mealTypes Tipos de comida solicitados (entrada, principal, postre, bebida)
   * @returns Platos que coinciden con el mealType
   */
  private filterByMealType(dishes: any[], mealTypes: string[]): any[] {
    const mealTypesLower = mealTypes.map(mt => mt.toLowerCase().trim());
    
    return dishes.filter(dish => {
      const category = dish.category?.toLowerCase() || '';
      
      // Buscar coincidencia EXACTA con el category del plato
      // MenuCategory enum: 'entrada', 'principal', 'postre', 'bebida', 'acompañamiento'
      return mealTypesLower.some(mealType => {
        // Normalizar variaciones del usuario al valor del enum
        const normalizedMealType = this.normalizeMealType(mealType);
        
        // Comparación exacta con la categoría del plato
        return category === normalizedMealType;
      });
    });
  }

  /**
   * Normaliza las variaciones de mealType a los valores del MenuCategory enum
   */
  private normalizeMealType(mealType: string): string {
    const normalized = mealType.toLowerCase().trim();
    
    // Mapeo de sinónimos a valores del enum MenuCategory
    const mealTypeMap: Record<string, string> = {
      // Postres
      'postre': 'postre',
      'postres': 'postre',
      'dessert': 'postre',
      'desserts': 'postre',
      'dulce': 'postre',
      'dulces': 'postre',
      
      // Entradas
      'entrada': 'entrada',
      'entradas': 'entrada',
      'appetizer': 'entrada',
      'appetizers': 'entrada',
      'aperitivo': 'entrada',
      'aperitivos': 'entrada',
      'entrante': 'entrada',
      'entrantes': 'entrada',
      
      // Principales
      'principal': 'principal',
      'principales': 'principal',
      'main': 'principal',
      'main course': 'principal',
      'plato fuerte': 'principal',
      'segundo': 'principal',
      
      // Bebidas
      'bebida': 'bebida',
      'bebidas': 'bebida',
      'drink': 'bebida',
      'drinks': 'bebida',
      
      // Acompañamientos
      'acompañamiento': 'acompañamiento',
      'acompañamientos': 'acompañamiento',
      'side': 'acompañamiento',
      'side dish': 'acompañamiento',
      'guarnición': 'acompañamiento',
    };
    
    return mealTypeMap[normalized] || normalized;
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

    // Score de disponibilidad (ya filtrado, siempre 100)
    const availability = 100;

    return {
      safety,
      dietaryMatch,
      budgetFit,
      preferencesMatch,
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
      } else if (restriction.includes('lactose') || restriction.includes('lactosa')) {
        if (dish.isLactoseFree) matches++;
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
   * Calcula score de preferencias basado en las intenciones extraídas
   * 
   * Usa las entidades del IntentExtractionResult para hacer matching preciso:
   * - tags: características del plato (ligero, abundante, casero, etc)
   * - mealType: tipo de comida (entrada, principal, postre)
   * - spicyLevel: nivel de picante deseado
   * - preferences: preferencias generales en texto libre
   * - favoriteIngredients: ingredientes preferidos
   */
  private calculatePreferencesScore(
    dish: any,
    preferences: any
  ): number {
    let score = 0;
    let maxPossibleScore = 0;

    // 1. MATCH DE TAGS (peso 30%) - Características principales del plato
    if (preferences.tags && preferences.tags.length > 0) {
      maxPossibleScore += 30;
      
      if (dish.tags && dish.tags.length > 0) {
        const dishTagsLower = dish.tags.map((t: string) => t.toLowerCase());
        const matchingTags = preferences.tags.filter((prefTag: string) =>
          dishTagsLower.some((dishTag: string) => 
            dishTag.includes(prefTag.toLowerCase()) || prefTag.toLowerCase().includes(dishTag)
          )
        );
        
        // Score proporcional a tags que coinciden
        const tagMatchRatio = matchingTags.length / preferences.tags.length;
        score += tagMatchRatio * 30;
      }
    }

    // 2. MATCH DE TIPO DE COMIDA (peso 25%) - entrada, principal, postre, bebida
    if (preferences.mealType && preferences.mealType.length > 0) {
      maxPossibleScore += 25;
      
      const dishText = `${dish.name} ${dish.description} ${dish.category}`.toLowerCase();
      const matchingTypes = preferences.mealType.filter((type: string) =>
        dishText.includes(type.toLowerCase()) || dish.category?.toLowerCase().includes(type.toLowerCase())
      );
      
      if (matchingTypes.length > 0) {
        const typeMatchRatio = matchingTypes.length / preferences.mealType.length;
        score += typeMatchRatio * 25;
      }
    }

    // 3. MATCH DE NIVEL DE PICANTE (peso 20%) - Exactitud en spicyLevel
    if (preferences.spicyLevel !== undefined) {
      maxPossibleScore += 20;
      
      if (dish.spicyLevel !== undefined) {
        const spicyDiff = Math.abs(preferences.spicyLevel - dish.spicyLevel);
        // Score inverso a la diferencia: 0 diff = 20 pts, 1 diff = 15 pts, 2 diff = 10 pts, 3+ diff = 5 pts
        const spicyScore = Math.max(20 - (spicyDiff * 5), 5);
        score += spicyScore;
      } else {
        // Si el plato no tiene spicyLevel definido, asumir nivel medio (1)
        const spicyDiff = Math.abs(preferences.spicyLevel - 1);
        const spicyScore = Math.max(20 - (spicyDiff * 5), 5);
        score += spicyScore;
      }
    }

    // 4. INGREDIENTES FAVORITOS (peso 15%) - Boost por ingredientes deseados
    if (preferences.favoriteIngredients && preferences.favoriteIngredients.length > 0) {
      maxPossibleScore += 15;
      
      if (dish.description || dish.ingredients) {
        const dishContent = `${dish.description || ''} ${dish.ingredients?.join(' ') || ''}`.toLowerCase();
        const matchingIngredients = preferences.favoriteIngredients.filter((ing: string) =>
          dishContent.includes(ing.toLowerCase())
        );
        
        if (matchingIngredients.length > 0) {
          const ingredientMatchRatio = matchingIngredients.length / preferences.favoriteIngredients.length;
          score += ingredientMatchRatio * 15;
        }
      }
    }

    // 5. CATEGORÍAS PREFERIDAS (peso 10%) - Match de categoría del menú
    if (preferences.preferredCategories && preferences.preferredCategories.length > 0) {
      maxPossibleScore += 10;
      
      if (dish.category) {
        const categoryMatch = preferences.preferredCategories.some((pref: string) =>
          dish.category.toLowerCase().includes(pref.toLowerCase()) ||
          pref.toLowerCase().includes(dish.category.toLowerCase())
        );
        
        if (categoryMatch) {
          score += 10;
        }
      }
    }

    // Normalizar a escala 0-100
    if (maxPossibleScore === 0) {
      // Sin preferencias definidas, retornar score neutral alto
      return 70;
    }

    // Convertir a porcentaje y ajustar para que un buen match de 80%+ sea ~90-100
    const normalizedScore = (score / maxPossibleScore) * 100;
    return Math.min(100, Math.max(0, normalizedScore));
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
  // ==========================================================================
  // TASK #42: RANKING Y DIVERSIDAD
  // ==========================================================================

  /**
   * Rankea platos y aplica algoritmo de diversidad
   * 
   * Garantiza:
   * - Top scores tienen prioridad SIEMPRE
   * - Diversidad en categorías (opcional) - NO aplica a mealType
   * - No más de 2 platos de la misma categoría si diversity habilitado
   * - NO autocompleta, muestra solo lo disponible
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
      // Sin diversidad, simplemente tomar los top por score
      return {
        rankedDishes: scoredDishes.slice(0, maxRecommendations),
        diversityMetrics: this.calculateDiversityMetrics(scoredDishes.slice(0, maxRecommendations).map(s => s.dish)),
        discardedForDiversity: [],
      };
    }

    // CON DIVERSIDAD: Aplicar penalización por repetición de categoría
    // pero NO a categorías que son mealType (entrada, principal, postre, bebida)
    type ScoredDishWithAdjustment = typeof scoredDishes[0] & {
      adjustedScore: number;
      originalScore: number;
      categoryPenalty: number;
    };
    
    const selected: ScoredDishWithAdjustment[] = [];
    const discarded: Array<{ dish: any; reason: string }> = [];
    const categoryCounts: Record<string, number> = {};
    
    // Categorías que NO deben penalizarse (son mealTypes)
    const mealTypeCategories = ['entrada', 'principal', 'postre', 'bebida', 'appetizer', 'main', 'dessert', 'drink'];

    // Crear una copia con scores ajustados por penalización de categoría
    const adjustedScores: ScoredDishWithAdjustment[] = scoredDishes.map(item => {
      const category = item.dish.category?.toLowerCase() || '';
      const categoryCount = categoryCounts[category] || 0;
      
      // NO aplicar penalización si es un mealType
      const isMealType = mealTypeCategories.some(mt => category.includes(mt));
      
      // Aplicar penalización solo si NO es mealType y ya hay platos de esta categoría
      const penalty = isMealType ? 0 : categoryCount * this.config.categoryRepetitionPenalty;
      const adjustedScore = item.totalScore * (1 - penalty);
      
      return {
        ...item,
        adjustedScore,
        originalScore: item.totalScore,
        categoryPenalty: penalty,
      };
    });

    // Re-ordenar por score ajustado (determinista)
    adjustedScores.sort((a, b) => b.adjustedScore - a.adjustedScore);

    // Seleccionar los mejores con límite de categoría (solo para categorías NO-mealType)
    for (const item of adjustedScores) {
      if (selected.length >= maxRecommendations) break;

      const category = item.dish.category?.toLowerCase() || '';
      const categoryCount = categoryCounts[category] || 0;
      const isMealType = mealTypeCategories.some(mt => category.includes(mt));

      // Verificar límite de categoría (2 platos máximo) SOLO para categorías que NO son mealType
      if (!isMealType && categoryCount >= 2 && selected.length < maxRecommendations) {
        // Si el score es muy superior, permitir excepción
        const scoreDifference = item.adjustedScore - (selected[selected.length - 1]?.adjustedScore || 0);
        if (scoreDifference < 20) {
          discarded.push({
            dish: item.dish,
            reason: `Límite de categoría "${category}" alcanzado (2 platos máximo)`,
          });
          continue;
        }
      }

      // Agregar a seleccionados
      selected.push(item);
      categoryCounts[category] = categoryCount + 1;
    }

    // NO autocompletar - mostrar solo lo que pasó los filtros de diversidad
    // Eliminado el bloque de minRecommendations

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
    const orderedDishes = [...rankedDishes].sort((a, b) => b.totalScore - a.totalScore);
    const recommendations: Recommendation[] = [];

    for (let i = 0; i < orderedDishes.length; i++) {
      const item = orderedDishes[i];
      
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
          allergens: item.dish.allergens || [], // Asegurar que siempre sea un array
          available: item.dish.available,
          imageUrl: item.dish.imageUrl,
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
   * Task #44: Genera justificaciones basadas en las intenciones extraídas
   * Usa scoreBreakdown para identificar las razones más fuertes del match
   */
  private async generateJustification(
    dish: any,
    params: RecommendationParams,
    scoreBreakdown: ScoreBreakdown
  ): Promise<string> {
    const reasons: string[] = [];

    // 1. RAZONES DE RESTRICCIONES DIETARIAS (si aplican y tienen buen score)
    if (scoreBreakdown.dietaryMatch >= 90 && params.dietaryRestrictions.length > 0) {
      const dietaryReasons: string[] = [];
      
      if (dish.isVegan && params.dietaryRestrictions.some(r => r.toLowerCase().includes('vegan'))) {
        dietaryReasons.push('100% vegano');
      } else if (dish.isVegetarian && params.dietaryRestrictions.some(r => r.toLowerCase().includes('vegetarian'))) {
        dietaryReasons.push('vegetariano');
      }
      
      if (dish.isGlutenFree && params.dietaryRestrictions.some(r => r.toLowerCase().includes('gluten'))) {
        dietaryReasons.push('sin gluten');
      }
      
      if (dish.isLactoseFree && params.dietaryRestrictions.some(r => r.toLowerCase().includes('lactos'))) {
        dietaryReasons.push('sin lactosa');
      }
      
      if (dietaryReasons.length > 0) {
        reasons.push(dietaryReasons.join(' y '));
      }
    }

    // 2. RAZONES DE PREFERENCIAS (tags, características)
    if (scoreBreakdown.preferencesMatch >= 70 && params.preferences.tags && params.preferences.tags.length > 0) {
      if (dish.tags && dish.tags.length > 0) {
        const dishTagsLower = dish.tags.map((t: string) => t.toLowerCase());
        const matchingTags = params.preferences.tags.filter((prefTag: string) =>
          dishTagsLower.some((dishTag: string) => 
            dishTag.includes(prefTag.toLowerCase()) || prefTag.toLowerCase().includes(dishTag)
          )
        );
        
        if (matchingTags.length > 0) {
          const tagDescription = matchingTags.slice(0, 2).join(' y '); // Máximo 2 tags en la justificación
          reasons.push(`es ${tagDescription}`);
        }
      }
    }

    // 3. RAZÓN DE PRESUPUESTO (si está dentro del rango)
    if (scoreBreakdown.budgetFit >= 90 && params.budget) {
      reasons.push(`se ajusta perfecto a tu presupuesto ($${dish.price})`);
    } else if (scoreBreakdown.budgetFit >= 70 && params.budget) {
      reasons.push(`tiene excelente relación precio-calidad ($${dish.price})`);
    }

    // 4. INGREDIENTES FAVORITOS (si coinciden)
    if (params.preferences.favoriteIngredients && params.preferences.favoriteIngredients.length > 0) {
      if (dish.description || dish.ingredients) {
        const dishContent = `${dish.description || ''} ${dish.ingredients?.join(' ') || ''}`.toLowerCase();
        const matchingIngredients = params.preferences.favoriteIngredients.filter((ing: string) =>
          dishContent.includes(ing.toLowerCase())
        );
        
        if (matchingIngredients.length > 0) {
          const ingredientList = matchingIngredients.slice(0, 2).join(' y ');
          reasons.push(`tiene ${ingredientList} que te gustan`);
        }
      }
    }

    // 5. NIVEL DE PICANTE (si es exacto)
    if (params.preferences.spicyLevel !== undefined && dish.spicyLevel !== undefined) {
      const spicyDiff = Math.abs(params.preferences.spicyLevel - dish.spicyLevel);
      if (spicyDiff === 0) {
        const spicyLabels = ['nada picante', 'levemente picante', 'picante moderado', 'muy picante'];
        reasons.push(`es ${spicyLabels[dish.spicyLevel]} como preferís`);
      }
    }

    // Construir justificación
    if (reasons.length === 0) {
      // Justificación genérica basada en el plato
      return `${dish.name} es una excelente opción del menú. ${dish.description || ''}`;
    }

    // Justificación personalizada con hasta 3 razones principales
    const topReasons = reasons.slice(0, 3);
    let justification = `Te recomiendo ${dish.name} porque ${topReasons.join(', ')}.`;
    
    // Agregar descripción del plato si es corta y relevante
    if (dish.description && dish.description.length < 80 && !justification.toLowerCase().includes(dish.description.toLowerCase())) {
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
