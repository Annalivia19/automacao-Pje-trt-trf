import puppeteer from 'puppeteer';
import fs from 'fs';


export async function executar(dados, sessao = null) {
  // utilidades
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min = 130, max = 250) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const tipoPeticao = dados.peticao.tipo; // agora pegamos tipoPeticao do dados
  
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();


  try {
    /* ========== LOGIN ========== */
    console.log('Acessando a página inicial...');
    await page.goto('https://pje.trt2.jus.br/segundograu/login.seam',
      { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Página inicial carregada.');

    // reaplica cookies (se houver)
    if (sessao?.cookies?.length) {
      for (const { domain, ...rest } of sessao.cookies) await page.setCookie(rest);
      await page.reload({ waitUntil: 'networkidle2' });
      console.log('Sessão reaplicada via cookies.');
    }

    // login completo se sessão inválida
    if (!sessao) {
      await page.waitForSelector('#btnSsoPdpj', { timeout: 40000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#btnSsoPdpj')
      ]);
      const loginPage = (await browser.pages())
        .find(p => p.url().includes('login')) ?? page;

      await loginPage.type('#username', dados.login, { delay: randomDelay() });
      await loginPage.type('#password', dados.senha, { delay: randomDelay() });
      await Promise.all([
        loginPage.waitForNavigation({ waitUntil: 'networkidle2' }),
        loginPage.click('#kc-login')
      ]);

      sessao = { cookies: await page.cookies() };
      console.log('Login concluído e cookies salvos.');
    }

    /*  BUSCA DO PROCESSO */
    await page.waitForSelector('#inputNumeroProcesso', { timeout: 30000 });
    await page.click('#inputNumeroProcesso', { clickCount: 3 });
    await page.type('#inputNumeroProcesso', dados.numero_processo,
      { delay: randomDelay(120, 200) });
    await page.keyboard.press('Enter');

  // Clica na primeira linha retornada na busca
await page.waitForSelector('#cdk-drop-list-0 > tr > td:nth-child(1) button', { timeout: 20000 });

console.log('Página de detalhes carregada.');

// Botão de peticionar //

// Captura os targets existentes antes do clique
const targetsAntes = browser.targets();

// Clica no botão que abre a nova aba
await page.click('#cdk-drop-list-0 > tr > td:nth-child(1) button');

// Aguarda uma nova aba aparecer (nova target do tipo 'page')
const novaTarget = await browser.waitForTarget(
  t => !targetsAntes.includes(t) && t.type() === 'page',
  { timeout: 5000 } // ajuste conforme necessário
);

// Abre a nova aba (page) e traz para frente
const novaAba = await novaTarget.page();
await novaAba.bringToFront();


/* ========== TIPO DE PETIÇÃO ========== */
   // Aguarda até a tela de peticionamento carregar completamente
   await sleep(2000); // pausa de 2 segundos para o Angular renderizar
   await page.waitForSelector('app-anexar-documento', { visible: true, timeout: 30000 });

// Agora pode buscar o campo
await page.waitForSelector('#mat-input-1', { visible: true, timeout: 30000 });
await page.type('#mat-input-1', tipoPeticao);

    /* ========== DESCRIÇÃO ========== */
    await page.evaluate(() => {
      const inp = document.getElementById('mat-input-0');
      if (inp) {
        inp.value =
          'Informar que as testemunhas comparecerão independentemente de intimação';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    /* ========== UPLOAD ========== */
    const fileSel = '#upload-anexo-0';
    await page.waitForSelector(fileSel, { visible: true });
    const arq = dados.peticao.path;
    if (!fs.existsSync(arq)) throw new Error(`Arquivo não encontrado: ${arq}`);
    await (await page.$(fileSel)).uploadFile(arq);
    console.log('📎 Upload OK:', arq);

    /* ========== SALVAR & ASSINAR ========== */
    const clickButtonByText = async texto => {
      const btn = await page.$x(`//button[normalize-space(text())='${texto}']`);
      if (btn[0]) await btn[0].click();
      else throw new Error(`Botão "${texto}" não encontrado`);
    };
    await clickButtonByText('Salvar');
    await page.waitForTimeout(1000);
    await clickButtonByText('Assinar documento e juntar ao processo');
    console.log('✅ Petição assinada e juntada.');
    return { sucesso: true, sessao };

  } catch (err) {
    console.error('❌ Erro na automação:', err);
    return { sucesso: false, mensagem: err.message };
  } finally {
    await browser.close();
  }
}


