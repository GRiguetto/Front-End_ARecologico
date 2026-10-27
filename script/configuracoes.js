// =====================================================================
// Configurações do sistema (visual, exibição e acessibilidade).
// As escolhas ficam salvas no navegador (localStorage) e valem para todas as telas.
// =====================================================================
const CHAVE_CONFIGURACOES = 'arecologico_configuracoes';

const CORES_DE_DESTAQUE = {
  verde: { nome: 'Verde', principal: '#1b7f5c', escura: '#14604a' },
  azul: { nome: 'Azul', principal: '#1f6fb2', escura: '#17507f' },
  laranja: { nome: 'Laranja', principal: '#d9731a', escura: '#a85610' },
  roxo: { nome: 'Roxo', principal: '#7b4bb3', escura: '#5b3585' },
};

const CONFIGURACOES_PADRAO = {
  tema: 'claro', cor: 'verde', tamanhoFonte: '16',
  densidade: 'confortavel', zebra: false, menuVisivel: true,
  altoContraste: false, fonteLegivel: false, espacamentoLinhas: false, destacarFoco: false, reduzirAnimacoes: false,
};

// Cada opção booleana liga uma classe CSS no <html>.
const CLASSE_POR_OPCAO = {
  zebra: 'zebra', altoContraste: 'alto-contraste', fonteLegivel: 'fonte-legivel',
  espacamentoLinhas: 'espacamento-linhas', destacarFoco: 'foco-forte', reduzirAnimacoes: 'sem-animacoes',
};

const GRUPOS_DE_CONFIGURACOES = [
  { titulo: 'Visual', itens: [
    { chave: 'tema', rotulo: 'Tema', tipo: 'select', opcoes: [['claro', 'Claro'], ['escuro', 'Escuro']] },
    { chave: 'cor', rotulo: 'Cor de destaque', tipo: 'select',
      opcoes: Object.entries(CORES_DE_DESTAQUE).map(([chave, cor]) => [chave, cor.nome]) },
    { chave: 'tamanhoFonte', rotulo: 'Tamanho da letra', tipo: 'select',
      opcoes: [['14', 'Pequena'], ['16', 'Normal'], ['18', 'Grande'], ['21', 'Muito grande']] },
  ] },
  { titulo: 'Exibição', itens: [
    { chave: 'densidade', rotulo: 'Densidade das tabelas', tipo: 'select', opcoes: [['confortavel', 'Confortável'], ['compacta', 'Compacta']] },
    { chave: 'zebra', rotulo: 'Linhas alternadas nas tabelas', tipo: 'checkbox' },
    { chave: 'menuVisivel', rotulo: 'Mostrar menu lateral', tipo: 'checkbox' },
  ] },
  { titulo: 'Acessibilidade', itens: [
    { chave: 'altoContraste', rotulo: 'Alto contraste', tipo: 'checkbox' },
    { chave: 'fonteLegivel', rotulo: 'Fonte de leitura facilitada', tipo: 'checkbox' },
    { chave: 'espacamentoLinhas', rotulo: 'Maior espaçamento entre linhas', tipo: 'checkbox' },
    { chave: 'destacarFoco', rotulo: 'Destacar item selecionado (teclado)', tipo: 'checkbox' },
    { chave: 'reduzirAnimacoes', rotulo: 'Reduzir animações', tipo: 'checkbox' },
  ] },
];

// ---------- Leitura e gravação ----------
function lerConfiguracoes() {
  const salvas = JSON.parse(localStorage.getItem(CHAVE_CONFIGURACOES) || '{}');
  return { ...CONFIGURACOES_PADRAO, ...salvas };
}

const gravarConfiguracoes = (configuracoes) =>
  localStorage.setItem(CHAVE_CONFIGURACOES, JSON.stringify(configuracoes));

// ---------- Aplicação na tela ----------
function aplicarCorDeDestaque(raiz, configuracoes) {
  const cor = CORES_DE_DESTAQUE[configuracoes.cor] ?? CORES_DE_DESTAQUE.verde;
  if (configuracoes.altoContraste) {
    raiz.style.removeProperty('--verde');
    raiz.style.removeProperty('--verde-escuro');
    return;
  }
  raiz.style.setProperty('--verde', cor.principal);
  raiz.style.setProperty('--verde-escuro', cor.escura);
}

function aplicarConfiguracoes(configuracoes) {
  const raiz = document.documentElement;
  raiz.dataset.tema = configuracoes.tema;
  raiz.style.fontSize = `${configuracoes.tamanhoFonte}px`;
  aplicarCorDeDestaque(raiz, configuracoes);
  raiz.classList.toggle('compacta', configuracoes.densidade === 'compacta');
  for (const [opcao, classe] of Object.entries(CLASSE_POR_OPCAO)) {
    raiz.classList.toggle(classe, configuracoes[opcao]);
  }
  document.getElementById('menu').hidden = !configuracoes.menuVisivel;
}

// ---------- Janela de configurações ----------
function criarHtmlDoItem(item, configuracoes) {
  const valor = configuracoes[item.chave];
  const entrada = item.tipo === 'checkbox'
    ? `<input type="checkbox" name="${item.chave}" ${valor ? 'checked' : ''}>`
    : `<select name="${item.chave}">${item.opcoes.map(([v, t]) =>
        `<option value="${v}" ${v === valor ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<label>${item.rotulo}${entrada}</label>`;
}

function preencherJanela(janela) {
  const configuracoes = lerConfiguracoes();
  const grupos = GRUPOS_DE_CONFIGURACOES.map((grupo) => `
    <fieldset><legend>${grupo.titulo}</legend>
      ${grupo.itens.map((item) => criarHtmlDoItem(item, configuracoes)).join('')}
    </fieldset>`).join('');
  janela.innerHTML = `<form class="configuracoes" method="dialog"><h2>Configurações</h2>${grupos}
    <div class="rodape">
      <button type="button" class="secundario" data-restaurar>Restaurar padrão</button>
      <button type="submit">Fechar</button>
    </div></form>`;
}

function lerEscolhasDaJanela(formulario) {
  const escolhas = {};
  for (const grupo of GRUPOS_DE_CONFIGURACOES) {
    for (const item of grupo.itens) {
      const elemento = formulario.elements[item.chave];
      escolhas[item.chave] = item.tipo === 'checkbox' ? elemento.checked : elemento.value;
    }
  }
  return escolhas;
}

function iniciarConfiguracoes() {
  const botao = document.createElement('button');
  botao.className = 'botao-configuracoes';
  botao.title = 'Configurações do sistema';
  botao.setAttribute('aria-label', 'Abrir configurações do sistema');
  botao.textContent = '⚙';

  const janela = document.createElement('dialog');
  document.body.append(botao, janela);

  botao.addEventListener('click', () => { preencherJanela(janela); janela.showModal(); });

  janela.addEventListener('change', (evento) => {
    const configuracoes = lerEscolhasDaJanela(evento.target.form);
    gravarConfiguracoes(configuracoes);
    aplicarConfiguracoes(configuracoes);
  });

  janela.addEventListener('click', (evento) => {
    if (!evento.target.matches('[data-restaurar]')) return;
    gravarConfiguracoes(CONFIGURACOES_PADRAO);
    aplicarConfiguracoes(CONFIGURACOES_PADRAO);
    preencherJanela(janela);
  });

  aplicarConfiguracoes(lerConfiguracoes());
}

iniciarConfiguracoes();
