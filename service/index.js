import express from "express";
import cors from "cors";
import { disconnect } from "./db/index.js";

// Import route handlers
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import reminderRoutes from "./routes/reminders.js";
import aiMemoryRoutes from "./routes/ai-memory.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => res.send("AI Life Coach API Server running ✅"));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/ai-memory", aiMemoryRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

app.listen(PORT, () => {
  console.log(`🚀 AI Life Coach API Server running on port ${PORT}`);
  console.log(`📖 API endpoints available at http://localhost:${PORT}/api`);
});