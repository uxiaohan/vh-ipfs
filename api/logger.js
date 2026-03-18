import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = '/data/logs';
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024;

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const formatLogMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}\n`;
};

const writeLog = (level, message) => {
  const logMessage = formatLogMessage(level, message);
  
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      
      if (stats.size >= MAX_LOG_SIZE) {
        const backupFile = path.join(LOG_DIR, `app.${Date.now()}.log`);
        fs.renameSync(LOG_FILE, backupFile);
        
        const backupStats = fs.statSync(backupFile);
        if (backupStats.size > MAX_LOG_SIZE) {
          const truncatedContent = fs.readFileSync(backupFile, 'utf-8');
          const lines = truncatedContent.split('\n');
          const keepLines = lines.slice(-10000);
          fs.writeFileSync(backupFile, keepLines.join('\n'), 'utf-8');
        }
      }
    }
    
    fs.appendFileSync(LOG_FILE, logMessage, 'utf-8');
  } catch (err) {
    console.error('Failed to write log:', err);
  }
};

export const logger = {
  info: (message) => writeLog('INFO', message),
  error: (message) => writeLog('ERROR', message),
  warn: (message) => writeLog('WARN', message),
  debug: (message) => writeLog('DEBUG', message)
};

export { LOG_FILE };
