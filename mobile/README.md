# ChatNYC Mobile

Native iOS/Android client built with Expo, React Native, TypeScript, and Expo Router. The Next.js web client remains in `../frontend`; both clients use the existing FastAPI backend.

## Run locally

```sh
cd mobile
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to the FastAPI URL reachable by this device.
npx expo start
```

On a physical phone, `localhost` points to the phone. Set `EXPO_PUBLIC_API_URL` to `http://<YOUR_COMPUTER_LAN_IP>:8000`, and ensure the phone and computer share a network. Do not put provider secrets in Expo variables; `EXPO_PUBLIC_*` values are bundled into the client.

For iOS simulator, use `http://localhost:8000`; for Android emulator, use `http://10.0.2.2:8000`. These are local development addresses, not source-code defaults.

## Native maps and location

`react-native-maps` and foreground `expo-location` are included in Expo Go for quick development. Location is requested only after the user presses **Use my location**. No background tracking is used. The map displays selected origin/destination markers; a route line appears only when real route geometry is returned by a service.

Standalone native builds can use platform-restricted Maps SDK keys supplied at build time as `GOOGLE_MAPS_IOS_API_KEY` and `GOOGLE_MAPS_ANDROID_API_KEY`. Restrict these to the app bundle identifier / Android package and the required Maps SDK. They are native SDK keys, not backend keys. The app uses the backend for provider services; do not expose server credentials in `EXPO_PUBLIC_*` variables.

## Backend integration status

- Ock: `POST /api/assistant/chat` (real backend response; no mobile mock fallback).
- Places: `GET /api/places`.
- NextStop: `POST /api/transit/plan` for the real MTA subway itinerary and alerts.
- Wallet: `GET /api/wallet`, `GET /api/wallet/transactions`, and reviewed XRPL Testnet sends through `POST /api/wallet/send`.
- Demo spending: clearly simulated server-managed payments and splits through `POST /api/wallet/demo/send` and `POST /api/wallet/demo/split`; these never claim to be on-chain.
- Google Routes three-mode comparison is not currently exposed as a backend endpoint. The mobile app does not send a Google server key to the device and does not invent Drive/Walk route data. Add a narrowly scoped server-side route proxy to enable the full native comparison and encoded route polyline.
- On-chain wallet data is XRPL Testnet only. Signing credentials stay in FastAPI; simulated Demo RLUSD is labeled separately.

## Checks

```sh
npm run typecheck
npx expo-doctor
```
