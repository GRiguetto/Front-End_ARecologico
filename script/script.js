// =====================================================================
// AR Ecológico - script.js
// Ao integrar o back-end: ajuste URL_API e USAR_DADOS_FALSOS em config.js.
// Contrato esperado (REST/JSON): GET /recurso | POST /recurso | PUT /recurso/{id} | DELETE /recurso/{id}
// Os nomes dos campos abaixo (camelCase) são os nomes do JSON esperado.
// =====================================================================
// ---------- Configuração das entidades (baseada no DER) ----------
const campo = (nome, rotulo, tipo = 'text', extras = {}) => ({ nome, rotulo, tipo, ...extras });

const STATUS_OS = ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

const ENTIDADES = {
  clientes: {
    titulo: 'Clientes', recurso: 'clientes', campoRotulo: 'nome',
    colunas: ['nome', 'tipoCliente', 'telefone', 'cidade'],
    campos: [
      campo('tipoCliente', 'Tipo de cliente', 'select', { opcoes: ['FISICA', 'JURIDICA'], obrigatorio: true }),
      campo('nome', 'Nome / Razão social', 'text', { obrigatorio: true }),
      campo('cpf', 'CPF', 'text', { somenteSe: ['tipoCliente', 'FISICA'] }),
      campo('rg', 'RG', 'text', { somenteSe: ['tipoCliente', 'FISICA'] }),
      campo('dataNascimento', 'Data de nascimento', 'date', { somenteSe: ['tipoCliente', 'FISICA'] }),
      campo('email', 'E-mail', 'email', { somenteSe: ['tipoCliente', 'FISICA'] }),
      campo('cnpj', 'CNPJ', 'text', { somenteSe: ['tipoCliente', 'JURIDICA'] }),
      campo('telefone', 'Telefone'),
      campo('cep', 'CEP'),
      campo('endereco', 'Endereço'),
      campo('numero', 'Número'),
      campo('cidade', 'Cidade'),
      campo('estado', 'Estado'),
    ],
  },
  funcionarios: {
    titulo: 'Funcionários (Prestadores de serviço)', recurso: 'funcionarios', campoRotulo: 'nome',
    colunas: ['nome', 'cargo', 'pagamento'],
    campos: [
      campo('nome', 'Nome', 'text', { obrigatorio: true }),
      campo('cargo', 'Cargo'),
      campo('pagamento', 'Pagamento (R$)', 'number', { moeda: true }),
    ],
  },
  contratos: {
    titulo: 'Contratos', recurso: 'contratos', campoRotulo: 'descricao',
    colunas: ['descricao', 'clienteId', 'tipoContrato', 'dataInicio', 'dataFim'],
    campos: [
      campo('clienteId', 'Cliente', 'select', { origem: 'clientes', obrigatorio: true }),
      campo('descricao', 'Descrição', 'text', { obrigatorio: true }),
      campo('tipoContrato', 'Tipo de contrato', 'select', { opcoes: ['PMOC', 'MANUTENCAO_PREVENTIVA', 'INSTALACAO', 'OUTRO'] }),
      campo('dataInicio', 'Data de início', 'date'),
      campo('dataFim', 'Data de fim', 'date'),
    ],
  },
  equipamentos: {
    titulo: 'Equipamentos do contrato', recurso: 'equipamentos', campoRotulo: 'modelo',
    colunas: ['marca', 'modelo', 'btus', 'contratoId'],
    campos: [
      campo('contratoId', 'Contrato', 'select', { origem: 'contratos', obrigatorio: true }),
      campo('marca', 'Marca'),
      campo('modelo', 'Modelo'),
      campo('btus', 'BTUs', 'number'),
    ],
  },
  ordensServico: {
    titulo: 'Ordens de Serviço', recurso: 'ordens-servico', campoRotulo: 'descricaoProblema',
    colunas: ['descricaoProblema', 'contratoId', 'funcionarioId', 'status', 'valor', 'dataAbertura'],
    campos: [
      campo('contratoId', 'Contrato', 'select', { origem: 'contratos', obrigatorio: true }),
      campo('funcionarioId', 'Funcionário', 'select', { origem: 'funcionarios' }),
      campo('tipoOs', 'Tipo da OS', 'select', { opcoes: ['INSTALACAO', 'MANUTENCAO', 'LIMPEZA', 'REPARO'] }),
      campo('status', 'Status', 'select', { opcoes: STATUS_OS, obrigatorio: true }),
      campo('tipoPagamento', 'Tipo de pagamento', 'select', { opcoes: ['PIX', 'DINHEIRO', 'CARTAO', 'BOLETO'] }),
      campo('valor', 'Valor (R$)', 'number', { moeda: true }),
      campo('dataAbertura', 'Data de abertura', 'date'),
      campo('dataExecucao', 'Data de execução', 'date'),
      campo('descricaoProblema', 'Descrição do problema', 'textarea', { obrigatorio: true }),
      campo('descricaoExecutado', 'Descrição do executado', 'textarea'),
      campo('obs', 'Observações', 'textarea'),
    ],
  },
  servicos: {
    titulo: 'Serviços', recurso: 'servicos', campoRotulo: 'descricao',
    colunas: ['descricao', 'valorServico', 'dataInicio', 'dataFim'],
    campos: [
      campo('descricao', 'Descrição', 'text', { obrigatorio: true }),
      campo('valorServico', 'Valor do serviço (R$)', 'number', { moeda: true }),
      campo('dataInicio', 'Data de início', 'date'),
      campo('dataFim', 'Data de fim', 'date'),
      campo('obs', 'Observações', 'textarea'),
    ],
  },
};

// ---------- Acesso a dados (único ponto que o back-end precisa atender) ----------
async function requisitar(caminho, metodo = 'GET', corpo) {
  const resposta = await fetch(URL_API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...Autenticacao.cabecalhos() },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resposta.status === 401) Autenticacao.sair();
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} em ${metodo} ${caminho}`);
  return resposta.status === 204 ? null : resposta.json();
}

const chaveLocal = (recurso) => `arecologico_${recurso}`;
const lerLocal = (recurso) => JSON.parse(localStorage.getItem(chaveLocal(recurso)) || '[]');
const gravarLocal = (recurso, lista) => localStorage.setItem(chaveLocal(recurso), JSON.stringify(lista));

const Repositorio = {
  async listar(recurso) {
    return USAR_DADOS_FALSOS ? lerLocal(recurso) : requisitar(`/${recurso}`);
  },

  async salvar(recurso, registro) {
    if (!USAR_DADOS_FALSOS) {
      return registro.id
        ? requisitar(`/${recurso}/${registro.id}`, 'PUT', registro)
        : requisitar(`/${recurso}`, 'POST', registro);
    }
    const lista = lerLocal(recurso);
    if (registro.id) {
      gravarLocal(recurso, lista.map((item) => (item.id === registro.id ? registro : item)));
    } else {
      gravarLocal(recurso, [...lista, { ...registro, id: Date.now() }]);
    }
  },

  async excluir(recurso, id) {
    if (!USAR_DADOS_FALSOS) return requisitar(`/${recurso}/${id}`, 'DELETE');
    gravarLocal(recurso, lerLocal(recurso).filter((item) => item.id !== id));
  },
};

// ---------- Menu lateral ----------
const LINKS_MENU = [
  ['../index.html', 'Início'], ['../templates/Dashboard.html', 'Dashboard'], ['../templates/Cliente.html', 'Clientes'],
  ['../templates/Contrato.html', 'Contratos'], ['../templates/Servico.html', 'Serviços / OS'], ['../templates/Funcionario.html', 'Funcionários'], ['../templates/Relatorio.html', 'Relatórios'],
];

function montarMenu() {
  const paginaAtual = location.pathname.split('/').pop() || 'index.html';
  const links = LINKS_MENU.map(([arquivo, nome]) =>
    `<a href="${arquivo}" class="${arquivo === paginaAtual ? 'ativo' : ''}">${nome}</a>`).join('');
  const usuario = Autenticacao.sessao()?.usuario ?? {};
  document.getElementById('menu').innerHTML = `<h1>AR Ecológico</h1><div class="links">${links}</div>
    <div class="usuario">Olá, <strong>${usuario.nome ?? 'visitante'}</strong>
      <button type="button" class="secundario" data-sair>Sair</button></div>`;
  document.querySelector('[data-sair]').addEventListener('click', () => Autenticacao.sair());
}

// ---------- Formatação ----------
const formatarMoeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarData = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
const formatarOpcao = (texto) => texto.replace(/_/g, ' ').toLowerCase();

function formatarCelula(definicao, valor, rotulos) {
  if (valor === undefined || valor === null || valor === '') return '-';
  if (definicao.origem) return rotulos[definicao.nome].get(valor) ?? valor;
  if (definicao.moeda) return formatarMoeda(valor);
  if (definicao.tipo === 'date') return formatarData(valor);
  if (definicao.opcoes) return formatarOpcao(valor);
  return valor;
}

// Para campos que apontam para outra entidade (ex.: clienteId), busca "id -> nome".
async function carregarRotulos(entidade) {
  const rotulos = {};
  for (const definicao of entidade.campos.filter((c) => c.origem)) {
    const origem = ENTIDADES[definicao.origem];
    const lista = await Repositorio.listar(origem.recurso);
    rotulos[definicao.nome] = new Map(lista.map((item) => [item.id, item[origem.campoRotulo]]));
  }
  return rotulos;
}

// Na tabela da tela o status vira uma etiqueta colorida (no PDF continua texto simples).
function celulaDaTabela(definicao, valor, rotulos) {
  const texto = formatarCelula(definicao, valor, rotulos);
  return definicao.nome === 'status' && valor ? `<span class="selo selo-${valor}">${texto}</span>` : texto;
}

// ---------- Construção da tela de CRUD ----------
function criarHtmlDoCampo(definicao) {
  const condicao = definicao.somenteSe ? `data-se-campo="${definicao.somenteSe[0]}" data-se-valor="${definicao.somenteSe[1]}"` : '';
  const obrigatorio = definicao.obrigatorio ? 'required' : '';
  const classe = definicao.tipo === 'textarea' ? 'linha-inteira' : '';
  const entrada = definicao.tipo === 'select'
    ? `<select name="${definicao.nome}" ${obrigatorio}></select>`
    : definicao.tipo === 'textarea'
      ? `<textarea name="${definicao.nome}" rows="2" ${obrigatorio}></textarea>`
      : `<input name="${definicao.nome}" type="${definicao.tipo}" ${definicao.tipo === 'number' ? 'step="any"' : ''} ${obrigatorio}>`;
  return `<label class="${classe}" ${condicao}>${definicao.rotulo}${entrada}</label>`;
}

function criarEsqueleto(secao, entidade) {
  secao.classList.add('secao');
  secao.innerHTML = `
    <h2>${entidade.titulo}</h2>
    <div class="barra-ferramentas">
      <input type="search" placeholder="Buscar..." data-busca>
      <button type="button" data-novo>+ Novo</button>
    </div>
    <div class="tabela-rolagem"><table><thead></thead><tbody></tbody></table></div>
    <dialog><form class="formulario" method="dialog">
      <input type="hidden" name="id">
      ${entidade.campos.map(criarHtmlDoCampo).join('')}
      <div class="rodape">
        <button type="button" class="secundario" data-cancelar>Cancelar</button>
        <button type="submit">Salvar</button>
      </div>
    </form></dialog>`;
}

function iniciarTelaCrud(secao) {
  const entidade = ENTIDADES[secao.dataset.entidade];
  criarEsqueleto(secao, entidade);

  const corpoTabela = secao.querySelector('tbody');
  const caixaBusca = secao.querySelector('[data-busca]');
  const janela = secao.querySelector('dialog');
  const formulario = secao.querySelector('form');
  const colunas = entidade.colunas.map((nome) => entidade.campos.find((c) => c.nome === nome));

  secao.querySelector('thead').innerHTML =
    `<tr>${colunas.map((c) => `<th>${c.rotulo}</th>`).join('')}<th>Ações</th></tr>`;

  async function atualizarTabela() {
    const [registros, rotulos] = await Promise.all([Repositorio.listar(entidade.recurso), carregarRotulos(entidade)]);
    const termo = caixaBusca.value.toLowerCase();
    const filtrados = registros.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(termo));

    corpoTabela.innerHTML = filtrados.length
      ? filtrados.map((registro) => `
        <tr>${colunas.map((c) => `<td data-rotulo="${c.rotulo}">${celulaDaTabela(c, registro[c.nome], rotulos)}</td>`).join('')}
          <td class="acoes">
            <button class="secundario" data-editar="${registro.id}">Editar</button>
            <button class="perigo" data-excluir="${registro.id}">Excluir</button>
          </td></tr>`).join('')
      : `<tr><td class="vazio" colspan="${colunas.length + 1}">Nenhum registro encontrado.</td></tr>`;
  }

  async function preencherSelects() {
    for (const definicao of entidade.campos.filter((c) => c.tipo === 'select')) {
      const select = formulario.elements[definicao.nome];
      const opcoes = definicao.origem
        ? (await Repositorio.listar(ENTIDADES[definicao.origem].recurso))
            .map((item) => [item.id, item[ENTIDADES[definicao.origem].campoRotulo]])
        : definicao.opcoes.map((opcao) => [opcao, formatarOpcao(opcao)]);
      select.innerHTML = '<option value="">Selecione...</option>' +
        opcoes.map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('');
    }
  }

  // Mostra/esconde campos que dependem de outro (ex.: CPF só para pessoa física).
  function atualizarCamposCondicionais() {
    formulario.querySelectorAll('[data-se-campo]').forEach((rotulo) => {
      const visivel = formulario.elements[rotulo.dataset.seCampo].value === rotulo.dataset.seValor;
      rotulo.hidden = !visivel;
      rotulo.querySelector('input, select, textarea').disabled = !visivel;
    });
  }

  async function abrirFormulario(registro = {}) {
    await preencherSelects();
    formulario.reset();
    formulario.elements.id.value = registro.id ?? '';
    entidade.campos.forEach((c) => { formulario.elements[c.nome].value = registro[c.nome] ?? ''; });
    atualizarCamposCondicionais();
    janela.showModal();
  }

  function lerFormulario() {
    const registro = {};
    if (formulario.elements.id.value) registro.id = Number(formulario.elements.id.value);
    for (const c of entidade.campos) {
      const elemento = formulario.elements[c.nome];
      if (elemento.disabled || elemento.value === '') continue;
      registro[c.nome] = (c.tipo === 'number' || c.origem) ? Number(elemento.value) : elemento.value;
    }
    return registro;
  }

  secao.querySelector('[data-novo]').addEventListener('click', () => abrirFormulario());
  secao.querySelector('[data-cancelar]').addEventListener('click', () => janela.close());
  caixaBusca.addEventListener('input', atualizarTabela);
  formulario.addEventListener('change', atualizarCamposCondicionais);

  formulario.addEventListener('submit', async () => {
    await Repositorio.salvar(entidade.recurso, lerFormulario());
    await atualizarTabela();
  });

  corpoTabela.addEventListener('click', async (evento) => {
    const { editar, excluir } = evento.target.dataset;
    if (editar) {
      const registros = await Repositorio.listar(entidade.recurso);
      abrirFormulario(registros.find((r) => r.id === Number(editar)));
    }
    if (excluir && confirm('Deseja realmente excluir este registro?')) {
      await Repositorio.excluir(entidade.recurso, Number(excluir));
      await atualizarTabela();
    }
  });

  atualizarTabela();
}

// ---------- Dashboard ----------
const PALETA = ['#1b7f5c', '#1f6fb2', '#c2620f', '#7b4bb3', '#c0392b', '#6f7f7a'];
const COR_STATUS = { ABERTA: '#1f6fb2', EM_ANDAMENTO: '#c2620f', CONCLUIDA: '#1b7f5c', CANCELADA: '#6f7f7a' };

const dataEmDias = (dias) => new Date(Date.now() + dias * 864e5).toLocaleDateString('sv-SE');
const somar = (lista, chave) => lista.reduce((total, item) => total + (item[chave] || 0), 0);
const contarPor = (lista, chave) =>
  lista.reduce((contagem, item) => ({ ...contagem, [item[chave] ?? 'N/D']: (contagem[item[chave] ?? 'N/D'] || 0) + 1 }), {});

function desenharBarras(idElemento, contagem, { rotular = formatarOpcao, valor = String } = {}) {
  const itens = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maior = Math.max(1, ...itens.map(([, total]) => total));
  document.getElementById(idElemento).innerHTML = itens.map(([nome, total]) => `
    <div class="barra"><span class="nome">${rotular(String(nome))}</span>
      <div class="preenchimento" style="width:${(total / maior) * 60}%"></div><span>${valor(total)}</span></div>`).join('')
    || '<p class="vazio">Sem dados no período.</p>';
}

function desenharRosca(idElemento, contagem, cores = {}) {
  const itens = Object.entries(contagem);
  const total = itens.reduce((soma, [, quantidade]) => soma + quantidade, 0);
  const destino = document.getElementById(idElemento);
  if (!total) { destino.innerHTML = '<p class="vazio">Sem dados no período.</p>'; return; }

  let inicio = 0;
  const corDe = (nome, i) => cores[nome] ?? PALETA[i % PALETA.length];
  const fatias = itens.map(([nome, quantidade], i) => {
    const fim = inicio + (quantidade / total) * 100;
    const fatia = `${corDe(nome, i)} ${inicio}% ${fim}%`;
    inicio = fim;
    return fatia;
  });
  const legenda = itens.map(([nome, quantidade], i) =>
    `<li><i style="background:${corDe(nome, i)}"></i>${formatarOpcao(nome)} <b>${quantidade}</b></li>`).join('');
  destino.innerHTML = `<div class="rosca-area">
    <div class="rosca" style="background:conic-gradient(${fatias.join(',')})"><span>${total}</span></div>
    <ul class="legenda">${legenda}</ul></div>`;
}

function desenharFaturamentoMensal(idElemento, ordens) {
  const meses = Array.from({ length: 6 }, (_, i) => {
    const data = new Date();
    data.setDate(1);
    data.setMonth(data.getMonth() - (5 - i));
    return data.toLocaleDateString('sv-SE').slice(0, 7);
  });
  const totais = meses.map((mes) => somar(
    ordens.filter((o) => o.status === 'CONCLUIDA' && (o.dataExecucao || o.dataAbertura || '').startsWith(mes)), 'valor'));
  const maior = Math.max(1, ...totais);
  document.getElementById(idElemento).innerHTML = `<div class="colunas">${meses.map((mes, i) => `
    <div class="coluna" title="${formatarMoeda(totais[i])}">
      <small>${(totais[i] / 1000).toFixed(1).replace('.', ',')} mil</small>
      <div class="pilar" style="height:${(totais[i] / maior) * 100}%"></div>
      <small>${new Date(`${mes}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small>
    </div>`).join('')}</div>`;
}

function desenharTabelaResumo(idElemento, cabecalhos, linhas, textoVazio) {
  document.getElementById(idElemento).innerHTML = linhas.length
    ? `<div class="tabela-rolagem"><table><thead><tr>${cabecalhos.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${linhas.map((l) => `<tr>${l.map((celula, i) => `<td data-rotulo="${cabecalhos[i]}">${celula}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : `<p class="vazio">${textoVazio}</p>`;
}

async function montarDashboard() {
  const seletor = document.getElementById('periodo');
  const [clientes, contratos, todasOrdens, funcionarios] = await Promise.all(
    ['clientes', 'contratos', 'ordensServico', 'funcionarios'].map((chave) => Repositorio.listar(ENTIDADES[chave].recurso)));
  const nomeFuncionario = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const nomeContrato = new Map(contratos.map((c) => [c.id, c.descricao]));

  function atualizar() {
    const dias = Number(seletor.value);
    const ordens = dias ? todasOrdens.filter((o) => (o.dataAbertura || '') >= dataEmDias(-dias)) : todasOrdens;
    const concluidas = ordens.filter((o) => o.status === 'CONCLUIDA');
    const faturamento = somar(concluidas, 'valor');
    const emAberto = ordens.filter((o) => ['ABERTA', 'EM_ANDAMENTO'].includes(o.status)).length;
    const vencendo = contratos.filter((c) => c.dataFim >= dataEmDias(0) && c.dataFim <= dataEmDias(30));

    document.getElementById('cartoes').innerHTML = [
      ['Clientes', clientes.length, 'Cliente.html'], ['Contratos', contratos.length, 'Contrato.html'],
      ['OS em aberto', emAberto, 'Servico.html'], ['Faturamento no período', formatarMoeda(faturamento)],
      ['Ticket médio por OS', formatarMoeda(concluidas.length ? faturamento / concluidas.length : 0)],
      ['Contratos vencendo em 30 dias', vencendo.length, 'Contrato.html'],
    ].map(([nome, valor, link]) => {
      const conteudo = `<small>${nome}</small><strong>${valor}</strong>`;
      return link ? `<a class="cartao" href="${link}">${conteudo}</a>` : `<div class="cartao">${conteudo}</div>`;
    }).join('');

    const porFuncionario = {};
    for (const ordem of concluidas) {
      const nome = nomeFuncionario.get(ordem.funcionarioId) ?? 'Sem funcionário';
      porFuncionario[nome] = (porFuncionario[nome] || 0) + (ordem.valor || 0);
    }

    desenharFaturamentoMensal('graficoFaturamento', todasOrdens);
    desenharRosca('graficoStatus', contarPor(ordens, 'status'), COR_STATUS);
    desenharBarras('graficoTipoOs', contarPor(ordens, 'tipoOs'));
    desenharRosca('graficoPagamento', contarPor(concluidas, 'tipoPagamento'));
    desenharBarras('graficoFuncionarios', porFuncionario, { rotular: (nome) => nome, valor: formatarMoeda });
    desenharBarras('graficoTipoContrato', contarPor(contratos, 'tipoContrato'));
    desenharBarras('graficoCidade', contarPor(clientes, 'cidade'), { rotular: (nome) => nome });
    desenharRosca('graficoTipoCliente', contarPor(clientes, 'tipoCliente'));

    const recentes = [...ordens].sort((a, b) => (b.dataAbertura || '').localeCompare(a.dataAbertura || '')).slice(0, 5);
    desenharTabelaResumo('ultimasOs', ['Problema', 'Contrato', 'Status', 'Valor'],
      recentes.map((o) => [o.descricaoProblema, nomeContrato.get(o.contratoId) ?? '-',
        `<span class="selo selo-${o.status}">${formatarOpcao(o.status)}</span>`, o.valor ? formatarMoeda(o.valor) : '-']),
      'Nenhuma OS no período.');
    desenharTabelaResumo('contratosVencendo', ['Contrato', 'Termina em'],
      vencendo.map((c) => [c.descricao, formatarData(c.dataFim)]), 'Nenhum contrato vence nos próximos 30 dias.');
  }

  seletor.addEventListener('change', atualizar);
  atualizar();
}

// ---------- Inicialização ----------
if (USAR_DADOS_FALSOS && typeof semearDadosDeExemplo === 'function') semearDadosDeExemplo();
montarMenu();
document.querySelectorAll('[data-entidade]').forEach(iniciarTelaCrud);
if (document.getElementById('cartoes')) montarDashboard();
