import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { API_KEY_GUARD_METADATA_KEY, ApiKeyGuard, type ApiKeyGuardConfig } from './api-key.guard';

/**
 * Decorator to protect endpoints with API Key validation.
 * Example:
 *   @ApiKeyProtected({ keys: ['my-key'] })
 *   @Get('secure')
 *   findSecure() {}
 */
export function ApiKeyProtected(config: ApiKeyGuardConfig = {}) {
  return applyDecorators(SetMetadata(API_KEY_GUARD_METADATA_KEY, config), UseGuards(ApiKeyGuard));
}
