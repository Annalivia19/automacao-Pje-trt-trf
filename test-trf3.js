import path from 'path';
import { executar } from './executarAutomacaoTRF3.js';

const dadosMock = {
  login: '10538268859',
  senha: 'Ra241216',
  numero_processo: '5004970-71.2024.4.03.6183',
  peticao: {
    tipo: '5',
    descricao: 'Petição inicial TRF3',
    path: path.resolve('/home/user/Downloads/peticao.pdf')
  },
  anexos: [
    {
      path: path.resolve('/home/user/Downloads/anexo1.pdf'),
      tipo: 'Outro documento',
      sigiloso: 1
    }
  ]
};

executar(dadosMock);