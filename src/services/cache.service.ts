/**
 * Epic #60: API Conversacional y Orquestación
 * Task #69: Sistema de Cache en Memoria
 * 
 * Servicio de caché en memoria con soporte para TTL diferenciado,
 * estrategias de invalidación y seguimiento de estadísticas.
 * 
 * Características:
 * - TTL diferenciado por tipo de contenido (común, recomendaciones, menú)
 * - Generación automática de claves únicas
 * - Estrategia LRU (Least Recently Used) para evicción
 * - Seguimiento de hits/misses y estadísticas
 * - Limpieza automática de entradas expiradas
 * - Invalidación manual y por patrón
 */

import { logger } from '../utils/logger';
import {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheStrategyConfig,
  ChatRequest,
  ChatResponse,
  MenuItem
} from '../interfaces/chat.interface';

/**
 * Tipo de contenido para determinar TTL
 */
export enum CacheContentType {
  COMMON_RESPONSE = 'common_response',      // Respuestas comunes (saludos, despedidas)
  RECOMMENDATION = 'recommendation',        // Recomendaciones personalizadas
  MENU = 'menu'                            // Datos del menú
}

/**
 * Configuración extendida para operaciones de caché
 */
interface ExtendedCacheConfig extends CacheConfig {
  enabled?: boolean;
  strategies?: CacheStrategyConfig;
}

/**
 * Opciones para operaciones de caché
 */
interface CacheOptions {
  contentType?: CacheContentType;
  customTTL?: number;
  tags?: string[];
}

/**
 * Almacén de caché en memoria
 */
type CacheStore = Map<string, CacheEntry>;

/**
 * Servicio de caché en memoria con TTL diferenciado
 */
export class CacheService {
  private store: CacheStore;
  private config: ExtendedCacheConfig;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null;
  private strategyConfig: CacheStrategyConfig;

  constructor(config: Partial<ExtendedCacheConfig> = {}) {
    this.strategyConfig = this.getDefaultStrategies();
    this.store = new Map();
    this.config = this.buildConfig(config);
    this.stats = this.initStats();
    this.cleanupInterval = null;

    this.startCleanupInterval();
    logger.info('CacheService initialized', {
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      strategy: this.config.strategy,
      enabled: this.config.enabled
    });
  }

  /**
   * Construye la configuración de caché con valores por defecto
   */
  private buildConfig(config: Partial<ExtendedCacheConfig>): ExtendedCacheConfig {
    return {
      enabled: config.enabled ?? true,
      maxSize: config.maxSize ?? 1000,
      ttl: config.ttl ?? 3600, // 1 hora por defecto
      strategy: config.strategy ?? 'LRU',
      strategies: config.strategies ?? this.strategyConfig
    };
  }

  /**
   * Obtiene las estrategias de TTL por defecto
   */
  private getDefaultStrategies(): CacheStrategyConfig {
    return {
      commonResponses: {
        ttl: 3600,  // 1 hora
        enabled: true
      },
      recommendations: {
        ttl: 1800,  // 30 minutos
        enabled: true
      },
      menuData: {
        ttl: 900,   // 15 minutos
        enabled: true
      }
    };
  }

  /**
   * Inicializa las estadísticas de caché
   */
  private initStats(): CacheStats {
    return {
      size: 0,
      maxSize: this.config.maxSize || 1000,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      oldestEntry: undefined,
      newestEntry: undefined
    };
  }

  /**
   * Genera una clave única para caché basada en el request
   */
  public generateKey(request: ChatRequest, prefix = 'chat'): string {
    const parts = [
      prefix,
      request.sessionId,
      request.message.toLowerCase().trim()
    ];

    // Simplificar la clave para hacerla más manejable
    const key = parts.join(':');
    return this.hashKey(key);
  }

  /**
   * Genera hash simple de una clave (para acortar claves largas)
   */
  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${Math.abs(hash).toString(36)}:${key.substring(0, 50)}`;
  }

  /**
   * Obtiene un valor del caché
   */
  public get<T>(key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      logger.debug('Cache miss', { key });
      return null;
    }

    // Verificar expiración
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      logger.debug('Cache expired', {
        key,
        age: Date.now() - entry.timestamp
      });
      return null;
    }

    // Hit exitoso - actualizar hits
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    logger.debug('Cache hit', {
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp
    });

    return entry.value as T;
  }

  /**
   * Guarda un valor en el caché
   */
  public set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Verificar límite de tamaño
    if (this.store.size >= this.config.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    const ttl = this.getTTL(options);
    const now = Date.now();
    
    const entry: CacheEntry = {
      key,
      value,
      timestamp: now,
      ttl,
      hits: 0
    };

    this.store.set(key, entry);
    this.stats.size = this.store.size;
    this.updateTimestamps();

    logger.debug('Cache set', {
      key,
      ttl,
      contentType: options.contentType
    });
  }

  /**
   * Obtiene el TTL apropiado basado en las opciones
   */
  private getTTL(options: CacheOptions): number {
    if (options.customTTL) {
      return options.customTTL;
    }

    const strategies = this.config.strategies;
    if (!strategies) {
      return this.config.ttl;
    }

    switch (options.contentType) {
      case CacheContentType.COMMON_RESPONSE:
        return strategies.commonResponses.enabled
          ? strategies.commonResponses.ttl
          : this.config.ttl;
      
      case CacheContentType.RECOMMENDATION:
        return strategies.recommendations.enabled
          ? strategies.recommendations.ttl
          : this.config.ttl;
      
      case CacheContentType.MENU:
        return strategies.menuData.enabled
          ? strategies.menuData.ttl
          : this.config.ttl;
      
      default:
        return this.config.ttl;
    }
  }

  /**
   * Elimina una entrada del caché
   */
  public delete(key: string): boolean {
    const deleted = this.store.delete(key);
    if (deleted) {
      this.stats.size = this.store.size;
      this.updateTimestamps();
      logger.debug('Cache delete', { key });
    }
    return deleted;
  }

  /**
   * Invalida todas las entradas que coincidan con un patrón
   */
  public invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.delete(key);
        count++;
      }
    }
    logger.info('Cache invalidated by pattern', {
      pattern: pattern.toString(),
      count
    });
    return count;
  }

  /**
   * Limpia todas las entradas del caché
   */
  public clear(): void {
    const size = this.store.size;
    this.store.clear();
    this.stats.size = 0;
    this.stats.oldestEntry = undefined;
    this.stats.newestEntry = undefined;
    logger.info('Cache cleared', { entriesRemoved: size });
  }

  /**
   * Obtiene las estadísticas del caché
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Verifica si una entrada ha expirado
   */
  private isExpired(entry: CacheEntry): boolean {
    const age = (Date.now() - entry.timestamp) / 1000; // edad en segundos
    return age > entry.ttl;
  }

  /**
   * Actualiza el hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Actualiza los timestamps de oldest/newest entry
   */
  private updateTimestamps(): void {
    if (this.store.size === 0) {
      this.stats.oldestEntry = undefined;
      this.stats.newestEntry = undefined;
      return;
    }

    let oldest = Infinity;
    let newest = 0;

    for (const entry of this.store.values()) {
      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }

    this.stats.oldestEntry = oldest;
    this.stats.newestEntry = newest;
  }

  /**
   * Evicta la entrada menos recientemente usada (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    let minHits = Infinity;

    for (const [key, entry] of this.store.entries()) {
      // LRU: buscar la entrada con timestamp más antiguo y menos hits
      if (entry.timestamp < lruTime || 
          (entry.timestamp === lruTime && entry.hits < minHits)) {
        lruTime = entry.timestamp;
        minHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
      logger.debug('LRU eviction', { key: lruKey });
    }
  }

  /**
   * Limpia las entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.size = this.store.size;
      this.updateTimestamps();
      logger.debug('Cache cleanup', {
        removed,
        remaining: this.store.size
      });
    }
  }

  /**
   * Inicia el intervalo de limpieza automática
   */
  private startCleanupInterval(): void {
    // Limpieza cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Detiene el intervalo de limpieza
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Cache cleanup interval stopped');
    }
  }

  /**
   * Métodos de conveniencia para tipos específicos de caché
   */

  /**
   * Cachea una respuesta de chat
   */
  public setChatResponse(
    request: ChatRequest,
    response: ChatResponse
  ): void {
    const key = this.generateKey(request, 'chat');
    this.set(key, response, {
      contentType: CacheContentType.COMMON_RESPONSE
    });
  }

  /**
   * Obtiene una respuesta de chat cacheada
   */
  public getChatResponse(request: ChatRequest): ChatResponse | null {
    const key = this.generateKey(request, 'chat');
    return this.get<ChatResponse>(key);
  }

  /**
   * Cachea items del menú
   */
  public setMenuItems(items: MenuItem[]): void {
    const key = 'menu:all';
    this.set(key, items, {
      contentType: CacheContentType.MENU
    });
  }

  /**
   * Obtiene items del menú cacheados
   */
  public getMenuItems(): MenuItem[] | null {
    return this.get<MenuItem[]>('menu:all');
  }

  /**
   * Invalida el caché de una sesión específica
   */
  public invalidateSession(sessionId: string): number {
    return this.invalidateByPattern(new RegExp(`^[^:]+:chat:${sessionId}:`));
  }

  /**
   * Invalida todo el caché de menú
   */
  public invalidateMenu(): number {
    return this.invalidateByPattern(/^[^:]+:menu:/);
  }

  /**
   * Cachea recomendaciones
   */
  public setRecommendations(
    sessionId: string,
    recommendations: MenuItem[]
  ): void {
    const key = `recs:${sessionId}`;
    this.set(key, recommendations, {
      contentType: CacheContentType.RECOMMENDATION
    });
  }

  /**
   * Obtiene recomendaciones cacheadas
   */
  public getRecommendations(sessionId: string): MenuItem[] | null {
    return this.get<MenuItem[]>(`recs:${sessionId}`);
  }
}

/**
 * Instancia singleton del servicio de caché
 */
export const cacheService = new CacheService();
