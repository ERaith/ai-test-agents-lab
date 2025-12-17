/**
 * Environment loader
 * 
 * Loads .env file into process.env
 * Must be imported at the top of entry point files
 */

import * as fs from 'fs';
import * as path from 'path';

export function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Parse KEY=value
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Only set if not already in environment
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      
      console.log('📁 Loaded .env file');
    }
  } catch (error) {
    // Silently ignore - .env is optional
  }
}

// Auto-load when imported
loadEnv();
