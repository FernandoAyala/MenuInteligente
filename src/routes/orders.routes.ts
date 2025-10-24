import { Request, Response, Router } from 'express';
import { OrderStatus } from '../models/order.model';
import orderService from '../services/order.service';

const router: Router = Router();

/**
 * POST /api/orders
 * Crear una nueva comanda desde el carrito
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tableNumber, sessionId, cartItems, customerNotes } = req.body;

    if (!tableNumber || !sessionId || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tableNumber, sessionId, cartItems',
      });
    }

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty',
      });
    }

    const order = await orderService.createFromCart(
      tableNumber,
      sessionId,
      cartItems,
      customerNotes,
    );

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders
 * Obtener todas las comandas activas (para el tablero de cocina)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await orderService.getActiveOrders();

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders/:id
 * Obtener una comanda por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.getById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Actualizar el estado de una comanda
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      });
    }

    // Validar que el estado sea válido
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`,
      });
    }

    const order = await orderService.updateStatus(id, status, cancelReason);

    res.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error('Error updating order status:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders/status/:status
 * Obtener comandas por estado
 */
router.get('/status/:status', async (req: Request, res: Response) => {
  try {
    const { status } = req.params;

    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`,
      });
    }

    const orders = await orderService.getOrdersByStatus(status as OrderStatus);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders/table/:tableNumber
 * Obtener comandas de una mesa
 */
router.get('/table/:tableNumber', async (req: Request, res: Response) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);

    if (isNaN(tableNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table number',
      });
    }

    const orders = await orderService.getOrdersByTable(tableNumber);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching orders by table:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders/session/:sessionId
 * Obtener comandas de una sesión
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const orders = await orderService.getOrdersBySession(sessionId);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching orders by session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders/stats/daily
 * Obtener estadísticas del día
 */
router.get('/stats/daily', async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    const stats = await orderService.getDailyStats(date);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/orders/stats/today
 * Obtener todas las comandas del día
 */
router.get('/stats/today', async (_req: Request, res: Response) => {
  try {
    const orders = await orderService.getTodayOrders();

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    console.error('Error fetching today orders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * DELETE /api/orders/:id/cancel
 * Cancelar una comanda
 */
router.delete('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: reason',
      });
    }

    const order = await orderService.cancelOrder(id, reason);

    res.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error('Error cancelling order:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
