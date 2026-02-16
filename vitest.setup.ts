import {
  type ILoggerFactory,
  type Logger,
  LoggerFactory,
} from "@nestjs-ai/commons";

const LOG_LEVELS: Record<string, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

const isEnabled = (level: number): boolean => {
  const configuredLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (!configuredLevel || !(configuredLevel in LOG_LEVELS)) return false;
  return level >= LOG_LEVELS[configuredLevel];
};

class ConsoleLogger implements Logger {
  constructor(public readonly name: string) {}

  trace(message: string, ...args: unknown[]): void {
    if (this.isTraceEnabled()) {
      console.trace(`[${this.name}] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDebugEnabled()) {
      console.debug(`[${this.name}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isInfoEnabled()) {
      console.info(`[${this.name}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isWarnEnabled()) {
      console.warn(`[${this.name}] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.isErrorEnabled()) {
      console.error(`[${this.name}] ${message}`, ...args);
    }
  }

  isTraceEnabled(): boolean {
    return isEnabled(LOG_LEVELS.TRACE);
  }

  isDebugEnabled(): boolean {
    return isEnabled(LOG_LEVELS.DEBUG);
  }

  isInfoEnabled(): boolean {
    return isEnabled(LOG_LEVELS.INFO);
  }

  isWarnEnabled(): boolean {
    return isEnabled(LOG_LEVELS.WARN);
  }

  isErrorEnabled(): boolean {
    return isEnabled(LOG_LEVELS.ERROR);
  }
}

class ConsoleLoggerFactory implements ILoggerFactory {
  getLogger(name: string): Logger {
    return new ConsoleLogger(name);
  }
}

LoggerFactory.bind(new ConsoleLoggerFactory());
