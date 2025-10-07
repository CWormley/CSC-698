# Setup Guide - AI Motivator and Life Coach

This guide will help you set up the development environment for the Personalized AI Motivator and Life Coach project from scratch.

## Prerequisites

### System Requirements
- **Operating System**: macOS, Linux, or Windows with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free space
- **Internet Connection**: Required for downloading dependencies and API access

### Required Software

#### 1. Node.js (v20 or higher)
```bash
# Install Node.js using Node Version Manager (recommended)
# Install nvm first
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc  # or ~/.zshrc on macOS

# Install and use Node.js v20
nvm install 20
nvm use 20
nvm alias default 20
```

#### 2. pnpm Package Manager
```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify installation
pnpm --version
```

#### 3. Git
```bash
# macOS (using Homebrew)
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Windows
# Download from https://git-scm.com/download/win
```

#### 4. Development Environment
Choose one of the following:
- **VS Code** (recommended): Download from https://code.visualstudio.com/
- **WebStorm**: https://www.jetbrains.com/webstorm/
- **Any text editor** with TypeScript support

### Mobile Development Setup

#### For iOS Development (macOS only)
```bash
# Install Xcode from App Store
# Install Xcode Command Line Tools
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods
```

#### For Android Development
1. **Java Development Kit (JDK 17)**
```bash
# macOS (using Homebrew)
brew install openjdk@17

# Add to your shell profile (~/.zshrc or ~/.bashrc)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH=$JAVA_HOME/bin:$PATH
```

2. **Android Studio**
   - Download from https://developer.android.com/studio
   - Install Android SDK (API level 33 or higher)
   - Set up Android Virtual Device (AVD)

3. **Environment Variables**
```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Database Setup

#### PostgreSQL
```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### Qdrant Vector Database
```bash
# Using Docker (recommended)
docker pull qdrant/qdrant
docker run -p 6333:6333 qdrant/qdrant

# Or install locally - see https://qdrant.tech/documentation/guides/installation/
```

## Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/CWormley/CSC-698.git
cd CSC-698
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
pnpm install

# This will install dependencies for:
# - Root workspace
# - mobile/ (React Native app)  
# - service/ (Express.js backend)
# - common/ (shared TypeScript types)
```

### 3. Environment Configuration

#### Backend Service (.env file)
Create `/service/.env`:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration  
DATABASE_URL=postgresql://username:password@localhost:5432/ai_coach_db

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_if_needed

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

#### React Native (.env file)
Create `/mobile/.env`:
```env
API_BASE_URL=http://localhost:3000
ENVIRONMENT=development
```

### 4. Database Setup
```bash
# Create PostgreSQL database
createdb ai_coach_db

# Run database migrations (when available)
cd service
# pnpm run migrate (implement this script)
```

### 5. Build the Project
```bash
# Build all packages
pnpm build

# Verify TypeScript compilation
pnpm typecheck
```

## Running the Application

### 1. Start the Backend Service
```bash
# Development mode with auto-reload
pnpm dev:service

# Or manually
cd service
pnpm dev
```
The API will be available at `http://localhost:3000`

### 2. Start the Mobile App

#### For iOS Simulator
```bash
# Start Metro bundler
pnpm dev:mobile

# In another terminal, run iOS simulator
cd mobile
pnpm ios
```

#### For Android Emulator
```bash
# Start Android emulator first (Android Studio > AVD Manager)
# Then start Metro bundler
pnpm dev:mobile

# In another terminal
cd mobile  
pnpm android
```

### 3. Development Workflow
```bash
# Run all tests
pnpm test

# Type checking across all packages
pnpm typecheck

# Build all packages
pnpm build

# Start specific package
pnpm --filter mobile start
pnpm --filter service dev
```

## API Keys and External Services

### OpenAI API
1. Sign up at https://platform.openai.com/
2. Create an API key
3. Add to `service/.env` as `OPENAI_API_KEY`

### Qdrant Vector Database
1. For cloud: Sign up at https://cloud.qdrant.io/
2. For local: Use Docker setup above
3. Configure connection in `service/.env`

### AWS (for production deployment)
1. Create AWS account
2. Set up IAM user with appropriate permissions
3. Configure AWS CLI: `aws configure`

## Troubleshooting

### Common Issues

#### Node.js Version Issues
```bash
# Check current version
node --version

# Switch to correct version
nvm use 20
```

#### Metro/React Native Cache Issues  
```bash
cd mobile
npx react-native start --reset-cache
```

#### Android Build Issues
```bash
cd mobile/android
./gradlew clean
cd ..
pnpm android
```

#### iOS Build Issues
```bash
cd mobile/ios
rm -rf Pods
pod install
cd ..
pnpm ios
```

#### Dependencies Issues
```bash
# Clean and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Port Conflicts
If ports 3000 or 8081 are in use:
```bash
# Kill processes on port
lsof -ti:3000 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```

## VS Code Extensions (Recommended)

Install these extensions for the best development experience:
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- ESLint
- React Native Tools
- GitLens

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## Getting Help

If you encounter issues:
1. Check this troubleshooting section
2. Search existing issues in the repository
3. Create a new issue with detailed error information
4. Contact the development team

## Next Steps

Once setup is complete:
1. Review the main [README.md](./README.md) for project overview
2. Check the `/mobile`, `/service`, and `/common` directories for package-specific documentation
3. Start development with your assigned tasks
4. Follow the team's Git workflow for contributions
