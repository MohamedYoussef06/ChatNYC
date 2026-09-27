import type { ExpoConfig } from 'expo/config';

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  ios: {
    ...config.ios,
    ...(process.env.GOOGLE_MAPS_IOS_API_KEY ? { config: { ...config.ios?.config, googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY } } : {}),
  },
  android: {
    ...config.android,
    ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY ? { config: { ...config.android?.config, googleMaps: { ...config.android?.config?.googleMaps, apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } } } : {}),
  },
});
