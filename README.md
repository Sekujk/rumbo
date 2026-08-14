# Rumbo

Rumbo es una app móvil de finanzas personales. A partir del primer gasto registrado, calcula una proyección de cuánto vas a terminar gastando el mes (un "run-rate": lo gastado hasta hoy, extrapolado a los días restantes) y distingue gastos puntuales de gasto recurrente para que esa proyección no se distorsione por una compra grande y aislada.

## Funcionalidades

- **Proyección de gasto mensual** con rango de confianza (no un número único fingiendo una precisión que los datos no tienen), calculada por categoría y en total.
- **Detección de gastos puntuales**: un gasto que se aleja mucho del patrón normal de su categoría se contabiliza, pero no se extrapola como si fuera a repetirse todos los días.
- **Ingresos y presupuestos** por categoría, con aviso al acercarse o superar el límite definido.
- **Historial agrupado por día**, con el total de cada día, pensado para no perder legibilidad con muchos movimientos en el mes.
- **Modo oscuro y claro**, con opción de seguir la configuración del sistema.
- **Español e inglés**, con detección automática del idioma del dispositivo.
- **Guía de bienvenida y preguntas frecuentes**, accesibles en cualquier momento desde el perfil.
- **Eliminación de cuenta autoservicio**: cualquier usuario puede borrar su cuenta y todos sus datos desde la app, sin intervención manual.

## Stack técnico

- **React Native + Expo** (managed workflow), probado en dispositivo con Expo Go.
- **Supabase** (Postgres + Auth) como backend, con políticas de seguridad a nivel de fila (RLS) para que cada usuario solo pueda ver y modificar sus propios datos.

## Estructura del proyecto

```
App.js                          # Navegación (tabs + perfil + FAQ) y animaciones de transición
src/
├── components/
│   └── Mascot.jsx               # Mascota animada usada en guía, vacíos y confirmaciones
├── config/
│   ├── supabase.js              # Cliente de Supabase
│   └── defaultCategories.js     # Categorías por defecto al primer inicio de sesión
├── context/
│   └── AuthContext.jsx          # Sesión (login, registro, cierre de sesión)
├── i18n/
│   ├── LanguageContext.jsx      # Selección de idioma y persistencia
│   └── translations.js          # Diccionario es/en
├── theme/
│   ├── ThemeContext.jsx         # Modo claro/oscuro/sistema y persistencia
│   └── colors.js                # Paletas y color determinista por categoría
└── screens/
    ├── AuthScreen.jsx
    ├── DashboardScreen.jsx       # Resumen y proyección del mes
    ├── AddTransactionScreen.jsx
    ├── HistoryScreen.jsx
    ├── BudgetsScreen.jsx
    ├── ProfileScreen.jsx
    ├── OnboardingScreen.jsx
    └── FAQScreen.jsx
supabase/migrations/             # Esquema de base de datos, versionado
```

## Puesta en marcha

```bash
npm install
npm start      # abre Expo Dev Tools; escanea el QR con la app Expo Go
npm run web     # alternativa: corre en el navegador
```

Requiere un archivo `.env` en la raíz (no versionado) con las credenciales del proyecto de Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Estos valores se obtienen en el dashboard de Supabase, en Project Settings → API.

## Base de datos

El esquema completo vive versionado en `supabase/migrations/`, en orden cronológico. Para aplicarlo en un proyecto nuevo de Supabase, ejecuta el contenido de cada archivo `.sql` en el SQL Editor del dashboard, en el orden en que aparecen.

Puntos relevantes del esquema:

- Todas las tablas de usuario (`categories`, `transactions`, `income`, `budgets`) tienen políticas RLS que limitan cada fila a su propio dueño.
- Las vistas de proyección (`monthly_projection` y por categoría) usan `security_invoker = true`, por lo que respetan el RLS del usuario que consulta.
- `delete_user()` es una función con `SECURITY DEFINER` que permite a un usuario autenticado borrar su propia cuenta y todos sus datos sin exponer credenciales privilegiadas al cliente.

## Privacidad

El tratamiento de datos de los usuarios está descrito en [PRIVACY.md](PRIVACY.md).

## Roadmap

- Comparación de gasto entre usuarios, una vez haya una base real de usuarios activos.
- Señal de día de la semana en la proyección, cuando haya suficiente historial acumulado por usuario.
- Importación de estados de cuenta y categorización automática.

## Licencia

Este proyecto es de código privado. Todos los derechos reservados.
