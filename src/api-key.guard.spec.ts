import { ApiKeyGuard, API_KEY_GUARD_METADATA_KEY } from './api-key.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

function makeContext(
  headers: Record<string, string | undefined>,
  query: Record<string, any> = {},
  metadata?: any,
) {
  const handler = () => undefined;
  if (metadata) {
    Reflect.defineMetadata(API_KEY_GUARD_METADATA_KEY, metadata, handler);
  }
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers, query }) }),
    getHandler: () => handler,
    getClass: () => ({}),
  } as any; // Simplified ExecutionContext mock
}

describe('ApiKeyGuard', () => {
  const reflector = new Reflector();
  const guard = new ApiKeyGuard(reflector);

  beforeEach(() => {
    // Limpar variáveis de ambiente mutáveis entre testes
    delete process.env.API_KEY;
    delete process.env.API_KEYS;
  });

  it('deve lançar Unauthorized (401) quando header ausente', () => {
    const ctx = makeContext({}, {}, { keys: ['abc'] });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('deve lançar Forbidden (403) quando chave inválida', () => {
    const ctx = makeContext({ 'x-api-key': 'errada' }, {}, { keys: ['certa'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('deve permitir acesso com chave válida explícita', () => {
    const ctx = makeContext({ 'x-api-key': 'token' }, {}, { keys: ['token'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deve aceitar chave via variável de ambiente (API_KEYS)', () => {
    process.env.API_KEYS = 'a,b,c';
    const ctx = makeContext({ 'x-api-key': 'b' }, {}); // Sem keys explícitas
    // Metadata vazio => fallback env
    expect(() => guard.canActivate(ctx)).not.toThrow();
  });

  it('deve falhar se nenhuma chave configurada ou em env', () => {
    const ctx = makeContext({ 'x-api-key': 'qualquer' }, {}); // Sem metadata nem env
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('deve aceitar query param quando allowQueryParam habilitado', () => {
    const ctx = makeContext(
      {},
      { api_key: 'abc' },
      { keys: ['abc'], allowQueryParam: true },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
