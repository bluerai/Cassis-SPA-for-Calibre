import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = winston.format;

const logdir = process.env.LOGDIR || "./logs";
const fileLogSilent = process.env.FILELOG_SILENT || false;
const consoleLogSilent = process.env.CONSOLELOG_SILENT || false;
const errorLogSilent = process.env.ERRORLOG_SILENT || false;

const consoleTransport = new winston.transports.Console({
  silent: consoleLogSilent,
});

const fileRotateTransport = new winston.transports.DailyRotateFile({
  level: 'debug',
  format: winston.format.uncolorize(),
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
  level: process.env.LOGLEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    consoleTransport,
    fileRotateTransport,
    errorTransport
  ],
});

export function errorLogger(error) {
  logger.error(error.message + " " + JSON.stringify(error));
  logger.debug(error.stack);
}

