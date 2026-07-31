/* =========================================================
   ABASTECIMENTOS
   Única Construtora — Centro Operacional
   ---------------------------------------------------------
   Fluxo mobile-first:
   1. Selecionar obra, data e responsável
   2. Selecionar máquinas e caminhões
   3. Informar novo medidor e litros
   4. Salvar um lançamento com todos os equipamentos
   ========================================================= */

const ABAST_CONFIG = {
  maquinas: {
    colecao: "maquinas",
    tipo: "maquina",
    rotulo: "Máquina",
    identificador: "identificador",
    medidor: "horimetroAtual",
    medidorRotulo: "Horímetro",
    unidade: "h",
  },

  caminhoes: {
    colecao: "caminhoes",
    tipo: "caminhao",
    rotulo: "Caminhão",
    identificador: "placa",
    medidor: "kmAtual",
    medidorRotulo: "Quilometragem",
    unidade: "km",
  },
};

let abastecimentoEstado = criarEstadoAbastecimento();

function criarEstadoAbastecimento() {
  return {
    etapa: 1,
    obras: [],
    equipamentos: [],
    selecionados: new Set(),
    filtroTipo: "todos",
    busca: "",
    carregando: false,
  };
}

function abastEscaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function abastNormalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function abastNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function abastFormatarNumero(valor) {
  const numero = abastNumero(valor);
  if (numero === null) return "—";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(numero);
}

function abastDataHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function verificarFirebaseAbastecimentos() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não foi inicializado.");
  }
}

function obterUsuarioAbastecimento() {
  const nome = document.getElementById("usuarioNome")?.textContent?.trim();
  return nome && nome !== "—" ? nome : "";
}

async function renderAbastecimentos() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  abastecimentoEstado = criarEstadoAbastecimento();

  area.innerHTML = `
    <section class="modulo-abastecimentos">
      <div class="abast-cabecalho-interno">
        <div>
          <span class="abast-eyebrow">Novo lançamento</span>
          <h2>Registrar abastecimento</h2>
          <p>Selecione a obra e os equipamentos abastecidos.</p>
        </div>

        <div class="abast-etapas" aria-label="Etapas do lançamento">
          <span class="ativo" data-abast-indicador="1">1</span>
          <i></i>
          <span data-abast-indicador="2">2</span>
        </div>
      </div>

      <div id="abastConteudo">
        <div class="abast-carregando">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p>Carregando obras e equipamentos...</p>
        </div>
      </div>
    </section>
  `;

  try {
    await carregarDadosAbastecimento();
    renderEtapaSelecaoAbastecimento();
  } catch (erro) {
    console.error("Erro ao carregar abastecimentos:", erro);
    renderErroAbastecimento(erro);
  }
}

window.renderAbastecimentos = renderAbastecimentos;

async function carregarDadosAbastecimento() {
  verificarFirebaseAbastecimentos();

  const { collection, getDocs } = window.fs;

  const [snapObras, snapMaquinas, snapCaminhoes] = await Promise.all([
    getDocs(collection(window.firebaseDb, "obras")),
    getDocs(collection(window.firebaseDb, "maquinas")),
    getDocs(collection(window.firebaseDb, "caminhoes")),
  ]);

  abastecimentoEstado.obras = [];
  snapObras.forEach((documento) => {
    const dados = documento.data();
    if (dados.ativo === false) return;

    abastecimentoEstado.obras.push({
      id: documento.id,
      ...dados,
    });
  });

  abastecimentoEstado.obras.sort((a, b) =>
    String(a.nome || a.titulo || "").localeCompare(
      String(b.nome || b.titulo || ""),
      "pt-BR"
    )
  );

  abastecimentoEstado.equipamentos = [];

  adicionarEquipamentosSnapshot(snapMaquinas, "maquinas");
  adicionarEquipamentosSnapshot(snapCaminhoes, "caminhoes");

  abastecimentoEstado.equipamentos.sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
  );
}

function adicionarEquipamentosSnapshot(snapshot, chaveConfig) {
  const config = ABAST_CONFIG[chaveConfig];

  snapshot.forEach((documento) => {
    const dados = documento.data();
    if (dados.ativo === false) return;

    abastecimentoEstado.equipamentos.push({
      id: documento.id,
      chaveConfig,
      colecao: config.colecao,
      tipo: config.tipo,
      tipoRotulo: config.rotulo,
      nome: dados.nome || "Sem nome",
      identificacao: dados[config.identificador] || "Sem identificação",
      medidorAtual: abastNumero(dados[config.medidor]),
      campoMedidor: config.medidor,
      medidorRotulo: config.medidorRotulo,
      unidade: config.unidade,
      status: dados.status || "disponivel",
    });
  });
}

function renderEtapaSelecaoAbastecimento() {
  abastecimentoEstado.etapa = 1;
  atualizarIndicadorEtapaAbastecimento();

  const conteudo = document.getElementById("abastConteudo");
  if (!conteudo) return;

  const responsavel = obterUsuarioAbastecimento();

  conteudo.innerHTML = `
    <div class="abast-dados-gerais">
      <div class="campo">
        <label for="abastObra">Obra *</label>
        <select id="abastObra">
          <option value="">Selecione a obra</option>
          ${abastecimentoEstado.obras.map((obra) => `
            <option value="${abastEscaparHtml(obra.id)}">
              ${abastEscaparHtml(obra.nome || obra.titulo || "Obra sem nome")}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="campo">
        <label for="abastData">Data *</label>
        <input type="date" id="abastData" value="${abastDataHoje()}">
      </div>

      <div class="campo">
        <label for="abastResponsavel">Responsável *</label>
        <input
          type="text"
          id="abastResponsavel"
          value="${abastEscaparHtml(responsavel)}"
          placeholder="Nome do responsável"
          maxlength="100"
          autocomplete="off"
        >
      </div>
    </div>

    <div class="abast-selecao-topo">
      <div class="cadastro-busca abast-busca">
        <input
          type="search"
          id="abastBusca"
          placeholder="Pesquisar equipamento..."
          autocomplete="off"
        >
      </div>

      <div class="filtro-status abast-filtros" id="abastFiltros">
        <button type="button" class="chip-status ativo" data-abast-tipo="todos">Todos</button>
        <button type="button" class="chip-status" data-abast-tipo="maquina">Máquinas</button>
        <button type="button" class="chip-status" data-abast-tipo="caminhao">Caminhões</button>
      </div>
    </div>

    <div id="abastListaEquipamentos"></div>

    <div class="abast-barra-acao">
      <div>
        <strong id="abastContadorSelecionados">Nenhum equipamento selecionado</strong>
        <span>Toque nos cards para selecionar.</span>
      </div>

      <button type="button" class="btn-primario" id="btnAbastContinuar" disabled>
        Continuar
      </button>
    </div>
  `;

  configurarEventosSelecaoAbastecimento();
  renderListaSelecaoAbastecimento();
}

function configurarEventosSelecaoAbastecimento() {
  document.getElementById("abastBusca")?.addEventListener("input", (evento) => {
    abastecimentoEstado.busca = abastNormalizar(evento.target.value);
    renderListaSelecaoAbastecimento();
  });

  document.getElementById("abastFiltros")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-abast-tipo]");
    if (!botao) return;

    abastecimentoEstado.filtroTipo = botao.dataset.abastTipo;

    document.querySelectorAll("[data-abast-tipo]").forEach((item) => {
      item.classList.toggle("ativo", item === botao);
    });

    renderListaSelecaoAbastecimento();
  });

  document.getElementById("btnAbastContinuar")?.addEventListener("click", () => {
    avancarParaLancamentoAbastecimento();
  });
}

function obterEquipamentosFiltradosAbastecimento() {
  return abastecimentoEstado.equipamentos.filter((item) => {
    if (
      abastecimentoEstado.filtroTipo !== "todos" &&
      item.tipo !== abastecimentoEstado.filtroTipo
    ) {
      return false;
    }

    if (!abastecimentoEstado.busca) return true;

    return abastNormalizar([
      item.nome,
      item.identificacao,
      item.tipoRotulo,
    ].join(" ")).includes(abastecimentoEstado.busca);
  });
}

function renderListaSelecaoAbastecimento() {
  const lista = document.getElementById("abastListaEquipamentos");
  if (!lista) return;

  const itens = obterEquipamentosFiltradosAbastecimento();

  if (itens.length === 0) {
    lista.innerHTML = `
      <div class="cadastro-vazio">
        Nenhum equipamento encontrado.
      </div>
    `;
    atualizarBarraSelecaoAbastecimento();
    return;
  }

  lista.innerHTML = `
    <div class="abast-grid-equipamentos">
      ${itens.map((item) => {
        const selecionado = abastecimentoEstado.selecionados.has(chaveEquipamento(item));

        return `
          <button
            type="button"
            class="abast-card-equipamento ${selecionado ? "selecionado" : ""}"
            data-abast-equipamento="${abastEscaparHtml(chaveEquipamento(item))}"
            aria-pressed="${selecionado ? "true" : "false"}"
          >
            <span class="abast-card-check" aria-hidden="true">✓</span>

            <span class="abast-card-tipo">${abastEscaparHtml(item.tipoRotulo)}</span>
            <strong>${abastEscaparHtml(item.nome)}</strong>
            <span class="abast-card-identificacao">${abastEscaparHtml(item.identificacao)}</span>

            <span class="abast-card-medidor">
              <small>${abastEscaparHtml(item.medidorRotulo)} atual</small>
              <b>${abastFormatarNumero(item.medidorAtual)} ${item.medidorAtual !== null ? abastEscaparHtml(item.unidade) : ""}</b>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  lista.querySelectorAll("[data-abast-equipamento]").forEach((card) => {
    card.addEventListener("click", () => {
      alternarEquipamentoAbastecimento(card.dataset.abastEquipamento);
    });
  });

  atualizarBarraSelecaoAbastecimento();
}

function chaveEquipamento(item) {
  return `${item.colecao}:${item.id}`;
}

function alternarEquipamentoAbastecimento(chave) {
  if (abastecimentoEstado.selecionados.has(chave)) {
    abastecimentoEstado.selecionados.delete(chave);
  } else {
    abastecimentoEstado.selecionados.add(chave);
  }

  renderListaSelecaoAbastecimento();
}

function atualizarBarraSelecaoAbastecimento() {
  const quantidade = abastecimentoEstado.selecionados.size;
  const contador = document.getElementById("abastContadorSelecionados");
  const botao = document.getElementById("btnAbastContinuar");

  if (contador) {
    contador.textContent = quantidade === 0
      ? "Nenhum equipamento selecionado"
      : `${quantidade} ${quantidade === 1 ? "equipamento selecionado" : "equipamentos selecionados"}`;
  }

  if (botao) {
    botao.disabled = quantidade === 0;
    botao.textContent = quantidade === 0 ? "Continuar" : `Continuar (${quantidade})`;
  }
}

function avancarParaLancamentoAbastecimento() {
  const obra = document.getElementById("abastObra")?.value || "";
  const data = document.getElementById("abastData")?.value || "";
  const responsavel = document.getElementById("abastResponsavel")?.value?.trim() || "";

  if (!obra) {
    alert("Selecione a obra.");
    document.getElementById("abastObra")?.focus();
    return;
  }

  if (!data) {
    alert("Informe a data do abastecimento.");
    document.getElementById("abastData")?.focus();
    return;
  }

  if (!responsavel) {
    alert("Informe o responsável pelo abastecimento.");
    document.getElementById("abastResponsavel")?.focus();
    return;
  }

  if (abastecimentoEstado.selecionados.size === 0) return;

  abastecimentoEstado.dadosGerais = { obra, data, responsavel };
  renderEtapaLancamentoAbastecimento();
}

function obterSelecionadosAbastecimento() {
  return abastecimentoEstado.equipamentos.filter((item) =>
    abastecimentoEstado.selecionados.has(chaveEquipamento(item))
  );
}

function renderEtapaLancamentoAbastecimento() {
  abastecimentoEstado.etapa = 2;
  atualizarIndicadorEtapaAbastecimento();

  const conteudo = document.getElementById("abastConteudo");
  if (!conteudo) return;

  const selecionados = obterSelecionadosAbastecimento();
  const obra = abastecimentoEstado.obras.find(
    (item) => item.id === abastecimentoEstado.dadosGerais.obra
  );

  conteudo.innerHTML = `
    <div class="abast-resumo-lancamento">
      <div>
        <span>Obra</span>
        <strong>${abastEscaparHtml(obra?.nome || obra?.titulo || "Obra")}</strong>
      </div>
      <div>
        <span>Data</span>
        <strong>${abastEscaparHtml(formatarDataAbastecimento(abastecimentoEstado.dadosGerais.data))}</strong>
      </div>
      <div>
        <span>Responsável</span>
        <strong>${abastEscaparHtml(abastecimentoEstado.dadosGerais.responsavel)}</strong>
      </div>
    </div>

    <form id="formAbastecimento">
      <div class="abast-lista-lancamentos">
        ${selecionados.map((item) => renderItemLancamentoAbastecimento(item)).join("")}
      </div>

      <div class="abast-erro" id="abastErro" role="alert"></div>

      <div class="abast-acoes-finais">
        <button type="button" class="btn-secundario" id="btnAbastVoltar">
          Voltar
        </button>

        <button type="submit" class="btn-primario" id="btnAbastSalvar">
          Salvar ${selecionados.length} ${selecionados.length === 1 ? "abastecimento" : "abastecimentos"}
        </button>
      </div>
    </form>
  `;

  document.getElementById("btnAbastVoltar")?.addEventListener("click", () => {
    renderEtapaSelecaoAbastecimento();
    restaurarDadosGeraisAbastecimento();
  });

  document.getElementById("formAbastecimento")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await salvarAbastecimento();
  });
}

function renderItemLancamentoAbastecimento(item) {
  const chave = chaveEquipamento(item);
  const medidorAtual = item.medidorAtual ?? "";

  return `
    <article class="abast-item-lancamento" data-abast-item="${abastEscaparHtml(chave)}">
      <div class="abast-item-cabecalho">
        <div>
          <span>${abastEscaparHtml(item.tipoRotulo)} · ${abastEscaparHtml(item.identificacao)}</span>
          <h3>${abastEscaparHtml(item.nome)}</h3>
        </div>

        <div class="abast-medidor-anterior">
          <span>${abastEscaparHtml(item.medidorRotulo)} atual</span>
          <strong>${abastFormatarNumero(item.medidorAtual)} ${item.medidorAtual !== null ? abastEscaparHtml(item.unidade) : ""}</strong>
        </div>
      </div>

      <div class="abast-campos-lancamento">
        <div class="campo">
          <label>Novo ${abastEscaparHtml(item.medidorRotulo.toLowerCase())} (${abastEscaparHtml(item.unidade)}) *</label>
          <input
            type="number"
            data-abast-novo-medidor
            min="0"
            step="0.01"
            inputmode="decimal"
            value="${abastEscaparHtml(medidorAtual)}"
            required
          >
        </div>

        <div class="campo">
          <label>Litros abastecidos *</label>
          <input
            type="number"
            data-abast-litros
            min="0.01"
            step="0.01"
            inputmode="decimal"
            placeholder="Ex.: 120"
            required
          >
        </div>
      </div>
    </article>
  `;
}

function restaurarDadosGeraisAbastecimento() {
  const dados = abastecimentoEstado.dadosGerais;
  if (!dados) return;

  const obra = document.getElementById("abastObra");
  const data = document.getElementById("abastData");
  const responsavel = document.getElementById("abastResponsavel");

  if (obra) obra.value = dados.obra;
  if (data) data.value = dados.data;
  if (responsavel) responsavel.value = dados.responsavel;
}

function coletarItensAbastecimento() {
  const selecionados = obterSelecionadosAbastecimento();
  const itens = [];

  for (const item of selecionados) {
    const elemento = document.querySelector(
      `[data-abast-item="${CSS.escape(chaveEquipamento(item))}"]`
    );

    const novoMedidor = abastNumero(
      elemento?.querySelector("[data-abast-novo-medidor]")?.value
    );

    const litros = abastNumero(
      elemento?.querySelector("[data-abast-litros]")?.value
    );

    if (novoMedidor === null || novoMedidor < 0) {
      throw new Error(`Informe o novo ${item.medidorRotulo.toLowerCase()} de ${item.nome}.`);
    }

    if (item.medidorAtual !== null && novoMedidor < item.medidorAtual) {
      throw new Error(
        `O novo ${item.medidorRotulo.toLowerCase()} de ${item.nome} não pode ser menor que o atual.`
      );
    }

    if (litros === null || litros <= 0) {
      throw new Error(`Informe os litros abastecidos de ${item.nome}.`);
    }

    itens.push({
      equipamentoId: item.id,
      colecaoEquipamento: item.colecao,
      tipoEquipamento: item.tipo,
      nomeEquipamento: item.nome,
      identificacao: item.identificacao,
      campoMedidor: item.campoMedidor,
      unidadeMedidor: item.unidade,
      medidorAnterior: item.medidorAtual,
      medidorAtual: novoMedidor,
      litros,
    });
  }

  return itens;
}

async function salvarAbastecimento() {
  const erro = document.getElementById("abastErro");
  const botao = document.getElementById("btnAbastSalvar");

  if (!erro || !botao || abastecimentoEstado.carregando) return;

  erro.textContent = "";

  let itens;
  try {
    itens = coletarItensAbastecimento();
  } catch (validacao) {
    erro.textContent = validacao.message;
    return;
  }

  abastecimentoEstado.carregando = true;
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    verificarFirebaseAbastecimentos();

    const {
      collection,
      addDoc,
      doc,
      updateDoc,
      serverTimestamp,
    } = window.fs;

    const obra = abastecimentoEstado.obras.find(
      (item) => item.id === abastecimentoEstado.dadosGerais.obra
    );

    const registro = {
      obraId: abastecimentoEstado.dadosGerais.obra,
      obraNome: obra?.nome || obra?.titulo || "Obra",
      data: abastecimentoEstado.dadosGerais.data,
      responsavel: abastecimentoEstado.dadosGerais.responsavel,
      quantidadeEquipamentos: itens.length,
      totalLitros: itens.reduce((soma, item) => soma + item.litros, 0),
      itens,
      ativo: true,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    };

    const documentoAbastecimento = await addDoc(
      collection(window.firebaseDb, "abastecimentos"),
      registro
    );

    await Promise.all(
      itens.map((item) =>
        updateDoc(
          doc(window.firebaseDb, item.colecaoEquipamento, item.equipamentoId),
          {
            [item.campoMedidor]: item.medidorAtual,
            ultimoAbastecimentoId: documentoAbastecimento.id,
            ultimoAbastecimentoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          }
        )
      )
    );

    renderSucessoAbastecimento(itens, registro.totalLitros);
  } catch (erroFirebase) {
    console.error("Erro ao salvar abastecimento:", erroFirebase);
    erro.textContent = "Não foi possível salvar. Verifique sua conexão e tente novamente.";
    botao.disabled = false;
    botao.textContent = "Tentar salvar novamente";
  } finally {
    abastecimentoEstado.carregando = false;
  }
}

function renderSucessoAbastecimento(itens, totalLitros) {
  const conteudo = document.getElementById("abastConteudo");
  if (!conteudo) return;

  conteudo.innerHTML = `
    <div class="abast-sucesso">
      <div class="abast-sucesso-icone">✓</div>
      <h2>Abastecimento salvo</h2>
      <p>
        ${itens.length} ${itens.length === 1 ? "equipamento foi atualizado" : "equipamentos foram atualizados"}
        com ${abastFormatarNumero(totalLitros)} litros no total.
      </p>

      <button type="button" class="btn-primario" id="btnNovoAbastecimento">
        Registrar novo abastecimento
      </button>
    </div>
  `;

  document.getElementById("btnNovoAbastecimento")?.addEventListener("click", () => {
    renderAbastecimentos();
  });
}

function renderErroAbastecimento(erro) {
  const conteudo = document.getElementById("abastConteudo");
  if (!conteudo) return;

  conteudo.innerHTML = `
    <div class="em-construcao estado-erro">
      <h3>Não foi possível carregar</h3>
      <p>Verifique sua conexão com a internet e tente novamente.</p>
      <div class="etapa">${abastEscaparHtml(erro?.message || "Erro ao carregar o módulo.")}</div>
      <button type="button" class="btn-primario" id="btnRecarregarAbastecimentos">Tentar novamente</button>
    </div>
  `;

  document.getElementById("btnRecarregarAbastecimentos")?.addEventListener("click", () => {
    renderAbastecimentos();
  });
}

function atualizarIndicadorEtapaAbastecimento() {
  document.querySelectorAll("[data-abast-indicador]").forEach((item) => {
    const etapa = Number(item.dataset.abastIndicador);
    item.classList.toggle("ativo", etapa <= abastecimentoEstado.etapa);
  });
}

function formatarDataAbastecimento(dataIso) {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}
