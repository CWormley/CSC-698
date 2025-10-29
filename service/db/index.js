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
      orderBy: { createdAt: 'desc' },
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

    return await prisma.aIMemory.upsert({
      where: { userId },
      update: {
        summary: memoryData.summary,
        goals: memoryData.goals,
        preferences: memoryData.preferences,
        lastSync: new Date(),
      },
      create: {
        userId,
        summary: memoryData.summary,
        goals: memoryData.goals,
        preferences: memoryData.preferences,
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

// Close Prisma connection
export async function disconnect() {
  await prisma.$disconnect();
}

export default prisma;
