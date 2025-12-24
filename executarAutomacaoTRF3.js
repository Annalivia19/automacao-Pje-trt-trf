// backend/executarTRF3.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function limparCookieAkBmsc(page) {
  const cookies = await page.cookies();
  const cookiesToDelete = cookies.filter(cookie => cookie.name === 'ak_bmsc');

  if (cookiesToDelete.length > 0) {
    await page.deleteCookie(...cookiesToDelete);
    console.log('Cookies ak_bmsc removidos.');
  } else {
    console.log('Nenhum cookie ak_bmsc encontrado para remover.');
  }
}
export async function executar(dados) {
  const {
    login,
    senha,
    numero_processo,
    peticao: { tipo, descricao, path: pathPeticao },
    anexos = []
  } = dados;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ]
  });
  const page = await browser.newPage();

  try {
    // 1. Acessa o site do PJe TRF3
    await page.goto('https://pje1g.trf3.jus.br/pje/home.seam', { waitUntil: 'networkidle2' });
    await limparCookieAkBmsc(page);
 
      // 2. Login - preenchendo campos com delays simulando digitação humana
    console.log("Realizando login...");

    await page.waitForSelector('#username'

    );
   await page.type('#username', login, { delay: 100 });

    await page.waitForSelector('#password');
    await page.type('#password', senha, { delay: 100 });

      await new Promise(resolve => setTimeout(resolve, 500));
       await page.click('#kc-login');

     console.log("Aguardando redirecionamento após login...");
     await page.waitForNavigation({ waitUntil: 'networkidle2' });


    // 3. Acessa tela de peticionamento

    await page.goto('https://pje1g.trf3.jus.br/pje/Processo/ConsultaProcesso/listView.seam', { waitUntil: 'networkidle2' });
    await limparCookieAkBmsc(page);

    const numeroProcesso = '5004970-71.2024.4.03.6183'; // Exemplo de número de processo

    // Remover pontos, hífens e espaços
    const numeroLimpo = numeroProcesso.replace(/\D/g, '');
    
    // Validar tamanho (20 dígitos)
    if (numeroLimpo.length !== 20) {
      throw new Error('Número de processo inválido');
    }
    
    // Separar partes
    const numeroSequencial = numeroLimpo.substring(0, 7);
    const digitoVerificador = numeroLimpo.substring(7, 9);
    const ano = numeroLimpo.substring(9, 13);
    const ramo = numeroLimpo.substring(13, 14);
    const tribunal = numeroLimpo.substring(14, 16);
    const orgao = numeroLimpo.substring(16, 20);

await page.type('#fPP\\:numeroProcesso\\:numeroSequencial', numeroSequencial);
await page.type('#fPP\\:numeroProcesso\\:numeroDigitoVerificador', digitoVerificador);
await page.type('#fPP\\:numeroProcesso\\:Ano', ano);
await page.type('#fPP\\:numeroProcesso\\:ramoJustica', ramo);
await page.type('#fPP\\:numeroProcesso\\:respectivoTribunal', tribunal);
await page.type('#fPP\\:numeroProcesso\\:NumeroOrgaoJustica', orgao);

   // Role até o final da página
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

// Aguarda o botão de busca aparecer e clica
await page.waitForSelector('#fPP\\:searchProcessos', { visible: true });
await page.click('#fPP\\:searchProcessos');
await limparCookieAkBmsc(page);

console.log("📄 Processo enviado para busca. Aguardando resultados...");

// Em vez de esperar por uma navegação, espere por algum elemento que aparece depois da busca.
// Exemplo: espere o botão "btn-link btn-condensed" aparecer
await page.waitForSelector('.btn-link.btn-condensed', { visible: true });
// Role até o topo da página
await page.evaluate(() => window.scrollTo(0, 0));

const [target] = await Promise.all([
  browser.waitForTarget(t => t.opener() === page.target()),
  page.click('.btn-link.btn-condensed:nth-child(1)'),
]);

let novaAba = await target.page();

if (!novaAba) {
  // aguarde um pouco e tente novamente
  await new Promise(r => setTimeout(r, 1000));
  novaAba = await target.page();
  if (!novaAba) {
    throw new Error('Nova aba não encontrada após espera.');
  }
}

await novaAba.bringToFront();
await novaAba.waitForSelector('#navbar\\:linkAbaIncluirPeticoes1', { visible: true });

await novaAba.evaluate(() => {
  const botao = document.querySelector("#navbar\\:linkAbaIncluirPeticoes1");
  if (botao) botao.scrollIntoView({ behavior: "smooth", block: "center" });
});

await new Promise(resolve => setTimeout(resolve, 1000));

const botaoHandle = await novaAba.$('#navbar\\:linkAbaIncluirPeticoes1');
if (botaoHandle) {
  const box = await botaoHandle.boundingBox();
  if (box) {
    await novaAba.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await novaAba.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    console.log("Clique no botão de juntada realizado com sucesso.");
  } else {
    console.log("Bounding box do botão não encontrado.");
  }
} else {
  console.log("Botão de juntada não encontrado.");
}

await limparCookieAkBmsc(page);

//preencher os campos de peticionamento

async function selecionarTipoPeticaoPorTexto(page, value) {
  await page.waitForSelector('#cbTDDecoration\\:cbTD', { timeout: 30000 });

  async function selecionarTipoPeticaoPorTexto(page, texto) {
    const selectSelector = '#cbTDDecoration\\:cbTD';
  
    try {
      await page.waitForSelector(selectSelector, { timeout: 30000 });
      const options = await page.$$eval(`${selectSelector} > option`, options =>
        options.map(option => ({
          value: option.value,
          text: option.textContent.trim(),
        }))
      );
  
      const match = options.find(option => option.text === texto);
  
      if (!match) {
        throw new Error(`❌ Tipo de petição "${texto}" não encontrado na lista.`);
      }
  
      await page.select(selectSelector, match.value);
      console.log(`✅ Tipo de petição "${texto}" selecionado com sucesso.`);
    } catch (erro) {
      console.error('❌ Erro ao selecionar tipo de petição:', erro.message);
      throw erro;
    }
  }
  const sucesso = await page.evaluate((selector, value) => {
    const select = document.querySelector(selector);
    if (!select) return false;

    const option = Array.from(select.options).find(opt => opt.value === value);
    if (option) {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, selectSelector, value);

  if (!sucesso) {
    throw new Error(`Tipo de petição "${value}" não encontrado no select.`);
  }

  await limparCookieAkBmsc(page);

  // Seleciona o valor
  await page.select(selectSelector, value);
  await limparCookieAkBmsc(page);

  // Aguarda 1 segundo (pode ser menor se necessário)
  await page.waitForTimeout(1000);
}

await selecionarTipoPeticaoPorTexto(novaAba, tipo); // tipo = texto vindo do front
await limparCookieAkBmsc(page);

// 6. Upload da petição
await limparCookieAkBmsc(page);

// Clica no botão "Adicionar"
await page.click('#uploadDocumentoPrincipalDecoration\\:uploadDocumentoPrincipal\\:add1');
await new Promise(resolve => setTimeout(resolve, 1000));

// Seleciona o campo de input[type=file]
const inputHandle = await page.$('input[type="file"][id$="file"]');

if (inputHandle) {
  // Torna o campo visível caso esteja oculto
  await page.evaluate((input) => {
    input.style.display = 'block';
    input.style.visibility = 'visible';
  }, inputHandle);

  // Faz o upload do arquivo
  await inputHandle.uploadFile(dados.peticao.path);
  console.log('📎 Arquivo enviado com sucesso!');
} else {
  console.log('❌ Não encontrei o campo de upload. Talvez o botão "Adicionar" não funcionou como esperado.');
}

    // 7. Adiciona anexos (se houver)
    for (let anexo of anexos) {
      await page.click('#fPP:btnAdicionarAnexo');
      const anexoInput = await page.$('input[type="file"]');
      await anexoInput.uploadFile(anexo.path);
      await page.waitForTimeout(1000);
      // Se houver campos para tipo/sigilo, ajustar aqui.
    }

    // 8. Avança para assinatura
    await page.click('#fPP:btnAvancar');
    await page.waitForSelector('#formAssinatura');
    await page.waitForTimeout(2000);

    // 9. Assina digitalmente (vai abrir prompt do Windows/A3)
    await page.click('#formAssinatura:btnAssinar');
    await page.waitForTimeout(15000); // tempo p/ PIN manual

    // 10. Confirma e finaliza peticionamento
    await page.click('#formAssinatura:btnConfirmar');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log("✅ Peticionamento realizado com sucesso!");

  } catch (err) {
    console.error("❌ Erro na automação TRF3:", err);
  } finally {
    // await browser.close(); // deixar comentado se for debug
  }
}

