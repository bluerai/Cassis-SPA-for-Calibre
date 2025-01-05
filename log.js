import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = winston.format;

const logdir = process.env.LOGDIR || "./logs";
const fileLogSilent = (process.env.FILELOG === "false") || false;
const consoleLogSilent = (process.env.CONSOLELOG === "false") || false;
const errorLogSilent = (process.env.ERRORLOG === "false") || false;

const consoleTransport = new winston.transports.Console({
  level: 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  silent: consoleLogSilent,
});

export const fileTransport = new winston.transports.DailyRotateFile({
  level: process.env.LOGLEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  filename: logdir + '/full_%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  silent: fileLogSilent
});

const errorTransport = new winston.transports.File({
  level: 'error',
  format: winston.format.uncolorize(),
  filename: logdir + "/error.log",
  lazy: true,
  maxsize: '10m',
  silent: errorLogSilent
})

export const logger = winston.createLogger({
  transports: [
    consoleTransport,
    fileTransport,
    errorTransport
  ],
});

export function errorLogger(error) {
  logger.error(error.message + " " + JSON.stringify(error));
  logger.debug(error.stack);
}

