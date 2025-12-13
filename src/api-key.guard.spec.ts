import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_GUARD_METADATA_KEY, ApiKeyGuard } from './api-key.guard';

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
    // Clear mutable environment variables between tests
    process.env.API_KEY = undefined;
    process.env.API_KEYS = undefined;
  });

  it('should throw Unauthorized (401) when header is missing', () => {
    const ctx = makeContext({}, {}, { keys: ['abc'] });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw Forbidden (403) when key is invalid', () => {
    const ctx = makeContext({ 'x-api-key': 'wrong' }, {}, { keys: ['correct'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow access with explicit valid key', () => {
    const ctx = makeContext({ 'x-api-key': 'token' }, {}, { keys: ['token'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should accept key via environment variable (API_KEYS)', () => {
    process.env.API_KEYS = 'a,b,c';
    const ctx = makeContext({ 'x-api-key': 'b' }, {}); // Without explicit keys
    // Empty metadata => env fallback
    expect(() => guard.canActivate(ctx)).not.toThrow();
  });

  it('should fail if no keys configured or in env', () => {
    const ctx = makeContext({ 'x-api-key': 'any' }, {}); // Without metadata or env
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should accept query param when allowQueryParam is enabled', () => {
    const ctx = makeContext({}, { api_key: 'abc' }, { keys: ['abc'], allowQueryParam: true });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
