
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
    const displayDetails = details instanceof Error 
      ? { message: details.message, stack: details.stack } 
      : details;
    console.log(`%c[${level.toUpperCase()}] ${message}`, `color: ${color}`, displayDetails || '');
  }

  private serializeDetails(details: any) {
    if (details instanceof Error) {
      return { 
        name: details.name, 
        message: details.message,
        stack: details.stack?.split('\n').slice(0, 2).join('\n') // Just first few lines
      };
    }
    return details;
  }

  info(message: string, details?: any) {
    this.addLog('info', message, this.serializeDetails(details));
  }

  error(message: string, details?: any) {
    this.addLog('error', message, this.serializeDetails(details));
  }

  warn(message: string, details?: any) {
    this.addLog('warn', message, this.serializeDetails(details));
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
