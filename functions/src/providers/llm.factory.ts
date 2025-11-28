import { ILLMProvider, LLMProviderType } from '../interfaces/llm.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { config } from '../config/env.config';

/**
 * Factory para crear proveedores de LLM
 * Implementa el patrón Factory para instanciar el proveedor correcto
 */
export class LLMProviderFactory {
  private static instances: Map<LLMProviderType, ILLMProvider> = new Map();

  /**
   * Crea o retorna una instancia del proveedor especificado
   */
  static getProvider(type: LLMProviderType): ILLMProvider {
    // Verificar si ya existe una instancia
    if (this.instances.has(type)) {
      return this.instances.get(type)!;
    }

    // Crear nueva instancia según el tipo
    let provider: ILLMProvider;

    switch (type) {
      case LLMProviderType.OPENAI:
        provider = new OpenAIProvider();
        break;

      case LLMProviderType.GEMINI:
        provider = new GeminiProvider();
        break;

      default:
        throw new Error(`Proveedor de LLM no soportado: ${type}`);
    }

    // Guardar instancia para reutilizar
    this.instances.set(type, provider);
    return provider;
  }

  /**
   * Obtiene el proveedor por defecto según la configuración
   */
  static getDefaultProvider(): ILLMProvider {
    const defaultType = config.llm?.defaultProvider || LLMProviderType.OPENAI;
    return this.getProvider(defaultType as LLMProviderType);
  }

  /**
   * Lista todos los proveedores disponibles (con API keys configuradas)
   */
  static getAvailableProviders(): LLMProviderType[] {
    const available: LLMProviderType[] = [];

    for (const type of Object.values(LLMProviderType)) {
      try {
        const provider = this.getProvider(type);
        if (provider.isAvailable()) {
          available.push(type);
        }
      } catch (error) {
        // Provider no disponible, continuar
      }
    }

    return available;
  }

  /**
   * Limpia todas las instancias (útil para testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}
