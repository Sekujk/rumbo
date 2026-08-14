# Rumbo

Rumbo es una app móvil de finanzas personales. Desde el primer gasto registrado, proyecta cuánto vas a terminar gastando el mes, y separa las compras puntuales del gasto recurrente para que esa proyección no se distorsione por una compra grande y poco común.

## Capturas

<p align="center">
  <img src="docs/screenshots/dashboard.png" width="200" alt="Resumen y proyección del mes" />
  <img src="docs/screenshots/agregar.png" width="200" alt="Agregar un gasto o ingreso" />
  <img src="docs/screenshots/historial.png" width="200" alt="Historial agrupado por día" />
  <img src="docs/screenshots/perfil.png" width="200" alt="Perfil con preferencias" />
</p>

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

## Base de datos

Los datos se guardan en Supabase (Postgres). Cada usuario solo puede ver y modificar su propia información: esa restricción la aplica la propia base de datos, no solo el código de la app.

## Cómo procesamos los datos

Solo se guarda lo que el usuario ingresa directamente (correo, gastos, ingresos, presupuestos). Nadie más puede ver los datos de otro usuario. Cualquier usuario puede eliminar su cuenta y toda su información en cualquier momento desde el perfil de la app.

## Versión

Versión actual: `1.0.0`.
