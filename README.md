# Scraper Corte Constitucional de Colombia

Este proyecto realiza web scraping de la página de comunicados de la Corte Constitucional de Colombia y envía los datos extraídos a un webhook.

## 🚀 Características

- **Web Scraping con Puppeteer**: Utiliza un navegador headless para extraer contenido dinámico
- **Extracción Inteligente**: Intenta extraer comunicados de manera estructurada, con fallback a contenido general
- **Envío a Webhook**: Envía automáticamente los datos extraídos a un endpoint configurado
- **Listo para Cloud Run**: Optimizado para despliegue en Google Cloud Run
- **Logging Detallado**: Console logs para facilitar la depuración

## 📋 Requisitos

- Node.js 18 o superior
- Docker (para despliegue en contenedor)

## 🛠️ Instalación Local

1. **Clonar el repositorio**:
```bash
git clone <tu-repositorio>
cd scraper-corte
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Ejecutar localmente**:
```bash
npm start
```

El servidor estará disponible en `http://localhost:8080`

## 🐳 Despliegue con Docker

### Construir la imagen:
```bash
docker build -t scraper-corte .
```

### Ejecutar el contenedor:
```bash
docker run -p 8080:8080 scraper-corte
```

## ☁️ Despliegue en Google Cloud Run

### 1. Configurar Google Cloud CLI:
```bash
gcloud auth login
gcloud config set project <tu-proyecto-id>
```

### 2. Habilitar APIs necesarias:
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Construir y desplegar:
```bash
# Construir y subir la imagen
gcloud builds submit --tag gcr.io/<tu-proyecto-id>/scraper-corte

# Desplegar en Cloud Run
gcloud run deploy scraper-corte \
  --image gcr.io/<tu-proyecto-id>/scraper-corte \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

## 📡 Endpoints

### GET /
Inicia el proceso de scraping y envía los datos al webhook.

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Scraping completado exitosamente",
  "data": {
    "tipo": "comunicados_estructurados",
    "total": 15,
    "webhook_status": 200
  }
}
```

### GET /health
Verifica el estado del servicio.

**Respuesta**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Scraper Corte Constitucional"
}
```

## 🔧 Configuración

### Variables de Entorno

- `PORT`: Puerto del servidor (por defecto: 8080)
- `TARGET_URL`: URL a scrapear (configurada en el código)
- `WEBHOOK_URL`: URL del webhook (configurada en el código)

### Configuración de Puppeteer

El scraper está configurado para:
- Ejecutar en modo headless
- Usar argumentos optimizados para contenedores
- Simular un navegador real con User-Agent personalizado
- Esperar a que la página cargue completamente

## 📊 Estructura de Datos

### Comunicados Estructurados
```json
{
  "comunicados": [
    {
      "titulo": "Título del comunicado",
      "fecha": "15 de enero de 2024",
      "enlace": "https://...",
      "contenido": "Primeros 200 caracteres del contenido..."
    }
  ],
  "total": 15,
  "fuente": "https://www.corteconstitucional.gov.co/comunicados",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Contenido General
```json
{
  "contenido": "Todo el texto extraído de la página...",
  "fuente": "https://www.corteconstitucional.gov.co/comunicados",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🐛 Solución de Problemas

### Errores Comunes

1. **Timeout en la carga de página**:
   - El scraper espera hasta 30 segundos para cargar la página
   - Si persiste, verifica la conectividad a internet

2. **Error de memoria en Cloud Run**:
   - Aumenta la memoria asignada a 2Gi o más
   - El scraper libera recursos automáticamente

3. **Error de permisos en Docker**:
   - El Dockerfile crea un usuario no-root para seguridad
   - Verifica que las dependencias del sistema estén instaladas

### Logs de Depuración

El scraper incluye logs detallados en cada paso:
- Inicio de Puppeteer
- Navegación a la página
- Extracción de contenido
- Envío al webhook
- Cierre de recursos

## 📝 Notas Técnicas

- **User-Agent**: Simula Chrome 120 para evitar detección de bots
- **Timeout**: 30 segundos para carga de página, 10 segundos para webhook
- **Memoria**: Optimizado para contenedores con recursos limitados
- **Seguridad**: Ejecuta como usuario no-root en Docker

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
