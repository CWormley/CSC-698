import express from 'express';
import { reminderService } from '../db/index.js';

const router = express.Router();

// GET /api/reminders/user/:userId - Get reminders for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const includeCompleted = req.query.includeCompleted === 'true';
    
    const reminders = await reminderService.getByUser(userId, includeCompleted);
    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/upcoming/:userId - Get upcoming reminders
router.get('/upcoming/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 7;
    
    const reminders = await reminderService.getUpcoming(userId, days);
    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Error fetching upcoming reminders:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming reminders' });
  }
});

// POST /api/reminders - Create new reminder
router.post('/', async (req, res) => {
  try {
    const { userId, title, dueDate, repeatType, repeatUntil, interval } = req.body;
    
    if (!userId || !title || !dueDate) {
      return res.status(400).json({ 
        error: 'userId, title, and dueDate are required' 
      });
    }
    
    const reminder = await reminderService.create({
      userId,
      title,
      dueDate,
      repeatType,
      repeatUntil,
      interval,
    });
    
    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PATCH /api/reminders/:id/complete - Mark reminder as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const reminder = await reminderService.markCompleted(req.params.id);
    res.json({ success: true, data: reminder });
  } catch (error) {
    console.error('Error completing reminder:', error);
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});

// PUT /api/reminders/:id - Update reminder
router.put('/:id', async (req, res) => {
  try {
    const { title, dueDate, repeatType, repeatUntil, interval } = req.body;
    
    const reminder = await reminderService.update(req.params.id, {
      title,
      dueDate,
      repeatType,
      repeatUntil,
      interval,
    });
    
    res.json({ success: true, data: reminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    await reminderService.delete(req.params.id);
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;
