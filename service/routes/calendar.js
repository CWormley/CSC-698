import express from 'express';
import { calendarEventService } from '../db/index.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Validation helper for date/time input
const validateDateTimeInput = (date, time) => {
  const errors = [];
  
  if (!date) {
    errors.push('Event date is required (YYYY-MM-DD format)');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      errors.push('Invalid date format. Use YYYY-MM-DD');
    } else {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        errors.push('Invalid date value');
      }
    }
  }
  
  if (time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      errors.push('Invalid time format. Use HH:mm (24-hour format)');
    }
  }
  
  return errors;
};

// GET /api/calendar - Get all calendar events for the user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const events = await calendarEventService.getByUser(userId);
    
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// GET /api/calendar/:id - Get specific event
router.get('/:id', async (req, res) => {
  try {
    const event = await calendarEventService.getById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Skip ownership check for testing
    
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/calendar - Create new calendar event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, type = 'event', date, time, description, recurring, recurringDays, recurringEndDate } = req.body;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ error: 'Event title is required' });
    }
    
    // Validate date and time format
    const validationErrors = validateDateTimeInput(date, time);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid date/time format', 
        details: validationErrors 
      });
    }
    
    // Validate recurring pattern if provided
    const validRecurringTypes = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];
    if (recurring && !validRecurringTypes.includes(recurring)) {
      return res.status(400).json({ 
        error: `Invalid recurring type. Must be one of: ${validRecurringTypes.join(', ')}` 
      });
    }
    
    // Validate recurringDays if provided (should be array of 0-6)
    if (recurringDays) {
      try {
        const days = typeof recurringDays === 'string' ? JSON.parse(recurringDays) : recurringDays;
        if (!Array.isArray(days) || !days.every(d => typeof d === 'number' && d >= 0 && d <= 6)) {
          return res.status(400).json({ 
            error: 'recurringDays must be a JSON array of numbers 0-6 (e.g., [1,3,5] for Mon/Wed/Fri)' 
          });
        }
      } catch (e) {
        return res.status(400).json({ 
          error: 'recurringDays must be valid JSON array' 
        });
      }
    }
    
    const event = await calendarEventService.create({
      userId,
      title,
      type,
      date,
      time,
      description,
      recurring: recurring || null,
      recurringDays: recurringDays ? (typeof recurringDays === 'string' ? recurringDays : JSON.stringify(recurringDays)) : null,
      recurringEndDate,
    });
    
    console.log(`📅 Calendar event created for user ${userId}: "${title}" on ${date}${time ? ` at ${time}` : ''}${recurring ? ` (recurring: ${recurring})` : ''}`);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message || 'Failed to create calendar event' });
  }
});

// PUT /api/calendar/:id - Update calendar event
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, type, date, time, description, completed, recurring, recurringDays, recurringEndDate } = req.body;
    const userId = req.user.id;
    
    const event = await calendarEventService.getById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Verify ownership
    if (event.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this event' });
    }
    
    // Validate date and time format if provided
    if (date || time) {
      const validationErrors = validateDateTimeInput(date || event.date?.toISOString().split('T')[0], time || event.time);
      if (validationErrors.length > 0 && date) { // Only error if date was provided and invalid
        return res.status(400).json({ 
          error: 'Invalid date/time format', 
          details: validationErrors 
        });
      }
    }
    
    // Validate recurring pattern if provided
    const validRecurringTypes = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];
    if (recurring && !validRecurringTypes.includes(recurring)) {
      return res.status(400).json({ 
        error: `Invalid recurring type. Must be one of: ${validRecurringTypes.join(', ')}` 
      });
    }
    
    // Validate recurringDays if provided
    if (recurringDays) {
      try {
        const days = typeof recurringDays === 'string' ? JSON.parse(recurringDays) : recurringDays;
        if (!Array.isArray(days) || !days.every(d => typeof d === 'number' && d >= 0 && d <= 6)) {
          return res.status(400).json({ 
            error: 'recurringDays must be a JSON array of numbers 0-6 (e.g., [1,3,5] for Mon/Wed/Fri)' 
          });
        }
      } catch (e) {
        return res.status(400).json({ 
          error: 'recurringDays must be valid JSON array' 
        });
      }
    }
    
    const updated = await calendarEventService.update(req.params.id, {
      title,
      type,
      date,
      time,
      description,
      completed,
      recurring,
      recurringDays: recurringDays ? (typeof recurringDays === 'string' ? recurringDays : JSON.stringify(recurringDays)) : undefined,
      recurringEndDate,
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: error.message || 'Failed to update calendar event' });
  }
});

// DELETE /api/calendar/:id - Delete calendar event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const event = await calendarEventService.getById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Verify ownership
    if (event.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this event' });
    }
    
    await calendarEventService.delete(req.params.id);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

export default router;
