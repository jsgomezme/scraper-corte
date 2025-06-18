const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// URL de la página a scrapear
const TARGET_URL = 'https://www.corteconstitucional.gov.co/comunicados';
// URL del webhook
const WEBHOOK_URL = 'https://lab.irradialab.com/webhook/recibir-comunicados';

app.get('/', async (req, res) => {
    let browser = null;
    
    try {
        console.log('🚀 Iniciando proceso de scraping...');
        
        // Iniciar Puppeteer
        console.log('📱 Iniciando Puppeteer en modo headless...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Configurar user agent para evitar detección de bot
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Navegar a la página
        console.log('🌐 Navegando a la página de comunicados...');
        await page.goto(TARGET_URL, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('⏳ Esperando a que la página cargue completamente...');
        // Esperar un poco más para asegurar que el contenido dinámico se cargue
        await page.waitForTimeout(3000);
        
        // Extraer contenido
        console.log('📄 Extrayendo contenido de la página...');
        const extractedData = await page.evaluate(() => {
            // Intentar extraer comunicados de manera estructurada
            const comunicados = [];
            
            // Buscar elementos que puedan contener comunicados
            const possibleSelectors = [
                '.comunicado',
                '.noticia',
                '.item',
                '.entry',
                'article',
                '.content-item',
                '.news-item'
            ];
            
            let foundStructured = false;
            
            for (const selector of possibleSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Encontrados ${elements.length} elementos con selector: ${selector}`);
                    foundStructured = true;
                    
                    elements.forEach((element, index) => {
                        const titulo = element.querySelector('h1, h2, h3, h4, .titulo, .title')?.textContent?.trim();
                        const fecha = element.querySelector('.fecha, .date, time, .fecha-publicacion')?.textContent?.trim();
                        const enlace = element.querySelector('a')?.href;
                        
                        if (titulo || fecha || enlace) {
                            comunicados.push({
                                titulo: titulo || `Comunicado ${index + 1}`,
                                fecha: fecha || 'Fecha no disponible',
                                enlace: enlace || null,
                                contenido: element.textContent?.trim().substring(0, 200) + '...'
                            });
                        }
                    });
                    break;
                }
            }
            
            // Si no se encontró estructura, extraer todo el contenido del body
            if (!foundStructured || comunicados.length === 0) {
                console.log('No se encontró estructura específica, extrayendo contenido general...');
                const bodyContent = document.body.textContent?.trim();
                return {
                    tipo: 'contenido_general',
                    contenido: bodyContent,
                    comunicados: []
                };
            }
            
            return {
                tipo: 'comunicados_estructurados',
                comunicados: comunicados,
                total: comunicados.length
            };
        });
        
        console.log(`✅ Contenido extraído: ${extractedData.tipo}`);
        if (extractedData.tipo === 'comunicados_estructurados') {
            console.log(`📊 Total de comunicados encontrados: ${extractedData.total}`);
        }
        
        // Preparar payload para el webhook
        let payload;
        if (extractedData.tipo === 'comunicados_estructurados' && extractedData.comunicados.length > 0) {
            payload = {
                comunicados: extractedData.comunicados,
                total: extractedData.total,
                fuente: TARGET_URL,
                timestamp: new Date().toISOString()
            };
        } else {
            payload = {
                contenido: extractedData.contenido,
                fuente: TARGET_URL,
                timestamp: new Date().toISOString()
            };
        }
        
        // Enviar datos al webhook
        console.log('📤 Enviando datos al webhook...');
        const webhookResponse = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Scraper-Corte-Constitucional/1.0'
            },
            timeout: 10000
        });
        
        console.log(`✅ Webhook respondió con status: ${webhookResponse.status}`);
        
        // Cerrar el navegador
        console.log('🔒 Cerrando navegador...');
        await browser.close();
        
        // Responder al cliente
        res.status(200).json({
            success: true,
            message: 'Scraping completado exitosamente',
            data: {
                tipo: extractedData.tipo,
                total: extractedData.tipo === 'comunicados_estructurados' ? extractedData.total : 'contenido_general',
                webhook_status: webhookResponse.status
            }
        });
        
    } catch (error) {
        console.error('❌ Error durante el proceso de scraping:', error.message);
        
        // Cerrar el navegador si está abierto
        if (browser) {
            try {
                await browser.close();
                console.log('🔒 Navegador cerrado después del error');
            } catch (closeError) {
                console.error('Error al cerrar el navegador:', closeError.message);
            }
        }
        
        // Responder con error
        res.status(500).json({
            success: false,
            message: 'Error durante el proceso de scraping',
            error: error.message
        });
    }
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Scraper Corte Constitucional'
    });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado. Use GET / para iniciar el scraping.'
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en el puerto ${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   - GET / : Iniciar scraping`);
    console.log(`   - GET /health : Verificar estado del servicio`);
});

// Manejar señales de terminación
process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
    process.exit(0);
}); 