import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { executar } from '../executarAutomacaoTRF3.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('arquivo'), async (req, res) => {
  try {
    const { login, senha, numero_processo, peticaoTipo } = req.body;
    const arquivo = req.file;

    if (!login || !senha || !numero_processo || !peticaoTipo || !arquivo) {
      if (arquivo) await fs.unlink(arquivo.path);
      return res.status(400).json({ sucesso: false, mensagem: 'Campos obrigatórios ausentes.' });
    }

    const dados = {
      login,
      senha,
      numero_processo,
      peticao: {
        tipo: peticaoTipo,
        path: arquivo.path
      }
    };

    await executar(dados);
    await fs.unlink(arquivo.path);

    res.json({ sucesso: true, mensagem: 'Petição enviada com sucesso!' });
  } catch (error) {
    console.error('Erro TRF3:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao executar automação TRF3.' });
  }
});

export default router;