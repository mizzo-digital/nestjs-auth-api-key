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
  /** Nome do header da API Key. Default: x-api-key */
  headerName?: string;
  /** Lista de chaves válidas explícitas. */
  keys?: string[];
  /** Permitir buscar também via query param (?api_key=). Default: false */
  allowQueryParam?: boolean;
  /** Nomes de variáveis de ambiente para fallback. Default: ['API_KEY','API_KEYS'] */
  envKeysVariableNames?: string[];
  /** Comparação case insensitive das chaves. Default: true */
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
    // Normalizar todos os headers para acesso case insensitive
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
    // Fallback ambiente
    for (const name of envVarNames) {
      const raw = process.env[name];
      if (!raw) continue;
      // Pode ser uma única chave ou lista separada por vírgula/ espaço / ponto e vírgula
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
    if (!allowed.length) return false; // Se nenhuma chave configurada, negar por segurança
    const candidate = caseInsensitive ? provided.toLowerCase() : provided;
    return allowed.includes(candidate);
  }
}
