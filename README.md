# Sistema Multiagente de Finanzas Personales — Documentación Unificada

Esta documentación cubre el frontend (React + Vite) y el backend (FastAPI + PostgreSQL + Gemini) del sistema multiagente de finanzas personales.

## Datos Generales del Equipo

- Integrantes: [Completar nombres y matrículas]
- Rol del equipo: Desarrollo de solución multiagente con IA aplicada a finanzas personales
- Periodo/Curso: [Completar]
- Repositorio/Entrega: Este repositorio contiene el frontend; la API puede estar desplegada en Render.

## Introducción

Solución de gestión financiera personal basada en una arquitectura multiagente. Cada agente cumple un rol (planificación, ejecución, interfaz, notificaciones, conocimiento) y se comunica mediante protocolos estandarizados (ANP, ACP, AGUI, A2A, MCP). El objetivo es ofrecer análisis inteligente, recomendaciones accionables y visualizaciones claras del estado financiero del usuario.

### Objetivos

- Unificar análisis financiero con múltiples agentes especializados
- Ofrecer un dashboard interactivo con KPIs y tendencias
- Monitorear presupuestos y generar alertas proactivas
- Integrar recomendaciones respaldadas por IA (Gemini)

## Arquitectura Multiagente y Protocolos

- Agentes: Planificador (ANP), Ejecutor (ACP), Interfaz (AGUI), Notificador (A2A), Knowledge Base (MCP), Monitor (observabilidad)
- Protocolos:
   - ANP: negociación y orquestación de subtareas del análisis completo
   - ACP: intercambio estructurado para cálculos y verificación de presupuestos
   - AGUI: formato de datos optimizado para UI (dashboard, tablas, listas)
   - A2A: notificaciones y coordinación simple entre agentes
   - MCP: estandarización de payloads de contenido (insights, predicciones)

## Desarrollo de la Solución

### Frontend (este repositorio)

- Stack: React + Vite, TailwindCSS, ES Modules
- Estructura principal:
   ```
   src/
      api/client.js          # Cliente API (con soporte JWT opcional)
      components/
         Icon.jsx
         LoginSelector.jsx
         NavTabs.jsx
      views/
         DashboardView.jsx
         TransactionsView.jsx
         BudgetsView.jsx
         AlertsView.jsx
         AnalysisView.jsx
         SystemStatusView.jsx
      App.jsx
      App.css
   ```
- Variables de entorno (archivo `.env`):
   - `VITE_API_BASE_URL` (ej.: `https://api-multiagente.onrender.com` o `http://localhost:8000`)
- Ejecutar en Windows PowerShell:
   - Instalar: `npm install`
   - Dev server: `npm run dev`
   - Build: `npm run build`; Preview: `npm run preview`
- Autenticación (opcional):
   - Endpoints `/auth/*` compatibles
   - Token JWT almacenado como `authToken` en `localStorage`

### Backend (resumen)

- Stack: FastAPI, SQLAlchemy, PostgreSQL, Pydantic, Uvicorn, Google Gemini
- Endpoints principales: `/usuarios`, `/transacciones`, `/presupuestos`, `/alertas`, `/analisis/*`, `/recomendaciones`, `/dashboard/{usuario_id}`, `/health`
- Variables de entorno esperadas:
   - `DATABASE_URL` (PostgreSQL)
   - `GOOGLE_API_KEY` (Gemini)
- Ejecución típica:
   - Crear venv; instalar `requirements.txt`
   - Iniciar: `uvicorn main:app --reload --port 8000`

### Integración FE-BE

- `src/api/client.js` usa `VITE_API_BASE_URL` y adjunta `Authorization: Bearer <token>` si hay `authToken`
- Rutas consumidas desde el frontend:
   - Dashboard: `GET /dashboard/{usuario_id}`
   - Análisis: `POST /analisis/balance|presupuestos|completo`
   - Recomendaciones: `POST /recomendaciones`
   - CRUD básico: `/usuarios`, `/transacciones`, `/presupuestos`, `/alertas`

## Pruebas

- Backend (Postman o cURL):
   1) `GET /health` y `GET /monitor/status`
   2) `POST /usuarios` → crear usuario
   3) `POST /presupuestos` → crear categorías y límites
   4) `POST /transacciones` → registrar ingresos y gastos
   5) `POST /analisis/balance` y `/analisis/presupuestos`
   6) `POST /analisis/completo` → plan ANP con subtareas
   7) `POST /recomendaciones` → insights, comparaciones, predicciones
   8) `GET /dashboard/{usuario_id}` → datos AGUI para UI

- Frontend (prueba manual):
   - Configurar `.env` con `VITE_API_BASE_URL`
   - `npm run dev`; abrir `http://localhost:5173`
   - Verificar vistas: Dashboard, Transacciones, Presupuestos, Alertas, Análisis IA, Estado del Sistema
   - Confirmar KPIs (Ingresos, Gastos del mes, Balance, Transacciones)
   - Validar que “Estado de Presupuestos”, “Recomendaciones” y “Tendencias” cargan según el dashboard

## Conclusiones

- La arquitectura multiagente permite separar responsabilidades y escalar funcionalidades
- El frontend consume directamente el dashboard AGUI para evitar acoplamiento y muestra KPIs consistentes
- El cálculo de “gastos del mes” se obtiene del dashboard o se recomputa en frontend desde presupuestos
- Recomendaciones y factores considerados enriquecen la toma de decisiones del usuario

## Archivo(s) Fuente

- Frontend (este repo):
   - `index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`
   - `src/api/client.js`, `src/App.jsx`, `src/App.css`, `src/main.jsx`, `src/index.css`
   - Vistas: `src/views/*.jsx` (Dashboard, Transactions, Budgets, Alerts, Analysis, SystemStatus)
   - Componentes: `src/components/*.jsx` (Icon, LoginSelector, NavTabs)
- Backend (no incluido aquí):
   - FastAPI con agentes y protocolos (ANP, ACP, AGUI, A2A, MCP)
   - Endpoints descritos en la sección Backend

---

Desarrollado con React + Vite (frontend) y FastAPI + PostgreSQL + Gemini (backend).

