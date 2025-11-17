# Sistema Multiagente de Finanzas Personales Inteligentes

Sistema avanzado de gestión financiera personal que utiliza múltiples agentes de IA (Google Gemini) trabajando en colaboración mediante protocolos de comunicación estandarizados.

## Datos del Proyecto

- **Nombre**: Sistema Multiagente de Finanzas Personales
- **Tecnologías**: FastAPI, PostgreSQL, Google Gemini AI, SQLAlchemy
- **Fecha**: 16 de Noviembre 2025
- **Equipo**: Pablo Urbina Macip y Bernardo Bojalil Lorenzini

## Introducción

Este sistema implementa un enfoque multiagente para la gestión de finanzas personales, donde cada agente cumple un rol específico y se comunica con otros mediante protocolos estandarizados. El sistema utiliza modelos de IA de Google Gemini para proporcionar análisis inteligente, recomendaciones personalizadas y alertas proactivas.

### Objetivos Principales

- Gestión automática y colaborativa de finanzas personales
- Análisis inteligente mediante IA (Google Gemini)
- Comunicación estructurada entre agentes usando protocolos definidos
- API REST completa para integración con frontend
- Almacenamiento persistente en PostgreSQL (Render)

## Capturas de Pantalla

Coloca las imágenes en `public/screenshots/` con los siguientes nombres sugeridos. Se mostrarán automáticamente en esta sección.

### Login
![Login](public/screenshots/login.png)

### Dashboard
![Dashboard](public/screenshots/dashboard.png)

### Transacciones
![Transacciones](public/screenshots/transacciones.png)

### Presupuestos
![Presupuestos](public/screenshots/presupuestos.png)

### Alertas
![Alertas](public/screenshots/alertas.png)

### Análisis IA
![Análisis IA](public/screenshots/analisis-ia.png)

## Arquitectura Multiagente y Protocolos

### Agentes del Sistema

| Agente | Rol | Modelo Gemini | Protocolo Principal |
|--------|-----|---------------|---------------------|
| **Planificador** | Descompone tareas financieras en subtareas | gemini-2.0-flash | ANP |
| **Ejecutor** | Realiza cálculos y operaciones financieras | gemini-2.5-flash | ACP |
| **Notificador** | Envía alertas y notificaciones | gemini-2.0-flash | A2A |
| **Interfaz** | Formatea información para el usuario | gemini-2.0-flash | AGUI |
| **Knowledge Base** | Almacena y proporciona datos históricos | gemini-2.5-pro | MCP |
| **Monitor** | Supervisa el sistema multiagente | gemini-2.0-flash | Múltiples |

### Protocolos Implementados

#### 1. **A2A (Agent-to-Agent)** 
- **Propósito**: Comunicación general entre cualquier par de agentes
- **Uso**: Notificaciones simples y coordinación básica
- **Ejemplo**: Notificador → Interfaz para mostrar alertas
- **Archivo**: `protocolos/a2a_protocol.py`

#### 2. **ACP (Agent Communication Protocol)**
- **Propósito**: Intercambio estructurado de mensajes y diálogos
- **Uso**: Consultas complejas y respuestas estructuradas
- **Ejemplo**: Ejecutor → Knowledge Base para obtener transacciones
- **Archivo**: `protocolos/acp_protocol.py`
- **Performatives**: inform, request, query, confirm, propose, accept, reject

#### 3. **ANP (Agent Negotiation Protocol)**
- **Propósito**: Resolución de conflictos y distribución de tareas/recursos
- **Uso**: Planificación y asignación de subtareas
- **Ejemplo**: Planificador distribuye análisis financiero entre múltiples agentes
- **Archivo**: `protocolos/anp_protocol.py`

#### 4. **AGUI (Agent-to-User Interface)**
- **Propósito**: Comunicación optimizada agente-interfaz
- **Uso**: Presentación de información al usuario final
- **Ejemplo**: Interfaz formatea dashboard para visualización
- **Archivo**: `protocolos/agui_protocol.py`
- **Componentes**: alert, dashboard, chart, table, form, card, list, progress

#### 5. **MCP (Message Content Protocol)**
- **Propósito**: Estandarización del contenido de mensajes
- **Uso**: Formato y validación de datos financieros
- **Ejemplo**: Knowledge Base retorna datos con esquema validado
- **Archivo**: `protocolos/mcp_protocol.py`

## Flujos de Comunicación Principales

### Flujo 1: Análisis Financiero Completo
```
Usuario → FastAPI → Planificador (ANP)
                         ↓
           [Descompone en subtareas]
                         ↓
              ┌──────────┼──────────┐
              ↓          ↓          ↓
         Ejecutor    Knowledge   Notificador
          (ACP)       Base (MCP)    (A2A)
              ↓          ↓          ↓
              └──────────┼──────────┘
                         ↓
                   Interfaz (AGUI)
                         ↓
                      Usuario
```

**Protocolo ANP**: Planificador negocia distribución de tareas
- Subtarea 1: Ejecutor calcula balance
- Subtarea 2: Knowledge Base analiza patrones históricos
- Subtarea 3: Notificador genera alertas si hay desviaciones

### Flujo 2: Creación de Transacción con Alerta
```
Usuario → FastAPI → [Guarda en DB]
                         ↓
                   Ejecutor (ACP)
                         ↓
              [Verifica presupuesto]
                         ↓
                 ¿Excede 80%? → Sí → Notificador (A2A)
                                          ↓
                                    Interfaz (AGUI)
                                          ↓
                                       Usuario
```

**Protocolo A2A**: Comunicación simple para alertas
**Protocolo AGUI**: Formato visual para el usuario

### Flujo 3: Consulta de Datos Históricos
```
Usuario → FastAPI → Knowledge Base (MCP)
                         ↓
              [Consulta en PostgreSQL]
                         ↓
              [Valida con esquema MCP]
                         ↓
                 Ejecutor (ACP)
                         ↓
              [Genera análisis con IA]
                         ↓
                   Interfaz (AGUI)
                         ↓
                      Usuario
```

**Protocolo MCP**: Datos estandarizados y validados
**Protocolo ACP**: Intercambio estructurado para análisis

## Desarrollo de la Solución

### Estructura del Proyecto

```
Protocolos_tarea/
├── agentes/
│   ├── __init__.py
│   ├── base_agent.py              # Clase base para todos los agentes
│   ├── planificador_agent.py      # Agente Planificador (ANP)
│   ├── ejecutor_agent.py          # Agente Ejecutor (ACP)
│   ├── notificador_agent.py       # Agente Notificador (A2A)
│   ├── interfaz_agent.py          # Agente Interfaz (AGUI)
│   ├── knowledge_base_agent.py    # Agente Knowledge Base (MCP)
│   └── monitor_agent.py           # Agente Monitor
├── protocolos/
│   ├── __init__.py
│   ├── a2a_protocol.py            # Protocolo Agent-to-Agent
│   ├── acp_protocol.py            # Protocolo de Comunicación
│   ├── anp_protocol.py            # Protocolo de Negociación
│   ├── agui_protocol.py           # Protocolo Agent-UI
│   └── mcp_protocol.py            # Protocolo de Contenido
├── config.py                       # Configuración general
├── database.py                     # Conexión PostgreSQL
├── models.py                       # Modelos SQLAlchemy
├── main.py                         # FastAPI endpoints
├── requirements.txt                # Dependencias Python
├── .env.example                    # Variables de entorno
├── postman_collection_completo.json # Colección Postman
└── README.md                       # Este archivo
```

### Tecnologías Utilizadas

- **FastAPI**: Framework web moderno y rápido
- **PostgreSQL**: Base de datos relacional (Render)
- **SQLAlchemy**: ORM para Python
- **Google Gemini AI**: Modelos de IA generativa
- **Pydantic**: Validación de datos
- **Uvicorn**: Servidor ASGI

### Modelos de Base de Datos

#### Usuario
```python
- id, nombre, email
- ingreso_mensual, objetivo_ahorro
- creado_en, actualizado_en
```

#### Transacción
```python
- id, usuario_id, tipo (ingreso/gasto)
- categoria, monto, descripcion
- fecha, creado_en
```

#### Presupuesto
```python
- id, usuario_id, categoria
- monto_limite, monto_gastado
- mes, anio, actualizado_en
```

#### Alerta
```python
- id, usuario_id, nivel, estado
- titulo, mensaje, metadata
- creado_en, leido_en
```

#### AnalisisFinanciero
```python
- id, usuario_id
- periodo_inicio, periodo_fin
- total_ingresos, total_gastos, balance
- recomendaciones, analisis_ia
```

## Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <tu-repositorio>
cd Protocolos_tarea
```

### 2. Crear Entorno Virtual
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar Dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Editar `.env` y agregar:
```env
DATABASE_URL=postgresql:...
GOOGLE_API_KEY=tu_api_key_de_google_ai_studio
```

**Obtener API Key de Google**: https://makersuite.google.com/app/apikey

### 5. Iniciar el Servidor
```bash
uvicorn main:app --reload --port 8000
```

La API estará disponible en: `http://localhost:8000`

Documentación interactiva: `http://localhost:8000/docs`

## Pruebas y Uso de la API

### Pruebas con Postman

1. Importar la colección `postman_collection_completo.json` en Postman
2. La variable `{{base_url}}` está configurada como `http://localhost:8000`
3. Para Render, cambiar a: `https://tu-app.onrender.com`

### Secuencia de Pruebas Recomendada

#### 1. Verificar Sistema
```
GET /
GET /health
GET /monitor/status
```

#### 2. Crear Usuario
```
POST /usuarios
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "ingreso_mensual": 50000.0,
  "objetivo_ahorro": 10000.0
}
```

#### 3. Crear Presupuestos
```
POST /presupuestos (Alimentación: 5000)
POST /presupuestos (Transporte: 3000)
POST /presupuestos (Entretenimiento: 2000)
```

#### 4. Registrar Transacciones
```
POST /transacciones (Ingreso: 50000)
POST /transacciones (Gasto Alimentación: 1500)
POST /transacciones (Gasto Transporte: 800)
```

#### 5. Análisis con IA
```
POST /analisis/balance         # Agente Ejecutor (ACP)
POST /analisis/presupuestos    # Agente Ejecutor (ACP)
POST /analisis/completo        # Agente Planificador (ANP)
POST /recomendaciones          # Knowledge Base (MCP)
```

#### 6. Visualización
```
GET /dashboard/1               # Agente Interfaz (AGUI)
GET /alertas?usuario_id=1
```

## Documentación de Endpoints

### Endpoints de Sistema

#### GET /
Obtiene información general del sistema y estado de los agentes.

**Respuesta:**
```json
{
  "app": "Sistema Multiagente de Finanzas Personales",
  "version": "1.0.0",
  "status": "online",
  "agentes": {
    "planificador": "activo",
    "ejecutor": "activo",
    "notificador": "activo",
    "interfaz": "activo",
    "knowledge_base": "activo",
    "monitor": "activo"
  },
  "protocolos": ["A2A", "ACP", "ANP", "AGUI", "MCP"]
}
```

#### GET /health
Verifica el estado de salud del sistema completo.

**Respuesta:**
```json
{
  "status": "healthy",
  "database": "connected",
  "agents": "all_active",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

#### GET /monitor/status
Obtiene métricas del sistema multiagente.

**Respuesta:**
```json
{
  "health": {
    "database": "healthy",
    "agents": "operational"
  },
  "metrics": {
    "uptime": 3600,
    "total_messages": 150
  },
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

#### GET /monitor/agentes
Obtiene estado detallado de todos los agentes.

**Respuesta:**
```json
{
  "agentes": {
    "planificador": {
      "activo": true,
      "historial": 25
    },
    "ejecutor": {
      "activo": true,
      "historial": 42
    },
    "notificador": {
      "activo": true,
      "historial": 18
    },
    "interfaz": {
      "activo": true,
      "historial": 30
    },
    "knowledge_base": {
      "activo": true,
      "historial": 35
    },
    "monitor": {
      "activo": true,
      "historial": 50
    }
  }
}
```

### Endpoints de Usuarios

#### POST /usuarios
Crea un nuevo usuario en el sistema.

**Body (JSON):**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "ingreso_mensual": 50000.0,
  "objetivo_ahorro": 10000.0
}
```

**Validaciones:**
- `nombre`: string, mínimo 1 carácter, máximo 100
- `email`: string, mínimo 1 carácter, máximo 100, único
- `ingreso_mensual`: float, mayor o igual a 0
- `objetivo_ahorro`: float, mayor o igual a 0

**Respuesta (201 Created):**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "ingreso_mensual": 50000.0,
  "objetivo_ahorro": 10000.0,
  "creado_en": "2025-11-11T10:30:00.000Z"
}
```

**Errores:**
- 400: Email ya registrado

#### GET /usuarios
Lista todos los usuarios registrados.

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "ingreso_mensual": 50000.0,
    "objetivo_ahorro": 10000.0,
    "creado_en": "2025-11-11T10:30:00.000Z"
  }
]
```

#### GET /usuarios/{usuario_id}
Obtiene un usuario específico por ID.

**Parámetros:**
- `usuario_id` (path): integer

**Respuesta:**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "ingreso_mensual": 50000.0,
  "objetivo_ahorro": 10000.0,
  "creado_en": "2025-11-11T10:30:00.000Z"
}
```

**Errores:**
- 404: Usuario no encontrado

### Endpoints de Transacciones

#### POST /transacciones
Crea una nueva transacción. Si es un gasto, actualiza automáticamente el presupuesto correspondiente y genera alertas si se excede el 80% del límite.

**Body (JSON):**
```json
{
  "usuario_id": 1,
  "tipo": "GASTO",
  "categoria": "ALIMENTACION",
  "monto": 1500.0,
  "descripcion": "Supermercado mensual",
  "fecha": "2025-11-11T10:00:00.000Z"
}
```

**Valores permitidos:**
- `tipo`: "INGRESO" | "GASTO"
- `categoria`: "ALIMENTACION" | "TRANSPORTE" | "ENTRETENIMIENTO" | "VIVIENDA" | "SERVICIOS" | "SALUD" | "EDUCACION" | "OTROS"

**Validaciones:**
- `usuario_id`: integer, debe existir
- `tipo`: enum TipoTransaccion
- `categoria`: enum CategoriaGasto (opcional)
- `monto`: float, mayor a 0
- `descripcion`: string (opcional)
- `fecha`: datetime (opcional, por defecto fecha actual)

**Respuesta (201 Created):**
```json
{
  "id": 1,
  "usuario_id": 1,
  "tipo": "GASTO",
  "categoria": "ALIMENTACION",
  "monto": 1500.0,
  "descripcion": "Supermercado mensual",
  "fecha": "2025-11-11T10:00:00.000Z"
}
```

**Protocolo usado:** A2A (notifica al Ejecutor si se debe generar alerta)

**Errores:**
- 404: Usuario no encontrado

#### GET /transacciones
Lista transacciones con filtros opcionales.

**Query Parameters:**
- `usuario_id` (optional): integer
- `tipo` (optional): "INGRESO" | "GASTO"
- `categoria` (optional): enum CategoriaGasto
- `dias` (optional): integer, default 30

**Ejemplo:** `/transacciones?usuario_id=1&tipo=GASTO&dias=90`

**Respuesta:**
```json
[
  {
    "id": 1,
    "usuario_id": 1,
    "tipo": "GASTO",
    "categoria": "ALIMENTACION",
    "monto": 1500.0,
    "descripcion": "Supermercado mensual",
    "fecha": "2025-11-11T10:00:00.000Z"
  },
  {
    "id": 2,
    "usuario_id": 1,
    "tipo": "INGRESO",
    "categoria": null,
    "monto": 50000.0,
    "descripcion": "Salario mensual",
    "fecha": "2025-11-01T00:00:00.000Z"
  }
]
```

### Endpoints de Presupuestos

#### POST /presupuestos
Crea un nuevo presupuesto para una categoría y período específico.

**Body (JSON):**
```json
{
  "usuario_id": 1,
  "categoria": "ALIMENTACION",
  "monto_limite": 5000.0,
  "mes": 11,
  "anio": 2025
}
```

**Validaciones:**
- `usuario_id`: integer, debe existir
- `categoria`: enum CategoriaGasto
- `monto_limite`: float, mayor a 0
- `mes`: integer, entre 1 y 12
- `anio`: integer, mayor o igual a 2020

**Respuesta (201 Created):**
```json
{
  "id": 1,
  "usuario_id": 1,
  "categoria": "ALIMENTACION",
  "monto_limite": 5000.0,
  "monto_gastado": 0.0,
  "mes": 11,
  "anio": 2025,
  "porcentaje_usado": 0.0
}
```

**Protocolo usado:** ANP (negociación de distribución de recursos)

**Errores:**
- 404: Usuario no encontrado
- 400: Ya existe presupuesto para esta categoría y período

#### GET /presupuestos
Lista presupuestos con filtros opcionales.

**Query Parameters:**
- `usuario_id` (optional): integer
- `mes` (optional): integer
- `anio` (optional): integer

**Ejemplo:** `/presupuestos?usuario_id=1&mes=11&anio=2025`

**Respuesta:**
```json
[
  {
    "id": 1,
    "usuario_id": 1,
    "categoria": "ALIMENTACION",
    "monto_limite": 5000.0,
    "monto_gastado": 3800.0,
    "mes": 11,
    "anio": 2025,
    "porcentaje_usado": 76.0
  },
  {
    "id": 2,
    "usuario_id": 1,
    "categoria": "TRANSPORTE",
    "monto_limite": 3000.0,
    "monto_gastado": 1200.0,
    "mes": 11,
    "anio": 2025,
    "porcentaje_usado": 40.0
  }
]
```

#### GET /presupuestos/{presupuesto_id}
Obtiene un presupuesto específico por ID.

**Parámetros:**
- `presupuesto_id` (path): integer

**Respuesta:**
```json
{
  "id": 1,
  "usuario_id": 1,
  "categoria": "ALIMENTACION",
  "monto_limite": 5000.0,
  "monto_gastado": 3800.0,
  "mes": 11,
  "anio": 2025,
  "porcentaje_usado": 76.0
}
```

**Errores:**
- 404: Presupuesto no encontrado

### Endpoints de Alertas

#### GET /alertas
Lista alertas con filtros opcionales.

**Query Parameters:**
- `usuario_id` (optional): integer
- `estado` (optional): "PENDIENTE" | "LEIDA" | "ARCHIVADA"
- `nivel` (optional): "INFO" | "WARNING" | "CRITICAL"

**Ejemplo:** `/alertas?usuario_id=1&estado=PENDIENTE`

**Respuesta:**
```json
[
  {
    "id": 1,
    "usuario_id": 1,
    "nivel": "WARNING",
    "estado": "PENDIENTE",
    "titulo": "Presupuesto cerca del límite",
    "mensaje": "Has gastado el 85% de tu presupuesto en Alimentación",
    "creado_en": "2025-11-11T10:30:00.000Z"
  }
]
```

#### PATCH /alertas/{alerta_id}/marcar-leida
Marca una alerta como leída.

**Parámetros:**
- `alerta_id` (path): integer

**Respuesta:**
```json
{
  "status": "success",
  "message": "Alerta marcada como leída"
}
```

**Errores:**
- 404: Alerta no encontrada

### Endpoints de Análisis con IA

#### POST /analisis/balance
Analiza el balance financiero del usuario usando el Agente Ejecutor con datos reales de la base de datos.

**Body (JSON):**
```json
{
  "usuario_id": 1,
  "periodo_dias": 30
}
```

**Validaciones:**
- `usuario_id`: integer, debe existir
- `periodo_dias`: integer, entre 1 y 365, default 30

**Respuesta:**
```json
{
  "status": "success",
  "analisis": {
    "status": "balance_calculated",
    "resultado": {
      "ingresos_totales": 50000.0,
      "gastos_totales": 28500.0,
      "balance": 21500.0,
      "total_transacciones": 15,
      "gastos_por_categoria": {
        "ALIMENTACION": 8500.0,
        "TRANSPORTE": 5000.0,
        "ENTRETENIMIENTO": 3000.0,
        "SERVICIOS": 12000.0
      },
      "analisis_ia": {
        "evaluacion_general": "Balance positivo. Estás ahorrando el 43% de tus ingresos mensuales.",
        "puntos_criticos": [
          "Los servicios representan el 42% del gasto total",
          "La alimentación está dentro de lo esperado"
        ],
        "recomendaciones": [
          "Considera renegociar contratos de servicios para reducir costos fijos",
          "Mantén el control en alimentación y transporte"
        ],
        "tendencia": "positiva"
      }
    },
    "protocol_used": "ACP"
  },
  "protocol_used": "ACP",
  "agent": "Ejecutor"
}
```

**Protocolo usado:** ACP (comunicación estructurada con Knowledge Base)

**Errores:**
- 404: Usuario no encontrado
- 503: Agente Ejecutor no disponible

#### POST /analisis/presupuestos
Verifica el estado de todos los presupuestos del usuario usando el Agente Ejecutor con datos reales.

**Body (JSON):**
```json
{
  "usuario_id": 1,
  "periodo_dias": 30
}
```

**Validaciones:**
- `usuario_id`: integer, debe existir
- `periodo_dias`: integer, entre 1 y 365, default 30

**Respuesta:**
```json
{
  "status": "success",
  "analisis": {
    "status": "budgets_verified",
    "resultado": {
      "presupuestos": [
        {
          "categoria": "ALIMENTACION",
          "limite": 5000.0,
          "gastado": 3800.0,
          "porcentaje": 76.0,
          "estado": "cerca"
        },
        {
          "categoria": "TRANSPORTE",
          "limite": 3000.0,
          "gastado": 3200.0,
          "porcentaje": 106.67,
          "estado": "excedido"
        },
        {
          "categoria": "ENTRETENIMIENTO",
          "limite": 2000.0,
          "gastado": 1200.0,
          "porcentaje": 60.0,
          "estado": "dentro"
        }
      ],
      "analisis_ia": "El presupuesto de Transporte ha sido excedido en un 6.67%. Se recomienda evaluar alternativas de movilidad más económicas. El presupuesto de Alimentación está cerca del límite, controla los gastos en esta categoría.",
      "recomendaciones": [
        "Reducir gastos en transporte: considera uso de transporte público",
        "Monitorear de cerca alimentación para no exceder el límite",
        "Entretenimiento está bajo control"
      ]
    },
    "protocol_used": "ACP"
  },
  "protocol_used": "ACP",
  "agent": "Ejecutor"
}
```

**Estados de presupuesto:**
- `dentro`: porcentaje <= 75%
- `cerca`: 76% <= porcentaje <= 100%
- `excedido`: porcentaje > 100%

**Protocolo usado:** ACP (comunicación estructurada)

**Errores:**
- 404: Usuario no encontrado
- 503: Agente Ejecutor no disponible

#### POST /analisis/completo
Realiza un análisis financiero completo coordinado por el Agente Planificador, quien distribuye subtareas entre múltiples agentes.

**Body (JSON):**
```json
{
  "usuario_id": 1,
  "periodo_dias": 30
}
```

**Validaciones:**
- `usuario_id`: integer, debe existir
- `periodo_dias`: integer, entre 1 y 365, default 30

**Respuesta:**
```json
{
  "status": "success",
  "plan": {
    "subtareas": [
      {
        "id": 1,
        "tipo": "calcular_balance",
        "descripcion": "Calcular ingresos, gastos y balance neto del usuario",
        "agente": "Ejecutor",
        "prioridad": "alta"
      },
      {
        "id": 2,
        "tipo": "verificar_presupuestos",
        "descripcion": "Revisar estado de todos los presupuestos activos",
        "agente": "Ejecutor",
        "prioridad": "alta"
      },
      {
        "id": 3,
        "tipo": "generar_alertas",
        "descripcion": "Crear alertas para presupuestos excedidos",
        "agente": "Notificador",
        "prioridad": "media"
      },
      {
        "id": 4,
        "tipo": "analizar_patrones",
        "descripcion": "Identificar patrones de gasto y tendencias",
        "agente": "KnowledgeBase",
        "prioridad": "media"
      }
    ],
    "estrategia": "Análisis financiero completo mediante ejecución paralela de subtareas especializadas"
  },
  "protocol_used": "ANP",
  "agent": "Planificador",
  "message": "Plan de análisis creado. Las subtareas serán ejecutadas por los agentes correspondientes."
}
```

**Protocolo usado:** ANP (negociación y distribución de tareas)

**Errores:**
- 404: Usuario no encontrado
- 503: Agente Planificador no disponible

#### POST /recomendaciones
Obtiene recomendaciones financieras personalizadas e insights usando el Agente Knowledge Base con datos históricos reales.

**Body (JSON):**
```json
{
  "usuario_id": 1,
  "objetivo": "optimizar_gastos"
}
```

**Validaciones:**
- `usuario_id`: integer, debe existir
- `objetivo`: string, default "optimizar_gastos"

**Respuesta:**
```json
{
  "status": "success",
  "insights": {
    "status": "insights_generated",
    "insights": {
      "insights": [
        "Gastos en Alimentación representan el 30% del total mensual, ligeramente por encima del promedio recomendado del 25%",
        "Los servicios (luz, agua, internet) son tu mayor gasto fijo con $12,000 mensuales",
        "Has mantenido un patrón de ahorro consistente del 43% durante los últimos 3 meses"
      ],
      "comparaciones": {
        "gastos_vs_ingresos": "Gastas el 57% de tus ingresos mensuales, lo cual está dentro del rango saludable",
        "categoria_mayor_gasto": "SERVICIOS"
      },
      "sugerencias": [
        "Evalúa cambiar de proveedor de servicios para reducir costos fijos",
        "Considera meal prep para reducir gastos en alimentación",
        "Incrementa tu fondo de emergencia con el excedente de ahorro"
      ],
      "alertas": [
        "El gasto en transporte aumentó 25% respecto al mes anterior"
      ]
    }
  },
  "prediccion": {
    "status": "prediction_completed",
    "prediccion": {
      "predicciones": [
        {
          "mes": 1,
          "gasto_estimado": 29500.0,
          "confianza": "alta"
        },
        {
          "mes": 2,
          "gasto_estimado": 28000.0,
          "confianza": "media"
        },
        {
          "mes": 3,
          "gasto_estimado": 30200.0,
          "confianza": "media"
        }
      ],
      "tendencia_general": "Se espera un incremento moderado en gastos debido a temporada de fin de año. Los gastos deberían estabilizarse en enero.",
      "factores_considerados": [
        "Promedio histórico de gastos mensuales",
        "Estacionalidad de fin de año",
        "Patrones de consumo recientes"
      ]
    },
    "meses_futuros": 3
  },
  "protocol_used": "MCP",
  "agent": "KnowledgeBase"
}
```

**Protocolo usado:** MCP (formato estandarizado de contenido)

**Errores:**
- 404: Usuario no encontrado
- 503: Agente Knowledge Base no disponible

### Endpoint de Dashboard

#### GET /dashboard/{usuario_id}
Obtiene un dashboard completo del usuario formateado por el Agente Interfaz usando el protocolo AGUI.

**Parámetros:**
- `usuario_id` (path): integer

**Respuesta:**
```json
{
  "status": "success",
  "dashboard": {
    "protocol": "AGUI",
    "component_type": "dashboard",
    "data": {
      "usuario": {
        "nombre": "Juan Pérez",
        "email": "juan@email.com",
        "ingreso_mensual": 50000.0
      },
      "transacciones_recientes": 10,
      "presupuestos_activos": 5,
      "alertas_pendientes": 2
    },
    "style_hints": {
      "layout": "grid",
      "priority": "high"
    }
  },
  "protocol_used": "AGUI",
  "agent": "Interfaz"
}
```

**Protocolo usado:** AGUI (optimización para interfaz de usuario)

**Errores:**
- 404: Usuario no encontrado
- 503: Agente Interfaz no disponible

## Ejemplo de Uso Completo

### Escenario: Usuario quiere analizar sus finanzas

1. **Frontend solicita análisis completo**
   ```bash
   POST /analisis/completo
   {
     "usuario_id": 1,
     "periodo_dias": 30
   }
   ```

2. **Planificador descompone la tarea (ANP)**
   - Subtarea 1: Calcular balance → Ejecutor
   - Subtarea 2: Verificar presupuestos → Ejecutor
   - Subtarea 3: Generar alertas → Notificador

3. **Ejecutor consulta datos (ACP)**
   ```python
   # Comunicación con Knowledge Base
   ejecutor.send_message(
       to_agent="KnowledgeBase",
       protocol="ACP",
       message_type="QUERY_TRANSACTIONS",
       content={"usuario_id": 1, "periodo_dias": 30}
   )
   ```

4. **Knowledge Base retorna datos (MCP)**
   ```python
   # Datos con esquema estandarizado
   {
       "protocol": "MCP",
       "content_type": "transaction_query_result",
       "data": {...}
   }
   ```

5. **Notificador genera alertas (A2A)**
   ```python
   # Si presupuesto excede 80%
   notificador.send_message(
       to_agent="Interfaz",
       protocol="A2A",
       message_type="ALERT_REQUIRED",
       content={...}
   )
   ```

6. **Interfaz formatea para UI (AGUI)**
   ```python
   # Formato optimizado para frontend
   interfaz.create_dashboard({
       "usuario_id": 1,
       "datos": {...}
   })
   ```

## Despliegue en Render

### 1. Preparar para Producción

Crear `render.yaml`:
```yaml
services:
  - type: web
    name: finanzas-multiagente
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: finanzas_zz74
          property: connectionString
      - key: GOOGLE_API_KEY
        sync: false
```

### 2. Configurar en Render

1. Conectar repositorio de GitHub
2. Seleccionar "Web Service"
3. Agregar variable de entorno `GOOGLE_API_KEY`
4. La base de datos PostgreSQL ya está configurada

### 3. Verificar Despliegue

```bash
curl https://tu-app.onrender.com/health
```

## Conclusiones

### Logros Principales

1. **Arquitectura Multiagente Funcional**: Sistema con 6 agentes especializados trabajando en colaboración
2. **Protocolos Implementados**: 5 protocolos diferentes (A2A, ACP, ANP, AGUI, MCP) con casos de uso específicos
3. **Integración con IA**: Uso de Google Gemini para análisis inteligente y recomendaciones
4. **API REST Completa**: FastAPI con documentación automática y validación de datos
5. **Persistencia de Datos**: PostgreSQL en Render con modelos relacionales
6. **Escalabilidad**: Diseño modular que permite agregar nuevos agentes y protocolos

### Aprendizajes Clave

- **Comunicación entre Agentes**: Los protocolos estandarizados facilitan la coordinación y mantenimiento
- **División de Responsabilidades**: Cada agente tiene un rol específico, mejorando la modularidad
- **IA como Herramienta**: Los modelos Gemini potencian las capacidades de análisis sin complejidad excesiva
- **Diseño de APIs**: FastAPI permite desarrollo rápido con validación automática


## Referencias

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [FIPA Agent Communication](http://www.fipa.org/specs/fipa00061/)
- [Multi-Agent Systems](https://en.wikipedia.org/wiki/Multi-agent_system)

## Contacto y Soporte

Para preguntas o sugerencias sobre este proyecto:
- Issues en GitHub
- Documentación interactiva: `/docs` endpoint

---

**Desarrollado usando FastAPI, Google Gemini AI y PostgreSQL**
