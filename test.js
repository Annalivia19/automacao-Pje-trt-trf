import path from 'path';
import { fileURLToPath } from 'url';
import { executar } from './executarAutomacao.js';

// Ajustes para usar __dirname em ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dadosMock = {
  login: "xxxxxxx",
  senha: "xxxxxx",
  pin_certificado: "xxxxx",
  numero_processo: "xxxxxx-xx.xx23.x.x2.xxxx",
  peticao: {
    nome: "xxxxxxxxxxxx.pdf",
    tipo: "Acordo",
    path: path.resolve('/xxx/xxxx/xxxxxx/manifestacao_xxxxx.pdf')
  }
};

(async () => {
  try {
    console.log("Caminho do arquivo:", dadosMock.peticao.path);
    console.log("Iniciando automação...");
    await executarAutomacao(dadosMock);
    console.log("Automação concluída com sucesso.");
  } catch (error) {
    console.error("Erro durante a execução da automação:", error);
  }
})();

await executar(dadosMock);
