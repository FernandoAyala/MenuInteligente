import { Request, Response, Router } from 'express';
import { OrderStatus } from '../models/order.model';
import orderService from '../services/order.service';

const router: Router = Router();

/**
 * POST /api/orders
 * Crear una nueva comanda desde el carrito
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, sessionId, cartItems, customerNotes } = req.body;

    if (!tableNumber || !sessionId || !cartItems || !Array.isArray(cartItems)) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tableNumber, sessionId, cartItems',
      });

      return;
    }

    if (cartItems.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Cart is empty',
      });

      return;
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


    return;
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });

    return;
  }
});

/**
 * GET /api/orders
 * Obtener todas las comandas activas (para el tablero de cocina)
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
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

    return;
  }
});

/**
 * GET /api/orders/:id
 * Obtener una comanda por ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderService.getById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });

      return;
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

    return;
  }
});

/**
 * PATCH /api/orders/:id/status
 * Actualizar el estado de una comanda
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      });

      return;
    }

    // Validar que el estado sea válido
    if (!Object.values(OrderStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`,
      });

      return;
    }

    const order = await orderService.updateStatus(id, status, cancelReason);

    res.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error('Error updating order status:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });

      return;
    }

    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });

      return;
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });

    return;
  }
});

/**
 * GET /api/orders/status/:status
 * Obtener comandas por estado
 */
router.get('/status/:status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;

    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`,
      });

      return;
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

    return;
  }
});

/**
 * GET /api/orders/table/:tableNumber
 * Obtener comandas de una mesa
 */
router.get('/table/:tableNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);

    if (isNaN(tableNumber)) {
      res.status(400).json({
        success: false,
        error: 'Invalid table number',
      });

      return;
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

    return;
  }
});

/**
 * GET /api/orders/session/:sessionId
 * Obtener comandas de una sesión
 */
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
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

    return;
  }
});

/**
 * GET /api/orders/stats/daily
 * Obtener estadísticas del día
 */
router.get('/stats/daily', async (req: Request, res: Response): Promise<void> => {
  try {
    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });

      return;
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

    return;
  }
});

/**
 * GET /api/orders/stats/today
 * Obtener todas las comandas del día
 */
router.get('/stats/today', async (_req: Request, res: Response): Promise<void> => {
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

    return;
  }
});

/**
 * DELETE /api/orders/:id/cancel
 * Cancelar una comanda
 */
router.delete('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: reason',
      });

      return;
    }

    const order = await orderService.cancelOrder(id, reason);

    res.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error('Error cancelling order:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });

      return;
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });


    return;
  }
});

export default router;
