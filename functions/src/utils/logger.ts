/**
 * Epic #60 - Task #70: Sistema de Logs Estructurado
 * 
 * Sistema de logging centralizado con niveles jerárquicos y formato JSON estructurado.
 * Diseñado para debugging, monitoreo y auditoría del sistema conversacional.
 */

import { config } from '../config/env.config';

/**
 * Niveles de log disponibles (ordenados por severidad)
 */
export enum LogLevel {
  ERROR = 'error',    // Errores críticos que requieren atención inmediata
  WARN = 'warn',      // Advertencias de situaciones anómalas
  INFO = 'info',      // Información general de operaciones
  DEBUG = 'debug',    // Información detallada para debugging
  TRACE = 'trace',    // Rastreo muy detallado de flujo de ejecución
}

/**
 * Contexto adicional para logs
 */
export interface LogContext {
  sessionId?: string;
  userId?: string;
  processingTime?: number;
  stage?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  [key: string]: any;
}

/**
 * Información de error para logs
 */
export interface LogError {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

/**
 * Estructura de una entrada de log
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  error?: LogError;
}

/**
 * Configuración del logger
 */
interface LoggerConfig {
  level: LogLevel;
  serviceName: string;
  enableConsole: boolean;
  enableFile: boolean;
  prettyPrint: boolean;
  nodeEnv?: string;
}

/**
 * Mapeo de niveles de log a números (para comparación)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
  [LogLevel.TRACE]: 4,
};

/**
 * Colores ANSI para output de consola
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Colores por nivel de log
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.ERROR]: COLORS.red,
  [LogLevel.WARN]: COLORS.yellow,
  [LogLevel.INFO]: COLORS.blue,
  [LogLevel.DEBUG]: COLORS.green,
  [LogLevel.TRACE]: COLORS.cyan,
};

/**
 * Clase principal del Logger
 */
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    const nodeEnv = config.nodeEnv || process.env.NODE_ENV || 'development';
    
    this.config = {
      level: this.parseLogLevel(config.level || LogLevel.INFO),
      serviceName: config.serviceName || 'menu-inteligente',
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile || false,
      prettyPrint: config.prettyPrint !== false && nodeEnv === 'development',
    };
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level: string | LogLevel): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      error: LogLevel.ERROR,
      warn: LogLevel.WARN,
      info: LogLevel.INFO,
      debug: LogLevel.DEBUG,
      trace: LogLevel.TRACE,
    };
    return levelMap[level.toLowerCase()] || LogLevel.INFO;
  }

  /**
   * Verifica si un nivel de log debe ser mostrado
   */
  private shouldLog(level: LogLevel): boolean {
    const currentPriority = LOG_LEVEL_PRIORITY[this.config.level];
    const messagePriority = LOG_LEVEL_PRIORITY[level];
    return messagePriority <= currentPriority;
  }

  /**
   * Crea una entrada de log estructurada
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.serviceName,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        name: error.name,
      };
    }

    return entry;
  }

  /**
   * Formatea una entrada de log para consola (pretty print)
   */
  private formatForConsole(entry: LogEntry): string {
    const color = LEVEL_COLORS[entry.level];
    const reset = COLORS.reset;
    const gray = COLORS.gray;

    const timestamp = `${gray}${entry.timestamp}${reset}`;
    const level = `${color}${entry.level.toUpperCase().padEnd(5)}${reset}`;
    const service = `${gray}[${entry.service}]${reset}`;
    const message = entry.message;

    let output = `${timestamp} ${level} ${service} ${message}`;

    // Agregar contexto si existe
    if (entry.context) {
      const contextStr = Object.entries(entry.context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      output += `\n  ${gray}Context:${reset} ${contextStr}`;
    }

    // Agregar error si existe
    if (entry.error) {
      output += `\n  ${COLORS.red}Error:${reset} ${entry.error.message}`;
      if (entry.error.code) {
        output += `\n  ${gray}Code:${reset} ${entry.error.code}`;
      }
      if (entry.error.stack && this.config.level === LogLevel.DEBUG) {
        output += `\n${gray}${entry.error.stack}${reset}`;
      }
    }

    return output;
  }

  /**
   * Escribe el log en los destinos configurados
   */
  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    if (this.config.enableConsole) {
      if (this.config.prettyPrint) {
        console.log(this.formatForConsole(entry));
      } else {
        console.log(JSON.stringify(entry));
      }
    }

    // TODO: Implementar escritura a archivo si enableFile es true
    // En producción, se podría usar Winston, Pino o escribir directamente
  }

  /**
   * Log de error (nivel ERROR)
   */
  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.write(entry);
  }

  /**
   * Log de advertencia (nivel WARN)
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.write(entry);
  }

  /**
   * Log de información (nivel INFO)
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.write(entry);
  }

  /**
   * Log de debug (nivel DEBUG)
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.write(entry);
  }

  /**
   * Log de trace (nivel TRACE)
   */
  trace(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.TRACE, message, context);
    this.write(entry);
  }

  /**
   * Helper para medir tiempo de ejecución
   */
  time(label: string): () => void {
    const startTime = Date.now();
    return () => {
      const processingTime = Date.now() - startTime;
      this.debug(`Timer: ${label}`, { processingTime });
    };
  }

  /**
   * Helper para logging de requests HTTP
   */
  logRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    processingTime: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR 
                : statusCode >= 400 ? LogLevel.WARN 
                : LogLevel.INFO;

    const message = `${method} ${endpoint} ${statusCode}`;
    
    this.write(
      this.createLogEntry(level, message, {
        ...context,
        method,
        endpoint,
        statusCode,
        processingTime,
      })
    );
  }

  /**
   * Helper para logging de chat
   */
  logChat(
    stage: string,
    sessionId: string,
    message: string,
    context?: LogContext
  ): void {
    this.info(message, {
      ...context,
      stage,
      sessionId,
    });
  }

  /**
   * Helper para logging de LLM
   */
  logLLM(
    provider: string,
    operation: string,
    processingTime: number,
    context?: LogContext
  ): void {
    this.debug(`LLM ${provider} - ${operation}`, {
      ...context,
      provider,
      operation,
      processingTime,
    });
  }

  /**
   * Helper para logging de cache
   */
  logCache(
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    context?: LogContext
  ): void {
    const level = operation === 'hit' ? LogLevel.DEBUG : LogLevel.TRACE;
    this.write(
      this.createLogEntry(level, `Cache ${operation}: ${key}`, context)
    );
  }

  /**
   * Helper para logging de métricas
   */
  logMetric(
    metricName: string,
    value: number,
    unit?: string,
    context?: LogContext
  ): void {
    this.info(`Metric: ${metricName} = ${value}${unit ? ' ' + unit : ''}`, context);
  }
}

/**
 * Instancia global del logger
 */
export const logger = new Logger({
  level: (config.nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG) as LogLevel,
  serviceName: 'menu-inteligente',
  enableConsole: true,
  enableFile: config.nodeEnv === 'production',
  prettyPrint: config.nodeEnv === 'development',
});

/**
 * Export default para conveniencia
 */
export default logger;
