# Skino Expo App

React Native / Expo Router app for the Skino sales module. Mirrors the Next.js UI 1:1.

## Setup

```bash
npm install
```

### Configure API URL

Edit `src/lib/axios.ts` and set `API_BASE_URL`:

```ts
export const API_BASE_URL = 'http://192.168.1.X:3000/api/v1';
```

Use your machine's **local IP** (not `localhost`) so the phone can reach the API.

## Run

```bash
# Start Expo dev server
npm start

# Open on device with Expo Go, or
npm run android   # Android emulator
npm run ios       # iOS simulator
```

## Project Structure

```
app/
├── _layout.tsx              ← Root layout (QueryClient + SafeAreaProvider + auth init)
├── index.tsx                ← Redirect to /dashboard or /login
├── (auth)/
│   └── login/index.tsx      ← Login screen
└── (app)/
    ├── _layout.tsx           ← Protected layout + BottomNav
    ├── dashboard/index.tsx   ← Dashboard (hero + last week card + long-term card)
    └── sales/
        ├── add/index.tsx     ← Add Sale/Payment/Return (3-tab)
        ├── weekly/index.tsx  ← Paginated weekly summary cards
        └── monthly/index.tsx ← Paginated monthly summary cards

src/
├── components/
│   ├── layout/BottomNav.tsx  ← Fixed bottom nav (4 tabs)
│   └── ui/
│       ├── theme.ts          ← Color tokens (matches Next.js Tailwind palette)
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Alert.tsx
│       ├── Spinner.tsx
│       └── WeekPicker.tsx    ← Bottom-sheet week selector (replaces <select>)
├── hooks/use-weeks.ts
├── lib/
│   ├── axios.ts              ← Axios + silent token refresh via SecureStore
│   ├── auth.ts
│   └── api-error.ts
├── store/auth.store.ts       ← Zustand auth state
└── types/api.ts
```

## Key differences from Next.js

| Next.js | Expo |
|---|---|
| `js-cookie` | `expo-secure-store` |
| CSS / Tailwind | `StyleSheet.create` with same color tokens |
| `<select>` for week | `WeekPicker` bottom-sheet modal |
| `lucide-react` | `lucide-react-native` |
| `window.location.href` redirect | `router.replace()` / Zustand state |
| `placeholderData` (no flicker) | Same — TanStack Query works identically |
