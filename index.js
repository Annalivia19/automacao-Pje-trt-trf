import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { executar as executarAutomacao } from './executarAutomacao.js';
import executarTRF3Route from './routes/executarTRF3Route.js'; // Import correto

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Use a rota do TRF3
app.use('/api/automacao/trf3', executarTRF3Route);

// 🔐 ROTA DE LOGIN
app.post('/api/login', async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Login e senha são obrigatórios.' });
  }

  try {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    
    console.log('Acessando a página de login...');
    await page.goto('https://pje.trt2.jus.br/primeirograu/login.seam', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('#btnSsoPdpj', { timeout: 60000 });
    await page.click('#btnSsoPdpj');
    await page.waitForSelector('#username');
    
    await page.type('#username', login);
    await page.type('#password', senha);
    await page.click('#kc-login');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      await page.waitForSelector('#inputNumeroProcesso', { timeout: 10000 });
      await browser.close();
      return res.json({ sucesso: true, mensagem: 'Login bem-sucedido!' });
    } catch (e) {
      await browser.close();
      return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas ou página não carregada.' });
    }

  } catch (err) {
    console.error('Erro ao validar login:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao validar login.' });
  }
});

// 📎 ROTA DE ENVIO DE PETIÇÃO
app.post('/api/automacao/executar', upload.single('arquivo'), async (req, res) => {
  console.log('BODY:', req.body);
  console.log('FILE:', req.file);
  
  try {
    const { login, senha, numero_processo, peticaoTipo } = req.body;
    const arquivo = req.file;

    if (!login || !senha || !numero_processo || !peticaoTipo || !arquivo) {
      if (arquivo) await fs.unlink(arquivo.path);
      return res.status(400).json({ sucesso: false, mensagem: 'Todos os campos são obrigatórios.' });
    }

    const dados = {
      login,
      senha,
      numero_processo,
      peticao: {
        tipo: peticaoTipo,
        path: arquivo.path,
      }
    };

    await executarAutomacao(dados);

    await fs.unlink(arquivo.path);

    res.json({ sucesso: true, mensagem: 'Automação executada com sucesso!' });
  } catch (err) {
    console.error('Erro ao executar automação:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao executar automação.' });
  }
});



// 🚀 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});