/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly VITE_REVENUECAT_API_KEY?: string;
  readonly VITE_REVENUECAT_ENTITLEMENT_ID?: string;
  readonly DEV?: boolean;
}
interface ImportMeta { readonly env: ImportMetaEnv }
