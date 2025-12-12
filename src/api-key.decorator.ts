import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ApiKeyGuard,
  ApiKeyGuardConfig,
  API_KEY_GUARD_METADATA_KEY,
} from './api-key.guard';

/**
 * Decorator para proteger endpoint com validação de API Key.
 * Exemplo:
 *   @ApiKeyProtected({ keys: ['minha-chave'] })
 *   @Get('secure')
 *   findSecure() {}
 */
export function ApiKeyProtected(config: ApiKeyGuardConfig = {}) {
  return applyDecorators(
    SetMetadata(API_KEY_GUARD_METADATA_KEY, config),
    UseGuards(ApiKeyGuard),
  );
}
