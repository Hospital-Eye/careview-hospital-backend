const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = format;

// Function to get file and line info from the stack trace
const getCallerInfo = () => {
  const stack = new Error().stack.split('\n');
  // Stack line format differs slightly by OS/Node version
  const callerLine = stack[3] || stack[2];
  const match = callerLine.match(/\(([^)]+)\)/);
  if (!match) return 'unknown:0';
  const parts = match[1].split(':');
  const filePath = parts[0];
  const line = parts[1];
  return `${path.basename(filePath)}:${line}`;
};

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  const location = getCallerInfo();
  return `${timestamp} [${level}] (${location}): ${stack || message}`;
});

const logger = createLogger({
  level: 'debug',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // logs stack traces for errors
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ],
});

module.exports = { logger };
