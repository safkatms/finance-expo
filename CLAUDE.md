# finance-expo — Project Guide

Mobile client (Android-first, APK builds) for the personal-finance API at `d:\Sakib\finance-api` — see its `CLAUDE.md` for endpoints, response envelope and domain rules.
Note: `README.md` is stale (copied from an older "Skino sales" app) — trust this file instead.

**Stack:** Expo SDK 54 · React Native 0.81 · React 19 · expo-router 6 (file-based) · TanStack Query 5 · axios · Zustand · react-hook-form + zod · expo-secure-store · `@expo/vector-icons/Feather` · TypeScript `strict`.

## Commands
```bash
npm start            # expo start
npm run android      # / npm run ios
eas build -p android --profile preview|production   # APK (eas.json), autoIncrement
```
- API URL: `EXPO_PUBLIC_API_URL` in `.env.local` (fallback hardcoded LAN IP in `src/lib/axios.ts`). Use the machine's LAN IP, not localhost, for a device.
- Path alias `@/*` → `src/*`.
- App version for the in-app updater is hardcoded `CURRENT_VERSION` in `src/lib/api/update.api.ts` (checks GitHub releases of `finance-expo` for an `.apk`). Bump it with each release.

## Layout
```
app/
  _layout.tsx            ← QueryClientProvider + SafeAreaProvider + Stack; on boot: token? → getMe() → set auth store, prefetch dashboard, hide splash
  index.tsx              ← splash/logo while loading, then Redirect to /(app)/dashboard or /(auth)/login
  (auth)/                ← login, change-password (forced first-login change)
  (app)/_layout.tsx      ← auth guard (Redirect if !isAuthenticated) + Stack + <BottomNav/>
  (app)/<feature>/index.tsx        ← list screen
  (app)/<feature>/form/index.tsx   ← create/edit screen (edit when ?id= present)
  (app)/loans/[id]/index.tsx       ← detail screen
  features: dashboard, transactions, budgets, savings (index / plan / entry; opened from a dashboard quick action),
            loans, accounts, categories, import, profile, settings,
            change-password, switch-user, admin/users
src/
  lib/axios.ts           ← `api` instance, token attach, cold-start retry, 401 refresh, setTokens/clearTokens/getAccessToken
  lib/api/<feature>.api.ts ← one file per backend module; typed async functions
  lib/api-error.ts       ← getApiErrorMessage(err, fallback)
  lib/query-client.ts    ← shared QueryClient (retry 1, staleTime 5 min)
  lib/auth.ts            ← re-exports from api/auth.api.ts
  store/auth.store.ts    ← Zustand: isAuthenticated, isLoading, user, originalAdmin/adminToken (impersonation)
  types/api.ts           ← ApiResponse<T>, PaginatedResponse<T>, TokenResponse
  types/finance.ts       ← domain types mirroring Prisma models + dashboard/budget/statement shapes
  components/ui/         ← theme.ts (colors), Button, Input, Alert, Spinner, PageHeader, WeekPicker,
                           AccountStatementModal, OtpRevealModal, UpdateBanner
  components/layout/BottomNav.tsx ← 5 tabs: Dashboard, Transactions, Budget, Loans, Accounts
```

## Networking pattern (`src/lib/axios.ts`)
- Request interceptor reads `access_token` from SecureStore → `Authorization: Bearer`.
- Response interceptor 1: network error or 502/503/504 → retry up to 3× with 2s/4s/6s backoff (server cold start).
- Response interceptor 2: 401 → single shared `refreshing` promise POSTs `/auth/refresh` (plain axios), stores rotated tokens, replays request; failure → `forceLogout()` (clear tokens + auth store).
- Tokens: SecureStore keys `access_token`, `refresh_token`.

## API client file pattern (`src/lib/api/<feature>.api.ts`)
```ts
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Foo } from '@/types/finance';

export interface CreateFooPayload { name: string; amount: number; note?: string }

export async function getFoos(params?: FooFilter): Promise<Foo[]> {
  const res = await api.get<ApiResponse<Foo[]>>('/foos', { params });
  return res.data.data!;               // always unwrap the ApiResponse envelope
}
export async function createFoo(payload: CreateFooPayload): Promise<Foo> {
  const res = await api.post<ApiResponse<Foo>>('/foos', payload);
  return res.data.data!;
}
export async function deleteFoo(id: number): Promise<void> { await api.delete(`/foos/${id}`); }
```
- Payload interfaces live in the api file; entity types in `types/finance.ts`.
- Paginated transactions come back as `ApiResponse<PaginatedData<T>>` (`{ data, meta, summary? }` inside `data`).
- PDFs: `fetch` with bearer token → blob → `expo-file-system/next` `File` in `Paths.document` → `expo-sharing` (`reports.api.ts`).
- Never send fields the DTO doesn't declare — the API rejects unknown properties (400).

## Screen patterns
**List screen** (`app/(app)/budgets/index.tsx` is a good reference):
```tsx
const insets = useSafeAreaInsets(); const router = useRouter(); const qc = useQueryClient();
const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
  queryKey: ['budgets', month], queryFn: () => getBudgetSummary(month),
});
const deleteMut = useMutation({
  mutationFn: deleteBudget,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  onError: (err) => Alert.alert('Error', getApiErrorMessage(err, 'Failed to delete')),
});
// confirm destructive actions with Alert.alert(title, msg, [{text:'Cancel'}, {text:'Delete', style:'destructive', onPress}])
// <PageHeader title=... rightActions=[{ icon:'plus', onPress: () => router.push('/(app)/budgets/form' as any) }]/>
// <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch}/>}>
// loading → <Spinner/>, error → message via getApiErrorMessage
```
**Form screen** (`app/(app)/budgets/form/index.tsx`):
- `useLocalSearchParams<{ id?: string; ... }>()` → `isEdit = !!params.id`; navigate with `router.push({ pathname: '/(app)/x/form', params: { id: String(id) } } as any)`.
- zod `schema` + `useForm<FormData>({ resolver: zodResolver(schema), defaultValues })` + `<Controller>`; numeric inputs kept as strings in the form, `parseFloat` in `mutationFn`.
- Edit prefill: query existing data (`enabled: isEdit`) then `reset({...})` in a `useEffect`.
- `useMutation` → on success `qc.invalidateQueries` for the feature (and `['dashboard']`/`['accounts']` when balances change) then `router.back()`.
- Wrap in `KeyboardAvoidingView` (`padding` on iOS, `height` on Android) with `paddingTop: insets.top`.

**Styling:** `StyleSheet.create` at file bottom named `s` (or `styles`); colors only from `colors` in `components/ui/theme.ts` (Tailwind-like scales: `teal` is primary — `teal[600]` active, `teal[700]` header; `gray`, `red`, `green`, `amber`, `orange`...). Screen bg `#F9FAFB`, cards white. Icons: `Feather`. Money formatted `৳` + `toLocaleString('en-US', { maximumFractionDigits: 0 })` (helper `fmt` is redefined per screen). Screens are large single files with local sub-components (e.g. `ProgressBar`, `BudgetCard`) — no shared hooks folder in use.

**Month handling:** `MMM-yyyy` strings (`Sep-2026`) everywhere, matching the API. `currentMonth()` / `shiftMonth()` / `prevMonth()` helpers are redefined locally in each screen.

## Query keys in use (invalidate the right ones)
`['dashboard']`, `['dashboard', month]`, `['transactions']`, `['transactions', params]`, `['transaction', id]`, `['accounts']`, `['accounts-list']`, `['account', id]`, `['account-statement', id, from, to]`, `['budgets']`, `['budgets', month]`, `['categories']`, `['pinned-categories']`, `['loans']`, `['loans', {filters}]`, `['loan', id]`, `['import-history']`, `['admin','users']`, `['admin','user', id]`, `['app-update']`, `['savings', year]`, `['savings','plans']`, `['savings-entries', year]`.
Every transaction/loan/import mutation also invalidates `['savings']`, because auto savings depend on transactions. Keep that when adding new money-moving mutations.
Invalidating a prefix (e.g. `['budgets']`) also refreshes `['budgets', month]`. Logout calls `queryClient.clear()`.

## Auth & roles
- `login()` stores tokens and returns user; root layout uses `getMe()` (`GET /users/me`) on boot.
- `user.mustChangePassword` → `(auth)/change-password` flow.
- Admin features (admin/users, switch-user) gated on `user.role === 'admin'`. Impersonation keeps `originalAdmin` + `adminToken` in the Zustand store to switch back; impersonated sessions get no refresh token (`setTokens(access, null)`).

## Adding a feature end-to-end
1. API: model in `schema.prisma` → migrate → module (see finance-api `CLAUDE.md`).
2. Here: types in `src/types/finance.ts` → `src/lib/api/<feature>.api.ts` → `app/(app)/<feature>/index.tsx` + `form/index.tsx` → link it (BottomNav, settings screen, or dashboard).
3. Bump `CURRENT_VERSION` in `update.api.ts` for a release. Commit style: `feat: …`.
