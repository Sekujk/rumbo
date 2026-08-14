# Rumbo

Rumbo es una app móvil de finanzas personales. Desde el primer gasto registrado, proyecta cuánto vas a terminar gastando el mes, y separa las compras puntuales del gasto recurrente para que esa proyección no se distorsione por una compra grande y poco común.

> [!NOTE]
> Rumbo es un proyecto personal de un solo desarrollador. El código se comparte como muestra de trabajo; no está pensado para que terceros lo desplieguen contra su propia infraestructura.

## Funcionalidades

- **Proyección de gasto mensual** con un rango de confianza, calculada en total y por categoría, en vez de un número único que finge una precisión que los datos no tienen.
- **Detección de gastos puntuales**: una compra que se aleja mucho del patrón normal de su categoría se cuenta en el total, pero no se extrapola como si fuera a repetirse todos los días.
- **Ingresos y presupuestos** por categoría, con aviso al acercarse o superar un límite.
- **Historial agrupado por día**, con un total corrido por día, para que un mes completo de movimientos siga siendo legible.
- **Modo claro y oscuro**, incluyendo una opción que sigue la configuración del sistema.
- **Español e inglés**, detectados automáticamente desde el idioma del dispositivo.
- **Guía de bienvenida y preguntas frecuentes**, accesibles en cualquier momento desde el perfil.
- **Eliminación de cuenta autoservicio**: cualquier usuario puede borrar permanentemente su cuenta y todos sus datos desde la propia app.

## Stack técnico

| Capa | Elección |
| --- | --- |
| App | React Native + Expo (managed workflow) |
| Backend | Supabase (Postgres + Auth) |
| Acceso a datos | Row Level Security (RLS): cada tabla restringe a cada usuario a sus propias filas |

## Versión

La versión actual es `1.0.0`. El historial de releases se publica en la [página de Releases](https://github.com/Sekujk/rumbo/releases) del repositorio a medida que se etiquetan versiones nuevas.

## Base de datos

El esquema vive versionado en [`supabase/migrations/`](supabase/migrations/), aplicado en el orden del nombre de archivo. Algunos puntos relevantes del diseño:

- Todas las tablas de usuario (`categories`, `transactions`, `income`, `budgets`) tienen políticas RLS que limitan cada fila a su propio dueño.
- Las vistas de proyección (`monthly_projection` y su equivalente por categoría) se crean con `security_invoker = true`, por lo que respetan el RLS de quien las consulta, no el de su dueño.
- `delete_user()` es una función `SECURITY DEFINER` que permite a un usuario autenticado borrar su propia cuenta y todos sus datos, sin exponer nunca una clave privilegiada al cliente.

## Estructura del proyecto

```
App.js                         # Navegación (tabs + perfil + FAQ) y transiciones entre pantallas
src/
├── components/
│   └── Mascot.jsx              # Mascota animada usada en la guía, vacíos y confirmaciones
├── config/
│   ├── supabase.js             # Cliente de Supabase
│   └── defaultCategories.js    # Crea las categorías por defecto en el primer login
├── context/
│   └── AuthContext.jsx         # Sesión (login, registro, cierre de sesión)
├── i18n/
│   ├── LanguageContext.jsx     # Selección de idioma y persistencia
│   └── translations.js         # Diccionario es/en
├── theme/
│   ├── ThemeContext.jsx        # Modo claro/oscuro/sistema y persistencia
│   └── colors.js                # Paletas y color determinista por categoría
└── screens/
    ├── AuthScreen.jsx
    ├── DashboardScreen.jsx       # Resumen mensual y proyección
    ├── AddTransactionScreen.jsx
    ├── HistoryScreen.jsx
    ├── BudgetsScreen.jsx
    ├── ProfileScreen.jsx
    ├── OnboardingScreen.jsx
    └── FAQScreen.jsx
supabase/migrations/            # Esquema de base de datos, versionado
```

## Privacidad

El tratamiento de datos de los usuarios está documentado en [PRIVACY.md](PRIVACY.md).

## Roadmap

- Comparación de gasto entre usuarios, cuando haya una base real de usuarios activos.
- Señal de día de la semana en la proyección, cuando haya suficiente historial acumulado por usuario.
- Importación de estados de cuenta y categorización automática.
