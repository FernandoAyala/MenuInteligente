/**
 * Rutas para gestión de items del menú
 */

import { Request, Response, Router } from 'express';
import { MenuItemRepository } from '../repositories/menuItem.repository';

const router = Router();
const menuItemRepo = new MenuItemRepository();

/**
 * GET /api/menu-items/:id
 * Obtener un item del menú por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Buscando menu item: ${id}`);
    
    const menuItem = await menuItemRepo.findById(id);
    
    if (!menuItem) {
      console.log(`❌ Menu item no encontrado: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    console.log(`✅ Menu item encontrado: ${menuItem.name}`);
    
    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('❌ Error getting menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/menu-items
 * Obtener todos los items del menú disponibles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const menuItems = await menuItemRepo.findAllAvailable();
    
    res.json({
      success: true,
      data: menuItems,
      count: menuItems.length,
    });
  } catch (error) {
    console.error('Error getting menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
