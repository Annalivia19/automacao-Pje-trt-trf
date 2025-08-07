import path from 'path';
import { executar } from './executarAutomacaoTRF3.js';

const dadosMock = {
  login: 'xxxxxxx',
  senha: 'xxxxxxxx',
  numero_processo: '50xxx-xx.xxx24.x.xx.xxx3',
  peticao: {
    tipo: '5',
    descricao: 'Petição inicial TRF3',
    path: path.resolve('/xxxxx/xxxx/peticao.pdf')
  },
  anexos: [
    {
      path: path.resolve('/xxxxxx/xxxx/xxxx/anexo1.pdf'),
      tipo: 'Outro documento',
      sigiloso: 1
    }
  ]
};

executar(dadosMock);
