const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

// Define tu Webhook de n8n aquí
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://lab.irradialab.com/webhook/recibir-comunicados';

app.get('/', async (req, res) => {
  try {
    console.log('🚀 Iniciando scraping...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.corteconstitucional.gov.co/comunicados', {
      waitUntil: 'networkidle0'
    });

    await page.waitForSelector('table');

    const comunicados = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const cols = row.querySelectorAll('td');
        return {
          comunicado: cols[0]?.innerText.trim(),
          fecha: cols[1]?.innerText.trim(),
          documento: cols[2]?.querySelector('a')?.href || null,
        };
      });
    });

    await browser.close();

    console.log(`📦 Comunicados extraídos: ${comunicados.length}`);
    console.log('🔁 Enviando datos a n8n...');

    const response = await axios.post(WEBHOOK_URL, {
      comunicados
    });

    console.log(`✅ Webhook responded with status ${response.status}`);
    res.status(200).send('Scraping completo y datos enviados a n8n ✅');
  } catch (error) {
    console.error('❌ Error durante el scraping o envío:', error.message);
    res.status(500).send('Error durante el scraping o envío ❌');
  }
});

app.listen(port, () => {
  console.log(`✅ Servidor escuchando en el puerto ${port}`);
});
