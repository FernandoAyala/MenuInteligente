/**
 * Rutas para gestión de sesiones
 */

import { Request, Response, Router } from 'express';
import { SessionRepository } from '../repositories/session.repository';

const router = Router();
const sessionRepo = new SessionRepository();

/**
 * GET /api/sessions/:sessionId
 * Obtener una sesión por ID
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionRepo.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    return res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
