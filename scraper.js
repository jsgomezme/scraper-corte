const puppeteer = require('puppeteer');
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://tu-n8n.com/webhook/recibir-comunicados';

(async () => {
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
        documento: cols[2]?.querySelector('a')?.href || null
      };
    });
  });

  await axios.post(WEBHOOK_URL, { comunicados });

  console.log(`✅ Enviados ${comunicados.length} comunicados a n8n`);
  await browser.close();
})(); 