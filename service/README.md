# Service API - AI Life Coach Backend

This is the Express.js backend service for the AI Life Coach application. It provides REST APIs for user management, AI chat interactions, reminders, and integrates with PostgreSQL via Prisma ORM.

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL 15+
- pnpm package manager

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd service
pnpm install
```

### 2. Database Setup
Follow the database setup instructions below, then:
```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# (Optional) Seed the database
pnpm prisma db seed
```

### 3. Start Development Server
```bash
pnpm dev
```

The API will be available at `http://localhost:3000`

## 🗄️ Database Setup

### PostgreSQL Installation

#### macOS (Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create a database user (optional)
createuser --interactive --pwprompt
```

#### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the superuser password you set during installation

### Database Configuration

#### 1. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database for the project
CREATE DATABASE ai_coach_dev;

# Create a user for the application (recommended)
CREATE USER ai_coach_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_coach_dev TO ai_coach_user;

# Exit psql
\q
```

#### 2. Environment Variables
Create a `.env` file in the service directory:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/capstone_app?schema=public"

## 🔧 Prisma Setup & Workflow

### Initial Setup
```bash
# Install Prisma CLI globally (optional)
npm install -g prisma

# Generate Prisma client
pnpm prisma generate
```

### Development Workflow

#### 1. Schema Changes
1. Edit `prisma/schema.prisma`
2. Create and apply migration:
```bash
# Create migration
pnpm prisma migrate dev --name describe_your_changes

# This will:
# - Create a new migration file
# - Apply it to your local database
# - Regenerate Prisma client
```

#### 2. Database Reset (if needed)
```bash
# Reset database and apply all migrations
pnpm prisma migrate reset

# Push schema changes without creating migration (for prototyping)
pnpm prisma db push
```

#### 3. View Data
```bash
# Open Prisma Studio (database GUI)
pnpm prisma studio
```

### Local Development & Testing Only

This setup is designed for local development and testing only. Production database management is handled separately by the deployment team.

#### Local Development Workflow
```bash
# For local experimentation (doesn't create migration files)
pnpm prisma db push

# For local development with migration tracking
pnpm prisma migrate dev --name describe_your_changes

# Reset your local database when needed
pnpm prisma migrate reset
```

### Local Testing Best Practices

1. **Quick Prototyping**: Use `prisma db push` for rapid schema iteration
2. **Feature Development**: Use `prisma migrate dev` when you want to track changes
3. **Fresh Start**: Use `prisma migrate reset` to start with a clean database
4. **Team Sync**: Share schema changes through `prisma/schema.prisma` in git

## 📁 Project Structure

```
service/
├── prisma/
│   ├── schema.prisma        # Database schema definition
│   ├── migrations/          # Migration files (git tracked)
│   └── seed.js             # Database seeding script
├── generated/
│   └── prisma/             # Generated Prisma client (git ignored)
├── src/                    # Source code (when you organize it)
├── .env                    # Environment variables (git ignored)
├── index.js               # Main server file
└── package.json
```



## 🔍 Troubleshooting

### Common Database Issues

#### Connection Refused
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL if not running
brew services start postgresql@15     # macOS
sudo systemctl start postgresql       # Linux
```

#### Authentication Failed
```bash
# Test database connection
psql -U ai_coach_user -d ai_coach_dev -h localhost

# Reset user password if needed
sudo -u postgres psql
ALTER USER ai_coach_user PASSWORD 'new_password';
```

#### Migration Conflicts
```bash
# Reset migrations (WARNING: destroys data)
pnpm prisma migrate reset

# Or resolve manually by editing migration files
```

### Prisma Issues

#### Generated Client Out of Sync
```bash
# Regenerate Prisma client
pnpm prisma generate

# Clear generated files and regenerate
rm -rf generated/prisma
pnpm prisma generate
```

#### Schema Validation Errors
```bash
# Validate schema
pnpm prisma validate

# Format schema file
pnpm prisma format
```

## 🧪 Local Testing Environment

### Development Database
- Use local PostgreSQL instance only
- Enable query logging: Add `?debug=true` to DATABASE_URL
- Use Prisma Studio for data inspection
- Safe to reset/modify since it's local only

### Testing Database (Optional)
Create a separate database for running tests:
```env
# Add to .env for test database
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/capstone_app_test?schema=public"
```

### Important Notes
- **No Production Access**: This setup is for local development only
- **Safe Experimentation**: Feel free to reset, modify, or break your local database
- **Production Deployments**: Handled separately by the deployment team