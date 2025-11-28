/**
 * Logger de auditoría para el Motor de Recomendaciones
 * Epic #34: Motor de Recomendaciones
 * Task #40: Logs de trazabilidad de recomendaciones
 * 
 * Proporciona trazabilidad completa de decisiones de filtrado,
 * scoring y recomendaciones finales para auditoría y debugging.
 */

import {
    Recommendation,
    RecommendationLog,
    RecommendationParams,
    SafetyFilterResult,
    ScoreBreakdown,
} from '../interfaces/recommendation.interface';

/**
 * Logger especializado para auditoría de recomendaciones
 */
export class RecommendationLogger {
  private logs: RecommendationLog[] = [];

  /**
   * Log de filtrado de seguridad
   */
  logSafetyFiltering(
    params: RecommendationParams,
    filterResult: SafetyFilterResult
  ): void {
    const log: Partial<RecommendationLog> = {
      id: this.generateLogId(),
      timestamp: new Date(),
      eventType: 'filtering',
      inputParams: params,
      safetyFilter: filterResult,
      executionTime: 0,
    };

    console.log('🛡️ [SAFETY FILTER]', {
      allergies: params.allergies,
      restrictions: params.dietaryRestrictions,
      totalDishes: filterResult.stats.total,
      safeDishes: filterResult.stats.safe,
      rejected: filterResult.stats.rejected,
      rejectionReasons: filterResult.stats.rejectionReasons,
    });

    // Detallar platos rechazados si hay
    if (filterResult.rejected.length > 0) {
      console.log('❌ [REJECTED DISHES]', {
        count: filterResult.rejected.length,
        dishes: filterResult.rejected.map(r => ({
          name: r.dishName,
          reason: r.reason,
          details: r.details,
        })),
      });
    }

    this.logs.push(log as RecommendationLog);
  }

  /**
   * Log de scoring de platos
   */
  logScoringDecision(
    scoredDishes: Array<{
      dish: any;
      scoreBreakdown: ScoreBreakdown;
      totalScore: number;
    }>
  ): void {
    console.log('📊 [SCORING]', {
      totalDishes: scoredDishes.length,
      topScores: scoredDishes
        .slice(0, 5)
        .map(s => ({
          name: s.dish.name,
          totalScore: s.totalScore,
          breakdown: {
            dietary: s.scoreBreakdown.dietaryMatch,
            budget: s.scoreBreakdown.budgetFit,
            preferences: s.scoreBreakdown.preferencesMatch,
          },
        })),
    });
  }

  /**
   * Log de recomendaciones finales
   */
  logFinalRecommendations(
    params: RecommendationParams,
    safetyFilter: SafetyFilterResult,
    scoredDishes: Array<{
      dish: any;
      scoreBreakdown: ScoreBreakdown;
      totalScore: number;
    }>,
    recommendations: Recommendation[],
    executionTime: number
  ): void {
    const log: RecommendationLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      eventType: 'final_recommendations',
      inputParams: params,
      safetyFilter,
      scoredDishes: scoredDishes.map(s => ({
        dishId: s.dish.id,
        dishName: s.dish.name,
        score: s.totalScore,
        scoreBreakdown: s.scoreBreakdown,
      })),
      finalRecommendations: recommendations,
      executionTime,
    };

    console.log('✨ [FINAL RECOMMENDATIONS]', {
      count: recommendations.length,
      executionTime: `${executionTime}ms`,
      recommendations: recommendations.map(r => ({
        rank: r.rank,
        name: r.dish.name,
        score: r.score,
        justification: r.justification,
      })),
    });

    this.logs.push(log);
  }

  /**
   * Obtiene todos los logs
   */
  getLogs(): RecommendationLog[] {
    return this.logs;
  }

  /**
   * Obtiene logs filtrados por tipo
   */
  getLogsByType(eventType: RecommendationLog['eventType']): RecommendationLog[] {
    return this.logs.filter(log => log.eventType === eventType);
  }

  /**
   * Limpia logs antiguos
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Genera ID único para log
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log de error en recomendaciones
   */
  logError(error: Error, params?: RecommendationParams): void {
    console.error('❌ [RECOMMENDATION ERROR]', {
      error: error.message,
      stack: error.stack,
      params,
    });
  }
}
