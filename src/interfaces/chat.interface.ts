/**
 * Epic #60 - Interfaces TypeScript para Chat
 * 
 * Definiciones de tipos para el sistema de chat conversacional,
 * incluyendo requests, responses, pipeline y configuraciones.
 */

import { z } from 'zod';
import { MenuItem } from '../models/menuItem.model';
import { Recommendation } from './recommendation.interface';

// ============================================================================
// ENUMS Y TIPOS BÁSICOS
// ============================================================================

/**
 * Tipos de acciones que puede realizar el chat
 */
export enum ChatActionType {
  ADD_TO_CART = 'add_to_cart',
  VIEW_MENU = 'view_menu',
  PLACE_ORDER = 'place_order',
  CLEAR_CART = 'clear_cart',
  VIEW_CART = 'view_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  UPDATE_QUANTITY = 'update_quantity',
  REQUEST_RECOMMENDATION = 'request_recommendation',
}

/**
 * Estados del pipeline de procesamiento
 */
export enum PipelineStage {
  INIT = 'init',
  LOAD_SESSION = 'load_session',
  CHECK_CACHE = 'check_cache',
  PROCESS_LLM = 'process_llm',
  FILTER_MENU = 'filter_menu',
  GENERATE_RECOMMENDATIONS = 'generate_recommendations',
  UPDATE_SESSION = 'update_session',
  SAVE_CACHE = 'save_cache',
  COMPLETE = 'complete',
}

// ============================================================================
// SCHEMAS DE VALIDACIÓN ZOD
// ============================================================================

/**
 * Schema de validación para ChatRequest
 */
export const ChatRequestSchema = z.object({
  message: z.string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(1000, 'El mensaje es demasiado largo (máximo 1000 caracteres)'),
  
  sessionId: z.string()
    .uuid('SessionId debe ser un UUID válido')
    .optional(),
  
  context: z.object({
    previousMessages: z.number()
      .int('previousMessages debe ser un entero')
      .min(0, 'previousMessages no puede ser negativo')
      .max(50, 'previousMessages no puede ser mayor a 50')
      .optional(),
    
    includeRecommendations: z.boolean().optional(),
    
    includeCart: z.boolean().optional(),
  }).optional(),
});

/**
 * Schema de validación para ChatAction
 */
export const ChatActionSchema = z.object({
  type: z.nativeEnum(ChatActionType),
  
  data: z.any().optional(),
  
  label: z.string()
    .min(1, 'El label no puede estar vacío'),
});

// ============================================================================
// INTERFACES DE REQUEST/RESPONSE
// ============================================================================

/**
 * Request del endpoint /api/chat
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    previousMessages?: number;
    includeRecommendations?: boolean;
    includeCart?: boolean;
  };
}

/**
 * Tipo inferido del schema de validación
 */
export type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Acción que puede ejecutar el usuario
 */
export interface ChatAction {
  type: ChatActionType;
  data?: any;
  label: string;
}

/**
 * Metadata de la respuesta
 */
export interface ChatResponseMetadata {
  processingTime: number;
  llmProvider: string;
  fromCache: boolean;
  stage: PipelineStage;
  cacheHit?: boolean;
  sessionCreated?: boolean;
}

/**
 * Response del endpoint /api/chat
 */
export interface ChatResponse {
  response: string;
  sessionId: string;
  suggestions?: string[];
  actions?: ChatAction[];
  recommendations?: Recommendation[];
  cart?: {
    items: MenuItem[];
    total: number;
    itemCount: number;
  };
  metadata: ChatResponseMetadata;
}

/**
 * Response de error
 */
export interface ChatErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// PIPELINE Y PROCESAMIENTO
// ============================================================================

/**
 * Contexto de procesamiento del pipeline
 */
export interface ProcessingContext {
  // Input
  message: string;
  sessionId: string;
  requestContext?: ChatRequest['context'];
  
  // Session
  session?: any; // ConversationSession from session.model.ts
  sessionCreated?: boolean;
  
  // LLM Processing
  llmResponse?: any;
  intent?: string;
  entities?: Record<string, any>;
  
  // Menu & Recommendations
  filteredMenu?: MenuItem[];
  recommendations?: Recommendation[];
  
  // Output
  response?: string;
  suggestions?: string[];
  actions?: ChatAction[];
  
  // Metadata
  metadata: {
    startTime: number;
    stageTimings: Record<PipelineStage, number>;
    fromCache?: boolean;
    llmProvider?: string;
    cacheKey?: string;
  };
  
  // Error handling
  error?: Error;
}

/**
 * Configuración de una etapa del pipeline
 */
export interface PipelineStageConfig {
  name: PipelineStage;
  execute: (context: ProcessingContext) => Promise<ProcessingContext>;
  onError?: (error: Error, context: ProcessingContext) => Promise<ProcessingContext>;
  timeout?: number;
  required?: boolean;
}

/**
 * Resultado de una etapa del pipeline
 */
export interface PipelineStageResult {
  stage: PipelineStage;
  success: boolean;
  context: ProcessingContext;
  error?: Error;
  duration: number;
}

// ============================================================================
// CACHE
// ============================================================================

/**
 * Configuración del cache
 */
export interface CacheConfig {
  ttl: number;              // Time to live en segundos
  maxSize: number;          // Máximo de entradas
  strategy: 'LRU' | 'LFU';  // Least Recently Used o Least Frequently Used
}

/**
 * Entrada del cache
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Estadísticas del cache
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * Configuración del cache por tipo de contenido
 */
export interface CacheStrategyConfig {
  commonResponses: {
    ttl: number;        // 1 hora
    enabled: boolean;
  };
  recommendations: {
    ttl: number;        // 30 minutos
    enabled: boolean;
  };
  menuData: {
    ttl: number;        // 15 minutos
    enabled: boolean;
  };
}

// ============================================================================
// MÉTRICAS
// ============================================================================

/**
 * Estadísticas de latencia
 */
export interface LatencyStats {
  count: number;
  total: number;
  mean: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Métricas del sistema
 */
export interface SystemMetrics {
  // Counters
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedResponses: number;
  
  // Timers
  endpointLatency: LatencyStats;
  llmProcessingTime: LatencyStats;
  dbQueryTime: LatencyStats;
  
  // Rates
  requestsPerMinute: number;
  errorsPerMinute: number;
  
  // Resources
  cacheHitRate: number;
  cacheSize: number;
  activeSessions: number;
  
  // Timestamp
  lastUpdated: Date;
}

/**
 * Evento de métrica
 */
export interface MetricEvent {
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  windowMs: number;        // Ventana de tiempo en ms
  maxRequests: number;     // Máximo de requests en la ventana
  message?: string;        // Mensaje de error personalizado
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Información de rate limit
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

// ============================================================================
// ERRORES
// ============================================================================

/**
 * Códigos de error del sistema de chat
 */
export enum ChatErrorCode {
  // Validación
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Sesión
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_CREATE_ERROR = 'SESSION_CREATE_ERROR',
  SESSION_UPDATE_ERROR = 'SESSION_UPDATE_ERROR',
  
  // LLM
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_ERROR = 'LLM_ERROR',
  LLM_UNAVAILABLE = 'LLM_UNAVAILABLE',
  
  // Database
  DB_TIMEOUT = 'DB_TIMEOUT',
  DB_ERROR = 'DB_ERROR',
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  
  // Processing
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  PIPELINE_ERROR = 'PIPELINE_ERROR',
  STAGE_TIMEOUT = 'STAGE_TIMEOUT',
  
  // Cache
  CACHE_ERROR = 'CACHE_ERROR',
  
  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Contexto de error
 */
export interface ErrorContext {
  stage?: PipelineStage;
  sessionId?: string;
  message?: string;
  [key: string]: any;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/**
 * Configuración del servicio de orquestación
 */
export interface OrchestrationConfig {
  timeouts: {
    llm: number;          // Timeout para LLM (5000ms)
    db: number;           // Timeout para DB (2000ms)
    total: number;        // Timeout total del request (10000ms)
  };
  
  cache: {
    enabled: boolean;
    config: CacheStrategyConfig;
  };
  
  metrics: {
    enabled: boolean;
    flushInterval: number; // Intervalo de flush en ms
  };
  
  retry: {
    enabled: boolean;
    maxAttempts: number;
    backoffMs: number;
  };
  
  fallback: {
    enabled: boolean;
    useGenericResponse: boolean;
  };
}

/**
 * Opciones para el procesamiento de mensajes
 */
export interface ProcessMessageOptions {
  skipCache?: boolean;
  skipRecommendations?: boolean;
  timeout?: number;
  previousMessages?: number;
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

/**
 * Helper para crear una acción de chat
 */
export function createChatAction(
  type: ChatActionType,
  label: string,
  data?: any
): ChatAction {
  return {
    type,
    label,
    data,
  };
}

/**
 * Helper para validar ChatRequest
 */
export function validateChatRequest(request: unknown): ValidatedChatRequest {
  return ChatRequestSchema.parse(request);
}

/**
 * Helper para crear metadata inicial
 */
export function createInitialMetadata(): ChatResponseMetadata {
  return {
    processingTime: 0,
    llmProvider: 'unknown',
    fromCache: false,
    stage: PipelineStage.INIT,
  };
}

/**
 * Helper para crear contexto de procesamiento inicial
 */
export function createProcessingContext(
  message: string,
  sessionId: string,
  requestContext?: ChatRequest['context']
): ProcessingContext {
  return {
    message,
    sessionId,
    requestContext,
    metadata: {
      startTime: Date.now(),
      stageTimings: {} as Record<PipelineStage, number>,
    },
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard para ChatRequest
 */
export function isChatRequest(obj: any): obj is ChatRequest {
  try {
    ChatRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard para ChatAction
 */
export function isChatAction(obj: any): obj is ChatAction {
  try {
    ChatActionSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  MenuItem,
  Recommendation,
};
