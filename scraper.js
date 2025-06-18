// scraper.js

const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

// --- Configuración ---
const app = express();
// Google Cloud Run provee el puerto a través de la variable de entorno PORT
const PORT = process.env.PORT || 8080;
const SCRAPE_URL = 'https://www.corteconstitucional.gov.co/comunicados';
const WEBHOOK_URL = 'https://lab.irradialab.com/webhook/recibir-comunicados';

// --- Endpoint Principal ---
app.get('/', async (req, res) => {
    console.log('Solicitud GET recibida en la ruta raíz. Iniciando proceso de scraping...');

    let browser = null;
    try {
        // 1. Iniciar Puppeteer
        // Las flags '--no-sandbox' y '--disable-setuid-sandbox' son esenciales para correr en un entorno Docker/Cloud Run
        console.log('Iniciando Puppeteer...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Recomendado para entornos con memoria limitada
                '--disable-gpu', // A menudo no es necesario en el servidor
            ],
        });
        const page = await browser.newPage();

        // Para simular un navegador real y evitar bloqueos
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');


        // 2. Navegar a la página
        console.log(`Navegando a: ${SCRAPE_URL}`);
        await page.goto(SCRAPE_URL, {
            waitUntil: 'networkidle0', // Espera a que no haya actividad de red por 500ms
            timeout: 60000 // Aumenta el timeout a 60 segundos
        });
        console.log('Página cargada completamente.');

        // 3. Extraer el contenido
        // Como la estructura es desconocida, extraemos todo el texto visible del body.
        // Esto es más robusto ante cambios en el HTML.
        console.log('Extrayendo contenido de la página...');
        const pageContent = await page.evaluate(() => {
            // Se usa document.body.innerText para obtener solo el texto visible por el usuario
            return document.body.innerText;
        });

        if (!pageContent || pageContent.trim() === '') {
            console.warn('Advertencia: El contenido extraído está vacío.');
        } else {
            console.log(`Contenido extraído exitosamente (longitud: ${pageContent.length} caracteres).`);
        }

        // 4. Enviar datos al Webhook
        console.log(`Enviando datos al webhook: ${WEBHOOK_URL}`);
        const payload = {
            contenido: pageContent,
        };
        await axios.post(WEBHOOK_URL, payload);
        console.log('Datos enviados al webhook exitosamente.');

        // 5. Responder a la solicitud HTTP
        res.status(200).json({
            status: 'success',
            message: 'Proceso de scraping completado y datos enviados al webhook.',
            dataLength: pageContent.length
        });

    } catch (error) {
        // Manejo de errores
        console.error('Ha ocurrido un error durante el proceso:', error);
        res.status(500).json({
            status: 'error',
            message: 'Falló el proceso de scraping.',
            error: error.message,
        });

    } finally {
        // 6. Cerrar el navegador
        // Es crucial cerrar el navegador para liberar recursos, incluso si hay un error.
        if (browser) {
            console.log('Cerrando el navegador Puppeteer...');
            await browser.close();
            console.log('Navegador cerrado.');
        }
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor de scraping escuchando en el puerto ${PORT}`);
});
