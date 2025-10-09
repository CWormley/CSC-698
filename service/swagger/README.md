# Automated Swagger Documentation

This project uses a completely automated Swagger documentation system that:

## 🚀 Features

- **Auto-generates schemas** from your Prisma database models
- **Auto-discovers API endpoints** from your Express routes
- **Real-time updates** when you modify your database or API structure
- **Zero maintenance** - no manual updates needed
- **Development-friendly** with file watching and hot reloading

## 📖 Accessing Documentation

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **View the documentation:**
   - Open http://localhost:5000/api-docs in your browser
   - The documentation will automatically reflect your current API structure

## 🔄 How It Works

### Automatic Schema Generation
The system reads your `prisma/schema.prisma` file and automatically generates OpenAPI schemas for:
- All your database models (User, Message, Reminder, AIMemory, etc.)
- Input schemas for POST/PUT operations
- Enum types
- Proper field types, validations, and descriptions

### Automatic Endpoint Discovery
The system scans your Express routes and automatically generates documentation for:
- All HTTP methods (GET, POST, PUT, DELETE)
- Path parameters (like `:id`)
- Request/response schemas
- Proper status codes and error responses

### Real-time Updates
- **Development mode**: Documentation regenerates automatically every 10 seconds
- **File watching**: Use `npm run swagger:watch` to regenerate on file changes
- **Manual refresh**: POST to `/api-docs/regenerate` to force regeneration

## 🛠️ Development Commands

```bash
# Start the server with auto-updating docs
npm run dev

# Watch files and auto-regenerate docs
npm run swagger:watch

# Manually regenerate documentation
npm run swagger:regenerate

# Show documentation URL
npm run docs
```

## 📁 File Structure

```
service/
├── swagger/
│   ├── generator.js     # Main auto-generation logic
│   └── watcher.js       # File watching utility
├── swagger.js           # Swagger configuration and middleware
├── prisma/
│   └── schema.prisma    # Database schema (auto-scanned)
└── routes/
    ├── users.js         # API routes (auto-scanned)
    ├── messages.js
    └── ...
```

## 🎯 Benefits

### For Developers
- **No manual documentation updates** - it's always current
- **Consistent documentation** - follows your actual code structure  
- **Time savings** - focus on code, not docs
- **Error prevention** - no outdated documentation

### For API Consumers
- **Always accurate** - reflects the current API state
- **Interactive testing** - test endpoints directly from the docs
- **Real-time updates** - see changes immediately
- **Complete coverage** - every endpoint is documented

## 🔧 Configuration

The system automatically detects:
- Database models from Prisma schema
- API routes from Express routers
- Request/response structures
- Field types and validations

### Customization Options

You can customize the documentation by:

1. **Adding descriptions to Prisma fields:**
   ```prisma
   model User {
     id    String @id @default(cuid()) // Auto-generates: "Unique identifier"
     email String @unique             // Auto-generates: "User email address"
   }
   ```

2. **Using meaningful route paths:**
   ```javascript
   // Auto-generates good documentation
   router.get('/:id', handler);           // "Get user by ID"
   router.post('/', handler);             // "Create new user"
   ```

## 🐛 Troubleshooting

### Documentation Not Updating?
1. Check if the server is running
2. Try manually regenerating: `npm run swagger:regenerate`
3. Clear cache by restarting the server

### Schema Generation Errors?
1. Verify your `prisma/schema.prisma` syntax
2. Run `npx prisma validate`
3. Check server logs for specific errors

### Missing Endpoints?
1. Ensure routes are properly imported in `index.js`
2. Check that routes follow Express conventions
3. Restart the server to refresh route discovery

## 📈 Future Enhancements

- **Request/response examples** from actual API calls
- **Authentication documentation** from middleware
- **Rate limiting documentation** from route configurations
- **Validation rules** from middleware and Prisma constraints

---

**The documentation is completely automatic - just code your API and the docs stay current!** 🎉
