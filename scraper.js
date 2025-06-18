const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;
const WEBHOOK_URL = 'https://lab.irradialab.com/webhook/recibir-comunicados';

app.get('/', async (req, res) => {
  console.log('--- INICIANDO SCRAPER (VERSIÓN ROBUSTA) ---');
  let browser = null;

  try {
    console.log('[1/4] Iniciando Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new', // 'new' es la sintaxis moderna para el modo headless
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('✅ Navegador iniciado.');

    const page = await browser.newPage();

    console.log('[2/4] Navegando a la página...');
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0',
      timeout: 90000 // Aumentamos timeout por si la red está lenta
    });
    console.log('✅ Página cargada.');
    
    // 3. EXTRAER DATOS DE FORMA SEGURA
    console.log('[3/4] Extrayendo datos de la tabla...');
    const selectorFilas = '#tabla-resultado tbody tr';
    
    // Esperamos a que el selector esté presente
    await page.waitForSelector(selectorFilas, { timeout: 45000 });

    const comunicados = await page.evaluate((selector) => {
      const datos = [];
      const filas = document.querySelectorAll(selector);

      // Usamos un bucle for tradicional para máximo control
      for (let i = 0; i < filas.length; i++) {
        try {
          const fila = filas[i];
          const celdas = fila.querySelectorAll('td');

          // Verificación de seguridad: nos aseguramos de que la fila tenga celdas
          if (celdas && celdas.length >= 2) {
            const titulo = celdas[0] ? celdas[0].innerText.trim() : 'Sin título';
            const publicado = celdas[1] ? celdas[1].innerText.trim() : 'Sin fecha';
            
            let documentoUrl = null;
            if (celdas[2]) {
              const link = celdas[2].querySelector('a');
              if (link) {
                documentoUrl = link.href;
              }
            }
            
            // Solo añadimos si el título no está vacío
            if (titulo) {
                datos.push({
                    titulo: titulo,
                    publicado: publicado,
                    documentoUrl: documentoUrl
                });
            }
          }
        } catch (e) {
          // Si una fila falla, lo registramos en la consola del navegador y continuamos
          console.error(`Error procesando fila ${i}:`, e.message);
        }
      }
      return datos;
    }, selectorFilas);
    
    console.log(`✅ Extracción completada. Se encontraron ${comunicados.length} comunicados.`);

    // 4. CERRAR Y ENVIAR
    await browser.close();
    console.log('✅ Navegador cerrado.');

    if (comunicados.length > 0) {
      console.log(`[4/4] Enviando ${comunicados.length} comunicados a n8n...`);
      await axios.post(WEBHOOK_URL, {
        comunicados: comunicados,
        cantidad: comunicados.length,
        timestamp: new Date().toISOString()
      }, { timeout: 30000 });
      console.log('✅ Envío a n8n exitoso.');
      res.status(200).send(`Proceso completado. ${comunicados.length} comunicados enviados.`);
    } else {
      console.log('[4/4] No se encontraron comunicados para enviar.');
      res.status(200).send('Proceso completado. No se encontraron comunicados.');
    }

  } catch (error) {
    console.error('--- ERROR CRÍTICO EN EL PROCESO ---');
    console.error('Mensaje de error:', error.message);
    if (browser) await browser.close();
    res.status(500).send(`Error crítico: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor robusto escuchando en puerto ${port}`);
});
