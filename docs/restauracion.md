# Restauración desde un respaldo JSON

Guía para una emergencia real: el proyecto de Supabase se perdió, se dañó o hay que reconstruirlo desde cero con los datos del último respaldo.

> **Antes de empezar**
> - El respaldo contiene datos personales. Trabaja siempre dentro de la carpeta `restore/` del repositorio (está en `.gitignore`) y bórrala al terminar.
> - Nunca pegues contraseñas, claves ni el contenido del respaldo en chats, tickets o commits.
> - Si el proyecto original sigue vivo, **no** ejecutes la restauración sobre él sin antes descargar un respaldo nuevo: el script vacía las 22 tablas antes de cargar los datos.

## Qué se recupera y qué no

| Se recupera | No se recupera |
|---|---|
| Las 22 tablas del respaldo (tickets, comentarios, historial, proyectos, equipos, dominios, SLA, horarios, notificaciones, auditoría, etc.) | Contraseñas de los usuarios: se crean cuentas sin contraseña |
| Folios y números de ticket originales | `password_registrador` y `password_hosting` de dominios (no se respaldan a propósito) |
| Usuarios (como cuentas mínimas en `auth.users`) | Archivos de Storage (adjuntos de tickets y respaldos anteriores) |
| | `backup_log` (historial de respaldos) |
| | Secretos de Vault, de Edge Functions y variables de Vercel |

## Lo que necesitas

- Acceso de administrador a Supabase, al sitio de SharePoint de respaldos, a Vercel y a Azure (Entra ID).
- Este repositorio actualizado (`git pull`) y Node instalado.
- `psql` (cliente de PostgreSQL). En Windows viene con el instalador de PostgreSQL; basta con marcar "Command Line Tools".
- El gestor de contraseñas donde están los secretos de Microsoft (`MS_*`).

---

## Paso 1. Descargar el respaldo de SharePoint

1. Abre el sitio de SharePoint de respaldos y entra a la carpeta configurada en `MS_FOLDER`.
2. Abre la subcarpeta del año (por ejemplo `2026`).
3. Descarga el archivo más reciente. Los nombres tienen la forma `AAAA-MM-DDTHHMMSS.json` en hora UTC, así que el último por nombre es el más nuevo.
4. Guárdalo en la carpeta `restore/` del repositorio, por ejemplo `restore/2026-11-06T184755.json`.

Si SharePoint no está disponible pero el proyecto original sigue vivo, el mismo archivo está en Supabase: **Storage > backups**, carpeta con la fecha.

## Paso 2. Crear el proyecto nuevo

1. En el dashboard de Supabase: **New project**. Usa la misma organización y, de preferencia, la misma región.
2. Guarda la contraseña de la base de datos en el gestor de contraseñas. La necesitarás en los pasos 3 y 5.
3. Anota el **Project ref** del proyecto nuevo (la parte `xxxx` de `https://xxxx.supabase.co`).

## Paso 3. Aplicar las migraciones

Desde la raíz del repositorio:

```bash
npx supabase@latest link --project-ref <REF_NUEVO>
```

```bash
npx supabase@latest db push --remote
```

Esto crea todas las tablas, funciones, políticas, buckets y tareas programadas. Las migraciones incluyen algunos datos de ejemplo; la restauración los borra.

> Las migraciones de respaldo (`phase9_backup_cron` y `cron_backup_timeout_60s`) dejan el cron apuntando a la URL del proyecto **anterior**. Se corrige en el paso 6.3.

## Paso 4. Generar el SQL de restauración

```bash
node scripts/backup-to-sql.mjs restore/2026-11-06T184755.json restore/restore.sql
```

El script muestra cuántas filas leyó de cada tabla y el tamaño del SQL. Anota los conteos: los compararás en el paso 5.

El SQL generado:

- Corre dentro de una transacción (`BEGIN` … `COMMIT`). Si algo falla, no se aplica nada.
- Desactiva los triggers de usuario de las 22 tablas mientras carga los datos y los reactiva al final.
- Vacía las 22 tablas (`TRUNCATE … RESTART IDENTITY CASCADE`).
- Crea una cuenta mínima en `auth.users` por cada perfil, sin contraseña.
- Carga los datos en orden de dependencias, conservando folios y números de ticket.
- Ajusta los consecutivos de `tickets.ticket_number`, `proyectos.folio` y `equipos.folio`.
- Termina con un conteo de filas por tabla.

## Paso 5. Ejecutar el SQL con psql

1. En el dashboard del proyecto nuevo: **Connect**. Copia la cadena de conexión **Session pooler** (puerto 5432) y reemplaza `[YOUR-PASSWORD]` por la contraseña del paso 2.
2. Ejecuta:

```bash
psql "<CADENA_DE_CONEXION>" -v ON_ERROR_STOP=1 -f restore/restore.sql
```

3. Al final aparece una tabla con `tabla | filas`. Compárala con los conteos del paso 4: deben coincidir.

Si aparece un error, la transacción se deshace y la base queda como estaba. Corrige la causa y vuelve a ejecutar el mismo comando: el script empieza vaciando las tablas, así que se puede repetir.

## Paso 6. Ajustes posteriores

### 6.1 Usuarios

Las cuentas se crearon **sin contraseña** y con el correo ya confirmado.

- **Quienes entran con Microsoft:** configura el proveedor en **Authentication > Sign In / Providers > Azure** con el Client ID, el Secret y la URL del tenant de la app de Entra ID. En Azure, agrega la URL de callback del proyecto nuevo (`https://<REF_NUEVO>.supabase.co/auth/v1/callback`) como Redirect URI. Al entrar, Supabase enlaza la cuenta por correo.
- **Quienes usan correo y contraseña:** deben usar "¿Olvidaste tu contraseña?" en la pantalla de inicio. También puedes enviarles el enlace desde **Authentication > Users > Send password recovery**.
- En **Authentication > URL Configuration**, pon el dominio de Vercel como Site URL y agrega `https://<dominio>/auth/callback` y `https://<dominio>/auth/reset-password` a las Redirect URLs.

> **No borres usuarios** en Authentication para "volver a crearlos". Al borrar un usuario se borra su perfil y, en cascada, todos los tickets que solicitó.

### 6.2 Contraseñas de dominios

`password_registrador` y `password_hosting` no están en el respaldo. Captúralas de nuevo en **Dominios** desde el gestor de contraseñas.

### 6.3 Tareas programadas

En el **SQL Editor** del proyecto nuevo:

1. Revisa que existan las dos tareas (`daily-backup-export` y `escalate-overdue-tickets`):

   ```sql
   select jobid, jobname, schedule, active from cron.job;
   ```

2. Crea en Vault el secreto que usa el cron de respaldo. Pega la **service_role key** del proyecto nuevo (Settings > API Keys) solo en el SQL Editor, nunca en un archivo del repositorio:

   ```sql
   select vault.create_secret('<SERVICE_ROLE_KEY_NUEVA>', 'backup_service_role_key');
   ```

3. Apunta el cron de respaldo al proyecto nuevo:

   ```sql
   select cron.alter_job(
     job_id := (select jobid from cron.job where jobname = 'daily-backup-export'),
     command := $cmd$
     select net.http_post(
       url := 'https://<REF_NUEVO>.supabase.co/functions/v1/backup-export',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'backup_service_role_key')
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 60000
     );
     $cmd$
   );
   ```

   Guarda este cambio también como una migración nueva en el repositorio, para que el código y la base no queden distintos.

### 6.4 Edge Functions y sus secretos

```bash
npx supabase@latest functions deploy backup-export --yes
```

Después configura los secretos en **Edge Functions > Secrets** (o con `npx supabase@latest secrets set`), copiando los valores del gestor de contraseñas:

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_SITE_ID`
- `MS_FOLDER`

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase automáticamente.

### 6.5 Variables de Vercel

En Vercel, **Settings > Environment Variables**, actualiza para Production (y Preview si se usa):

- `NEXT_PUBLIC_SUPABASE_URL` → `https://<REF_NUEVO>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la publishable key del proyecto nuevo

Después haz **Redeploy** del último despliegue: las variables `NEXT_PUBLIC_*` se fijan al construir. Actualiza también tu `.env.local`.

### 6.6 Archivos de Storage

El respaldo solo contiene datos de tablas, no archivos:

- **`ticket-attachments`:** los adjuntos de tickets se pierden. Si el proyecto anterior sigue accesible, descárgalos desde Storage y súbelos con la misma ruta al bucket nuevo.
- **`backups`:** empieza vacío. El primer respaldo del proyecto nuevo lo llenará. Los respaldos anteriores siguen en SharePoint.

## Paso 7. Verificación final

- [ ] Un admin entra con Microsoft y ve el dashboard con los datos esperados.
- [ ] Los tickets conservan su número y un ticket de prueba nuevo recibe el siguiente número.
- [ ] Proyectos y equipos conservan su folio.
- [ ] **Configuración > Respaldos > Respaldar ahora** termina en "Exitoso" y el archivo aparece en SharePoint.
- [ ] Al día siguiente, el respaldo automático aparece como "Automático" y "Exitoso".
- [ ] Borra la carpeta `restore/` de tu equipo.

## Ensayo recomendado

Practica esta guía de vez en cuando en un proyecto desechable de Supabase (pasos 2 a 5), para confirmar que el último respaldo se puede restaurar y que la guía sigue al día. Al terminar, borra ese proyecto.
