import swaggerUi from 'swagger-ui-express';
import SwaggerGenerator from './swagger/generator.js';
import { PrismaClient } from './generated/prisma/index.js';

let cachedSpecs = null;
let lastGenerated = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get Swagger specifications with caching
 * Automatically regenerates docs when cache expires or in development
 */
export async function getSwaggerSpecs(app) {
  const now = Date.now();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // In development, always regenerate to ensure fresh route discovery
  // In production, use caching
  if (cachedSpecs && lastGenerated && !isDevelopment && (now - lastGenerated) < CACHE_DURATION) {
    return cachedSpecs;
  }

  try {
    // Initialize Prisma client for schema generation
    const prisma = new PrismaClient();
    
    // Create the automated generator
    const generator = new SwaggerGenerator(app, prisma);
    
    // Generate the complete documentation
    const specs = await generator.generateDocumentation();
    
    // Cache the results
    cachedSpecs = specs;
    lastGenerated = now;
    
    console.log('✅ Swagger documentation auto-generated successfully');
    
    // Clean up Prisma client
    await prisma.$disconnect();
    
    return specs;
  } catch (error) {
    console.error('❌ Error generating Swagger documentation:', error);
    
    // Return fallback documentation if generation fails
    return getFallbackSpecs();
  }
}

/**
 * Generate fallback servers configuration
 */
function generateFallbackServers() {
  const servers = [];
  
  // Production/deployed server
  if (process.env.API_BASE_URL) {
    servers.push({
      url: process.env.API_BASE_URL,
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Deployed server',
    });
  }
  
  // Staging server
  if (process.env.STAGING_API_URL) {
    servers.push({
      url: process.env.STAGING_API_URL,
      description: 'Staging server',
    });
  }
  
  // Local development server
  const port = process.env.PORT || 5000;
  const localUrl = `http://localhost:${port}`;
  
  // Only add localhost if we're in development or no other servers are defined
  if (process.env.NODE_ENV !== 'production' || servers.length === 0) {
    servers.push({
      url: localUrl,
      description: 'Development server',
    });
  }
  
  // Fallback if no servers defined
  if (servers.length === 0) {
    servers.push({
      url: localUrl,
      description: 'Local server',
    });
  }
  
  return servers;
}

/**
 * Fallback Swagger specs if auto-generation fails
 */
function getFallbackSpecs() {
  return {
    openapi: '3.0.0',
    info: {
      title: process.env.API_TITLE || 'AI Life Coach API',
      version: process.env.API_VERSION || '1.0.0',
      description: 'API documentation (fallback mode - auto-generation failed)',
    },
    servers: generateFallbackServers(),
    paths: {
      '/api/users': {
        get: {
          summary: 'List all users',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { type: 'object' } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}

/**
 * Create Swagger middleware that automatically updates documentation
 */
export function createSwaggerMiddleware(app) {
  return async (req, res, next) => {
    if (req.path === '/api-docs/swagger.json') {
      try {
        const specs = await getSwaggerSpecs(app);
        res.json(specs);
      } catch (error) {
        console.error('Error serving Swagger specs:', error);
        res.status(500).json({ error: 'Failed to generate API documentation' });
      }
    } else {
      next();
    }
  };
}

/**
 * Force regeneration of Swagger documentation
 */
export function regenerateSwaggerDocs() {
  cachedSpecs = null;
  lastGenerated = null;
  console.log('🔄 Swagger documentation cache cleared - will regenerate on next request');
}

export { swaggerUi };
export default swaggerUi;
