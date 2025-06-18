const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

// URL del Webhook de n8n
const WEBHOOK_URL = 'https://lab.irradialab.com/webhook/recibir-comunicados';

app.get('/', async (req, res) => {
  console.log('--- INICIANDO SCRAPER DE DIAGNÓSTICO ---');
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

    // 2. IR A LA PÁGINA
    console.log('[2/5] Navegando a la página...');
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('✅ Página cargada.');

    // 3. ENCONTRAR Y CONTAR LAS FILAS
    const selectorFilas = '#tabla-resultado tbody tr';
    console.log(`[3/5] Buscando selector: "${selectorFilas}"`);
    
    // Esperamos a que el selector esté presente en la página.
    // Si esto falla, el log mostrará un error de timeout.
    await page.waitForSelector(selectorFilas, { timeout: 30000 });
    
    // Contamos los elementos.
    const numeroDeFilas = await page.$$eval(selectorFilas, filas => filas.length);
    console.log(`✅ Selector encontrado. Número de filas: ${numeroDeFilas}`);

    // 4. CERRAR NAVEGADOR
    console.log('[4/5] Cerrando navegador...');
    await browser.close();
    console.log('✅ Navegador cerrado.');
    
    // 5. ENVIAR RESULTADO A N8N
    const datosAEnviar = {
      diagnostico: 'OK',
      filasEncontradas: numeroDeFilas,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[5/5] Enviando datos a n8n: ${JSON.stringify(datosAEnviar)}`);
    
    await axios.post(WEBHOOK_URL, datosAEnviar, { timeout: 20000 });
    
    console.log('✅ Envío a n8n exitoso.');
    res.status(200).send(`Diagnóstico completado. Se encontraron ${numeroDeFilas} filas y se notificó a n8n.`);

  } catch (error) {
    console.error('--- ERROR EN EL PROCESO ---');
    console.error('Mensaje de error:', error.message);
    
    if (browser) {
      await browser.close();
      console.log('✅ Navegador cerrado después de error.');
    }

    // Intentar enviar el error a n8n para tener visibilidad
    try {
      await axios.post(WEBHOOK_URL, {
        diagnostico: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { timeout: 10000 });
      console.log('✅ Notificación de error enviada a n8n.');
    } catch (axiosError) {
      console.error('❌ Falló el envío de la notificación de error a n8n:', axiosError.message);
    }

    res.status(500).send(`Error durante el diagnóstico: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor de diagnóstico escuchando en puerto ${port}`);
});
