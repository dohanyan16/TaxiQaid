# TaxiQaid — enlaces Google Sheets → páginas (fase 1)

Fecha: 17 de noviembre de 2026. Alcance aprobado: **conectar solo la lectura de la pestaña DATA**, con los permisos actuales. No activar operaciones de negocio, escrituras entre libros, aprobaciones, ni nuevas funciones de Helpdesk o Appeals.

## Mapa de los 16 libros existentes

| Google Sheet | Página de TaxiQaid | Fuente interna | Situación en el código |
|---|---|---|---|
| Drivers Management | Drivers Management | `drivers` | Lector propio existente |
| Fleet Management | Fleet Management | `fleet` | Lector propio existente |
| Accident Tracker | Accident Tracker | `accidents` | Lector de tabla propio |
| Breakdown Tracker | Breakdown Tracker | `breakdowns` | Panel DATA solo lectura |
| Maintenance Tracker | Maintenance Tracker | `maintenance` | Panel DATA solo lectura |
| Fuel Tracker | Fuel Tracker | `fuel` | Panel DATA solo lectura |
| Trip Check | Trip Check | `tripcheck` | Lector de tabla propio |
| NCR Tracker | NCR Tracker | `ncr` | Panel DATA solo lectura |
| Traffic Violations | Traffic Violations | `penalties` | Lector de tabla propio |
| Training Tracker | Training Tracker | `training` | Panel DATA solo lectura |
| Driver Deductions | Driver Deductions | `driver-deductions` | Panel DATA solo lectura |
| Driver Appeals | Driver Appeals | `driver-appeals` | Lector propio, operaciones aplazadas |
| Customer Care | Customer Care | `customer-care` | Panel DATA solo lectura |
| Driver Profile Requests | User Management (Master) | `driver-profile-requests` | Panel DATA solo lectura |
| User Directory | User Management (Master) | `user-directory` | Panel DATA solo lectura |
| Driver Password Reset Requests | User Management (Master) | `driver-reset-requests` | Panel DATA solo lectura |

**Helpdesk:** entre los 16 libros presentados no figura un Google Sheet de Helpdesk. La página Helpdesk no debe inventar ni reutilizar otra fuente. El desarrollo y la conexión de su posible libro propio quedan pendientes.

## Límites de la conexión inicial

- La Edge Function `operational-data` lee cada módulo a través de su variable `TAXIQAID_*_SHEET_ID`; el navegador **nunca** recibe credenciales de Google ni IDs secretos.
- Las pestañas `CHANGE_LOG`, `REQUESTS`, `ANSWERS`, `SIGNOFFS`, `EXPENSES`, `DRIVER_SCORE` o `FINANCIAL_APPROVAL` forman parte de los esquemas de los libros, pero **no son lectores activos ni flujos de escritura** de esta fase.
- Los tres libros de directorio/solicitudes se muestran únicamente a cuentas Master en User Management. Los demás respetan el permiso de lectura de su página.
- El control de escritura existente de Drivers es un proyecto aparte; esta fase **no cambia ningún Secret, rol, permiso ni dato de producción**.
- El test `tests/sheet-page-bindings.test.cjs` impide introducir rutas duplicadas, faltantes o apuntadas al libro incorrecto.

## Verificación real aún pendiente

La presencia de los Secrets y la ruta de código **no certifica** el valor real de cada ID ni que la cuenta de servicio Google pueda leer cada libro: los valores están ocultos por diseño. Cada libro requiere una lectura autenticada real de `DATA` por un usuario con acceso a su página; `0 records loaded` es válido cuando `DATA` está vacía, pero un error de encabezados/permisos no lo es.

Los registros del servicio ya han confirmado correctamente algunas lecturas, pero **no se afirma que los 16 estén verificados en vivo**. No hace falta activar las funcionalidades futuras para comprobar esas lecturas. La cuenta propietaria puede recorrer las páginas con Refresh cuando se haga la validación de aceptación.
