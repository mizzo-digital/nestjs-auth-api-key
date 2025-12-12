# Nestjs Auth API Key

## Overview

The API Key Guard provides a flexible and secure mechanism for protecting NestJS endpoints using API key authentication. It supports multiple authentication methods (header and query parameter), environment-based configuration, and seamless integration with Swagger documentation.

## Features

- ✅ **Multiple Authentication Methods**: Header-based and query parameter authentication
- ✅ **Environment Variable Support**: Automatic key resolution from environment variables
- ✅ **Case Insensitive Comparison**: Configurable case sensitivity for key validation
- ✅ **Multiple Keys Support**: Accept multiple valid API keys from different sources
- ✅ **Swagger Integration**: Automatic security scheme documentation
- ✅ **Flexible Configuration**: Per-endpoint or class-level configuration

## Installation

The guard is built using NestJS core packages. Ensure you have the following dependencies:

```bash
npm install @nestjs/common @nestjs/core @nestjs/swagger
```

## Basic Usage

### 1. Setup Swagger Security Schemes

First, configure the Swagger security schemes in your application bootstrap:

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

const SWAGGER_SECURITY_SCHEME = {
  API_KEY_HEADER: 'api-key-header',
  API_KEY_QUERY: 'api-key-query',
} as const;

export const setupSwagger = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('Your API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-KEY',
        in: 'header',
        description: 'Enter your API key',
      },
      SWAGGER_SECURITY_SCHEME.API_KEY_HEADER,
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'api_key',
        in: 'query',
        description: 'Enter your API key',
      },
      SWAGGER_SECURITY_SCHEME.API_KEY_QUERY,
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);
};
```

### 2. Protect Individual Endpoints

Use the `@ApiKeyProtected()` decorator to protect specific endpoints:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiKeyProtected } from './guards';

@Controller('protected')
export class ProtectedController {
  @Get()
  @ApiKeyProtected({
    keys: ['my-secret-key'],
  })
  findAll() {
    return { message: 'Protected resource' };
  }
}
```

### 3. Protect Entire Controllers

Apply the decorator at the class level to protect all endpoints:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from './guards';

@Controller('admin')
@ApiKeyProtected({
  allowQueryParam: true,
  envKeysVariableNames: ['ADMIN_API_KEY'],
})
@ApiSecurity('api-key-header')
@ApiSecurity('api-key-query')
@ApiTags('Admin')
export class AdminController {
  @Get('dashboard')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('users')
  getUsers() {
    return { message: 'User list' };
  }
}
```

## Configuration Options

The `@ApiKeyProtected()` decorator accepts a configuration object with the following options:

| Option                 | Type       | Default                   | Description                                  |
| ---------------------- | ---------- | ------------------------- | -------------------------------------------- |
| `headerName`           | `string`   | `'x-api-key'`             | Name of the header containing the API key    |
| `keys`                 | `string[]` | `[]`                      | Explicit list of valid API keys              |
| `allowQueryParam`      | `boolean`  | `false`                   | Enable authentication via query parameter    |
| `envKeysVariableNames` | `string[]` | `['API_KEY', 'API_KEYS']` | Environment variable names to read keys from |
| `caseInsensitive`      | `boolean`  | `true`                    | Perform case-insensitive key comparison      |

### Configuration Examples

#### Using Explicit Keys

```typescript
@ApiKeyProtected({
  keys: ['key1', 'key2', 'key3'],
})
```

#### Using Environment Variables

```typescript
@ApiKeyProtected({
  envKeysVariableNames: ['MY_SERVICE_API_KEY'],
})
```

**Environment file (.env):**
```env
MY_SERVICE_API_KEY=super-secret-key
```

#### Multiple Keys from Environment

You can provide multiple keys in a single environment variable, separated by comma, semicolon, or space:

```env
API_KEYS=key1,key2,key3
# or
API_KEYS=key1;key2;key3
# or
API_KEYS=key1 key2 key3
```

#### Query Parameter Authentication

```typescript
@ApiKeyProtected({
  allowQueryParam: true,
  envKeysVariableNames: ['PUBLIC_API_KEY'],
})
```

Access the endpoint with:
```
GET /api/data?api_key=your-key-here
```

#### Custom Header Name

```typescript
@ApiKeyProtected({
  headerName: 'X-Custom-Auth-Key',
  keys: ['custom-key'],
})
```

Access the endpoint with:
```bash
curl -H "X-Custom-Auth-Key: custom-key" http://localhost:3000/api/data
```

#### Case Sensitive Keys

```typescript
@ApiKeyProtected({
  keys: ['MySecretKey123'],
  caseInsensitive: false,
})
```

## Authentication Methods

### Header-based (Recommended)

Send the API key in the request header:

```bash
curl -H "X-API-KEY: your-api-key" http://localhost:3000/api/protected
```

### Query Parameter (Optional)

Enable with `allowQueryParam: true` and send the key as a query parameter:

```bash
curl "http://localhost:3000/api/protected?api_key=your-api-key"
```

Supported query parameter names:
- `api_key`
- `apiKey`
- `key`

## Error Responses

### Missing API Key (401 Unauthorized)

**Request:**
```bash
curl http://localhost:3000/api/protected
```

**Response:**
```json
{
  "statusCode": 401,
  "message": "API key header missing",
  "error": "Unauthorized"
}
```

### Invalid API Key (403 Forbidden)

**Request:**
```bash
curl -H "X-API-KEY: wrong-key" http://localhost:3000/api/protected
```

**Response:**
```json
{
  "statusCode": 403,
  "message": "Invalid API key",
  "error": "Forbidden"
}
```

## Advanced Usage

### Base Controller Pattern

Create a base controller class with common authentication settings:

```typescript
import { Controller } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from './guards';

@Controller('jobs')
@ApiKeyProtected({
  allowQueryParam: true,
  envKeysVariableNames: ['JOBS_API_KEY'],
})
@ApiSecurity('api-key-header')
@ApiSecurity('api-key-query')
@ApiTags('Jobs')
export abstract class JobsBaseController {}
```

Extend this base controller in your feature controllers:

```typescript
import { Get, Post, Body } from '@nestjs/common';
import { JobsBaseController } from './jobs.base.controller';

@Controller('jobs/sync')
export class SyncJobsController extends JobsBaseController {
  @Post('start')
  startSync(@Body() data: any) {
    return { status: 'started' };
  }

  @Get('status')
  getStatus() {
    return { status: 'running' };
  }
}
```

All endpoints in `SyncJobsController` will automatically inherit the API key protection.

### Combining with Other Guards

The API Key Guard can be combined with other guards:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyProtected } from './guards';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('admin')
@ApiKeyProtected({ envKeysVariableNames: ['ADMIN_API_KEY'] })
@UseGuards(RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin', 'superadmin')
  getUsers() {
    return { users: [] };
  }
}
```

### Environment-specific Configuration

Use different API keys per environment:

```typescript
@ApiKeyProtected({
  envKeysVariableNames: [
    process.env.NODE_ENV === 'production' 
      ? 'PROD_API_KEY' 
      : 'DEV_API_KEY'
  ],
})
```

**Development (.env.development):**
```env
DEV_API_KEY=dev-key-123
```

**Production (.env.production):**
```env
PROD_API_KEY=prod-secure-key-xyz
```

## Security Best Practices

1. **Never hardcode API keys** in your source code
2. **Use environment variables** for key storage
3. **Rotate keys regularly** in production environments
4. **Use HTTPS** to prevent key interception
5. **Prefer header authentication** over query parameters
6. **Enable query parameter authentication only when necessary** (e.g., webhooks, file downloads)
7. **Use different keys** for different environments
8. **Implement rate limiting** alongside API key authentication
9. **Log authentication attempts** for security monitoring
10. **Set short expiration times** and implement key rotation policies

## Testing

### Unit Testing the Guard

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ApiKeyGuard, Reflector],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow valid API key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': 'valid-key' },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'get').mockReturnValue({
      keys: ['valid-key'],
    });

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should reject invalid API key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': 'invalid-key' },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'get').mockReturnValue({
      keys: ['valid-key'],
    });

    expect(() => guard.canActivate(mockContext)).toThrow();
  });
});
```

### Integration Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('API Key Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should reject request without API key', () => {
    return request(app.getHttpServer())
      .get('/protected')
      .expect(401);
  });

  it('should accept request with valid API key', () => {
    return request(app.getHttpServer())
      .get('/protected')
      .set('X-API-KEY', 'valid-key')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Troubleshooting

### Guard Not Working

**Problem:** Endpoints are accessible without API key.

**Solutions:**
1. Ensure the guard is properly imported and applied
2. Check that you're using `@ApiKeyProtected()` (with parentheses)
3. Verify that either `keys` or `envKeysVariableNames` are configured
4. Check environment variables are properly loaded

### Keys Not Found from Environment

**Problem:** Authentication always fails despite correct key.

**Solutions:**
1. Verify environment variables are loaded (use `console.log(process.env.YOUR_VAR)`)
2. Check variable names match exactly (case-sensitive)
3. Ensure `.env` file is in the correct location
4. Confirm environment variables are available at runtime

### Case Sensitivity Issues

**Problem:** Same key works sometimes but not others.

**Solution:** By default, comparison is case-insensitive. If you need case-sensitive comparison:

```typescript
@ApiKeyProtected({
  keys: ['CaseSensitiveKey'],
  caseInsensitive: false,
})
```

### Swagger Not Showing Security Options

**Problem:** Swagger UI doesn't show API key authentication.

**Solutions:**
1. Ensure `@ApiSecurity()` decorators are applied
2. Verify security schemes are registered in Swagger setup
3. Check that scheme names match between setup and decorators

## Migration Guide

### From Basic Auth to API Key

**Before:**
```typescript
@UseGuards(AuthGuard('basic'))
```

**After:**
```typescript
@ApiKeyProtected({
  envKeysVariableNames: ['API_KEY'],
})
@ApiSecurity('api-key-header')
```

### From Custom Implementation

**Before:**
```typescript
@UseGuards(CustomApiKeyGuard)
@SetMetadata('apiKeys', ['key1', 'key2'])
```

**After:**
```typescript
@ApiKeyProtected({
  keys: ['key1', 'key2'],
})
```

## References

- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [Swagger/OpenAPI Security](https://swagger.io/docs/specification/authentication/)

## License

This implementation follows standard NestJS patterns and can be freely used in any NestJS project.
