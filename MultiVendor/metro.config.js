const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { createApiProxyMiddleware } = require('./scripts/api-proxy.cjs');

/**
 * Metro configuration
 * Supports React Native CLI and the optional Expo CLI workflow.
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);
const originalEnhancer = defaultConfig.server?.enhanceMiddleware;
const config = {
  server: {
    enhanceMiddleware(metroMiddleware, metroServer) {
      const enhanced = originalEnhancer
        ? originalEnhancer(metroMiddleware, metroServer)
        : metroMiddleware;
      const proxy = createApiProxyMiddleware();
      return (request, response, next) =>
        proxy(request, response, () => enhanced(request, response, next));
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
