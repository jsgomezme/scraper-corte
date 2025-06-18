const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://lab.irradialab.com/webhook/recibir-comunicados';

app.get('/', async (req, res) => {
  try {
    console.log('🌐 Iniciando scraping genérico...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Extraer todo el texto visible del <body>
    const contenidoPlano = await page.evaluate(() => {
      return document.body.innerText;
    });

    await browser.close();

    console.log('📦 Contenido extraído, longitud:', contenidoPlano.length);

    // Enviar a n8n
    const response = await axios.post(WEBHOOK_URL, {
      contenido: contenidoPlano
    });

    console.log(`✅ Enviado a n8n con status ${response.status}`);
    res.status(200).send('Scraping genérico completo ✅');
  } catch (error) {
    console.error('❌ Error durante scraping:', error.message);
    res.status(500).send('Error durante scraping ❌');
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
