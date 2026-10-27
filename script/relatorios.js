// =====================================================================
// Relatórios em PDF (usa jsPDF + AutoTable, carregados no Relatorio.html).
// Para incluir um novo tipo de relatório, adicione uma linha em CONFIGURACAO_RELATORIOS.
// campoData   -> campo usado para filtrar por período (se não houver, o período fica desativado)
// campoFiltro -> campo de lista usado como filtro extra (opcional)
// =====================================================================
const CONFIGURACAO_RELATORIOS = {
  ordensServico: { campoData: 'dataAbertura', campoFiltro: 'status' },
  contratos: { campoData: 'dataInicio', campoFiltro: 'tipoContrato' },
  servicos: { campoData: 'dataInicio' },
  equipamentos: {},
  clientes: { campoFiltro: 'tipoCliente' },
  funcionarios: {},
};

const COLUNAS_PARA_PAISAGEM = 5;
const COR_CABECALHO_PDF = [27, 127, 92];

function iniciarTelaRelatorios() {
  const formulario = document.getElementById('formularioRelatorio');
  const mensagem = document.getElementById('mensagemRelatorio');

  formulario.elements.tipo.innerHTML = Object.keys(CONFIGURACAO_RELATORIOS)
    .map((chave) => `<option value="${chave}">${ENTIDADES[chave].titulo}</option>`).join('');

  function atualizarOpcoes() {
    const chave = formulario.elements.tipo.value;
    const entidade = ENTIDADES[chave];
    const { campoData, campoFiltro } = CONFIGURACAO_RELATORIOS[chave];

    document.getElementById('colunasRelatorio').innerHTML = entidade.campos.map((c) => `
      <label><input type="checkbox" name="colunas" value="${c.nome}" ${entidade.colunas.includes(c.nome) ? 'checked' : ''}>
        ${c.rotulo}</label>`).join('');

    formulario.elements.dataInicial.disabled = !campoData;
    formulario.elements.dataFinal.disabled = !campoData;

    const rotuloFiltro = document.getElementById('rotuloFiltro');
    rotuloFiltro.hidden = !campoFiltro;
    if (!campoFiltro) return;
    const definicao = entidade.campos.find((c) => c.nome === campoFiltro);
    rotuloFiltro.firstChild.textContent = definicao.rotulo;
    formulario.elements.filtro.innerHTML = '<option value="">Todos</option>' +
      definicao.opcoes.map((opcao) => `<option value="${opcao}">${formatarOpcao(opcao)}</option>`).join('');
  }

  function filtrarRegistros(registros, chave) {
    const { campoData, campoFiltro } = CONFIGURACAO_RELATORIOS[chave];
    const { dataInicial, dataFinal, filtro } = formulario.elements;
    return registros.filter((registro) => {
      const data = registro[campoData];
      const dentroDoPeriodo = !campoData
        || ((!dataInicial.value || data >= dataInicial.value) && (!dataFinal.value || data <= dataFinal.value));
      const passaNoFiltro = !campoFiltro || !filtro.value || registro[campoFiltro] === filtro.value;
      return dentroDoPeriodo && passaNoFiltro;
    });
  }

  const descreverPeriodo = () => {
    const { dataInicial, dataFinal } = formulario.elements;
    if (dataInicial.disabled || (!dataInicial.value && !dataFinal.value)) return 'Período: todos os registros';
    const inicio = dataInicial.value ? formatarData(dataInicial.value) : 'início';
    const fim = dataFinal.value ? formatarData(dataFinal.value) : 'hoje';
    return `Período: ${inicio} a ${fim}`;
  };

  function montarPdf(entidade, colunas, linhas, registros) {
    const { jsPDF } = window.jspdf;
    const orientacao = colunas.length > COLUNAS_PARA_PAISAGEM ? 'landscape' : 'portrait';
    const documento = new jsPDF({ orientation: orientacao });

    documento.setFontSize(16);
    documento.text(`AR Ecológico - Relatório de ${entidade.titulo}`, 14, 16);
    documento.setFontSize(10);
    documento.text(`${descreverPeriodo()}  |  Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 23);

    documento.autoTable({
      startY: 28,
      head: [colunas.map((c) => c.rotulo)],
      body: linhas,
      headStyles: { fillColor: COR_CABECALHO_PDF },
      styles: { fontSize: 9 },
    });

    let posicaoY = documento.lastAutoTable.finalY + 8;
    documento.text(`Total de registros: ${registros.length}`, 14, posicaoY);
    for (const coluna of colunas.filter((c) => c.moeda)) {
      posicaoY += 6;
      const soma = registros.reduce((total, r) => total + (r[coluna.nome] || 0), 0);
      documento.text(`Total de ${coluna.rotulo}: ${formatarMoeda(soma)}`, 14, posicaoY);
    }
    return documento;
  }

  async function gerarRelatorio(evento) {
    evento.preventDefault();
    const chave = formulario.elements.tipo.value;
    const entidade = ENTIDADES[chave];
    const nomesEscolhidos = [...formulario.querySelectorAll('[name=colunas]:checked')].map((c) => c.value);
    if (!nomesEscolhidos.length) { mensagem.textContent = 'Escolha pelo menos uma coluna.'; return; }

    const colunas = entidade.campos.filter((c) => nomesEscolhidos.includes(c.nome));
    const registros = filtrarRegistros(await Repositorio.listar(entidade.recurso), chave);
    if (!registros.length) { mensagem.textContent = 'Nenhum registro encontrado para esses filtros.'; return; }

    const rotulos = await carregarRotulos(entidade);
    const linhas = registros.map((r) => colunas.map((c) => formatarCelula(c, r[c.nome], rotulos)));
    const hoje = new Date().toISOString().slice(0, 10);

    montarPdf(entidade, colunas, linhas, registros).save(`relatorio-${chave}-${hoje}.pdf`);
    mensagem.textContent = `Relatório gerado com ${registros.length} registro(s).`;
  }

  formulario.elements.tipo.addEventListener('change', atualizarOpcoes);
  formulario.addEventListener('submit', gerarRelatorio);
  atualizarOpcoes();
}

if (document.getElementById('formularioRelatorio')) iniciarTelaRelatorios();
