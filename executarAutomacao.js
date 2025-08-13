import puppeteer from 'puppeteer';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * Converte o PDF para PDF/A-1b usando Ghostscript
 */
function converterParaPDFA(entrada) {
  const saida = path.join('/tmp', `pdf_convertido_${Date.now()}.pdf`);
  try {
    execSync(`gs -dPDFA=1 -dBATCH -dNOPAUSE \
      -sProcessColorModel=DeviceRGB \
      -sDEVICE=pdfwrite \
      -dCompatibilityLevel=1.4 \
      -sPDFACompatibilityPolicy=1 \
      -sOutputFile="${saida}" "${entrada}"`);
    console.log(`✅ PDF convertido para PDF/A: ${saida}`);
    return saida;
  } catch (err) {
    throw new Error(`Erro na conversão para PDF/A: ${err.message}`);
  }
}

/**
 * Valida se o arquivo é um PDF válido
 */
function validarPDF(caminho) {
  if (!caminho.endsWith('.pdf')) throw new Error('Extensão inválida, precisa ser .pdf');
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 4).toString() !== '%PDF') throw new Error('Arquivo não é PDF válido');
  console.log('✅ PDF válido para upload');
}

/**
 * Executa a automação
 */
export async function executar(dados, sessao = null) {
  // Primeiro valida e converte para PDF/A
  validarPDF(dados.peticao.path);
  const pdfConvertido = converterParaPDFA(dados.peticao.path);
  validarPDF(pdfConvertido);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min = 130, max = 250) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  async function reaplicarCookies(page, cookies) {
    if (!cookies || !cookies.length) return;
    for (const cookie of cookies) {
      try {
        await page.setCookie(cookie);
      } catch (error) {
        console.warn(`Erro ao aplicar cookie ${cookie.name}: ${error.message}`);
      }
    }
    await page.reload({ waitUntil: 'networkidle2' });
    console.log('Cookies reaplicados e página recarregada');
  }

  try {

    // INICIO DA AUTOMAÇÃO

   /* ========== LOGIN ========== */
    console.log('Acessando a página inicial...');
    await page.goto('https://pje.trt2.jus.br/primeirograu/login.seam',
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


        // Captura os targets antes do clique para identificar a nova aba
    const targetsAntes = browser.targets();
    await page.waitForSelector('#cdk-drop-list-0 > tr > td:nth-child(1) button', { timeout: 20000 });
    await page.click('#cdk-drop-list-0 > tr > td:nth-child(1) > div > div > button');

    console.log('Página de detalhes carregada.');


// Espera a nova aba ser aberta
const novaTarget = await browser.waitForTarget(
  target => !targetsAntes.includes(target) && target.type() === 'page',
  { timeout: 10000 }
);

const novaAba = await novaTarget.page();
await novaAba.bringToFront();
console.log('Nova aba de detalhes aberta.');
// Aguarda o botão de peticionar aparecer na nova aba
await novaAba.waitForSelector('button[mattooltip="Peticionar"]', { visible: true });

// Clica no botão de peticionar
await novaAba.click('button[mattooltip="Peticionar"]');

console.log('Clique no botão "Peticionar" realizado.');


const targetsDepoisPeticionar = browser.targets();


// Espera a segunda aba abrir (onde peticiona)
    // Somente no repositório origial //

// Aguarda e digita o tipo de petição no campo correto
await abaPeticionamento.waitForSelector('#mat-input-1', { visible: true, timeout: 30000 });
await abaPeticionamento.type('#mat-input-1', dados.peticao.tipo);

// Preenche a descrição (executando no contexto da abaPeticionamento)
await abaPeticionamento.evaluate(() => {
  const inp = document.getElementById('mat-input-0');
  if (inp) {
    inp.value = 'Informar que as testemunhas comparecerão independentemente de intimação';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
});

// Agora o upload do arquivo, sempre usando abaPeticionamento (não page!)
console.log(`Anexando arquivo: ${dados.peticao.nome || 'Nome não informado'}`);

await sleep(1000);


const inputUploadHandle = await abaPeticionamento.$('#upload-anexo-0');
if (!inputUploadHandle) throw new Error('Campo de upload não encontrado');

await abaPeticionamento.waitForSelector('#upload-anexo-0', { visible: true });
await inputUploadHandle.uploadFile(pdfConvertido);
await abaPeticionamento.waitForResponse(resp => 
  resp.url().includes('/upload') && resp.status() === 200
);



await abaPeticionamento.evaluate(() => {
  const input = document.getElementById('upload-anexo-0');
  if (input) {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
});

await sleep(4000);  // Aguarde processamento do arquivo no PJe

//Salvar petição

// Função para clicar botão por texto na abaPeticionamento
const clickButtonByText = async texto => {
  const clicked = await abaPeticionamento.evaluate((texto) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.trim() === texto);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, texto);

  if (!clicked) throw new Error(`Botão "${texto}" não encontrado`);
};
await clickButtonByText('Salvar');
await sleep(1000); 
await clickButtonByText('Assinar documento e juntar ao processo');
console.log(' Petição assinada e juntada.');

return { sucesso: true, sessao };

} catch (err) {
  console.error(' Erro na automação:', err);
  return { sucesso: false, mensagem: err.message };
} finally {
  await browser.close();
  }
}


