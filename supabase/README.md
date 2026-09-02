# Supabase — Impulse Fase 2

## 1. Crear proyecto
Creá un proyecto en Supabase y copiá la URL y la anon key a `.env`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

La anon key es pública para el cliente; **nunca** pongas service-role keys en el frontend.

## 2. Base de datos
Ejecutá `schema.sql` en el SQL Editor. Crea tablas normalizadas, índices, triggers `updated_at`, RLS y el bucket privado `impulse-files`.

## 3. Auth
En Authentication > Providers habilitá:
- Email
- Google
- Apple
- Phone

Google y Apple requieren credenciales propias y URLs de redirección configuradas en sus consolas y en Supabase. Phone requiere un proveedor SMS compatible.

## 4. Edge Function
Con Supabase CLI:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy sync
```

La función usa el JWT del usuario y `SUPABASE_URL`/`SUPABASE_ANON_KEY` del entorno administrado por Supabase.

## 5. Redirección OAuth
El cliente usa `window.location.origin`. Para producción, agregá los dominios web y deep links nativos permitidos en Authentication > URL Configuration.
