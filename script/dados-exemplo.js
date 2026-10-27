// =====================================================================
// Dados fictícios só para demonstrar as telas (gravados no localStorage).
// Ao integrar o back-end, apague este arquivo e a tag <script> dele nas páginas.
// =====================================================================
function semearDadosDeExemplo() {
  if (localStorage.getItem('arecologico_clientes')) return;

  const escolher = (lista, i) => lista[i % lista.length];
  const dia = (diasAtras) => new Date(Date.now() - diasAtras * 864e5).toLocaleDateString('sv-SE');
  const gravar = (recurso, lista) => localStorage.setItem(`arecologico_${recurso}`, JSON.stringify(lista));
  const numerar = (lista) => lista.map((item, i) => ({ id: i + 1, ...item }));

  const nomes = ['Maria Souza', 'Padaria Pão Dourado', 'João Almeida', 'Clínica Vida', 'Ana Ribeiro',
    'Escritório Lima & Filhos', 'Carlos Mendes', 'Mercado Bom Preço'];
  const cidades = ['São José do Rio Preto', 'Mirassol', 'Bady Bassitt', 'Votuporanga'];
  const tiposContrato = ['PMOC', 'MANUTENCAO_PREVENTIVA', 'INSTALACAO', 'OUTRO'];
  const problemas = ['Ar não gela', 'Barulho no aparelho', 'Vazamento de água', 'Limpeza programada',
    'Instalação de novo split', 'Controle sem resposta'];

  gravar('clientes', numerar(nomes.map((nome, i) => ({
    nome, tipoCliente: i % 2 ? 'JURIDICA' : 'FISICA', telefone: `(17) 99100-00${10 + i}`, cidade: escolher(cidades, i * 3 + 1),
  }))));

  gravar('funcionarios', numerar(['Rafael Costa', 'Bruno Martins', 'Tiago Nunes', 'Paulo Ferreira', 'Lucas Prado']
    .map((nome, i) => ({ nome, cargo: i < 3 ? 'Técnico em refrigeração' : 'Auxiliar técnico', pagamento: 2500 + i * 300 }))));

  gravar('contratos', numerar(nomes.map((nome, i) => ({
    clienteId: i + 1, descricao: `Manutenção - ${nome}`, tipoContrato: escolher(tiposContrato, i),
    dataInicio: dia(300 - i * 30), dataFim: dia(i < 3 ? -(10 + i * 8) : -(120 + i * 30)),
  }))));

  gravar('equipamentos', numerar(Array.from({ length: 12 }, (_, i) => ({
    contratoId: (i % 8) + 1, marca: escolher(['Springer', 'LG', 'Samsung', 'Daikin'], i),
    modelo: `Split Inverter ${escolher([9000, 12000, 18000], i)}`, btus: escolher([9000, 12000, 18000, 24000], i),
  }))));

  const statusPonderado = ['CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'EM_ANDAMENTO', 'ABERTA', 'CANCELADA'];
  gravar('ordens-servico', numerar(Array.from({ length: 36 }, (_, i) => {
    const diasAtras = Math.round(175 - i * 4.8);
    const status = escolher(statusPonderado, i * 5);
    return {
      contratoId: (i % 8) + 1, funcionarioId: (i % 5) + 1, status,
      tipoOs: escolher(['MANUTENCAO', 'LIMPEZA', 'INSTALACAO', 'REPARO'], i * 7),
      tipoPagamento: escolher(['PIX', 'CARTAO', 'DINHEIRO', 'BOLETO'], i * 3),
      valor: 180 + ((i * 97) % 14) * 60, dataAbertura: dia(diasAtras),
      ...(status === 'CONCLUIDA' ? { dataExecucao: dia(diasAtras - 2) } : {}),
      descricaoProblema: escolher(problemas, i),
    };
  })));

  gravar('servicos', numerar(['Limpeza completa', 'Carga de gás', 'Instalação de split', 'Visita técnica']
    .map((descricao, i) => ({ descricao, valorServico: 150 + i * 120, dataInicio: dia(120 - i * 25) }))));
}
