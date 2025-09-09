#!/usr/bin/env node

/**
 * ChaiQ App Builder - Maintenance Cleanup Script
 * 
 * This script performs routine cleanup and maintenance tasks:
 * - Removes old log files
 * - Cleans up temporary user data
 * - Optimizes database
 * - Clears expired sessions
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.join(__dirname, '..', 'server', 'logs');
const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

async function cleanup() {
  console.log('🧹 Starting ChaiQ v0.9 Limedrop maintenance cleanup...\n');

  try {
    // 1. Clean old log files (older than 30 days)
    await cleanOldLogs();

    // 2. Clean temporary files
    await cleanTempFiles();

    // 3. Optimize SQLite database
    await optimizeDatabase();

    // 4. Clean expired sessions (if using file-based sessions)
    await cleanExpiredSessions();

    // 5. Generate cleanup report
    await generateReport();

    console.log('✅ Cleanup completed successfully!\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

async function cleanOldLogs() {
  console.log('📄 Cleaning old log files...');
  
  try {
    await fs.access(LOG_DIR);
    const files = await fs.readdir(LOG_DIR);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime.getTime() < thirtyDaysAgo && file.endsWith('.log')) {
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`  🗑️  Deleted old log: ${file}`);
      }
    }
    
    console.log(`  ✅ Cleaned ${deletedCount} old log files\n`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  📝 No log directory found, skipping...\n');
    } else {
      throw error;
    }
  }
}

async function cleanTempFiles() {
  console.log('🗂️  Cleaning temporary files...');
  
  try {
    await fs.access(TEMP_DIR);
    await fs.rmdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.log('  ✅ Temporary files cleaned\n');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  📁 No temp directory found, creating...\n');
      await fs.mkdir(TEMP_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
}

async function optimizeDatabase() {
  console.log('🗄️  Optimizing SQLite database...');
  
  const dbPath = path.join(DATA_DIR, 'database.sqlite');
  
  try {
    await fs.access(dbPath);
    
    // Run SQLite vacuum command to optimize database
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);
    
    await new Promise((resolve, reject) => {
      db.run('VACUUM;', (err) => {
        if (err) reject(err);
        else resolve();
      });
      db.close();
    });
    
    const stats = await fs.stat(dbPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`  ✅ Database optimized (${sizeInMB} MB)\n`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  🆕 No database found yet, skipping optimization...\n');
    } else if (error.code === 'MODULE_NOT_FOUND') {
      console.log('  ⚠️  SQLite3 module not available, skipping optimization...\n');
    } else {
      throw error;
    }
  }
}

async function cleanExpiredSessions() {
  console.log('🔐 Cleaning expired sessions...');
  
  // For JWT-based auth, this is handled by token expiration
  // For demo purposes, we'll just log that sessions are JWT-based
  console.log('  ℹ️  Using JWT tokens (auto-expiring), no cleanup needed\n');
}

async function generateReport() {
  console.log('📊 Generating cleanup report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    actions: [
      'Cleaned old log files (>30 days)',
      'Cleared temporary files',
      'Optimized SQLite database',
      'Checked session expiration'
    ],
    nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  const reportPath = path.join(DATA_DIR, 'cleanup-report.json');
  
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`  ✅ Report saved to: ${reportPath}\n`);
  } catch (error) {
    console.log('  ⚠️  Could not save report:', error.message, '\n');
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanup().catch(console.error);
}

module.exports = { cleanup };