// Structured, production-safe JSON logger with automatic PII and credential redaction

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  correlationId?: string;
  route?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'playertoken',
  'secret',
  'cookie',
  'authorization',
  'database_url',
  'postgres_url',
  'session_secret',
  'key',
  'credential',
]);

const SENSITIVE_PATTERN = /(?:postgres|postgresql):\/\/[^:]+:[^@]+@[^/]+\/[^?\s]+/gi;

function redactValue(key: string, value: unknown, depth = 0): unknown {
  if (depth > 4) return '[MaxDepth]';
  if (value === null || value === undefined) return value;

  const lowerKey = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lowerKey)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    if (SENSITIVE_PATTERN.test(value)) {
      return value.replace(SENSITIVE_PATTERN, 'postgres://[REDACTED_USER]:[REDACTED_PASS]@[HOST]/[DB]');
    }
    // Redact Bearer tokens
    if (value.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.replace(SENSITIVE_PATTERN, '[REDACTED_URL]'),
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(key, item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = redactValue(k, v, depth + 1);
    }
    return sanitizedObj;
  }

  return value;
}

function outputLog(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const isProd = process.env.NODE_ENV === 'production';

  const sanitizedContext = context ? (redactValue('context', context) as LogContext) : undefined;

  if (isProd) {
    const payload = {
      timestamp,
      level,
      message,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
      ...sanitizedContext,
    };
    const jsonStr = JSON.stringify(payload);
    if (level === 'error') {
      console.error(jsonStr);
    } else if (level === 'warn') {
      console.warn(jsonStr);
    } else {
      console.log(jsonStr);
    }
  } else {
    // Development console formatting
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const details = sanitizedContext ? JSON.stringify(sanitizedContext, null, 2) : '';
    if (level === 'error') {
      console.error(prefix, message, details);
    } else if (level === 'warn') {
      console.warn(prefix, message, details);
    } else {
      console.log(prefix, message, details);
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      outputLog('debug', message, context);
    }
  },
  info: (message: string, context?: LogContext) => {
    outputLog('info', message, context);
  },
  warn: (message: string, context?: LogContext) => {
    outputLog('warn', message, context);
  },
  error: (message: string, context?: LogContext) => {
    outputLog('error', message, context);
  },
};
