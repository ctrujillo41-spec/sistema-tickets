# Verificación en dos pasos (MFA)

## Qué es

Además de la contraseña o de la cuenta de Microsoft, el **staff** (administradores y agentes) necesita un código de 6 dígitos que genera una app en su teléfono. Ese código cambia cada 30 segundos. Si alguien roba una contraseña, sin el teléfono no puede entrar al panel.

Los usuarios finales (rol "usuario final") no necesitan este paso.

## Cómo registrarse (una sola vez)

1. Instala en tu teléfono una app de autenticación: Microsoft Authenticator, Google Authenticator u otra compatible con TOTP.
2. Entra al Sistema de Tickets como siempre. Te llevará a la pantalla **Verificación en dos pasos**.
3. En la app del teléfono, agrega una cuenta nueva y escanea el código QR. Si no puedes escanearlo, escribe a mano la clave que aparece debajo.
4. Escribe el código de 6 dígitos que muestra la app y da clic en **Activar**.

Listo: entrarás al panel.

## Cómo se entra a diario

1. Inicia sesión con tu correo y contraseña o con Microsoft.
2. Abre la app de autenticación en tu teléfono.
3. Escribe el código de 6 dígitos de "Sistema de Tickets" y da clic en **Verificar**.

Si el código sale como incorrecto o expirado, espera al siguiente código y revisa que la hora del teléfono esté en automático.

## Si alguien perdió su teléfono (solo administradores)

1. En el dashboard de Supabase, entra a **Authentication > Users**.
2. Busca y abre al usuario.
3. En la sección de MFA, elimina su factor.
4. Avísale que vuelva a entrar al sistema: le aparecerá de nuevo la pantalla para registrar su teléfono.

> Antes de restablecer el factor, confirma la identidad de la persona por un canal confiable (en persona o por llamada). Quien tenga acceso a la cuenta con el factor restablecido puede registrar su propio teléfono.

> **No borres al usuario**, solo su factor. Borrar al usuario elimina también su perfil y sus tickets.
