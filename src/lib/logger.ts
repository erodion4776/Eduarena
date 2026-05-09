
type LogEntry = {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  details?: any;
};

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 50;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private addLog(level: 'info' | 'error' | 'warn', message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      details
    };
    this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
    this.notify();
    
    // Also log to console
    const color = level === 'error' ? 'red' : level === 'warn' ? 'orange' : 'cyan';
    console.log(`%c[${level.toUpperCase()}] ${message}`, `color: ${color}`, details || '');
  }

  info(message: string, details?: any) {
    this.addLog('info', message, details);
  }

  error(message: string, details?: any) {
    this.addLog('error', message, details);
  }

  warn(message: string, details?: any) {
    this.addLog('warn', message, details);
  }

  getLogs() {
    return this.logs;
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }
}

export const logger = new Logger();
