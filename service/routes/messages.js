import express from 'express';
import { messageService } from '../db/index.js';

const router = express.Router();

// GET /api/messages/user/:userId - Get messages for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await messageService.getByUser(userId, limit);
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/conversation/:userId - Get recent conversation
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const messages = await messageService.getConversation(userId, limit);
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /api/messages - Create new message
router.post('/', async (req, res) => {
  try {
    const { text, userId } = req.body;
    
    if (!text || !userId) {
      return res.status(400).json({ error: 'Text and userId are required' });
    }
    
    const message = await messageService.create({ text, userId });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', async (req, res) => {
  try {
    await messageService.delete(req.params.id);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
