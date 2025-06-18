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
    webhook_url: WEBHOOK_URL
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
          fecha: '2024-01-01',
          documento: 'https://ejemplo.com/test.pdf'
        }
      ]
    };

    console.log('📤 Enviando datos de prueba:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, testData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
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
      message: 'Error al conectar con webhook'
    });
  }
});

// Endpoint principal - Scraping de comunicados
app.get('/', async (req, res) => {
  console.log('🚀 Iniciando scraping de comunicados...');
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  let browser = null;
  
  try {
    // Configurar navegador
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ]
    });

    console.log('✅ Navegador iniciado');

    const page = await browser.newPage();
    
    // Configurar user agent realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Página creada');

    // Navegar a la página
    console.log('🌐 Navegando a la página...');
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('✅ Página cargada');

    // Esperar un poco para que se cargue el contenido dinámico
    await page.waitForTimeout(5000);
    console.log('⏳ Esperando 5 segundos para contenido dinámico...');

    // Intentar múltiples estrategias para extraer los comunicados
    let comunicados = [];

    // Estrategia 1: Buscar tabla específica
    try {
      console.log('🔍 Estrategia 1: Buscando tabla específica...');
      await page.waitForSelector('table', { timeout: 10000 });
      
      comunicados = await page.evaluate(() => {
        const filas = Array.from(document.querySelectorAll('table tbody tr'));
        console.log(`📊 Filas encontradas: ${filas.length}`);
        
        return filas.map((fila, index) => {
          const celdas = fila.querySelectorAll('td');
          if (celdas.length >= 2) {
            const titulo = celdas[0]?.innerText?.trim() || '';
            const fecha = celdas[1]?.innerText?.trim() || '';
            const link = celdas[2]?.querySelector('a')?.href || null;
            
            return {
              indice: index + 1,
              titulo: titulo,
              fecha: fecha,
              documento: link
            };
          }
          return null;
        }).filter(item => item && item.titulo);
      });

      console.log(`✅ Estrategia 1 exitosa: ${comunicados.length} comunicados encontrados`);
    } catch (error) {
      console.log('❌ Estrategia 1 falló:', error.message);
    }

    // Estrategia 2: Si no hay comunicados, extraer todo el contenido
    if (comunicados.length === 0) {
      console.log('🔍 Estrategia 2: Extrayendo contenido completo...');
      
      const contenidoCompleto = await page.evaluate(() => {
        return {
          titulo: document.title,
          contenido: document.body.innerText,
          html: document.body.innerHTML.substring(0, 2000) // Primeros 2000 caracteres
        };
      });

      comunicados = [{
        titulo: 'Contenido completo de la página',
        fecha: new Date().toISOString(),
        contenido: contenidoCompleto.contenido.substring(0, 1000),
        html: contenidoCompleto.html
      }];

      console.log('✅ Estrategia 2 completada');
    }

    await browser.close();
    console.log('✅ Navegador cerrado');

    // Preparar datos para enviar
    const datosAEnviar = {
      comunicados: comunicados,
      timestamp: new Date().toISOString(),
      cantidad: comunicados.length,
      source: 'Corte Constitucional Colombia',
      url: 'https://www.corteconstitucional.gov.co/comunicados'
    };

    console.log(`📤 Enviando ${comunicados.length} comunicados a n8n...`);
    console.log('🔗 URL del webhook:', WEBHOOK_URL);

    // Enviar a n8n
    const response = await axios.post(WEBHOOK_URL, datosAEnviar, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Envío exitoso - Status: ${response.status}`);
    console.log('📥 Respuesta del webhook:', JSON.stringify(response.data, null, 2));

    res.status(200).json({
      success: true,
      message: `Scraping completado. ${comunicados.length} comunicados enviados a n8n.`,
      cantidad: comunicados.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error durante el scraping:', error);
    console.error('❌ Stack trace:', error.stack);
    
    if (browser) {
      await browser.close();
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error durante el scraping'
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
  console.log(`   - GET / (scraping principal)`);
});
