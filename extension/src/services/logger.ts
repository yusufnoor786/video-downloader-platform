import { LogEntry } from '@/types';
import { storage } from './storage';

class Logger {
  info(module: string, message: string, context?: any): void {
    this.log('info', module, message, context);
  }

  warn(module: string, message: string, context?: any): void {
    this.log('warn', module, message, context);
  }

  error(module: string, message: string, context?: any): void {
    this.log('error', module, message, context);
    console.error(`[${module}]`, message, context);
  }

  debug(module: string, message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', module, message, context);
      console.debug(`[${module}]`, message, context);
    }
  }

  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    module: string,
    message: string,
    context?: any
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      message,
      context,
    };

    storage.addLog(entry).catch((error) => {
      console.error('Failed to store log', error);
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] [${module}]`, message, context);
    }
  }
}

export const logger = new Logger();
