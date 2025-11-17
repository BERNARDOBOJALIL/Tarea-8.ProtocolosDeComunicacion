# 🔐 Sistema de Autenticación

El sistema ahora incluye autenticación JWT para proteger los datos de cada usuario y proporcionar una experiencia personalizada.

## 📋 Características

✅ **Registro de usuarios** con validación de email único  
✅ **Login con JWT** - Token válido por 24 horas  
✅ **Contraseñas hasheadas** con bcrypt  
✅ **Autorización automática** - Cada usuario solo puede ver/modificar sus propios datos  
✅ **Endpoints protegidos** - Requieren token JWT válido  

## 🚀 Inicio Rápido

### 1. Ejecutar Migración (solo primera vez)

```powershell
python migrate_auth.py
```

Esto agregará las columnas necesarias (`password_hash`, `activo`, `ultimo_login`) a la tabla `usuarios`.

### 2. Registrar un Usuario

**Endpoint:** `POST /auth/register`

```powershell
$registro = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/auth/register" -Body '{"nombre":"Juan Pérez","email":"juan@example.com","password":"password123","ingreso_mensual":5000,"objetivo_ahorro":1000}' -ContentType 'application/json'
```

**Respuesta:**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "ingreso_mensual": 5000.0,
  "objetivo_ahorro": 1000.0,
  "activo": true,
  "creado_en": "2025-11-15T14:00:00"
}
```

### 3. Iniciar Sesión

**Endpoint:** `POST /auth/login`

```powershell
$loginBody = "username=juan@example.com&password=password123"
$login = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/auth/login" -Body $loginBody -ContentType 'application/x-www-form-urlencoded'
$token = $login.access_token
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 4. Usar el Token

Incluye el token en el header `Authorization` de todas tus peticiones:

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

# Ver mi perfil
$me = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/auth/me" -Headers $headers

# Analizar mi balance
$balance = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/analisis/balance" -Headers $headers -Body "{`"usuario_id`":1,`"periodo_dias`":30}" -ContentType 'application/json'
```

## 🔒 Endpoints Protegidos

Los siguientes endpoints ahora requieren autenticación:

### Transacciones
- `POST /transacciones` - Crear transacción (solo para tu usuario)

### Análisis
- `POST /analisis/balance` - Analizar balance (solo tu balance)
- `POST /analisis/presupuestos` - Verificar presupuestos (solo tus presupuestos)
- `POST /analisis/completo` - Análisis completo (solo tus datos)

### Recomendaciones
- `POST /recomendaciones` - Obtener recomendaciones (solo para ti)

### Dashboard
- `GET /dashboard/{usuario_id}` - Ver dashboard (solo tu dashboard)

## 🛡️ Seguridad

### Contraseñas
- Hasheadas con **bcrypt** (algoritmo de hashing robusto)
- No se almacenan en texto plano
- Verificación segura en cada login

### Tokens JWT
- Expiración: **24 horas**
- Algoritmo: **HS256**
- Incluyen el email del usuario en el payload

### Autorización
- Validación automática en cada endpoint protegido
- Cada usuario solo puede acceder a sus propios datos
- Error `403 Forbidden` si intentas acceder a datos de otro usuario

## 📝 Validaciones

### Registro
- Email único (no puede haber duplicados)
- Contraseña mínima: 6 caracteres
- Todos los campos obligatorios

### Login
- Credenciales verificadas
- Usuario debe estar activo (`activo=true`)
- Token se genera solo si las credenciales son correctas

## 🔧 Configuración

### Variables de Entorno (.env)

```env
SECRET_KEY=tu-clave-secreta-super-segura-cambiar-en-produccion-123456789
```

**⚠️ IMPORTANTE:** Cambia la `SECRET_KEY` en producción por una clave aleatoria segura.

Para generar una clave segura en PowerShell:

```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (Get-Date).Ticks))
```

## 🧪 Probar el Sistema

### Script Completo de Prueba

```powershell
# 1. Registrar usuario
$registro = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/auth/register" -Body '{"nombre":"Test User","email":"test@example.com","password":"password123","ingreso_mensual":5000,"objetivo_ahorro":1000}' -ContentType 'application/json'
$userId = $registro.id

# 2. Login
$loginBody = "username=test@example.com&password=password123"
$login = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/auth/login" -Body $loginBody -ContentType 'application/x-www-form-urlencoded'
$token = $login.access_token

# 3. Headers
$headers = @{ Authorization = "Bearer $token" }

# 4. Crear transacción
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/transacciones" -Headers $headers -Body "{`"usuario_id`":$userId,`"tipo`":`"ingreso`",`"monto`":5000}" -ContentType 'application/json'

# 5. Análisis
$balance = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/analisis/balance" -Headers $headers -Body "{`"usuario_id`":$userId,`"periodo_dias`":30}" -ContentType 'application/json'
$balance | ConvertTo-Json -Depth 10
```

## 🔄 Flujo de Autenticación

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ 1. POST /auth/register
       │    (nombre, email, password)
       │
       ▼
┌─────────────┐
│     API     │──► Hash password (bcrypt)
└──────┬──────┘   ──► Guardar en DB
       │
       │ 2. POST /auth/login
       │    (email, password)
       │
       ▼
┌─────────────┐
│     API     │──► Verificar password
└──────┬──────┘   ──► Generar JWT token
       │
       │ ◄── Token JWT (válido 24h)
       │
       ▼
┌─────────────┐
│   Cliente   │──► Guardar token
└──────┬──────┘
       │
       │ 3. Peticiones protegidas
       │    Authorization: Bearer {token}
       │
       ▼
┌─────────────┐
│     API     │──► Validar token
└──────┬──────┘   ──► Verificar permisos
       │           ──► Ejecutar acción
       │
       │ ◄── Respuesta
       │
       ▼
```

## 📚 Documentación Adicional

- Ver `GUIA_AUTENTICACION.md` para ejemplos detallados
- Consulta `/docs` (Swagger UI) para probar endpoints interactivamente
- Consulta `/redoc` (ReDoc) para documentación alternativa

## ❓ Preguntas Frecuentes

### ¿Qué pasa si mi token expira?
Debes hacer login nuevamente para obtener un nuevo token.

### ¿Puedo ver los datos de otro usuario?
No, cada usuario solo puede acceder a sus propios datos. Si intentas acceder a datos de otro usuario, recibirás un error `403 Forbidden`.

### ¿Las contraseñas se almacenan en texto plano?
No, todas las contraseñas se hashean con bcrypt antes de guardarse.

### ¿Puedo cambiar mi contraseña?
Actualmente no hay endpoint de cambio de contraseña, pero puedes agregarlo fácilmente.

## 🚀 Próximos Pasos

Mejoras opcionales que puedes implementar:

- [ ] Endpoint para cambiar contraseña
- [ ] Endpoint para recuperar contraseña (reset)
- [ ] Refresh tokens para renovar sin login
- [ ] Rate limiting en endpoints de autenticación
- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 con Google/GitHub
