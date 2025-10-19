/**
 * Tests CRÍTICOS para RecommendationService
 * Epic #34 - Task #41: Testing exhaustivo de casos de alergia
 * 
 * IMPORTANTE: Los tests de seguridad alimentaria son CRÍTICOS.
 * DEBE pasar el 100% de estos tests antes de deployment.
 */

import { RecommendationService } from '../../services/recommendation.service';
import { MenuItemRepository } from '../../repositories/menuItem.repository';
import { RecommendationParams } from '../../interfaces/recommendation.interface';
import { MenuItem, MenuCategory } from '../../models/menuItem.model';

// Mock del repository
jest.mock('../../repositories/menuItem.repository');

describe('RecommendationService - CRITICAL SAFETY TESTS', () => {
  let service: RecommendationService;
  let mockRepository: jest.Mocked<MenuItemRepository>;

  // Mock dishes para testing
  const mockDishes: MenuItem[] = [
    {
      id: '1',
      name: 'Paella de Mariscos',
      description: 'Deliciosa paella con mariscos frescos',
      category: MenuCategory.MAIN_COURSE,
      allergens: ['shellfish', 'fish'],
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      price: 2500,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Ensalada Vegana',
      description: 'Ensalada fresca y saludable',
      category: MenuCategory.APPETIZER,
      allergens: [],
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      price: 1200,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Pasta Carbonara',
      description: 'Pasta italiana tradicional',
      category: MenuCategory.MAIN_COURSE,
      allergens: ['eggs', 'dairy', 'gluten'],
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      price: 1800,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
    {
      id: '4',
      name: 'Pizza Vegetariana',
      description: 'Pizza con vegetales frescos',
      category: MenuCategory.MAIN_COURSE,
      allergens: ['dairy', 'gluten'],
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      price: 1500,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
    {
      id: '5',
      name: 'Salmón a la Parrilla',
      description: 'Salmón fresco a la parrilla',
      category: MenuCategory.MAIN_COURSE,
      allergens: ['fish'],
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: true,
      price: 3200,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
    {
      id: '6',
      name: 'Brownie con Nueces',
      description: 'Brownie de chocolate con nueces',
      category: MenuCategory.DESSERT,
      allergens: ['nuts', 'eggs', 'dairy', 'gluten'],
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      price: 800,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
    {
      id: '7',
      name: 'Hamburguesa Clásica',
      description: 'Hamburguesa de carne con queso',
      category: MenuCategory.MAIN_COURSE,
      allergens: ['gluten', 'dairy'],
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      price: 1600,
      currency: 'ARS',
      available: false, // NO DISPONIBLE
      createdAt: new Date(),
    },
    {
      id: '8',
      name: 'Sopa de Verduras',
      description: 'Sopa casera de verduras',
      category: MenuCategory.APPETIZER,
      allergens: [],
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      price: 900,
      currency: 'ARS',
      available: true,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock repository method
    mockRepository = {
      findAllAvailable: jest.fn().mockResolvedValue(mockDishes),
    } as any;

    // Mock MenuItemRepository constructor
    (MenuItemRepository as jest.MockedClass<typeof MenuItemRepository>).mockImplementation(() => mockRepository as any);

    // Create service (it will use the mocked repository)
    service = new RecommendationService();
  });

  describe('🚨 CRITICAL: Allergen Filtering', () => {
    it('should NEVER recommend dishes with declared shellfish allergy', async () => {
      const params: RecommendationParams = {
        allergies: ['shellfish'],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: No debe haber NINGÚN plato con shellfish
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens).not.toContain('shellfish');
        // Verificar que hay al menos un safety check que pasó
        const allergenChecks = rec.safetyChecks.filter(c => c.type === 'allergen');
        expect(allergenChecks.every(c => c.passed)).toBe(true);
      });

      // Verificar que la Paella fue rechazada
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Paella de Mariscos');
    });

    it('should NEVER recommend dishes with multiple allergies', async () => {
      const params: RecommendationParams = {
        allergies: ['nuts', 'dairy'], // Alérgico a nueces Y lácteos
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: No debe haber NINGÚN plato con nuts O dairy
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens).not.toContain('nuts');
        expect(rec.dish.allergens).not.toContain('dairy');
      });

      // Verificar que el Brownie y la Pizza fueron rechazados
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Brownie con Nueces');
      expect(dishNames).not.toContain('Pizza Vegetariana');
      expect(dishNames).not.toContain('Pasta Carbonara');
    });

    it('should handle all common allergens correctly', async () => {
      const commonAllergens = ['nuts', 'shellfish', 'fish', 'eggs', 'dairy', 'gluten'];

      for (const allergen of commonAllergens) {
        const params: RecommendationParams = {
          allergies: [allergen],
          dietaryRestrictions: [],
          budget: { min: 0, max: 5000 },
          preferences: {},
        };

        const recommendations = await service.generateRecommendations(params);

        // CRITICAL: NINGUNA recomendación debe contener el alérgeno
        recommendations.forEach((rec) => {
          expect(rec.dish.allergens).not.toContain(allergen);
        });
      }
    });

    it('should reject ALL unsafe dishes when allergic to multiple items', async () => {
      const params: RecommendationParams = {
        allergies: ['nuts', 'shellfish', 'fish', 'eggs', 'dairy', 'gluten'],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // Solo deben quedar platos SIN alérgenos (Ensalada Vegana, Sopa de Verduras)
      expect(recommendations.length).toBeLessThanOrEqual(2);
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens.length).toBe(0);
      });
    });
  });

  describe('🥗 CRITICAL: Dietary Restrictions', () => {
    it('should ONLY recommend vegan dishes for vegan diet', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegan'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser veganos
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegan).toBe(true);
      });

      // Solo Ensalada Vegana y Sopa de Verduras son veganas
      expect(recommendations.length).toBeLessThanOrEqual(2);
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames.every((name) => ['Ensalada Vegana', 'Sopa de Verduras'].includes(name))).toBe(true);
    });

    it('should ONLY recommend vegetarian dishes for vegetarian diet', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegetarian'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser vegetarianos
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegetarian).toBe(true);
      });

      // No deben aparecer: Paella, Carbonara, Salmón, Hamburguesa
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Paella de Mariscos');
      expect(dishNames).not.toContain('Pasta Carbonara');
      expect(dishNames).not.toContain('Salmón a la Parrilla');
      expect(dishNames).not.toContain('Hamburguesa Clásica');
    });

    it('should ONLY recommend gluten-free dishes for celiac diet', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['gluten-free'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser sin gluten
      recommendations.forEach((rec) => {
        expect(rec.dish.isGlutenFree).toBe(true);
      });

      // No deben aparecer platos con gluten
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Pasta Carbonara');
      expect(dishNames).not.toContain('Pizza Vegetariana');
      expect(dishNames).not.toContain('Brownie con Nueces');
      expect(dishNames).not.toContain('Hamburguesa Clásica');
    });

    it('should handle COMBINED restrictions (vegan + gluten-free)', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegan', 'gluten-free'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: Debe cumplir AMBAS restricciones (AND lógico)
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegan).toBe(true);
        expect(rec.dish.isGlutenFree).toBe(true);
      });

      // Solo Ensalada Vegana y Sopa de Verduras cumplen ambas
      expect(recommendations.length).toBeLessThanOrEqual(2);
    });
  });

  describe('🔒 CRITICAL: Combined Safety Filters', () => {
    it('should handle allergies + dietary restrictions together', async () => {
      const params: RecommendationParams = {
        allergies: ['dairy'],
        dietaryRestrictions: ['vegetarian'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: Debe cumplir AMBOS filtros
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens).not.toContain('dairy');
        expect(rec.dish.isVegetarian).toBe(true);
      });

      // Solo Ensalada Vegana y Sopa de Verduras cumplen (sin dairy + vegetarianas)
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Pizza Vegetariana'); // Tiene dairy
      expect(dishNames).not.toContain('Brownie con Nueces'); // Tiene dairy
    });

    it('should NEVER recommend unavailable dishes regardless of other factors', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben estar disponibles
      recommendations.forEach((rec) => {
        expect(rec.dish.available).toBe(true);
      });

      // La Hamburguesa está marcada como NO disponible
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Hamburguesa Clásica');
    });

    it('should return empty array or safe dishes when extreme restrictions', async () => {
      const params: RecommendationParams = {
        allergies: ['shellfish', 'fish', 'eggs', 'dairy', 'gluten', 'nuts'],
        dietaryRestrictions: [],
        budget: { min: 0, max: 500 }, // Budget muy bajo
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // Debe devolver array
      expect(Array.isArray(recommendations)).toBe(true);

      // Si hay recomendaciones, TODAS deben cumplir seguridad
      recommendations.forEach((rec) => {
        const allergenChecks = rec.safetyChecks.filter(c => c.type === 'allergen' && c.passed);
        expect(allergenChecks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('📊 Scoring and Ranking Quality', () => {
    it('should return maximum 3 recommendations', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should include score breakdown for all recommendations', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      recommendations.forEach((rec) => {
        expect(rec.scoreBreakdown).toBeDefined();
        expect(rec.scoreBreakdown.safety).toBeDefined();
        expect(rec.scoreBreakdown.dietaryMatch).toBeDefined();
        expect(rec.scoreBreakdown.budgetFit).toBeDefined();
        expect(rec.scoreBreakdown.preferencesMatch).toBeDefined();
        expect(rec.scoreBreakdown.semanticScore).toBeDefined();
        expect(rec.scoreBreakdown.availability).toBeDefined();
        expect(rec.scoreBreakdown.total).toBeDefined();
      });
    });

    it('should prioritize dishes within budget range', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 1000, max: 2000 }, // Rango medio
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // Los platos dentro del rango deben tener mejor budget score
      recommendations.forEach((rec) => {
        if (rec.dish.price >= 1000 && rec.dish.price <= 2000) {
          expect(rec.scoreBreakdown.budgetFit).toBeGreaterThan(0.5);
        }
      });
    });

    it('should include justification for each recommendation', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegetarian'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      recommendations.forEach((rec) => {
        expect(rec.justification).toBeDefined();
        expect(rec.justification.length).toBeGreaterThan(0);
      });
    });
  });

  describe('⚠️ Edge Cases and Error Handling', () => {
    it('should handle empty menu gracefully', async () => {
      mockRepository.findAllAvailable.mockResolvedValue([]);

      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      // Debe lanzar error cuando no hay platos disponibles
      await expect(service.generateRecommendations(params)).rejects.toThrow('No hay platos disponibles en el menú');
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findAllAvailable.mockRejectedValue(new Error('Database connection failed'));

      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      await expect(service.generateRecommendations(params)).rejects.toThrow('Database connection failed');
    });
  });

  describe('🔍 Safety Check Validation', () => {
    it('should populate safety checks for each recommendation', async () => {
      const params: RecommendationParams = {
        allergies: ['nuts'],
        dietaryRestrictions: ['vegetarian'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      recommendations.forEach((rec) => {
        expect(rec.safetyChecks).toBeDefined();
        expect(Array.isArray(rec.safetyChecks)).toBe(true);
        expect(rec.safetyChecks.length).toBeGreaterThan(0);

        // Todos los safety checks deben haber pasado
        const failedChecks = rec.safetyChecks.filter(c => !c.passed);
        expect(failedChecks.length).toBe(0);
      });
    });
  });
});

/**
 * CRITERIOS DE ACEPTACIÓN PARA Task #41:
 * 
 * ✅ MUST PASS:
 * 1. 100% de tests de alérgenos deben pasar
 * 2. 100% de tests de restricciones dietarias deben pasar
 * 3. NUNCA recomendar platos con alérgenos declarados
 * 4. NUNCA recomendar platos que violen restricciones dietarias
 * 5. NUNCA recomendar platos no disponibles
 * 6. Manejar correctamente combinaciones de filtros
 * 7. Manejar casos edge sin crashes
 * 
 * 🎯 COBERTURA OBJETIVO:
 * - Líneas: > 90%
 * - Branches: > 85%
 * - Functions: > 90%
 * 
 * 🚨 SEVERIDAD:
 * Cualquier fallo en tests de seguridad alimentaria es BLOCKER.
 * NO se puede deployar sin pasar el 100% de estos tests.
 */
