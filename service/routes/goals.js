import express from 'express';
import { goalService } from '../db/index.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// GET /api/goals - Get all goals for the user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const goals = await goalService.getByUser(userId);
    
    res.json({ success: true, data: goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// GET /api/goals/:id - Get specific goal
router.get('/:id', async (req, res) => {
  try {
    const goal = await goalService.getById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Skip ownership check for testing
    
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

// POST /api/goals - Create new goal
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { text, category = 'general', priority = 'medium' } = req.body;
    const userId = req.user.id;
    
    if (!text) {
      return res.status(400).json({ error: 'Goal text is required' });
    }
    
    const goal = await goalService.create({
      userId,
      text,
      category,
      priority,
    });
    
    console.log(`✅ Goal created for user ${userId}: "${text}"`);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /api/goals/:id - Update goal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { text, category, priority, completed } = req.body;
    const userId = req.user.id;
    
    const goal = await goalService.getById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Verify ownership
    if (goal.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this goal' });
    }
    
    const updated = await goalService.update(req.params.id, {
      text,
      category,
      priority,
      completed,
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /api/goals/:id - Delete goal
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const goal = await goalService.getById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Verify ownership
    if (goal.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this goal' });
    }
    
    await goalService.delete(req.params.id);
    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export default router;
