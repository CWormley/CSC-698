import 'dotenv/config';
import express from "express";
import cors from "cors";
import { disconnect } from "./db/index.js";
import { getSwaggerSpecs, createSwaggerMiddleware, swaggerUi, regenerateSwaggerDocs } from "./swagger.js";

// Import route handlers
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import reminderRoutes from "./routes/reminders.js";
import aiMemoryRoutes from "./routes/ai-memory.js";
import chatRoutes from "./routes/chat.js"; // Using real OpenAI with cost optimization
import goalRoutes from "./routes/goals.js";
import calendarRoutes from "./routes/calendar.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => res.send("AI Life Coach API Server running ✅"));

// API routes - REGISTER THESE FIRST
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/ai-memory", aiMemoryRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/calendar", calendarRoutes);

// Auto-updating Swagger middleware (after routes are registered)
app.use(createSwaggerMiddleware(app));

// Swagger documentation setup
let swaggerSetup;

// Swagger documentation routes
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', async (req, res, next) => {
  try {
    // Always generate fresh specs to ensure routes are captured
    const specs = await getSwaggerSpecs(app);
    const setup = swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "AI Life Coach API Documentation"
    });
    setup(req, res, next);
  } catch (error) {
    console.error('Error generating Swagger docs:', error);
    return res.status(500).send('Failed to generate API documentation');
  }
});

// Force regenerate docs endpoint (useful for development)
app.post('/api-docs/regenerate', (req, res) => {
  regenerateSwaggerDocs();
  swaggerSetup = null; // Reset setup to force regeneration
  res.json({ success: true, message: 'Documentation will be regenerated on next request' });
});

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