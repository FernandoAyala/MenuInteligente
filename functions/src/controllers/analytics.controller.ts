/**
 * Controlador para análisis de órdenes con IA
 * Permite hacer consultas en lenguaje natural sobre estadísticas de ventas
 */

import { Request, Response } from 'express';
import { MenuItemRepository } from '../repositories/menuItem.repository';
import { OrderRepository } from '../repositories/order.repository';
import { LLMService } from '../services/llm.service';
import { logger } from '../utils/logger';

export class AnalyticsController {
  private orderRepository: OrderRepository;
  private menuItemRepository: MenuItemRepository;
  private llmService: LLMService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.menuItemRepository = new MenuItemRepository();
    this.llmService = new LLMService();
  }

  /**
   * Procesa una consulta en lenguaje natural sobre estadísticas de órdenes
   */
  public async handleQuery(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Se requiere una consulta válida',
        });
        return;
      }

      logger.info('[AnalyticsController] Procesando consulta:', { query });

      // 1. Obtener todas las órdenes de la base de datos
      const orders = await this.orderRepository.findAll();
      logger.info('[AnalyticsController] Órdenes encontradas:', { count: orders.length });

      // 2. Obtener todos los items del menú para enriquecer los datos
      const allMenuItems = await this.menuItemRepository.findAllAvailable();
      const menuItemsMap = new Map(allMenuItems.map(item => [item.id, item]));

      // 3. Calcular estadísticas básicas
      const stats = this.calculateStatistics(orders);
      
      // Log para debug
      logger.info('[AnalyticsController] Estadísticas calculadas:', { 
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        ordersToday: stats.ordersToday,
        revenueToday: stats.revenueToday,
        topDishesCount: stats.topDishes.length,
        topDishes: stats.topDishes.slice(0, 3),
        dishSalesKeys: Object.keys(stats.dishSales).length
      });

      // 4. Crear contexto para el LLM con los datos relevantes
      const context = this.buildAnalyticsContext(stats, orders, menuItemsMap);

      // 5. Usar el LLM para responder la consulta
      const prompt = `Eres un asistente de análisis de ventas para un restaurante. 
Tu trabajo es responder preguntas sobre las estadísticas de órdenes basándote ÚNICAMENTE en los datos proporcionados.

DATOS DISPONIBLES:
${context}

IMPORTANTE: Los datos arriba son REALES de la base de datos Firebase. Hay ${orders.length} órdenes registradas.
${stats.topDishes.length > 0 ? `Los platos más vendidos están listados arriba con cantidades exactas.` : 'No se encontraron platos en las órdenes.'}

PREGUNTA DEL USUARIO:
${query}

INSTRUCCIONES:
- Responde de forma clara, concisa y profesional
- Usa emojis apropiados para hacer la respuesta más amigable
- Si la pregunta es sobre el plato más vendido, usa los datos de "TOP 10 PLATOS MÁS VENDIDOS" que se proporcionaron arriba
- Proporciona números exactos de las estadísticas
- Si la pregunta no puede responderse con los datos disponibles, indícalo claramente
- Formatea bien la respuesta con saltos de línea cuando sea necesario
- Usa bullet points (•) cuando listes múltiples items

IMPORTANTE SOBRE TIEMPOS DE PREPARACIÓN:
- Si te preguntan sobre tiempo promedio de preparación, usa los datos de "TIEMPOS DE PREPARACIÓN"
- Calcula el promedio sumando todos los tiempos y dividiendo por la cantidad de órdenes
- Ejemplo: Si hay 3 órdenes con 5, 10 y 15 minutos → Promedio = (5+10+15)/3 = 10 minutos
- Muestra el cálculo de forma clara para que el usuario entienda

IMPORTANTE SOBRE INSTRUCCIONES ESPECIALES:
- Si te preguntan qué platos tienen más instrucciones especiales, usa la sección "PLATOS CON INSTRUCCIONES ESPECIALES"
- Cada plato muestra cuántas veces se pidió con instrucciones y ejemplos de las instrucciones
- Ordena por cantidad de veces y muestra los platos más personalizados
- Incluye algunos ejemplos de las instrucciones para dar contexto

Responde ahora:`;

      // Usar el nuevo método para generar respuesta de texto libre
      const llmResponse = await this.llmService.generateTextResponse(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      logger.info('[AnalyticsController] Respuesta generada exitosamente');

      res.json({
        success: true,
        response: llmResponse,
        stats: {
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          averageOrderValue: stats.averageOrderValue,
        },
      });
    } catch (error) {
      logger.error('[AnalyticsController] Error al procesar consulta:', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Error al procesar la consulta',
      });
    }
  }

  /**
   * Calcula estadísticas generales de las órdenes
   */
  private calculateStatistics(orders: any[]) {
    const stats: any = {
      totalOrders: orders.length,
      totalRevenue: 0,
      ordersByStatus: {} as Record<string, number>,
      dishSales: {} as Record<string, { name: string; count: number; revenue: number }>,
      ordersByTable: {} as Record<number, number>,
      ordersWithSpecialInstructions: 0,
      averagePreparationTime: 0,
      ordersToday: 0,
      revenueToday: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders.forEach(order => {
      // Total revenue - intentar varios campos posibles
      const orderTotal = order.totalAmount || order.total || 0;
      stats.totalRevenue += orderTotal;

      // Orders by status
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;

      // Orders by table
      if (order.tableNumber) {
        stats.ordersByTable[order.tableNumber] = (stats.ordersByTable[order.tableNumber] || 0) + 1;
      }

      // Orders today - mejorar detección de fecha
      const orderDate = new Date(order.createdAt || order.timestamp || order.updatedAt);
      const orderDateOnly = new Date(orderDate);
      orderDateOnly.setHours(0, 0, 0, 0);
      
      if (orderDateOnly.getTime() === today.getTime()) {
        stats.ordersToday++;
        stats.revenueToday += orderTotal;
      }

      // Dish sales - usar 'dishes' en lugar de 'items'
      const dishesArray = order.dishes || order.items || [];
      if (Array.isArray(dishesArray) && dishesArray.length > 0) {
        dishesArray.forEach((dish: any) => {
          // El plato ya contiene name y price en el modelo OrderDish
          const dishName = dish.name;
          const dishPrice = dish.price;
          const quantity = dish.quantity || 1;

          if (dishName) {
            if (!stats.dishSales[dishName]) {
              stats.dishSales[dishName] = {
                name: dishName,
                count: 0,
                revenue: 0,
              };
            }
            stats.dishSales[dishName].count += quantity;
            stats.dishSales[dishName].revenue += dishPrice * quantity;
          }

          // Special instructions
          if (dish.specialInstructions) {
            stats.ordersWithSpecialInstructions++;
          }
        });
      }
    });

    // Calculate averages
    stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

    // Sort dishes by sales
    stats.topDishes = Object.values(stats.dishSales)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Construye el contexto de análisis para el LLM
   */
  private buildAnalyticsContext(stats: any, orders: any[], _menuItemsMap: Map<string, any>): string {
    // Calcular información de tiempos de preparación
    const ordersWithTiming = orders.filter(order => order.startedAt && (order.servedAt || order.readyAt));
    const timingDetails = ordersWithTiming.map(order => {
      const startTime = new Date(order.startedAt).getTime();
      const endTime = order.servedAt 
        ? new Date(order.servedAt).getTime() 
        : new Date(order.readyAt).getTime();
      const prepTimeMinutes = Math.round((endTime - startTime) / 1000 / 60);
      
      return {
        orderId: order.id,
        tableNumber: order.tableNumber,
        prepTimeMinutes,
        status: order.status,
      };
    }).filter(t => t.prepTimeMinutes > 0);

    const timingInfo = timingDetails.length > 0 
      ? `\n⏱️ TIEMPOS DE PREPARACIÓN (${timingDetails.length} órdenes con datos):\n${timingDetails.map(t => 
          `• Orden #${t.orderId?.substring(0, 8)} (Mesa ${t.tableNumber}): ${t.prepTimeMinutes} minutos [${t.status}]`
        ).join('\n')}\n`
      : '';

    // Recopilar información de instrucciones especiales
    const instructionsMap = new Map<string, { instructions: Set<string>; count: number }>();

    orders.forEach(order => {
      const dishesArray = order.dishes || order.items || [];
      if (Array.isArray(dishesArray)) {
        dishesArray.forEach((dish: any) => {
          if (dish.specialInstructions && dish.specialInstructions.trim()) {
            const dishName = dish.name;
            if (!instructionsMap.has(dishName)) {
              instructionsMap.set(dishName, { instructions: new Set(), count: 0 });
            }
            const dishData = instructionsMap.get(dishName)!;
            dishData.instructions.add(dish.specialInstructions);
            dishData.count++;
          }
        });
      }
    });

    // Convertir a array y ordenar por frecuencia
    const specialInstructionsDetails = Array.from(instructionsMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        examples: Array.from(data.instructions).slice(0, 3), // Mostrar hasta 3 ejemplos
      }))
      .sort((a, b) => b.count - a.count);

    const specialInstructionsInfo = specialInstructionsDetails.length > 0
      ? `\n📝 PLATOS CON INSTRUCCIONES ESPECIALES:\n${specialInstructionsDetails.map(item => 
          `• ${item.name}: ${item.count} ${item.count === 1 ? 'vez' : 'veces'}\n  Ejemplos: "${item.examples.join('", "')}"`
        ).join('\n')}\n`
      : '';

    const context = `
📊 ESTADÍSTICAS GENERALES:
• Total de órdenes: ${stats.totalOrders}
• Ingresos totales: $${stats.totalRevenue.toFixed(2)}
• Valor promedio por orden: $${stats.averageOrderValue.toFixed(2)}
• Órdenes hoy: ${stats.ordersToday}
• Ingresos hoy: $${stats.revenueToday.toFixed(2)}${timingInfo}

📈 ÓRDENES POR ESTADO:
${Object.entries(stats.ordersByStatus)
  .map(([status, count]) => `• ${this.translateStatus(status)}: ${count}`)
  .join('\n')}

🍽️ TOP 10 PLATOS MÁS VENDIDOS:
${stats.topDishes.map((dish: any, index: number) => 
  `${index + 1}. ${dish.name}: ${dish.count} unidades (Ingresos: $${dish.revenue.toFixed(2)})`
).join('\n')}

📋 ÓRDENES POR MESA:
${Object.entries(stats.ordersByTable)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 5)
  .map(([table, count]) => `• Mesa ${table}: ${count} órdenes`)
  .join('\n')}
${specialInstructionsInfo}
`;

    return context;
  }

  /**
   * Traduce el estado de la orden al español
   */
  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      'pending': 'Pendientes',
      'in-progress': 'En preparación',
      'ready': 'Listos',
      'served': 'Servidos',
      'cancelled': 'Cancelados',
    };
    return translations[status] || status;
  }

  /**
   * Exporta un reporte de análisis a Excel con las preguntas sugeridas
   */
  public async exportToExcel(_req: Request, res: Response): Promise<void> {
    try {
      const ExcelJS = require('exceljs');
      
      // 1. Obtener datos
      const orders = await this.orderRepository.findAll();
      const stats = this.calculateStatistics(orders);

      // 2. Crear workbook y worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Análisis de Ventas');

      // 3. Configurar estilos (se usan más adelante en el código)
      // const headerStyle = {
      //   font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      //   fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
      //   alignment: { vertical: 'middle', horizontal: 'left' },
      // };

      const questionStyle = {
        font: { bold: true, size: 11, color: { argb: 'FF1F2937' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } },
        alignment: { vertical: 'middle', horizontal: 'left' },
      };

      // 4. Título principal
      worksheet.mergeCells('A1:B1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = '📊 REPORTE DE ANÁLISIS DE VENTAS';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };
      worksheet.getRow(1).height = 30;

      // 5. Fecha del reporte
      worksheet.mergeCells('A2:B2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Fecha: ${new Date().toLocaleDateString('es-AR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      dateCell.alignment = { horizontal: 'center' };
      worksheet.addRow([]);

      let currentRow = 4;

      // 6. Pregunta 1: ¿Cuál fue el plato más vendido?
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      let cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '1. ¿Cuál fue el plato más vendido?';
      cell.style = questionStyle;
      currentRow++;

      if (stats.topDishes.length > 0) {
        const topDish = stats.topDishes[0];
        worksheet.getCell(`A${currentRow}`).value = 'Plato:';
        worksheet.getCell(`B${currentRow}`).value = topDish.name;
        currentRow++;
        worksheet.getCell(`A${currentRow}`).value = 'Cantidad vendida:';
        worksheet.getCell(`B${currentRow}`).value = `${topDish.count} unidades`;
        currentRow++;
        worksheet.getCell(`A${currentRow}`).value = 'Ingresos generados:';
        worksheet.getCell(`B${currentRow}`).value = `$${topDish.revenue.toFixed(2)}`;
      } else {
        worksheet.getCell(`A${currentRow}`).value = 'No hay datos disponibles';
      }
      currentRow += 2;

      // 7. Pregunta 2: ¿Cuántos pedidos se completaron hoy?
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '2. ¿Cuántos pedidos se completaron hoy?';
      cell.style = questionStyle;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Órdenes de hoy:';
      worksheet.getCell(`B${currentRow}`).value = stats.ordersToday;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Ingresos de hoy:';
      worksheet.getCell(`B${currentRow}`).value = `$${stats.revenueToday.toFixed(2)}`;
      currentRow += 2;

      // 8. Pregunta 3: ¿Cuál es el tiempo promedio de preparación?
      const ordersWithTiming = orders.filter(order => order.startedAt && (order.servedAt || order.readyAt));
      const avgPrepTime = ordersWithTiming.length > 0
        ? ordersWithTiming.reduce((sum, order) => {
            if (!order.startedAt) return sum;
            const startTime = new Date(order.startedAt).getTime();
            const endTime = order.servedAt 
              ? new Date(order.servedAt).getTime() 
              : (order.readyAt ? new Date(order.readyAt).getTime() : startTime);
            return sum + (endTime - startTime) / 1000 / 60;
          }, 0) / ordersWithTiming.length
        : 0;

      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '3. ¿Cuál es el tiempo promedio de preparación?';
      cell.style = questionStyle;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Tiempo promedio:';
      worksheet.getCell(`B${currentRow}`).value = avgPrepTime > 0 ? `${Math.round(avgPrepTime)} minutos` : 'Sin datos';
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Órdenes analizadas:';
      worksheet.getCell(`B${currentRow}`).value = ordersWithTiming.length;
      currentRow += 2;

      // 9. Pregunta 4: ¿Qué platos tienen más instrucciones especiales?
      const instructionsMap = new Map<string, number>();
      orders.forEach(order => {
        const dishesArray = order.dishes || [];
        if (Array.isArray(dishesArray)) {
          dishesArray.forEach((dish: any) => {
            if (dish.specialInstructions && dish.specialInstructions.trim()) {
              instructionsMap.set(dish.name, (instructionsMap.get(dish.name) || 0) + 1);
            }
          });
        }
      });
      const topInstructions = Array.from(instructionsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '4. ¿Qué platos tienen más instrucciones especiales?';
      cell.style = questionStyle;
      currentRow++;

      if (topInstructions.length > 0) {
        topInstructions.forEach(([name, count]) => {
          worksheet.getCell(`A${currentRow}`).value = name;
          worksheet.getCell(`B${currentRow}`).value = `${count} ${count === 1 ? 'vez' : 'veces'}`;
          currentRow++;
        });
      } else {
        worksheet.getCell(`A${currentRow}`).value = 'No hay platos con instrucciones especiales';
        currentRow++;
      }
      currentRow++;

      // 10. Pregunta 5: ¿Cuál es el valor total de ventas del día?
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '5. ¿Cuál es el valor total de ventas del día?';
      cell.style = questionStyle;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Total del día:';
      worksheet.getCell(`B${currentRow}`).value = `$${stats.revenueToday.toFixed(2)}`;
      currentRow += 2;

      // 11. Pregunta 6: ¿Qué mesa ha ordenado más platos?
      const topTable = Object.entries(stats.ordersByTable)
        .sort(([, a]: any, [, b]: any) => b - a)[0];

      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '6. ¿Qué mesa ha ordenado más platos?';
      cell.style = questionStyle;
      currentRow++;
      if (topTable) {
        worksheet.getCell(`A${currentRow}`).value = `Mesa ${topTable[0]}:`;
        worksheet.getCell(`B${currentRow}`).value = `${topTable[1]} órdenes`;
      } else {
        worksheet.getCell(`A${currentRow}`).value = 'No hay datos';
      }
      currentRow += 2;

      // 12. Pregunta 7: Muéstrame las estadísticas de ventas
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '7. Estadísticas generales de ventas';
      cell.style = questionStyle;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Total de órdenes:';
      worksheet.getCell(`B${currentRow}`).value = stats.totalOrders;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Ingresos totales:';
      worksheet.getCell(`B${currentRow}`).value = `$${stats.totalRevenue.toFixed(2)}`;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Valor promedio por orden:';
      worksheet.getCell(`B${currentRow}`).value = `$${stats.averageOrderValue.toFixed(2)}`;
      currentRow += 2;

      // 13. Pregunta 8: ¿Cuántos pedidos están pendientes?
      const pendingOrders = stats.ordersByStatus['pending'] || 0;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = '8. ¿Cuántos pedidos están pendientes?';
      cell.style = questionStyle;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = 'Pedidos pendientes:';
      worksheet.getCell(`B${currentRow}`).value = pendingOrders;
      currentRow++;

      // Órdenes por estado
      currentRow++;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      cell = worksheet.getCell(`A${currentRow}`);
      cell.value = 'Desglose por estado:';
      cell.font = { bold: true };
      currentRow++;
      Object.entries(stats.ordersByStatus).forEach(([status, count]) => {
        worksheet.getCell(`A${currentRow}`).value = this.translateStatus(status);
        worksheet.getCell(`B${currentRow}`).value = count;
        currentRow++;
      });

      // 14. Ajustar anchos de columnas
      worksheet.getColumn('A').width = 40;
      worksheet.getColumn('B').width = 30;

      // 15. Generar el archivo y enviarlo
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=reporte-analisis-${new Date().toISOString().split('T')[0]}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();

      logger.info('[AnalyticsController] Reporte Excel generado exitosamente');

    } catch (error) {
      logger.error('[AnalyticsController] Error al generar reporte Excel:', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Error al generar el reporte Excel',
      });
    }
  }
}
