const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

// URL del Webhook de n8n
const WEBHOOK_URL = 'https://lab.irradialab.com/webhook/recibir-comunicados';

// Endpoint de salud para verificar que el servicio funciona
app.get('/health', (req, res) => {
  console.log('🏥 Health check ejecutado');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'scraper-corte-constitucional',
    webhook_url_configured: !!WEBHOOK_URL
  });
});

// Endpoint de prueba para verificar el webhook
app.get('/test', async (req, res) => {
  console.log('🧪 Probando webhook...');
  try {
    const testData = {
      test: true,
      message: 'Prueba desde Cloud Run',
      timestamp: new Date().toISOString(),
      comunicados: [
        {
          titulo: 'Comunicado de prueba',
          publicado: '2024-01-01 12:00:00',
          documentoUrl: 'https://ejemplo.com/test.pdf'
        }
      ]
    };

    console.log('📤 Enviando datos de prueba:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, testData, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`✅ Prueba exitosa - Status: ${response.status}`);
    res.status(200).json({
      success: true,
      status: response.status,
      message: 'Webhook funcionando correctamente'
    });
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error al conectar con el webhook. Verifica la URL y la conectividad.'
    });
  }
});

// Endpoint principal - Scraping de comunicados
app.get('/', async (req, res) => {
  console.log('🚀 Iniciando scraping de comunicados...');
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  let browser = null;
  
  try {
    // 1. Configurar navegador
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('✅ Navegador iniciado');

    const page = await browser.newPage();
    console.log('✅ Página creada');

    // 2. Navegar a la página
    console.log('🌐 Navegando a https://www.corteconstitucional.gov.co/comunicados');
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('✅ Página cargada');

    // 3. Usar el selector específico y esperar a que esté disponible
    const selectorFilas = '#tabla-resultado tbody tr';
    console.log(`🔍 Esperando por el selector: "${selectorFilas}"`);
    await page.waitForSelector(selectorFilas, { timeout: 30000 });
    console.log('✅ Selector encontrado en la página.');

    // 4. Extraer los datos de forma estructurada
    const comunicados = await page.evaluate((selector) => {
        const filas = Array.from(document.querySelectorAll(selector));
        
        return filas.map((fila) => {
          const celdas = fila.querySelectorAll('td');
          if (celdas.length >= 3) {
            const titulo = celdas[0]?.innerText?.trim() || '';
            const publicado = celdas[1]?.innerText?.trim() || '';
            const documentoUrl = celdas[2]?.querySelector('a')?.href || null;
            
            return {
              titulo: titulo,
              publicado: publicado,
              documentoUrl: documentoUrl
            };
          }
          return null;
        }).filter(item => item && item.titulo);
    }, selectorFilas);

    console.log(`📊 Se extrajeron ${comunicados.length} comunicados.`);
    
    // 5. Cerrar el navegador TAN PRONTO como ya no se necesite
    await browser.close();
    console.log('✅ Navegador cerrado');

    if (comunicados.length === 0) {
      console.warn('⚠️ No se encontraron comunicados. El proceso termina aquí.');
      return res.status(200).json({
          success: true,
          message: 'Scraping completado, pero no se encontraron comunicados para enviar.',
          cantidad: 0
      });
    }

    // 6. Preparar y enviar los datos
    const datosAEnviar = {
      comunicados: comunicados,
      timestamp: new Date().toISOString(),
      cantidad: comunicados.length,
      source: 'Corte Constitucional Colombia Scraper',
      url: 'https://www.corteconstitucional.gov.co/comunicados'
    };

    console.log(`📤 Enviando ${datosAEnviar.cantidad} comunicados a n8n...`);
    
    const response = await axios.post(WEBHOOK_URL, datosAEnviar, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`✅ Envío exitoso a n8n - Status: ${response.status}`);
    
    res.status(200).json({
      success: true,
      message: `Scraping completado. ${datosAEnviar.cantidad} comunicados enviados a n8n.`,
      data: datosAEnviar
    });

  } catch (error) {
    console.error('❌ Error fatal durante el scraping:', error.message);
    if (browser) {
      await browser.close();
      console.log('✅ Navegador cerrado después de error.');
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor iniciado en puerto ${port}`);
  console.log(`🌐 Webhook configurado: ${WEBHOOK_URL}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   - GET /health (verificar servicio)`);
  console.log(`   - GET /test (probar webhook)`);
  console.log(`   - GET / (iniciar scraping)`);
});
