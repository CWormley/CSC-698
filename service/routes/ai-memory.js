import express from 'express';
import { aiMemoryService } from '../db/index.js';

const router = express.Router();

// GET /api/ai-memory/:userId - Get AI memory for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const memory = await aiMemoryService.getByUser(userId);
    
    if (!memory) {
      return res.status(404).json({ error: 'AI memory not found for this user' });
    }
    
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('Error fetching AI memory:', error);
    res.status(500).json({ error: 'Failed to fetch AI memory' });
  }
});

// POST /api/ai-memory/:userId - Create or update AI memory
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { summary, goals, preferences } = req.body;
    
    const memory = await aiMemoryService.upsert(userId, {
      summary,
      goals,
      preferences,
    });
    
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('Error updating AI memory:', error);
    
    // Handle specific error cases
    if (error.message.includes('User with ID') && error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user ID - user does not exist' });
    }
    
    res.status(500).json({ error: 'Failed to update AI memory' });
  }
});

// PATCH /api/ai-memory/:userId/goals - Update user goals
router.patch('/:userId/goals', async (req, res) => {
  try {
    const { userId } = req.params;
    const goals = req.body; // Accept the entire body as goals JSON
    
    if (!goals || Object.keys(goals).length === 0) {
      return res.status(400).json({ error: 'Goals data is required' });
    }
    
    const memory = await aiMemoryService.updateGoals(userId, goals);
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('Error updating goals:', error);
    
    // Handle specific error cases
    if (error.message.includes('User with ID') && error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user ID - user does not exist' });
    }
    
    res.status(500).json({ error: 'Failed to update goals' });
  }
});

// PATCH /api/ai-memory/:userId/preferences - Update user preferences
router.patch('/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body; // Accept the entire body as preferences JSON
    
    if (!preferences || Object.keys(preferences).length === 0) {
      return res.status(400).json({ error: 'Preferences data is required' });
    }
    
    const memory = await aiMemoryService.updatePreferences(userId, preferences);
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('Error updating preferences:', error);
    
    // Handle specific error cases
    if (error.message.includes('User with ID') && error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user ID - user does not exist' });
    }
    
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// DELETE /api/ai-memory/:userId - Delete AI memory
router.delete('/:userId', async (req, res) => {
  try {
    await aiMemoryService.delete(req.params.userId);
    res.json({ success: true, message: 'AI memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI memory:', error);
    res.status(500).json({ error: 'Failed to delete AI memory' });
  }
});

export default router;
