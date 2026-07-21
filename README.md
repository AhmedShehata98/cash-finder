# Cash Finder

A location-based React Native application built with Expo SDK 57.

## Tech Stack

- **Framework**: Expo SDK 57 with TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand (client state), TanStack Query (server state)
- **Maps**: React Native Maps
- **Location**: Expo Location (foreground & background)
- **Sensors**: Expo Sensors (compass/heading)
- **Networking**: Axios
- **Forms**: React Hook Form + Zod
- **Storage**: Expo Secure Store, AsyncStorage
- **Styling**: React Native StyleSheet

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- For iOS: macOS with Xcode installed
- For Android: Android Studio with SDK configured

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cash-finder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your API endpoints and other environment variables.

## Running the App

### Development with Expo Go

```bash
npm start
```

Scan the QR code with:
- **iOS**: Camera app or Expo Go app
- **Android**: Expo Go app

### Running on Android Emulator

```bash
npm run android
```

### Running on iOS Simulator (macOS only)

```bash
npm run ios
```

### Running on Web

```bash
npm run web
```

## Development Build

For development builds with native modules:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

### Email authentication deep links

Supabase email authentication is supported in installed development, preview, and production
builds. It is intentionally unavailable in Expo Go and on web because the callback must use the
stable `cashfinder://auth/callback` URL and PKCE verifier stored by the app installation.

In Supabase Dashboard, open **Authentication → URL Configuration** and:

1. Add the exact redirect URL `cashfinder://auth/callback`.
2. Remove localhost as the production/default mobile destination. For this mobile-only app, use
   `cashfinder://auth/callback` as the Site URL unless the project has a real production HTTPS site.
3. Keep the mobile redirect exact; do not use a wildcard.
4. Confirm the magic-link email template uses `{{ .ConfirmationURL }}` or otherwise honors
   `{{ .RedirectTo }}` instead of hardcoding the Site URL or localhost.

After changing the native scheme configuration, rebuild the development client. Test the email link
on both Android and iOS with the app terminated, backgrounded, and already open. Also verify expired
links, offline retry, returning to Rewards, and guest-progress merging.

## Production Build

### Create production builds:

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

### Submit to stores:

```bash
eas submit --platform android
eas submit --platform ios
```

## Project Structure

```
cash-finder/
├── app/                    # Expo Router file-based routes
│   └── (tabs)/            # Tab navigation
├── assets/                # Images, fonts, and other assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── features/          # Feature-specific modules
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API clients and services
│   ├── store/             # Zustand stores
│   ├── constants/         # App-wide constants
│   ├── lib/               # Library configurations
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   ├── theme/             # Theme configuration (colors, spacing, typography)
│   └── providers/         # React context providers
└── app.config.ts          # Expo configuration
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS (macOS only)
- `npm run web` - Run on web
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Code Quality

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

### Type Checking

```bash
npx tsc --noEmit
```

## Path Aliases

The project is configured with path aliases for cleaner imports:

```typescript
import Button from "@/components/Button"
import { useAppStore } from "@/store/app-store"
import { colors } from "@/theme/colors"
```

## Environment Variables

Environment variables are configured in `.env` and accessed via `expo-constants`:

```typescript
import Constants from "expo-constants"

const apiUrl = Constants.expoConfig?.extra?.apiUrl
```

Available variables:
- `API_URL` - Backend API base URL
- `API_TIMEOUT` - API request timeout (ms)
- `APP_ENV` - Environment (development/production)

## Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - Precise location
- `ACCESS_COARSE_LOCATION` - Approximate location
- `ACCESS_BACKGROUND_LOCATION` - Background location (prepared, not implemented)
- `FOREGROUND_SERVICE_LOCATION` - Location foreground service

### iOS
- `NSLocationWhenInUseUsageDescription` - Location access while using app
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Always-on location access
- `NSMotionUsageDescription` - Motion sensors for compass

## Features (Planned)

- GPS location tracking
- Background location updates
- Compass/heading display
- Interactive maps
- Offline support
- Location-based search

## License

MIT
