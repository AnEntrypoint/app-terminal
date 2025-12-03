class ErrorHandler {
  constructor(appName) {
    this.appName = appName;
    this.errors = [];
    this.maxErrors = 100;
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'uncaught',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || '',
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandled-promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
        timestamp: new Date().toISOString()
      });
    });
  }

  logError(errorData) {
    const error = {
      app: this.appName,
      ...errorData,
      id: Math.random().toString(36).substr(2, 9)
    };

    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    console.error(`[${this.appName}] Error:`, error);
    this.sendToServer(error);
    this.notifyObservers(error);
  }

  async sendToServer(error) {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to send error to server:', e);
    }
  }

  notifyObservers(error) {
    const event = new CustomEvent('app-error', { detail: error });
    window.dispatchEvent(event);
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }

  wrapAsync(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logError({
          type: 'async-function',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };
  }

  wrapSync(fn) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.logError({
          type: 'sync-function',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };
  }
}

window.ErrorHandler = ErrorHandler;
