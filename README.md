# BARBERÍA TAURUS — Plataforma Web de Gestión de Servicios y Reservas

Proyecto Integrador · Programación y Plataformas Web · Universidad Politécnica Salesiana
**Fase I: aplicación web con Angular, Firebase Authentication y Cloud Firestore.**
Contexto: barbería con estilo *Urban Luxury* (negro, champagne, marfil y grafito).

## Integrantes
| Integrante | Aportes principales |
|---|---|
| Edison Muy — Integrante A | Prototipo HTML/CSS/JS, interfaz Angular, formularios y validaciones, páginas de cliente |
| Esteban Pezantes — Integrante B | Firebase (Authentication, Firestore, reglas de seguridad), servicios Angular, guards, panel de administración |

Los aportes individuales pueden verificarse con `git log`.

## Versiones
Angular 21.2 · TypeScript 5.9 · Firebase JS SDK 13 · Node.js 22 · npm 11 · Vitest 4 · Bootstrap 5.3.3 y Bootstrap Icons 1.11.3 (por CDN, requiere internet).

## Instalación y ejecución
```bash
npm install
cp src/environments/firebase.config.example.ts src/environments/firebase.config.ts   # y completar con los datos del proyecto Firebase
npm start          # http://localhost:4200
npm run build      # compilación de producción en dist/
npm test           # pruebas unitarias
```
En Windows (CMD) el segundo paso es: `copy src\environments\firebase.config.example.ts src\environments\firebase.config.ts`.

`firebase.config.ts` **no se sube a Git** (está en `.gitignore`); cada integrante tiene su copia. Las credenciales de prueba y la configuración para el docente se entregan por el canal privado de AVAC.

## Configuración de Firebase (una sola vez)
1. Crear el proyecto en Firebase, registrar una app web y copiar su configuración en `src/environments/firebase.config.ts`.
2. **Authentication** → activar el proveedor *Correo y contraseña*.
3. **Firestore** → crear la base de datos y publicar las reglas del archivo `firestore.rules`:
   `npx firebase-tools deploy --only firestore:rules`
4. **Cuenta de administrador (procedimiento controlado):** el registro público *siempre* crea clientes. Para crear el administrador:
   1. En Authentication → *Add user*, crear el correo y la contraseña del administrador y copiar su **UID**.
   2. En Firestore, crear el documento `usuarios/<UID>` con los campos `nombre` (texto), `email` (texto) y `rol` = `admin`.
   3. Las reglas impiden que un usuario se asigne `admin` por sí mismo.
5. **Datos de ejemplo:** el proyecto de Firebase entregado al docente ya tiene servicios, barberos y reservas ficticias. Si se usa un proyecto nuevo, se crean desde el panel de administración (servicios y horario de cada barbero) o desde la consola de Firestore con esta estructura:
   - `servicios/<id>`: `nombre`, `descripcion`, `duracionMinutos` (número), `precio` (número), `activo` (booleano).
   - `barberos/<id>`: `nombre`, `activo` (booleano) y `horario` = `{ dias: [1,2,3,4,5,6], inicio: "09:00", fin: "19:00" }` (los días van de 0 = domingo a 6 = sábado).

## Publicación (Firebase Hosting)
```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting,firestore:rules
```
`firebase.json` reescribe todas las rutas a `index.html`, así que recargar `/mis-reservas` o abrir una ruta directa funciona. **URL publicada:** _(pegar aquí la URL cuando se despliegue)_.

## Qué hace la aplicación
| Rol | Puede |
|---|---|
| Visitante | Ver el catálogo de servicios y los barberos; **consultar horarios disponibles** sin cuenta; al confirmar se le pide iniciar sesión o registrarse y vuelve a su reserva con la selección conservada |
| Cliente | Reservar eligiendo servicio, barbero, fecha y una **hora libre**; ver sus reservas; cancelar las futuras confirmadas (con confirmación en un diálogo propio, no el del navegador) |
| Administrador | Ver todas las reservas **en tiempo real** (sin recargar la página; avisa cuando entra una nueva) con filtro por fecha y estado; cancelar; marcar como atendidas las que ya terminaron; crear/editar/activar servicios; definir los **días y el horario de atención** de cada barbero y activarlo/desactivarlo |

### Regla de negocio central
Un barbero no puede tener dos reservas activas con horarios superpuestos: hay cruce si `nuevoInicio < finExistente` **y** `nuevoFin > inicioExistente`. Una cita puede empezar justo cuando termina otra. El fin se calcula con la duración del servicio; toda la cita debe caber en el horario del barbero; el inicio debe ser futuro. Las reservas **canceladas liberan el horario**; las atendidas conservan su ocupación. Cambiar el horario de un barbero se rechaza si dejaría fuera una reserva futura confirmada.

### Zona horaria
El negocio opera en **America/Guayaquil (UTC−5, sin horario de verano)**. Todas las fechas y horas se interpretan en esa zona **sin importar la zona del navegador**: la interfaz (selector de fecha, horas disponibles y listados), las validaciones (día de atención, horario, fecha futura) y la persistencia. En Firestore, `inicio` y `fin` se guardan como milisegundos desde el epoch (UTC) y `fecha` como texto `AAAA-MM-DD` del día en hora de Guayaquil. La lógica está centralizada en `src/app/services/horarios.ts` (`fechaNegocio`, `partesNegocio`, `hoyNegocio`) y hay pruebas en `horarios.spec.ts`. Se usa un desfase fijo de −05:00, válido para el Ecuador continental (no cubre Galápagos, UTC−6).

### Implementación
La lógica pura de disponibilidad está en `src/app/services/horarios.ts` (con pruebas) y el uso con Firestore en `reserva.service.ts`. Cada reserva crea además un documento en `horariosOcupados` (con barbero, fecha, inicio y fin) que consulta cualquier visitante para ver qué horas están ocupadas. El panel de administración usa `onSnapshot` de Firestore para recibir las reservas en tiempo real.

### Seguridad
`firestore.rules`: cada cliente solo lee y cancela sus reservas; el administrador gestiona todo; `servicios`, `barberos` y `horariosOcupados` se leen públicamente (los horarios ocupados no contienen datos personales, solo un identificador interno) y solo el administrador escribe servicios y barberos; el registro público solo puede crear `rol: 'cliente'`. Los *guards* de Angular solo ayudan a la navegación: los permisos reales están en las reglas.

## Evolución del prototipo a Angular
`prototipo-inicial/` es la primera interfaz, hecha con HTML semántico, CSS adaptable y JavaScript puro (sin Angular ni base de datos). Lo que resolvió con JavaScript se rehízo en Angular así:
- **Hora de fin de la cita** (`actualizarResumen`) → `generarHoras()` y `validarEnHorario()` en `horarios.ts`, que calculan el fin con `duracionMinutos`.
- **Validación con `if`** → `Validators` de los formularios reactivos, y se repite en `ReservaService.crearReserva()` porque el servidor de datos no se puede dar por confiable.
- **Datos fijos en el HTML** → colecciones `servicios` y `barberos` de Firestore, leídas por `ServicioService`.
- **Reserva en memoria** → colecciones `reservas` y `horariosOcupados` de Firestore.
- **Mensajes con `alert`** → mensajes en pantalla con `role="alert"` y un diálogo de confirmación propio (`confirm-dialog`).
- El filtro por texto del prototipo no se migró al catálogo de Angular.

## Estructura
```
src/app/
  services/
    firebase.ts                 Inicializa Firebase (app, auth, db)
    models.ts                   Tipos: Usuario, Servicio, Barbero, Reserva, HorarioAtencion
    auth.service.ts             Registro, inicio y cierre de sesión, rol
    servicio.service.ts         Servicios y barberos en Firestore
    reserva.service.ts          Reservas, cancelación, atención, horarios libres y escucha en tiempo real
    horarios.ts                 Funciones puras: regla de disponibilidad y zona horaria
  guards/auth.guard.ts          sesionGuard y adminGuard
  components/                   navbar (menú móvil, sesión) y confirm-dialog (diálogo reutilizable)
  pages/                        servicios-catalogo, crear-reserva, mis-reservas,
                                admin-dashboard, login, registro
src/environments/               firebase.config.example.ts (la real no se versiona)
prototipo-inicial/              Primera interfaz en HTML, CSS y JavaScript
firestore.rules  firebase.json  Reglas de seguridad y configuración de hosting
docs/                           Diseño, pruebas, usabilidad y declaración de uso de IA
```

## Limitaciones conocidas
- **El solapamiento de horarios se valida en el cliente** (Angular) con los datos de Firestore; las reglas de seguridad no lo verifican. La Fase I lo permite. La protección ante solicitudes simultáneas (dos personas reservando el mismo horario al mismo tiempo) se exige en la Fase II.
- Zona horaria con desfase fijo de −05:00 (Ecuador continental; no cubre Galápagos).
- Bootstrap se carga por CDN: sin internet la interfaz se ve sin estilos.
- Las reglas de Firestore no validan el contenido de los horarios ocupados; es una simplificación de la Fase I.

## Uso de IA
Ver `docs/declaracion-ia.md`. Pruebas realizadas: `docs/pruebas.md`.