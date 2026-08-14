# Rumbo

App móvil de finanzas personales. Registras tus gastos y la app te muestra, desde el primer gasto, una proyección de cuánto vas a terminar gastando el mes ("run-rate": lo gastado hasta hoy, extrapolado a todo el mes).

Fase 1: uso individual. El modelo de datos ya está pensado para multiusuario (RLS por fila) para no tener que rediseñar el esquema si más adelante se agrega comparación entre usuarios.

## Stack

- **React Native + Expo** (managed workflow) — se prueba en el celular con la app "Expo Go", sin necesidad de Android Studio/Xcode.
- **Supabase** — Postgres + Auth + RLS. Proyecto separado del Portafolio web (`code/Portafolio`), es otro dominio de datos.

## Cómo correr el proyecto

```bash
npm install
npm start          # abre Expo Dev Tools, escanea el QR con Expo Go en tu celular
npm run web         # alternativa: corre en el navegador (útil para probar rápido sin celular)
```

Requiere un archivo `.env` en la raíz (no versionado) con:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Estos valores están en el dashboard de Supabase → Project Settings → API.

## Base de datos

El esquema vive versionado en `supabase/migrations/`. La primera migración (`20260813000000_initial_schema.sql`) crea:

- `categories` — categorías de gasto por usuario (se auto-crean 5 por defecto la primera vez que alguien entra: Comida, Transporte, Ocio, Salud, Otros).
- `transactions` — cada gasto individual.
- Políticas RLS: cada usuario solo ve/edita sus propias filas.
- Vista `monthly_projection`: calcula la proyección de gasto del mes en curso a partir de `transactions`, respetando RLS (`security_invoker = true`).

**Para aplicarla:** pega el contenido del archivo `.sql` en el SQL Editor del dashboard de Supabase y ejecútalo. (Alternativa para el futuro: usar `supabase db push` con el CLI, igual que en `code/Portafolio`, si se vincula el proyecto.)

## Estructura

```
src/
├── config/
│   ├── supabase.js           # Cliente de Supabase (con AsyncStorage para persistir sesión)
│   └── defaultCategories.js  # Crea categorías por defecto en el primer login
├── context/
│   └── AuthContext.jsx       # Login/registro/logout vía supabase.auth
└── screens/
    ├── AuthScreen.jsx        # Login / registro
    ├── DashboardScreen.jsx   # Proyección del mes ("wow" feature)
    ├── AddTransactionScreen.jsx
    └── HistoryScreen.jsx     # Gastos del mes en curso

App.js                        # Tab switcher simple (sin librería de navegación, MVP)
```

## Pendiente / roadmap

- Fase 2: comparación con otros usuarios (solo cuando haya usuarios reales usando la app — ver `wiki/code/rumbo.md` para el razonamiento completo).
- Detección de anomalías (mismo z-score usado en `code/ExplicadorEconomico`) cuando haya suficiente historial semanal.
- Import de estados de cuenta / categorización automática (v2, no MVP).
