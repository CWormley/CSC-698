import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// User operations
export const userService = {
  // Get all users
  async getAll() {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        aiMemory: true,
        _count: {
          select: {
            messages: true,
            reminders: true,
          },
        },
      },
    });
  },

  // Create a new user
  async create(userData) {
    return await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        passwordHash: userData.passwordHash,
      },
      include: {
        aiMemory: true,
        messages: true,
        reminders: true,
      },
    });
  },

  // Get user by ID
  async getById(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        aiMemory: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 messages
        },
        reminders: {
          where: { completed: false },
          orderBy: { dueDate: 'asc' },
        },
      },
    });
  },

  // Get user by email
  async getByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        aiMemory: true,
        messages: true,
        reminders: true,
      },
    });
  },

  // Update user
  async update(userId, userData) {
    return await prisma.user.update({
      where: { id: userId },
      data: userData,
    });
  },

  // Delete user
  async delete(userId) {
    return await prisma.user.delete({
      where: { id: userId },
    });
  },
};

// Message operations
export const messageService = {
  // Create a new message
  async create(messageData) {
    return await prisma.message.create({
      data: {
        text: messageData.text,
        userId: messageData.userId,
        role: messageData.role || "user", // Defaults to "user" if not specified
      },
      include: {
        user: true,
      },
    });
  },

  // Get messages for a user
  async getByUser(userId, limit = 50) {
    return await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }, // Changed to asc so older messages come first (natural conversation order)
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  // Get recent conversation (last N messages)
  async getConversation(userId, limit = 10) {
    return await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  // Delete message
  async delete(messageId) {
    return await prisma.message.delete({
      where: { id: messageId },
    });
  },
};

// Reminder operations
export const reminderService = {
  // Create a new reminder
  async create(reminderData) {
    return await prisma.reminder.create({
      data: {
        userId: reminderData.userId,
        title: reminderData.title,
        dueDate: new Date(reminderData.dueDate),
        repeatType: reminderData.repeatType,
        repeatUntil: reminderData.repeatUntil ? new Date(reminderData.repeatUntil) : null,
        interval: reminderData.interval,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  // Get reminders for a user
  async getByUser(userId, includeCompleted = false) {
    return await prisma.reminder.findMany({
      where: {
        userId,
        ...(includeCompleted ? {} : { completed: false }),
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get upcoming reminders (next 7 days)
  async getUpcoming(userId, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await prisma.reminder.findMany({
      where: {
        userId,
        completed: false,
        dueDate: {
          lte: endDate,
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Mark reminder as completed
  async markCompleted(reminderId) {
    return await prisma.reminder.update({
      where: { id: reminderId },
      data: { completed: true },
    });
  },

  // Update reminder
  async update(reminderId, reminderData) {
    return await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        ...reminderData,
        dueDate: reminderData.dueDate ? new Date(reminderData.dueDate) : undefined,
        repeatUntil: reminderData.repeatUntil ? new Date(reminderData.repeatUntil) : undefined,
      },
    });
  },

  // Delete reminder
  async delete(reminderId) {
    return await prisma.reminder.delete({
      where: { id: reminderId },
    });
  },
};

// AI Memory operations
export const aiMemoryService = {
  // Create or update AI memory for a user
  async upsert(userId, memoryData) {
    // First verify that the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Extract metadata fields (from chat onboarding parser)
    const extractionConfidence = memoryData._extractionConfidence || null;
    const extractionWarnings = memoryData._extractionWarnings || null;
    const extractedAt = memoryData._extractedAt || null;

    return await prisma.aIMemory.upsert({
      where: { userId },
      update: {
        summary: memoryData.summary,
        goals: memoryData.goals,
        preferences: memoryData.preferences,
        extractionConfidence,
        extractionWarnings,
        extractedAt,
        lastSync: new Date(),
      },
      create: {
        userId,
        summary: memoryData.summary,
        goals: memoryData.goals,
        preferences: memoryData.preferences,
        extractionConfidence,
        extractionWarnings,
        extractedAt,
      },
    });
  },

  // Get AI memory for a user
  async getByUser(userId) {
    return await prisma.aIMemory.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  // Update specific memory fields
  async updateGoals(userId, goals) {
    // First verify that the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return await prisma.aIMemory.upsert({
      where: { userId },
      update: {
        goals,
        lastSync: new Date(),
      },
      create: {
        userId,
        goals,
      },
    });
  },

  async updatePreferences(userId, preferences) {
    // First verify that the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return await prisma.aIMemory.upsert({
      where: { userId },
      update: {
        preferences,
        lastSync: new Date(),
      },
      create: {
        userId,
        preferences,
      },
    });
  },

  // Delete AI memory
  async delete(userId) {
    return await prisma.aIMemory.delete({
      where: { userId },
    });
  },
};

// Goal operations
export const goalService = {
  // Create a new goal
  async create(goalData) {
    return await prisma.goal.create({
      data: {
        userId: goalData.userId,
        text: goalData.text,
        category: goalData.category || 'general',
        priority: goalData.priority || 'medium',
        type: goalData.type || 'daily',
        lastCompletedDate: goalData.lastCompletedDate ? new Date(goalData.lastCompletedDate) : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Get all goals for a user
  async getByUser(userId) {
    return await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Get goal by ID
  async getById(goalId) {
    return await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Update goal
  async update(goalId, goalData) {
    return await prisma.goal.update({
      where: { id: goalId },
      data: goalData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Delete goal
  async delete(goalId) {
    return await prisma.goal.delete({
      where: { id: goalId },
    });
  },
};

// Calendar Event operations
export const calendarEventService = {
  // Helper function to validate date format (YYYY-MM-DD)
  _validateDate(date) {
    if (!date) return null;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date value');
    }
    
    return dateObj;
  },

  // Helper function to validate time format (HH:mm)
  _validateTime(time) {
    if (!time) return null;
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new Error('Invalid time format. Use HH:mm (24-hour format)');
    }
    
    return time;
  },

  // Create a new calendar event
  async create(eventData) {
    const date = eventData.date ? this._validateDate(eventData.date) : null;
    const time = eventData.time ? this._validateTime(eventData.time) : null;
    
    if (!date) {
      throw new Error('Event date is required (YYYY-MM-DD format)');
    }

    return await prisma.calendarEvent.create({
      data: {
        userId: eventData.userId,
        title: eventData.title,
        type: eventData.type || 'event',
        date,
        time,
        description: eventData.description,
        recurring: eventData.recurring || null, // "daily", "weekly", "biweekly", "monthly", "yearly"
        recurringDays: eventData.recurringDays || null, // JSON array string for weekly recurrence
        recurringEndDate: eventData.recurringEndDate ? new Date(eventData.recurringEndDate) : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Get all calendar events for a user
  async getByUser(userId) {
    return await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Get calendar event by ID
  async getById(eventId) {
    return await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Update calendar event
  async update(eventId, eventData) {
    const updateData = {};
    
    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.type !== undefined) updateData.type = eventData.type;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.completed !== undefined) updateData.completed = eventData.completed;
    
    // Validate and set date if provided
    if (eventData.date !== undefined) {
      updateData.date = eventData.date ? this._validateDate(eventData.date) : null;
    }
    
    // Validate and set time if provided
    if (eventData.time !== undefined) {
      updateData.time = eventData.time ? this._validateTime(eventData.time) : null;
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    return await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // Delete calendar event
  async delete(eventId) {
    return await prisma.calendarEvent.delete({
      where: { id: eventId },
    });
  },
};

// Close Prisma connection
export async function disconnect() {
  await prisma.$disconnect();
}

export default prisma;
