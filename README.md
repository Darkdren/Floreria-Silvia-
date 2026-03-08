# Floreria Silvia

Migracion completada a arquitectura **frontend + backend** con Node.js, Express y SQLite.

## Stack

- Frontend: HTML/CSS/JS en `frontend/`
- Backend: Express API en `backend/src/`
- Base de datos: SQLite local en `backend/data/floreria.sqlite`

## Estructura

```text
frontend/
  index.html
  css/styles.css
  js/app.js
backend/
  src/
    app.js
    server.js
    db.js
    seedData.js
    recommendations.js
    validation.js
    config.js
  tests/api.test.js
  data/
```

## Instalacion

```bash
npm install
```

## Ejecutar

```bash
npm start
```

Servidor: `http://localhost:3000`

## Desarrollo

```bash
npm run dev
```

## Probar API

```bash
npm test
```

## Endpoints

- `GET /api/health`
- `GET /api/catalog`
- `GET /api/recommendations?budget=120&occasion=sorpresa`
- `POST /api/orders`

### Payload de `POST /api/orders`

```json
{
  "customerName": "Cliente",
  "phone": "999888777",
  "deliveryDate": "2026-03-20",
  "district": "Ancon",
  "address": "Av. Principal 123",
  "note": "opcional",
  "source": "web",
  "items": [
    { "productId": 1, "qty": 2 }
  ]
}
```

## Seguridad aplicada

- `helmet`
- CORS restringido por `ALLOWED_ORIGINS`
- Rate limit en `POST /api/orders`
- Validacion de payload y calculo de total en backend

## Variables de entorno

Usa `.env.example` como base:

- `PORT`
- `NODE_ENV`
- `DATABASE_PATH`
- `ALLOWED_ORIGINS`
- `WHATSAPP_PHONE`
- `ORDER_RATE_LIMIT_MAX`
- `ORDER_RATE_LIMIT_WINDOW_MS`

## Despliegue Render/Railway

- Build command: `npm install`
- Start command: `npm start`
- Configurar variables del `.env.example`
- Usar disco/volumen persistente para conservar SQLite
