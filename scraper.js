const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');
const fs = require('fs'); // Necesario para guardar archivos
const path = require('path'); // Necesario para manejar rutas

const app = express();
const port = process.env.PORT || 8080;
const WEBHOOK_URL = 'https://lab.irradialab.com/webhook/recibir-comunicados';

app.get('/', async (req, res) => {
  console.log('--- INICIANDO SCRAPER CON CAPTURA DE PANTALLA ---');
  let browser = null;

  try {
    // 1. INICIAR NAVEGADOR
    console.log('[1/5] Iniciando Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('✅ Navegador iniciado.');

    const page = await browser.newPage();
    // Aumentar el tamaño de la ventana para capturar más contenido
    await page.setViewport({ width: 1280, height: 1024 });

    // 2. IR A LA PÁGINA
    console.log('[2/5] Navegando a la página...');
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('✅ Página cargada.');
    
    // 3. TOMAR CAPTURA DE PANTALLA
    // En Cloud Run, solo podemos escribir en el directorio /tmp
    const screenshotPath = path.join('/tmp', 'screenshot.png');
    console.log(`[3/5] Tomando captura de pantalla en: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('✅ Captura de pantalla guardada.');

    // 4. EXTRAER CONTENIDO DE TEXTO PLANO (el método que sabemos que funciona)
    console.log('[4/5] Extrayendo contenido de texto plano...');
    const contenidoPlano = await page.evaluate(() => document.body.innerText || '');
    console.log(`✅ Texto extraído. Longitud: ${contenidoPlano.length}`);

    // 5. CERRAR NAVEGADOR
    await browser.close();
    console.log('✅ Navegador cerrado.');
    
    // ENVIAR RESULTADO A N8N
    const datosAEnviar = {
      diagnostico: 'CAPTURA_Y_TEXTO',
      longitudContenido: contenidoPlano.length,
      // Incluir solo una parte del texto para no sobrecargar el log/webhook
      previewContenido: contenidoPlano.substring(0, 500), 
      timestamp: new Date().toISOString()
    };
    
    console.log(`[5/5] Enviando datos a n8n: ${JSON.stringify(datosAEnviar)}`);
    await axios.post(WEBHOOK_URL, datosAEnviar, { timeout: 20000 });
    
    console.log('✅ Envío a n8n exitoso.');
    // No podemos enviar la imagen directamente en la respuesta, pero el log lo confirma.
    res.status(200).send(`Diagnóstico con captura completado. Se extrajo texto y se notificó a n8n.`);

  } catch (error) {
    console.error('--- ERROR EN EL PROCESO ---');
    console.error('Mensaje de error:', error.message);
    if (browser) await browser.close();
    res.status(500).send(`Error durante el diagnóstico: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor de diagnóstico (con captura) escuchando en puerto ${port}`);
});
