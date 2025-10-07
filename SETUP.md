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
# N/A
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
