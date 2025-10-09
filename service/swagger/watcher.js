#!/usr/bin/env node

/**
 * Development utility for watching file changes and auto-regenerating Swagger docs
 * Usage: npm run swagger:watch
 */

import chokidar from 'chokidar';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = 'http://localhost:5000';
const REGENERATE_ENDPOINT = `${SERVER_URL}/api-docs/regenerate`;

// Files to watch for changes
const watchPaths = [
  path.join(__dirname, 'prisma/schema.prisma'),
  path.join(__dirname, 'routes/**/*.js'),
  path.join(__dirname, 'db/**/*.js'),
];

console.log('🔍 Watching for changes to auto-regenerate Swagger documentation...');
console.log('📁 Watching paths:');
watchPaths.forEach(p => console.log(`   - ${p}`));
console.log(`🌐 Server URL: ${SERVER_URL}/api-docs\n`);

// Create file watcher
const watcher = chokidar.watch(watchPaths, {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true
});

// Debounce function to avoid too many regenerations
let regenerateTimeout;
function debounceRegenerate(filePath) {
  clearTimeout(regenerateTimeout);
  regenerateTimeout = setTimeout(() => {
    regenerateSwaggerDocs(filePath);
  }, 1000); // Wait 1 second after last change
}

// Function to trigger documentation regeneration
async function regenerateSwaggerDocs(changedFile) {
  try {
    console.log(`📝 File changed: ${path.relative(__dirname, changedFile)}`);
    console.log('🔄 Regenerating Swagger documentation...');
    
    const response = await fetch(REGENERATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Documentation regenerated successfully');
      console.log(`🌐 View updated docs at: ${SERVER_URL}/api-docs\n`);
    } else {
      console.error('❌ Failed to regenerate documentation:', response.statusText);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Server not running. Start the server with: npm run dev');
    } else {
      console.error('❌ Error regenerating documentation:', error.message);
    }
  }
}

// Watch for file changes
watcher
  .on('change', debounceRegenerate)
  .on('add', debounceRegenerate)
  .on('unlink', debounceRegenerate)
  .on('ready', () => {
    console.log('👀 Watching for changes... (Press Ctrl+C to stop)');
  })
  .on('error', error => {
    console.error('❌ Watcher error:', error);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping file watcher...');
  watcher.close();
  process.exit(0);
});
