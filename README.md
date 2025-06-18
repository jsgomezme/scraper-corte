# Scraper Corte Constitucional Colombia

Scraper automatizado para extraer comunicados de la Corte Constitucional de Colombia y enviarlos a n8n.

## 🎯 Objetivo

Automatizar el scraping de comunicados desde la página oficial de la Corte Constitucional de Colombia y enviar esa información a un flujo de n8n en la nube, cada 10 minutos.

## 🏗️ Arquitectura

- **Google Cloud Run**: Servicio sin servidor para ejecutar el scraper
- **Puppeteer**: Navegador headless para scraping
- **Express**: Servidor web para endpoints
- **n8n**: Plataforma de automatización para procesar los datos

## 📁 Estructura del Proyecto

```
scraper-corte/
├── scraper.js          # Lógica principal del scraper
├── package.json        # Dependencias del proyecto
├── Dockerfile          # Configuración para Cloud Run
└── README.md           # Este archivo
```

## 🚀 Endpoints Disponibles

### `/health`
Verifica que el servicio esté funcionando.
```bash
GET https://tu-servicio.run.app/health
```

### `/test`
Prueba la conexión con el webhook de n8n.
```bash
GET https://tu-servicio.run.app/test
```

### `/`
Ejecuta el scraping principal y envía datos a n8n.
```bash
GET https://tu-servicio.run.app/
```

## 📊 Formato de Datos

Los datos se envían a n8n en el siguiente formato:

```json
{
  "comunicados": [
    {
      "indice": 1,
      "titulo": "Título del comunicado",
      "fecha": "Fecha de publicación",
      "documento": "URL del documento"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "cantidad": 10,
  "source": "Corte Constitucional Colombia",
  "url": "https://www.corteconstitucional.gov.co/comunicados"
}
```

## 🔧 Configuración

### Variables de Entorno

- `PORT`: Puerto del servidor (default: 8080)
- `WEBHOOK_URL`: URL del webhook de n8n (configurada en el código)

### Webhook de n8n

El webhook debe estar configurado en n8n para recibir datos POST en:
```
https://lab.irradialab.com/webhook/recibir-comunicados
```

## 🚀 Despliegue en Google Cloud Run

1. **Subir código a GitHub**
2. **Conectar repositorio con Cloud Run**
3. **Configurar variables de entorno**
4. **Desplegar automáticamente**

## ⏰ Programación con Cloud Scheduler

Configurar un job que ejecute cada 10 minutos:
- **URL**: `https://tu-servicio.run.app/`
- **Método**: GET
- **Frecuencia**: `*/10 * * * *`

## 🔍 Diagnóstico

### Verificar que el servicio funciona
```bash
curl https://tu-servicio.run.app/health
```

### Probar el webhook
```bash
curl https://tu-servicio.run.app/test
```

### Ejecutar scraping manual
```bash
curl https://tu-servicio.run.app/
```

## 📝 Logs

Los logs se pueden ver en Google Cloud Console:
1. Ir a Cloud Run
2. Seleccionar el servicio
3. Ir a la pestaña "Logs"

Los logs incluyen emojis para facilitar la identificación:
- 🏥 Health check
- 🧪 Prueba de webhook
- 🚀 Inicio de scraping
- ✅ Operaciones exitosas
- ❌ Errores

## 🛠️ Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript
- **Puppeteer**: Navegador headless
- **Express**: Framework web
- **Axios**: Cliente HTTP
- **Docker**: Contenedorización
- **Google Cloud Run**: Plataforma de ejecución

## 📞 Soporte

Para problemas o consultas, revisar los logs en Google Cloud Console. 