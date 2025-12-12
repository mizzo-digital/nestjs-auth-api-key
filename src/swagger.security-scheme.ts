export const enum SWAGGER_SECURITY_SCHEME {
  API_KEY_HEADER = 'ApiKeyHeader',
  API_KEY_QUERY = 'ApiKeyQuery',
}
export function swaggerSecuritySchemeForHeaderApiKey() {
  return [
    {
      type: 'apiKey',
      name: 'X-API-KEY',
      in: 'header',
      description: 'Enter your API key',
    },
    SWAGGER_SECURITY_SCHEME.API_KEY_HEADER,
  ];
}

export function swaggerSecuritySchemeForQueryApiKey() {
  return [
    {
      type: 'apiKey',
      name: 'api_key',
      in: 'query',
      description: 'Enter your API key',
    },
    SWAGGER_SECURITY_SCHEME.API_KEY_QUERY,
  ];
}
