import { createLogger, format, transports } from 'winston';

const { combine, printf } = format;

const developEnvFormat = printf(({ level, message, ...metadata }) => {
  let msg = `[${level}]: ${message as string} `;
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata, null, 2);
  }

  return msg;
});

const awsCloudWatchFormat = format.printf(
  ({ level, message, ...metadata }) =>
    `[${level}]: ${message as string} ${Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata, null, 0)}` : ''}`,
);

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'silly',
  format: process.env.RUN_LOCAL ? combine(format.colorize({ all: true }), developEnvFormat) : awsCloudWatchFormat,
  transports: [new transports.Console()],
});
