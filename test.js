import path from 'path';
import { fileURLToPath } from 'url';
import { executar } from './executarAutomacao.js';

// Ajustes para usar __dirname em ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dadosMock = {
  login: "10538268859",
  senha: "Ra241216",
  pin_certificado: "31555531",
  numero_processo: "1001474-73.2023.5.02.0075",
  peticao: {
    nome: "ROSINALVA JESUS DOS SANTOS.pdf",
    tipo: "Acordo",
    path: path.resolve('/home/user/Downloads/manifestacao_rosinalva.pdf')
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
