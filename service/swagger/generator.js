import listEndpoints from 'express-list-endpoints';
import fs from 'fs';
import path from 'path';

/**
 * Automated Swagger Documentation Generator
 * This class automatically generates Swagger documentation from:
 * 1. Prisma schema models
 * 2. Express route definitions
 */
class SwaggerGenerator {
  constructor(app, prismaClient) {
    this.app = app;
    this.prismaClient = prismaClient;
    this.schemas = {};
    this.paths = {};
  }

  /**
   * Generate server configurations based on environment
   */
  generateServers() {
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
   * Generate complete Swagger documentation
   */
  async generateDocumentation() {
    // Generate schemas from Prisma models
    await this.generateSchemasFromPrisma();
    
    // Generate paths from Express routes
    this.generatePathsFromRoutes();
    
    return {
      openapi: '3.0.0',
      info: {
        title: process.env.API_TITLE || 'AI Life Coach API',
        version: process.env.API_VERSION || '1.0.0',
        description: process.env.API_DESCRIPTION || 'Automatically generated API documentation',
      },
      servers: this.generateServers(),
      components: {
        schemas: this.schemas,
        responses: {
          Success: {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          Error: {
            description: 'Error response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      paths: this.paths,
    };
  }

  /**
   * Generate Swagger schemas from Prisma models
   */
  async generateSchemasFromPrisma() {
    try {
      // Read the Prisma schema file
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      // Parse models and enums from the schema content
      const models = this.parsePrismaModels(schemaContent);
      const enums = this.parsePrismaEnums(schemaContent);

      // Convert each Prisma model to OpenAPI schema
      models.forEach(model => {
        this.schemas[model.name] = this.convertPrismaModelToSchema(model);
        
        // Create input schemas for POST/PUT operations
        this.schemas[`${model.name}Input`] = this.convertPrismaModelToInputSchema(model);
      });

      // Convert enums
      enums.forEach(enumModel => {
        this.schemas[enumModel.name] = {
          type: 'string',
          enum: enumModel.values,
          description: `Available values for ${enumModel.name}`
        };
      });

      console.log(`✅ Generated schemas for ${models.length} models and ${enums.length} enums`);

    } catch (error) {
      console.error('Error generating schemas from Prisma:', error);
      // Fallback to manual schemas if Prisma parsing fails
      this.generateFallbackSchemas();
    }
  }

  /**
   * Parse Prisma models from schema content
   */
  parsePrismaModels(schemaContent) {
    const models = [];
    const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      
      const fields = this.parsePrismaFields(modelBody);
      
      models.push({
        name: modelName,
        fields: fields
      });
    }

    return models;
  }

  /**
   * Parse Prisma enums from schema content
   */
  parsePrismaEnums(schemaContent) {
    const enums = [];
    const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
    let match;

    while ((match = enumRegex.exec(schemaContent)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];
      
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => line.split(/\s+/)[0]); // Get first word (enum value)

      enums.push({
        name: enumName,
        values: values
      });
    }

    return enums;
  }

  /**
   * Parse fields from a Prisma model body
   */
  parsePrismaFields(modelBody) {
    const fields = [];
    const lines = modelBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
        continue;
      }

      // Parse field definition: fieldName Type @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?\??\s*(.*)$/);
      if (fieldMatch) {
        const [, name, type, isArray, attributes] = fieldMatch;
        
        const field = {
          name: name,
          type: type,
          isList: !!isArray,
          isOptional: trimmed.includes('?'),
          isId: attributes.includes('@id'),
          isUnique: attributes.includes('@unique'),
          hasDefaultValue: attributes.includes('@default'),
          isUpdatedAt: attributes.includes('@updatedAt'),
          relationName: attributes.includes('@relation') ? 'relation' : null
        };

        // Determine if required (not optional, not auto-generated)
        field.isRequired = !field.isOptional && !field.hasDefaultValue && !field.isId;

        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Convert Prisma model to OpenAPI schema
   */
  convertPrismaModelToSchema(model) {
    const properties = {};
    const required = [];

    model.fields.forEach(field => {
      // Skip relation fields for now
      if (field.relationName) return;

      const property = this.convertPrismaFieldToProperty(field);
      properties[field.name] = property;

      // Add to required if field is required and not auto-generated
      if (field.isRequired && !field.hasDefaultValue && !field.isId) {
        required.push(field.name);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Convert Prisma model to input schema (for POST/PUT requests)
   */
  convertPrismaModelToInputSchema(model) {
    const properties = {};
    const required = [];

    model.fields.forEach(field => {
      // Skip relation fields and auto-generated fields
      if (field.relationName || field.isId || field.isUpdatedAt) return;

      const property = this.convertPrismaFieldToProperty(field);
      properties[field.name] = property;

      // Add to required if field is required and not auto-generated
      if (field.isRequired && !field.hasDefaultValue && field.name !== 'createdAt') {
        required.push(field.name);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Convert Prisma field to OpenAPI property
   */
  convertPrismaFieldToProperty(field) {
    const property = {};

    // Map Prisma types to OpenAPI types
    switch (field.type) {
      case 'String':
        property.type = 'string';
        if (field.name.includes('email')) {
          property.format = 'email';
        }
        break;
      case 'Int':
        property.type = 'integer';
        break;
      case 'Float':
        property.type = 'number';
        break;
      case 'Boolean':
        property.type = 'boolean';
        break;
      case 'DateTime':
        property.type = 'string';
        property.format = 'date-time';
        break;
      case 'Json':
        property.type = 'object';
        property.description = 'JSON object';
        break;
      default:
        // Handle enums and other custom types
        // Check if it's likely an enum (uppercase name)
        if (field.type === field.type.toUpperCase()) {
          property.$ref = `#/components/schemas/${field.type}`;
        } else {
          property.type = 'string';
        }
    }

    // Handle arrays
    if (field.isList) {
      const itemProperty = { ...property };
      property.type = 'array';
      property.items = itemProperty;
    }

    // Add description based on field name
    property.description = this.generateFieldDescription(field.name, field.type);

    return property;
  }

  /**
   * Generate field descriptions
   */
  generateFieldDescription(fieldName, fieldType) {
    const descriptions = {
      id: 'Unique identifier',
      email: 'User email address',
      name: 'Full name',
      title: 'Title or subject',
      text: 'Text content',
      createdAt: 'Creation timestamp',
      updatedAt: 'Last update timestamp',
      userId: 'Reference to user ID',
      dueDate: 'Due date for the item',
      completed: 'Completion status',
      summary: 'Summary or overview',
      goals: 'User goals (JSON object)',
      preferences: 'User preferences (JSON object)',
    };

    return descriptions[fieldName] || `${fieldName} field of type ${fieldType}`;
  }

  /**
   * Generate API paths from Express routes
   */
  generatePathsFromRoutes() {
    try {
      const endpoints = listEndpoints(this.app);
      console.log('🔍 Discovered endpoints:', endpoints);
      
      if (!endpoints || endpoints.length === 0) {
        console.warn('⚠️ No endpoints found. App might not be fully initialized.');
        // Add fallback routes based on known route files
        this.generateFallbackPaths();
        return;
      }
      
      endpoints.forEach(endpoint => {
        const path = endpoint.path.replace(/:(\w+)/g, '{$1}'); // Convert :id to {id}
        
        if (!this.paths[path]) {
          this.paths[path] = {};
        }

        endpoint.methods.forEach(method => {
          this.paths[path][method.toLowerCase()] = this.generateOperationFromEndpoint(endpoint, method);
        });
      });
      
      console.log(`✅ Generated ${Object.keys(this.paths).length} API paths`);
    } catch (error) {
      console.error('❌ Error generating paths from routes:', error);
      this.generateFallbackPaths();
    }
  }

  /**
   * Generate fallback paths when route discovery fails by scanning actual route files
   */
  generateFallbackPaths() {
    console.log('🔄 Using fallback path generation by scanning route files...');
    
    try {
      const routeFiles = this.scanRouteFiles();
      
      if (routeFiles.length === 0) {
        console.warn('⚠️ No route files found - no endpoints will be documented');
        return;
      }

      routeFiles.forEach(routeInfo => {
        console.log(`📁 Found routes in ${routeInfo.file}:`, routeInfo.routes.map(r => `${r.methods.join(',')} ${r.path}`));
        
        routeInfo.routes.forEach(route => {
          if (!this.paths[route.path]) {
            this.paths[route.path] = {};
          }

          route.methods.forEach(method => {
            this.paths[route.path][method.toLowerCase()] = this.generateOperationFromPath(route.path, method);
          });
        });
      });
      
      console.log(`✅ Generated documentation for ${Object.keys(this.paths).length} endpoints from actual route files`);
    } catch (error) {
      console.error('❌ Error scanning route files:', error);
      console.log('⚠️ No routes documented - please check your routes directory');
    }
  }

  /**
   * Scan route files to discover actual endpoints
   */
  scanRouteFiles() {
    const routesDir = path.join(process.cwd(), 'routes');
    const routeFiles = [];

    if (!fs.existsSync(routesDir)) {
      console.warn(`⚠️ Routes directory not found: ${routesDir}`);
      return [];
    }

    const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
    
    files.forEach(file => {
      try {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract route information from file
        const routes = this.extractRoutesFromFile(content, file);
        if (routes.length > 0) {
          const resourceName = path.basename(file, '.js');
          routeFiles.push({
            file: file,
            resource: resourceName,
            routes: routes
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error reading route file ${file}:`, error.message);
      }
    });

    return routeFiles;
  }

  /**
   * Extract routes from route file content using regex
   */
  extractRoutesFromFile(content, filename) {
    const routes = [];
    const resourceName = path.basename(filename, '.js');
    const basePath = `/api/${resourceName}`;

    // Regex patterns to match router method calls
    const routePatterns = [
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ];

    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [, method, routePath] = match;
        
        // Convert route path to full API path
        const fullPath = routePath === '/' ? basePath : `${basePath}${routePath}`;
        
        // Convert :param to {param} for OpenAPI
        const openApiPath = fullPath.replace(/:(\w+)/g, '{$1}');

        // Find existing route or create new one
        let existingRoute = routes.find(r => r.path === openApiPath);
        if (!existingRoute) {
          existingRoute = { path: openApiPath, methods: [] };
          routes.push(existingRoute);
        }

        const httpMethod = method.toUpperCase();
        if (!existingRoute.methods.includes(httpMethod)) {
          existingRoute.methods.push(httpMethod);
        }
      }
    });

    return routes;
  }

  /**
   * Generate operation from path when endpoint data is not available
   */
  generateOperationFromPath(path, method) {
    const operation = {
      summary: this.generateOperationSummary(path, method),
      description: this.generateOperationDescription(path, method),
      tags: [this.extractTagFromPath(path)],
    };

    // Add parameters for path variables
    const pathParams = path.match(/\{(\w+)\}/g);
    if (pathParams) {
      operation.parameters = pathParams.map(param => ({
        name: param.replace(/[{}]/g, ''), // Remove the braces
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${param.replace(/[{}]/g, '')} parameter`,
      }));
    }

    // Add request body for POST/PUT/PATCH methods
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const modelName = this.extractModelFromPath(path);
      
      // Special handling for goals and preferences endpoints
      if (path.includes('/goals')) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'User goals as a JSON object',
                example: {
                  "fitness": "Exercise 30 minutes daily",
                  "career": "Learn new programming language",
                  "health": "Eat more vegetables"
                }
              },
            },
          },
        };
      } else if (path.includes('/preferences')) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'User preferences as a JSON object',
                example: {
                  "communication_style": "direct",
                  "reminder_frequency": "daily",
                  "time_zone": "America/New_York"
                }
              },
            },
          },
        };
      } else if (modelName && this.schemas[`${modelName}Input`]) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${modelName}Input` },
            },
          },
        };
      }
    }

    // Add responses
    operation.responses = {
      '200': { $ref: '#/components/responses/Success' },
      '400': { $ref: '#/components/responses/Error' },
      '404': { $ref: '#/components/responses/Error' },
      '500': { $ref: '#/components/responses/Error' },
    };

    if (method === 'POST') {
      operation.responses['201'] = { $ref: '#/components/responses/Success' };
    }

    return operation;
  }

  /**
   * Generate OpenAPI operation from endpoint
   */
  generateOperationFromEndpoint(endpoint, method) {
    const operation = {
      summary: this.generateOperationSummary(endpoint.path, method),
      description: this.generateOperationDescription(endpoint.path, method),
      tags: [this.extractTagFromPath(endpoint.path)],
    };

    // Add parameters for path variables
    const pathParams = endpoint.path.match(/:(\w+)/g);
    if (pathParams) {
      operation.parameters = pathParams.map(param => ({
        name: param.substring(1), // Remove the ':'
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${param.substring(1)} parameter`,
      }));
    }

    // Add request body for POST/PUT/PATCH methods
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const modelName = this.extractModelFromPath(endpoint.path);
      
      // Special handling for goals and preferences endpoints
      if (endpoint.path.includes('/goals')) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'User goals as a JSON object',
                example: {
                  "fitness": "Exercise 30 minutes daily",
                  "career": "Learn new programming language",
                  "health": "Eat more vegetables"
                }
              },
            },
          },
        };
      } else if (endpoint.path.includes('/preferences')) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'User preferences as a JSON object',
                example: {
                  "communication_style": "direct",
                  "reminder_frequency": "daily",
                  "time_zone": "America/New_York"
                }
              },
            },
          },
        };
      } else if (modelName && this.schemas[`${modelName}Input`]) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${modelName}Input` },
            },
          },
        };
      }
    }

    // Add responses
    operation.responses = {
      '200': { $ref: '#/components/responses/Success' },
      '400': { $ref: '#/components/responses/Error' },
      '404': { $ref: '#/components/responses/Error' },
      '500': { $ref: '#/components/responses/Error' },
    };

    if (method === 'POST') {
      operation.responses['201'] = { $ref: '#/components/responses/Success' };
    }

    return operation;
  }

  /**
   * Generate operation summary
   */
  generateOperationSummary(path, method) {
    const resource = this.extractTagFromPath(path);
    const hasId = path.includes(':id') || path.includes('{id}');
    const hasEmail = path.includes('email');

    // Format resource name for display
    const displayResource = this.formatResourceName(resource);

    switch (method) {
      case 'GET':
        if (hasEmail) return `Get ${displayResource} by email`;
        if (hasId) return `Get ${displayResource} by ID`;
        return `List all ${displayResource}`;
      case 'POST':
        return `Create new ${displayResource}`;
      case 'PUT':
        return `Update ${displayResource}`;
      case 'DELETE':
        return `Delete ${displayResource}`;
      default:
        return `${method} ${displayResource}`;
    }
  }

  /**
   * Format resource name for display
   */
  formatResourceName(resource) {
    // Handle special cases
    if (resource === 'ai-memory') return 'AI Memory';
    
    // Convert to singular and title case
    const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  /**
   * Generate operation description
   */
  generateOperationDescription(path, method) {
    const resource = this.extractTagFromPath(path);
    const displayResource = this.formatResourceName(resource);
    const hasId = path.includes(':id') || path.includes('{id}');
    const hasEmail = path.includes('email');
    
    switch (method) {
      case 'GET':
        if (hasEmail) return `Retrieve a specific ${displayResource} by email address`;
        if (hasId) return `Retrieve a specific ${displayResource} by its unique ID`;
        return `Retrieve a list of all ${displayResource} records`;
      case 'POST':
        return `Create a new ${displayResource} record in the system`;
      case 'PUT':
        return `Update an existing ${displayResource} record with new data`;
      case 'DELETE':
        return `Permanently delete a ${displayResource} record from the system`;
      default:
        return `Perform ${method} operation on ${displayResource}`;
    }
  }

  /**
   * Extract tag from API path
   */
  extractTagFromPath(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
    
    // Look for the main resource after /api/
    if (parts.length >= 2 && parts[0] === 'api') {
      return parts[1]; // Return the resource name (users, messages, etc.)
    }
    
    // Fallback to the first meaningful part
    return parts[parts.length - 1] || 'api';
  }

  /**
   * Extract model name from path
   */
  extractModelFromPath(path) {
    const tag = this.extractTagFromPath(path);
    
    // Handle special cases
    if (tag === 'ai-memory') return 'AIMemory';
    
    // Convert plural to singular and capitalize
    const singular = tag.endsWith('s') ? tag.slice(0, -1) : tag;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  /**
   * Fallback schemas if Prisma parsing fails
   */
  generateFallbackSchemas() {
    this.schemas = {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          email: { type: 'string', format: 'email', description: 'User email' },
          name: { type: 'string', description: 'User name' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
        },
        required: ['email']
      },
      UserInput: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', description: 'User email' },
          name: { type: 'string', description: 'User name' }
        },
        required: ['email']
      }
    };
  }
}

export default SwaggerGenerator;
