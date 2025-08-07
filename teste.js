import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://pje.trt2.jus.br/pjekz/processo/1429575/documento/anexar', { waitUntil: 'networkidle2' });

  const existeBotao = await page.$('#btnSsoPdpj');
  if (existeBotao) {
    console.log('Botão encontrado!');
  } else {
    console.log('Botão NÃO encontrado!');
  }

  // Deixe aberto pra você inspecionar
  // await browser.close();
})();

