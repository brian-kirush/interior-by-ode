const winston = require('winston');
require('winston-daily-rotate-file');

const transports = [
    // In development, we'll log to the console.
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }),
];

// For production, we'll add a file transport to log errors.
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true, // Compress old log files
            maxSize: '20m',      // Rotate if file size exceeds 20MB
            maxFiles: '14d',     // Keep logs for 14 days
            level: 'error', // Only log messages with level 'error'
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json() // Log in JSON format
            ),
        })
    );
}

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    transports,
});

module.exports = logger;