import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

export const API_KEY_GUARD_METADATA_KEY = 'API_KEY_GUARD_CONFIG';

export interface ApiKeyGuardConfig {
  /** API Key header name. Default: x-api-key */
  headerName?: string;
  /** List of explicit valid keys. */
  keys?: string[];
  /** Allow fetching via query param (?api_key=). Default: false */
  allowQueryParam?: boolean;
  /** Environment variable names for fallback. Default: ['API_KEY','API_KEYS'] */
  envKeysVariableNames?: string[];
  /** Case insensitive key comparison. Default: true */
  caseInsensitive?: boolean;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config =
      this.reflector.get<ApiKeyGuardConfig | undefined>(
        API_KEY_GUARD_METADATA_KEY,
        context.getHandler(),
      ) ||
      this.reflector.get<ApiKeyGuardConfig | undefined>(
        API_KEY_GUARD_METADATA_KEY,
        context.getClass(),
      ) ||
      {};

    const headerName = (config.headerName || 'x-api-key').toLowerCase();
    const allowQueryParam = config.allowQueryParam ?? false;
    const caseInsensitive = config.caseInsensitive ?? true;
    const envVarNames = config.envKeysVariableNames || ['API_KEY', 'API_KEYS'];

    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { query?: Record<string, any>; headers?: Record<string, any> }
    >();

    const provided = this.extractProvidedKey(request, headerName, allowQueryParam);
    if (!provided) {
      throw new UnauthorizedException('API key header missing');
    }

    const allowed = this.resolveAllowedKeys(config.keys, envVarNames, caseInsensitive);

    const isValid = this.validateKey(provided, allowed, caseInsensitive);
    if (!isValid) {
      throw new ForbiddenException('Invalid API key');
    }
    return true;
  }

  private extractProvidedKey(
    request: { headers?: Record<string, any>; query?: Record<string, any> },
    headerName: string,
    allowQueryParam: boolean,
  ): string | undefined {
    const headers = request.headers || {};
    // Normalize all headers for case-insensitive access
    const normalizedHeaderKey = Object.keys(headers).find((h) => h.toLowerCase() === headerName);
    let value: unknown = normalizedHeaderKey ? headers[normalizedHeaderKey] : undefined;
    if (!value && allowQueryParam) {
      const query = request.query || {};
      value = query.api_key || query.apiKey || query.key;
    }
    if (Array.isArray(value)) {
      value = value[0];
    }
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  }

  private resolveAllowedKeys(
    explicitKeys: string[] | undefined,
    envVarNames: string[],
    caseInsensitive: boolean,
  ): string[] {
    const keys: string[] = [];
    if (explicitKeys?.length) {
      keys.push(...explicitKeys.map((k) => k.trim()).filter(Boolean));
    }
    // Environment fallback
    for (const name of envVarNames) {
      const raw = process.env[name];
      if (!raw) continue;
      // Can be a single key or a list separated by comma/space/semicolon
      const parts = raw
        .split(/[;,\s]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      keys.push(...parts);
    }
    const unique = Array.from(new Set(keys.map((k) => (caseInsensitive ? k.toLowerCase() : k))));
    return unique;
  }

  private validateKey(provided: string, allowed: string[], caseInsensitive: boolean): boolean {
    if (!allowed.length) return false; // If no keys configured, deny for security
    const candidate = caseInsensitive ? provided.toLowerCase() : provided;
    return allowed.includes(candidate);
  }
}
