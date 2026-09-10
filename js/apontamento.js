/* =========================================================
   APONTAMENTO DIÁRIO
   Única Construtora — Centro Operacional
   Registro diário de máquinas e caminhões por obra, com
   operador, horário, medidor, serviço, produção, combustível,
   ocorrência e foto. Segue o mesmo padrão de tela usado em
   abastecimentos.js (seleção → lançamento → sucesso).
   ========================================================= */

const APONT_CONFIG = {
  maquinas: {
    colecao: "maquinas",
    tipo: "maquina",
    tipoRotulo: "Máquina",
    campoIdentificador: "identificador",
    campoMedidor: "horimetroAtual",
    medidorRotulo: "Horímetro",
    unidade: "h",
  },
  caminhoes: {
    colecao: "caminhoes",
    tipo: "caminhao",
    tipoRotulo: "Caminhão",
    campoIdentificador: "placa",
    campoMedidor: "kmAtual",
    medidorRotulo: "Quilometragem",
    unidade: "km",
  },
};

function criarEstadoApontamento() {
  return {
    tela: "historico", // historico | selecao | lancamento | sucesso
    carregando: true,
    erro: null,

    obras: [],
    equipamentos: [],
    servicos: [],
    unidades: [],
    funcionarios: [],
    combustiveis: [],
    motivos: [],
    apontamentos: [],

    buscaHistorico: "",

    dadosGerais: { data: dataHojeApont(), obraId: "" },
    buscaEquip: "",
    filtroTipoEquip: "todos",
    selecionados: new Set(),

    salvando: false,
  };
}

let apontEstado = criarEstadoApontamento();

function escApont(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normApont(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function numApont(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function fmtNumeroApont(valor) {
  if (valor === undefined || valor === null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
}

function dataHojeApont() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function fmtDataApont(dataIso) {
  if (!dataIso) return "—";
  try {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataIso;
  }
}

function usuarioAtualApont() {
  const nome = document.getElementById("usuarioNome")?.textContent?.trim() || "";
  if (nome && nome !== "—" && nome !== "Usuário") return nome;
  return "";
}

function verificarFirebaseApont() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não está pronto. Recarregue a página.");
  }
}

/* =========================================================
   CARREGAMENTO DA BASE
   ========================================================= */

async function carregarBaseApontamento() {
  verificarFirebaseApont();
  const { collection, getDocs } = window.fs;

  const [snapObras, snapMaquinas, snapCaminhoes, snapServicos, snapUnidades,
         snapFuncionarios, snapCombustiveis, snapMotivos, snapApontamentos] = await Promise.all([
    getDocs(collection(window.firebaseDb, "obras")),
    getDocs(collection(window.firebaseDb, "maquinas")),
    getDocs(collection(window.firebaseDb, "caminhoes")),
    getDocs(collection(window.firebaseDb, "cadastros_servicos")),
    getDocs(collection(window.firebaseDb, "cadastros_unidades")),
    getDocs(collection(window.firebaseDb, "cadastros_funcionarios")),
    getDocs(collection(window.firebaseDb, "cadastros_combustiveis")),
    getDocs(collection(window.firebaseDb, "cadastros_motivos")),
    getDocs(collection(window.firebaseDb, "apontamentos")),
  ]);

  apontEstado.obras = [];
  snapObras.forEach((d) => {
    const dados = d.data();
    if (dados.ativo === false) return;
    apontEstado.obras.push({ id: d.id, ...dados });
  });
  apontEstado.obras.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  apontEstado.equipamentos = [];
  adicionarSnapshotEquipApont(snapMaquinas, "maquinas");
  adicionarSnapshotEquipApont(snapCaminhoes, "caminhoes");
  apontEstado.equipamentos.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  const listar = (snap, comColecao) => {
    const lista = [];
    snap.forEach((d) => {
      const dados = d.data();
      if (dados.ativo === false) return;
      lista.push({ id: d.id, ...dados });
    });
    lista.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    return lista;
  };

  apontEstado.servicos = listar(snapServicos);
  apontEstado.unidades = listar(snapUnidades);
  apontEstado.funcionarios = listar(snapFuncionarios);
  apontEstado.combustiveis = listar(snapCombustiveis);
  apontEstado.motivos = listar(snapMotivos);

  apontEstado.apontamentos = [];
  snapApontamentos.forEach((d) => apontEstado.apontamentos.push({ id: d.id, ...d.data() }));
  apontEstado.apontamentos.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
}

function adicionarSnapshotEquipApont(snapshot, chaveConfig) {
  const config = APONT_CONFIG[chaveConfig];
  snapshot.forEach((d) => {
    const dados = d.data();
    if (dados.ativo === false) return;
    apontEstado.equipamentos.push({
      id: d.id,
      colecao: config.colecao,
      tipo: config.tipo,
      tipoRotulo: config.tipoRotulo,
      nome: dados.nome || "Sem nome",
      identificacao: dados[config.campoIdentificador] || "Sem identificação",
      medidorAtual: numApont(dados[config.campoMedidor]),
      campoMedidor: config.campoMedidor,
      medidorRotulo: config.medidorRotulo,
      unidade: config.unidade,
      fotoUrl: dados.fotoUrl || null,
    });
  });
}

/* =========================================================
   ENTRADA DO MÓDULO
   ========================================================= */

async function renderApontamento() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  apontEstado = criarEstadoApontamento();

  area.innerHTML = `
    <section class="painel-cadastro modulo-abastecimentos">
      <div class="abast-carregando">
        <div class="loading-spinner"></div>
        Carregando apontamentos...
      </div>
    </section>
  `;

  try {
    await carregarBaseApontamento();
    renderHistoricoApontamentos();
  } catch (erro) {
    console.error("Erro ao carregar apontamentos:", erro);
    renderErroApontamento("Não foi possível carregar os dados. Verifique sua conexão e tente novamente.");
  }
}

window.renderApontamento = renderApontamento;

function renderErroApontamento(mensagem) {
  const area = document.getElementById("areaPagina");
  if (!area) return;
  area.innerHTML = `
    <div class="em-construcao estado-erro">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
      <h3>Não foi possível carregar</h3>
      <p class="etapa">${escApont(mensagem)}</p>
      <button type="button" class="btn-primario" id="btnTentarApont">Tentar novamente</button>
    </div>
  `;
  document.getElementById("btnTentarApont")?.addEventListener("click", renderApontamento);
}

/* =========================================================
   HISTÓRICO
   ========================================================= */

function renderHistoricoApontamentos() {
  apontEstado.tela = "historico";
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <section class="painel-cadastro modulo-abastecimentos">
      <div class="abast-cabecalho-interno">
        <div>
          <span class="abast-eyebrow">Operação</span>
          <h2>Apontamento Diário</h2>
          <p>Registro do que cada máquina e caminhão fez em cada obra, todo dia.</p>
        </div>
        <button type="button" class="btn-primario" id="btnNovoApontamento">+ Novo apontamento</button>
      </div>

      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="search" id="buscaHistoricoApont" placeholder="Buscar por obra..." autocomplete="off">
        </div>
      </div>

      <div id="listaHistoricoApontWrap"></div>
    </section>
  `;

  document.getElementById("btnNovoApontamento")?.addEventListener("click", iniciarNovoApontamento);
  document.getElementById("buscaHistoricoApont")?.addEventListener("input", (e) => {
    apontEstado.buscaHistorico = normApont(e.target.value);
    renderizarListaHistoricoApont();
  });

  renderizarListaHistoricoApont();
}

function renderizarListaHistoricoApont() {
  const wrap = document.getElementById("listaHistoricoApontWrap");
  if (!wrap) return;

  let itens = apontEstado.apontamentos;
  if (apontEstado.buscaHistorico) {
    itens = itens.filter((a) => normApont(a.obraNome).includes(apontEstado.buscaHistorico));
  }

  if (itens.length === 0) {
    wrap.innerHTML = `<div class="cadastro-vazio">Nenhum apontamento registrado ainda.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="grid-obras">
      ${itens.map((a) => `
        <div class="card-obra${a.status === "cancelado" ? " card-obra-inativa" : ""}" data-apont-id="${escApont(a.id)}" style="cursor:pointer;">
          <div class="card-obra-topo">
            <span class="badge ${a.status === "cancelado" ? "parada" : "ativa"}">${a.status === "cancelado" ? "Cancelado" : "Registrado"}</span>
          </div>
          <h3>${escApont(a.obraNome || "Obra")}</h3>
          <p class="card-obra-info">${fmtDataApont(a.data)} · ${a.itens?.length || 0} equipamento(s)</p>
          <div class="card-obra-rodape">
            <span>${escApont(a.responsavel || "—")}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-apont-id]").forEach((card) => {
    card.addEventListener("click", () => abrirDetalhesApontamento(card.dataset.apontId));
  });
}

/* =========================================================
   DETALHES / CANCELAMENTO
   ========================================================= */

function abrirDetalhesApontamento(id) {
  const registro = apontEstado.apontamentos.find((a) => a.id === id);
  if (!registro) return;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro" style="max-width:640px;">
        <div class="modal-cabecalho">
          <h3>${escApont(registro.obraNome)} · ${fmtDataApont(registro.data)}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharDetalheApont">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <div class="abast-lista-lancamentos">
          ${(registro.itens || []).map((item) => `
            <div class="abast-item-lancamento">
              <div class="abast-item-cabecalho">
                <div>
                  <span>${escApont(item.tipoRotulo || "")}</span>
                  <h3>${escApont(item.equipamentoNome)} · ${escApont(item.identificacao || "")}</h3>
                </div>
                <div class="abast-medidor-anterior">
                  <span>${escApont(item.medidorRotulo || "Medidor")}</span>
                  <strong>${fmtNumeroApont(item.medidorAtual)} ${escApont(item.unidade || "")}</strong>
                </div>
              </div>
              <p style="font-size:12.5px; color:#9A9A97; margin-bottom:6px;">
                ${item.percentualTrabalhado !== undefined && item.percentualTrabalhado !== null
                  ? `Trabalhou: <strong style="color:${item.percentualTrabalhado === 0 ? "var(--perigo)" : "var(--branco)"}">${item.percentualTrabalhado}%</strong>`
                  : `Operador: ${escApont(item.operadorNome || "—")} · ${escApont(item.horaInicial || "—")}–${escApont(item.horaFinal || "—")}`}
              </p>
              ${item.servicoNome ? `<p style="font-size:12.5px; color:#9A9A97; margin-bottom:6px;">
                Serviço: ${escApont(item.servicoNome)} ${item.quantidadeProduzida ? `· ${fmtNumeroApont(item.quantidadeProduzida)} ${escApont(item.unidadeProducaoNome || "")}` : ""}
              </p>` : ""}
              ${item.litros ? `<p style="font-size:12.5px; color:#9A9A97; margin-bottom:6px;">Abastecimento: ${fmtNumeroApont(item.litros)} L de ${escApont(item.combustivelNome || "")}</p>` : ""}
              ${item.ocorrencia ? `<p style="font-size:12.5px; color:#F5A623;">Ocorrência: ${escApont(item.ocorrencia)}</p>` : ""}
              ${item.fotoUrl ? `<div class="preview-foto-frota" style="margin-top:8px;"><img src="${escApont(item.fotoUrl)}" alt=""></div>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn-primario" id="btnEditarApont">Editar apontamento</button>
          ${registro.status === "cancelado"
            ? `<span class="badge parada">Este apontamento foi cancelado</span>`
            : `<button type="button" class="btn-secundario" id="btnCancelarApont" style="color:var(--perigo);">Cancelar apontamento</button>`}
          <button type="button" class="btn-primario" id="btnFecharDetalheApont2">Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharDetalheApont")?.addEventListener("click", fecharModalApont);
  document.getElementById("btnFecharDetalheApont2")?.addEventListener("click", fecharModalApont);
  document.getElementById("btnCancelarApont")?.addEventListener("click", () => cancelarApontamento(id));
  document.getElementById("btnEditarApont")?.addEventListener("click", () => {
    fecharModalApont();
    window.editarApontamentoSalvo("diario", id, renderApontamento);
  });
}

function fecharModalApont() {
  document.getElementById("modalOverlay")?.remove();
}

async function cancelarApontamento(id) {
  if (!confirm("Tem certeza que deseja cancelar este apontamento? Ele continua no histórico, marcado como cancelado — não é excluído.")) return;
  try {
    verificarFirebaseApont();
    const { doc, updateDoc, serverTimestamp } = window.fs;
    await updateDoc(doc(window.firebaseDb, "apontamentos", id), {
      status: "cancelado",
      atualizadoEm: serverTimestamp(),
    });
    fecharModalApont();
    await renderApontamento();
  } catch (erro) {
    console.error("Erro ao cancelar apontamento:", erro);
    alert("Não foi possível cancelar. Tente novamente.");
  }
}

/* =========================================================
   ETAPA 1 — SELEÇÃO (data, obra, equipamentos)
   ========================================================= */

function iniciarNovoApontamento() {
  apontEstado.tela = "selecao";
  apontEstado.dadosGerais = { data: dataHojeApont(), obraId: "" };
  apontEstado.buscaEquip = "";
  apontEstado.filtroTipoEquip = "todos";
  apontEstado.selecionados = new Set();
  renderSelecaoNovoApontamento();
}

function renderSelecaoNovoApontamento() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <section class="painel-cadastro modulo-abastecimentos">
      <div class="abast-cabecalho-interno">
        <div>
          <span class="abast-eyebrow">Novo apontamento</span>
          <h2>Selecione a obra e os equipamentos</h2>
          <p>Escolha a data, a obra, e marque todas as máquinas e caminhões que trabalharam nela hoje.</p>
        </div>
        <div class="abast-etapas">
          <span class="ativo">1</span><i></i><span>2</span>
        </div>
      </div>

      <div class="abast-dados-gerais">
        <div class="campo">
          <label>Obra</label>
          <select id="apontObra">
            <option value="">Selecione a obra</option>
            ${apontEstado.obras.map((o) => `<option value="${escApont(o.id)}" ${o.id === apontEstado.dadosGerais.obraId ? "selected" : ""}>${escApont(o.nome)}</option>`).join("")}
          </select>
        </div>
        <div class="campo">
          <label>Data</label>
          <input type="date" id="apontData" value="${escApont(apontEstado.dadosGerais.data)}">
        </div>
        <div class="campo">
          <label>Responsável pelo lançamento</label>
          <input type="text" value="${escApont(usuarioAtualApont())}" disabled>
        </div>
      </div>

      <div class="abast-selecao-topo">
        <div class="cadastro-busca abast-busca">
          <input type="search" id="apontBuscaEquip" placeholder="Buscar equipamento...">
        </div>
        <div class="filtro-status abast-filtros" id="apontFiltroTipo">
          <button type="button" class="chip-status ativo" data-tipo-equip="todos">Todos</button>
          <button type="button" class="chip-status" data-tipo-equip="maquina">Máquinas</button>
          <button type="button" class="chip-status" data-tipo-equip="caminhao">Caminhões</button>
        </div>
      </div>

      <div id="apontGridEquip"></div>
    </section>

    <div class="abast-barra-acao">
      <div>
        <strong id="apontContadorSelecao">Nenhum equipamento selecionado</strong>
        <span>Marque ao menos 1 para continuar</span>
      </div>
      <button type="button" class="btn-primario" id="btnAvancarApont" disabled>Avançar</button>
    </div>
  `;

  document.getElementById("apontObra")?.addEventListener("change", (e) => {
    apontEstado.dadosGerais.obraId = e.target.value;
  });
  document.getElementById("apontData")?.addEventListener("change", (e) => {
    apontEstado.dadosGerais.data = e.target.value;
  });
  document.getElementById("apontBuscaEquip")?.addEventListener("input", (e) => {
    apontEstado.buscaEquip = normApont(e.target.value);
    renderCardsEquipApont();
  });
  document.getElementById("apontFiltroTipo")?.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-tipo-equip]");
    if (!botao) return;
    apontEstado.filtroTipoEquip = botao.dataset.tipoEquip;
    document.querySelectorAll("#apontFiltroTipo [data-tipo-equip]").forEach((b) => b.classList.toggle("ativo", b === botao));
    renderCardsEquipApont();
  });
  document.getElementById("btnAvancarApont")?.addEventListener("click", avancarLancamentoApont);

  renderCardsEquipApont();
}

function equipamentosFiltradosApont() {
  return apontEstado.equipamentos.filter((eq) => {
    if (apontEstado.filtroTipoEquip !== "todos" && eq.tipo !== apontEstado.filtroTipoEquip) return false;
    if (!apontEstado.buscaEquip) return true;
    return normApont(`${eq.nome} ${eq.identificacao}`).includes(apontEstado.buscaEquip);
  });
}

function renderCardsEquipApont() {
  const grid = document.getElementById("apontGridEquip");
  if (!grid) return;
  const itens = equipamentosFiltradosApont();

  if (itens.length === 0) {
    grid.innerHTML = `<div class="cadastro-vazio">Nenhum equipamento encontrado.</div>`;
    return;
  }

  grid.innerHTML = `
    <div class="abast-grid-equipamentos">
      ${itens.map((eq) => {
        const chave = `${eq.colecao}:${eq.id}`;
        const selecionado = apontEstado.selecionados.has(chave);
        return `
          <button type="button" class="abast-card-equipamento${selecionado ? " selecionado" : ""}" data-chave-equip="${escApont(chave)}">
            <span class="abast-card-check">✓</span>
            <div class="cabecalho-card-equip">
              ${eq.fotoUrl
                ? `<div class="apont-card-foto"><img src="${escApont(eq.fotoUrl)}" alt="" loading="lazy"></div>`
                : `<div class="apont-card-foto apont-card-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/><path d="M8 6l1.5-2h5L16 6"/></svg></div>`}
              <div class="cabecalho-card-equip-texto">
                <span class="abast-card-tipo">${escApont(eq.tipoRotulo)}</span>
                <strong>${escApont(eq.nome)}</strong>
              </div>
            </div>
            <span class="abast-card-identificacao">${escApont(eq.identificacao)}</span>
            <div class="abast-card-medidor">
              <small>${escApont(eq.medidorRotulo)}</small>
              <b>${fmtNumeroApont(eq.medidorAtual)} ${escApont(eq.unidade)}</b>
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  grid.querySelectorAll("[data-chave-equip]").forEach((card) => {
    card.addEventListener("click", () => {
      const chave = card.dataset.chaveEquip;
      if (apontEstado.selecionados.has(chave)) {
        apontEstado.selecionados.delete(chave);
      } else {
        apontEstado.selecionados.add(chave);
      }
      card.classList.toggle("selecionado");
      atualizarContadorSelecaoApont();
    });
  });

  atualizarContadorSelecaoApont();
}

function atualizarContadorSelecaoApont() {
  const contador = document.getElementById("apontContadorSelecao");
  const botao = document.getElementById("btnAvancarApont");
  const total = apontEstado.selecionados.size;
  if (contador) {
    contador.textContent = total === 0 ? "Nenhum equipamento selecionado" : `${total} equipamento${total > 1 ? "s" : ""} selecionado${total > 1 ? "s" : ""}`;
  }
  if (botao) botao.disabled = total === 0;
}

function selecionadosApont() {
  return apontEstado.equipamentos.filter((eq) => apontEstado.selecionados.has(`${eq.colecao}:${eq.id}`));
}

function avancarLancamentoApont() {
  if (!apontEstado.dadosGerais.obraId) {
    alert("Selecione a obra antes de continuar.");
    return;
  }
  if (!apontEstado.dadosGerais.data) {
    alert("Selecione a data antes de continuar.");
    return;
  }
  if (apontEstado.selecionados.size === 0) {
    alert("Selecione ao menos um equipamento antes de continuar.");
    return;
  }
  apontEstado.tela = "lancamento";
  renderLancamentoApont();
}

/* =========================================================
   ETAPA 2 — LANÇAMENTO POR EQUIPAMENTO
   ========================================================= */

function renderLancamentoApont() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  const itens = selecionadosApont();
  const obra = apontEstado.obras.find((o) => o.id === apontEstado.dadosGerais.obraId);

  area.innerHTML = `
    <section class="painel-cadastro modulo-abastecimentos modulo-apontamento-lancamento" style="padding-bottom: 0;">
      <div class="abast-cabecalho-interno">
        <div>
          <span class="abast-eyebrow">Novo apontamento</span>
          <h2>Preencha os dados de cada equipamento</h2>
          <p>${escApont(obra?.nome || "")} · ${fmtDataApont(apontEstado.dadosGerais.data)}</p>
        </div>
        <div class="abast-etapas">
          <span>1</span><i></i><span class="ativo">2</span>
        </div>
      </div>

      <div class="abast-resumo-lancamento">
        <div><span>Obra</span><strong>${escApont(obra?.nome || "—")}</strong></div>
        <div><span>Data</span><strong>${fmtDataApont(apontEstado.dadosGerais.data)}</strong></div>
        <div><span>Equipamentos</span><strong>${itens.length}</strong></div>
      </div>

      <div class="abast-lista-lancamentos">
        ${itens.map((eq, i) => renderItemLancamentoApont(eq, i)).join("")}
      </div>

      <div class="abast-erro" id="erroSalvarApont"></div>
    </section>

    <div class="abast-barra-acao" style="position: static; left: auto; right: auto; margin-top: 20px; border-radius: 14px; border: 1px solid #2A2B30; backdrop-filter: none; flex-wrap: nowrap;">
      <div>
        <strong>Revise antes de salvar</strong>
        <span>Marca o percentual trabalhado de cada equipamento</span>
      </div>
      <div class="abast-acoes-finais" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; padding-top: 0; margin-top: 0; border-top: none;">
        <button type="button" class="btn-primario" id="btnVoltarSelecaoApont" style="width: auto;">Voltar</button>
        <button type="button" class="btn-primario" id="btnSalvarApont" style="width: auto;">Salvar apontamento</button>
      </div>
    </div>
  `;

  document.getElementById("btnVoltarSelecaoApont")?.addEventListener("click", () => {
    apontEstado.tela = "selecao";
    renderSelecaoNovoApontamento();
  });
  document.getElementById("btnSalvarApont")?.addEventListener("click", salvarNovoApontamento);

  itens.forEach((eq) => configurarEventosItemApont(eq));
}

function renderItemLancamentoApont(eq, indice) {
  const chave = `${eq.colecao}:${eq.id}`;
  return `
    <div class="abast-item-lancamento" data-item-chave="${escApont(chave)}">
      <div class="abast-item-cabecalho">
        <div>
          <span>${escApont(eq.tipoRotulo)}</span>
          <h3>${escApont(eq.nome)} · ${escApont(eq.identificacao)}</h3>
        </div>
        <button type="button" class="btn-secundario btn-checklist-apont" data-checklist-equip="${escApont(eq.colecao)}:${escApont(eq.id)}">Fazer Checklist</button>
      </div>

      <div class="campo campo-percentual-apont">
        <label>Quanto do dia este equipamento trabalhou? *</label>
        <div class="cards-percentual-apont">
          ${[25, 50, 75, 100].map((valor) => {
            const ehCompleto = valor === 100;
            const marcadoPadrao = valor === 100 ? "checked" : "";
            const circunferencia = 2 * Math.PI * 26;
            const preenchido = (valor / 100) * circunferencia;
            return `
            <label class="card-percentual-apont ${ehCompleto ? "card-percentual-completo" : ""}" data-percentual-card="${indice}:${valor}">
              <input type="radio" name="percentual_${indice}" value="${valor}" ${marcadoPadrao}>
              <div class="anel-percentual-apont">
                <svg viewBox="0 0 60 60">
                  <circle class="anel-percentual-fundo" cx="30" cy="30" r="26"></circle>
                  <circle class="anel-percentual-progresso" cx="30" cy="30" r="26"
                    stroke-dasharray="${preenchido.toFixed(2)} ${circunferencia.toFixed(2)}"></circle>
                </svg>
                <span class="anel-percentual-numero">${valor}%</span>
              </div>
              <span class="card-percentual-legenda">Trabalhou ${valor}%${ehCompleto ? " · Dia completo" : ""}</span>
            </label>`;
          }).join("")}
        </div>
      </div>

      <div class="campo" style="margin-top:12px;">
        <label>Ocorrência (opcional)</label>
        <textarea data-campo="ocorrencia" rows="2" placeholder="Alguma observação sobre o dia deste equipamento..."></textarea>
      </div>

      <div class="resumo-item-apont" data-resumo-percentual="${indice}">
        <span class="resumo-item-apont-equip">${escApont(eq.nome)} · ${escApont(eq.identificacao)}</span>
        <span class="resumo-item-apont-data">${fmtDataApont(apontEstado.dadosGerais.data)}</span>
        <span class="resumo-item-apont-percentual">100%</span>
        <span class="resumo-item-apont-status">A ser salvo</span>
      </div>
    </div>
  `;
}

function configurarEventosItemApont(eq) {
  const chave = `${eq.colecao}:${eq.id}`;
  const container = document.querySelector(`[data-item-chave="${chave}"]`);
  if (!container) return;

  container.querySelector(".btn-checklist-apont")?.addEventListener("click", () => {
    if (typeof window.abrirPreenchimentoChecklist === "function") {
      window.abrirPreenchimentoChecklist(eq.id, eq.colecao, () => {});
    } else {
      alert("O módulo de Checklist ainda não carregou. Recarregue a página.");
    }
  });

  const resumoPercentual = container.querySelector(".resumo-item-apont-percentual");
  container.querySelectorAll('input[type="radio"][name^="percentual_"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (resumoPercentual) resumoPercentual.textContent = `${radio.value}%`;
    });
  });
}

function coletarItensNovoApont() {
  const itens = [];
  const equipamentosSelecionados = selecionadosApont();

  for (const eq of equipamentosSelecionados) {
    const chave = `${eq.colecao}:${eq.id}`;
    const container = document.querySelector(`[data-item-chave="${chave}"]`);
    if (!container) continue;

    const obterValor = (campo) => container.querySelector(`[data-campo="${campo}"]`)?.value?.trim() || "";

    const percentualMarcado = container.querySelector(`input[name^="percentual_"]:checked`);
    if (!percentualMarcado) throw new Error(`Marca quanto "${eq.nome}" trabalhou hoje (25/50/75/100%).`);
    const percentualTrabalhado = Number(percentualMarcado.value);

    itens.push({
      tipoItem: eq.tipo,
      tipoRotulo: eq.tipoRotulo,
      colecaoEquipamento: eq.colecao,
      equipamentoId: eq.id,
      equipamentoNome: eq.nome,
      identificacao: eq.identificacao,
      campoMedidor: eq.campoMedidor,
      medidorRotulo: eq.medidorRotulo,
      unidade: eq.unidade,
      percentualTrabalhado,
      ocorrencia: obterValor("ocorrencia") || null,
    });
  }

  return itens;
}

async function salvarNovoApontamento() {
  const erro = document.getElementById("erroSalvarApont");
  const botao = document.getElementById("btnSalvarApont");
  if (!erro || !botao || apontEstado.salvando) return;

  erro.textContent = "";

  let itens;
  try {
    itens = coletarItensNovoApont();
  } catch (erroValidacao) {
    erro.textContent = erroValidacao.message;
    return;
  }

  try {
    verificarFirebaseApont();
    apontEstado.salvando = true;
    botao.disabled = true;
    botao.textContent = "Salvando...";

    const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;
    const obra = apontEstado.obras.find((o) => o.id === apontEstado.dadosGerais.obraId);

    const registro = {
      obraId: apontEstado.dadosGerais.obraId,
      obraNome: obra?.nome || "Obra",
      data: apontEstado.dadosGerais.data,
      responsavel: usuarioAtualApont(),
      quantidadeItens: itens.length,
      itens,
      status: "ativo",
      ativo: true,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    };

    const salvo = await addDoc(collection(window.firebaseDb, "apontamentos"), registro);

    await Promise.all(itens.map((item) =>
      updateDoc(doc(window.firebaseDb, item.colecaoEquipamento, item.equipamentoId), {
        ultimoApontamentoId: salvo.id,
        ultimoApontamentoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
    ));

    renderSucessoNovoApont(registro);
  } catch (erroFirebase) {
    console.error("Erro ao salvar apontamento:", erroFirebase);
    erro.textContent = "Não foi possível salvar. Verifique a conexão e tente novamente.";
    botao.disabled = false;
    botao.textContent = "Tentar salvar novamente";
  } finally {
    apontEstado.salvando = false;
  }
}

function renderSucessoNovoApont(registro) {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <section class="painel-cadastro">
      <div class="abast-sucesso">
        <div class="abast-sucesso-icone">✓</div>
        <h2>Apontamento registrado</h2>
        <p>${escApont(registro.obraNome)} · ${fmtDataApont(registro.data)} · ${registro.itens.length} equipamento(s) registrado(s). Os medidores da frota já foram atualizados.</p>
        <button type="button" class="btn-primario" id="btnVoltarHistoricoApont">Voltar para o histórico</button>
      </div>
    </section>
  `;

  document.getElementById("btnVoltarHistoricoApont")?.addEventListener("click", renderApontamento);
}


/* Edição administrativa dos registros existentes; não altera cadastros da frota. */
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const assinatura = (v) => JSON.stringify(v, function (k, x) {
    return x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((p) => [p, x[p]])) : x;
  });
  const lista = (snap) => { const r = []; snap.forEach((d) => r.push({ ...d.data(), id: d.id })); return r; };
  const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + "T12:00:00Z")) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;

  window.editarApontamentoSalvo = async function (tipo, id, aoSalvar) {
    if (document.getElementById("editorApontamento")) return;
    const modal = document.createElement("div");
    modal.id = "editorApontamento";
    modal.className = "modal-overlay";
    modal.innerHTML = `<div class="modal-cadastro" role="dialog" aria-modal="true" aria-label="Editar apontamento" style="max-width:1000px;width:calc(100% - 24px);max-height:90vh;overflow-y:auto"><div class="modal-cabecalho"><h3>Editar ${tipo === "diario" ? "Apontamento Diário" : "Viagens"}</h3><button type="button" class="btn-fechar-modal" id="editFechar" aria-label="Fechar">×</button></div><div id="editCorpo">Carregando registro...</div></div>`;
    document.body.appendChild(modal);
    const el = (id) => modal.querySelector(`#${id}`);
    let salvando = false;
    const fechar = () => { if (!salvando) modal.remove(); };
    el("editFechar").onclick = fechar;
    let original, obras, equips, materiais, usuario, perfil;
    const { doc, getDoc, getDocs, collection, serverTimestamp, runTransaction } = window.fs || {};
    const colecao = tipo === "diario" ? "apontamentos" : "apontamentos_viagens";
    let ref;
    try {
      usuario = window.firebaseAuth?.currentUser;
      if (!usuario || !runTransaction) throw new Error("Entre novamente e confira se o arquivo auth.js foi atualizado.");
      const snapPerfil = await getDoc(doc(window.firebaseDb, "usuarios", usuario.uid));
      perfil = snapPerfil.exists() ? snapPerfil.data() : {};
      if (perfil.papel !== "admin" || perfil.ativo === false) throw new Error("A edição completa está disponível para administradores ativos.");
      ref = doc(window.firebaseDb, colecao, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Este registro não existe mais.");
      original = snap.data();
      const snaps = await Promise.all(["obras", "maquinas", "caminhoes", "cadastros_materiais_viagens"].filter((nome) => tipo === "viagens" || nome !== "cadastros_materiais_viagens").map((nome) => getDocs(collection(window.firebaseDb, nome))));
      obras = lista(snaps[0]);
      if (!obras.some((o) => o.id === original.obraId)) obras.push({ id: original.obraId || "", nome: original.obraNome || "Obra original" });
      equips = [[snaps[1], "maquinas"], [snaps[2], "caminhoes"]].flatMap(([s, col]) => lista(s).map((e) => ({ id: e.id, chave: `${col}:${e.id}`, colecao: col, nome: e.nome || "Sem nome", identificacao: e.placa || e.identificador || "", tipo: col === "maquinas" ? "maquina" : "caminhao", tipoRotulo: col === "maquinas" ? "Máquina" : "Caminhão" })));
      if (tipo === "viagens") {
        const chave = `caminhoes:${original.caminhaoId}`;
        if (!equips.some((e) => e.chave === chave)) equips.push({ id: original.caminhaoId, chave, colecao: "caminhoes", nome: original.caminhaoNome || "Caminhão original", identificacao: original.placa || "", tipo: "caminhao", tipoRotulo: "Caminhão" });
        materiais = ["Terra", "Cascalho", "Entulho", "Massa asfáltica", "Brita"].map((nome, i) => ({ id: `padrao-${i}`, nome }));
        materiais.push(...lista(snaps[3]).filter((c) => !materiais.some((m) => m.id === c.id)));
        if (!materiais.some((m) => m.id === original.materialId)) materiais.push({ id: original.materialId || "", nome: original.materialNome || "Material original" });
      } else {
        (original.itens || []).forEach((i) => {
          const col = i.colecaoEquipamento || (i.tipoItem === "caminhao" ? "caminhoes" : "maquinas");
          const chave = `${col}:${i.equipamentoId}`;
          if (!equips.some((e) => e.chave === chave)) equips.push({ id: i.equipamentoId, chave, colecao: col, nome: i.equipamentoNome || "Equipamento original", identificacao: i.identificacao || "", tipo: i.tipoItem || (col === "maquinas" ? "maquina" : "caminhao"), tipoRotulo: i.tipoRotulo || "Equipamento" });
        });
      }
    } catch (e) {
      if (modal.isConnected) el("editCorpo").textContent = e.message || "Não foi possível carregar a edição.";
      return;
    }
    if (!modal.isConnected) return;
    const opcoes = (itens, valor, nome) => itens.map((i) => `<option value="${esc(valor(i))}">${esc(nome(i))}</option>`).join("");
    const campo = (id, rotulo, valor, type = "text") => `<div class="campo"><label for="${id}">${rotulo}</label><input id="${id}" type="${type}" value="${esc(valor)}"></div>`;
    el("editCorpo").innerHTML = `<form id="editForm"><fieldset id="editCampos" style="border:0;padding:0;min-width:0">
      <div class="abast-dados-gerais">${campo("editData", "Data *", original.data, "date")}<div class="campo"><label for="editObra">Obra *</label><select id="editObra">${opcoes(obras, (o) => o.id, (o) => o.nome)}</select></div>${campo("editResponsavel", "Responsável pelo lançamento *", original.responsavel || "")}</div>
      ${tipo === "viagens" ? `<div class="abast-dados-gerais"><div class="campo"><label for="editCaminhao">Caminhão *</label><select id="editCaminhao">${opcoes(equips.filter((e) => e.colecao === "caminhoes"), (e) => e.chave, (e) => `${e.nome} · ${e.identificacao}`)}</select></div><div class="campo"><label for="editMaterial">Material *</label><select id="editMaterial">${opcoes(materiais, (m) => m.id, (m) => m.nome)}</select></div>${campo("editQuantidade", "Quantidade de viagens *", original.quantidadeViagens, "number")}</div><div class="campo"><label for="editObservacao">Observação</label><textarea id="editObservacao" rows="3">${esc(original.observacao || "")}</textarea></div>` : '<div id="editItens"></div><button type="button" class="btn-secundario" id="editAdicionar">+ Adicionar equipamento</button>'}
      </fieldset><p class="abast-erro" id="editErro" role="alert"></p><div class="modal-acoes"><button type="button" class="btn-secundario" id="editVoltar">Voltar sem salvar</button><button type="submit" class="btn-primario" id="editSalvar">Salvar alterações</button></div></form>`;
    el("editObra").value = original.obraId || "";
    el("editData").required = true;
    el("editResponsavel").required = true;
    el("editResponsavel").maxLength = 150;
    el("editVoltar").onclick = fechar;
    let contador = 0;
    const fontes = new Map();
    function adicionar(item = {}) {
      const n = contador++;
      fontes.set(String(n), item);
      const div = document.createElement("div");
      div.className = "abast-item-lancamento";
      div.dataset.editItem = String(n);
      const col = item.colecaoEquipamento || (item.tipoItem === "caminhao" ? "caminhoes" : "maquinas");
      div.innerHTML = `<div class="abast-dados-gerais"><div class="campo"><label for="editEquip${n}">Equipamento *</label><select id="editEquip${n}" data-edit="equipamento" required><option value="">Selecione</option>${opcoes(equips, (e) => e.chave, (e) => `${e.tipoRotulo} · ${e.nome} · ${e.identificacao}`)}</select></div><div class="campo"><label for="editPercent${n}">Percentual trabalhado</label><select id="editPercent${n}" data-edit="percentual"><option value="">Não informado</option>${[0, 25, 50, 75, 100].map((v) => `<option value="${v}">${v}%</option>`).join("")}</select></div><div class="campo"><label for="editOperador${n}">Operador / motorista</label><input id="editOperador${n}" data-edit="operador" value="${esc(item.operadorNome || "")}"></div></div><div class="campo"><label for="editOcorrencia${n}">Observação</label><textarea id="editOcorrencia${n}" data-edit="ocorrencia" rows="2">${esc(item.ocorrencia || "")}</textarea></div><button type="button" class="btn-secundario" data-remover>Remover equipamento deste apontamento</button>`;
      div.querySelector('[data-edit="equipamento"]').value = item.equipamentoId ? `${col}:${item.equipamentoId}` : "";
      div.querySelector('[data-edit="percentual"]').value = item.percentualTrabalhado ?? "";
      div.querySelector('[data-remover]').onclick = () => div.remove();
      el("editItens").appendChild(div);
    }
    if (tipo === "diario") {
      (original.itens || []).forEach(adicionar);
      el("editAdicionar").onclick = () => adicionar();
    } else {
      el("editCaminhao").value = `caminhoes:${original.caminhaoId}`;
      el("editMaterial").value = original.materialId || "";
      el("editQuantidade").min = "0";
      el("editQuantidade").step = "1";
      el("editQuantidade").required = true;
    }
    el("editForm").onsubmit = async (evento) => {
      evento.preventDefault();
      if (salvando) return;
      el("editErro").textContent = "";
      let patch;
      try {
        const obra = obras.find((o) => String(o.id) === el("editObra").value);
        const responsavel = el("editResponsavel").value.trim(), data = el("editData").value;
        if (!obra || !responsavel || !dataValida(data)) throw new Error("Informe data, obra e responsável.");
        patch = { obraId: obra.id, obraNome: obra.id === original.obraId ? (original.obraNome || obra.nome) : obra.nome, data, responsavel };
        if (tipo === "viagens") {
          const eq = equips.find((e) => e.chave === el("editCaminhao").value);
          const material = materiais.find((m) => String(m.id) === el("editMaterial").value);
          const quantidadeViagens = Number(el("editQuantidade").value);
          if (!eq || !material || el("editQuantidade").value === "" || !Number.isSafeInteger(quantidadeViagens) || quantidadeViagens < 0) throw new Error("Selecione caminhão, material e uma quantidade inteira de viagens igual ou maior que zero.");
          Object.assign(patch, { caminhaoId: eq.id, caminhaoNome: eq.nome, placa: eq.identificacao, materialId: material.id, materialNome: material.nome, quantidadeViagens, observacao: el("editObservacao").value.trim() });
          if (eq.id === original.caminhaoId) { patch.caminhaoNome = original.caminhaoNome || eq.nome; patch.placa = original.placa ?? eq.identificacao; }
          if (material.id === original.materialId) patch.materialNome = original.materialNome || material.nome;
        } else {
          const itens = [...modal.querySelectorAll("[data-edit-item]")].map((div) => {
            const antes = fontes.get(div.dataset.editItem);
            const eq = equips.find((e) => e.chave === div.querySelector('[data-edit="equipamento"]').value);
            const percentual = div.querySelector('[data-edit="percentual"]').value;
            if (!eq) throw new Error("Selecione o equipamento em todas as linhas.");
            if (!percentual && antes.percentualTrabalhado !== null && antes.percentualTrabalhado !== undefined) throw new Error("Selecione o percentual trabalhado.");
            if (!percentual && !antes.equipamentoId) throw new Error("Selecione o percentual do equipamento adicionado.");
            const item = { ...antes, equipamentoId: eq.id, colecaoEquipamento: eq.colecao, equipamentoNome: eq.nome, identificacao: eq.identificacao, tipoItem: eq.tipo, tipoRotulo: eq.tipoRotulo, ocorrencia: div.querySelector('[data-edit="ocorrencia"]').value.trim() || null };
            if (eq.id === antes.equipamentoId && eq.colecao === antes.colecaoEquipamento) {
              item.equipamentoNome = antes.equipamentoNome || eq.nome;
              item.identificacao = antes.identificacao ?? eq.identificacao;
            }
            if (percentual !== "") item.percentualTrabalhado = Number(percentual);
            const operador = div.querySelector('[data-edit="operador"]').value.trim();
            if (operador !== (antes.operadorNome || "")) { item.operadorNome = operador || null; item.operadorId = null; }
            if (eq.id !== antes.equipamentoId || eq.colecao !== antes.colecaoEquipamento) {
              item.campoMedidor = eq.colecao === "maquinas" ? "horimetroAtual" : "kmAtual";
              item.medidorRotulo = eq.colecao === "maquinas" ? "Horímetro" : "Quilometragem";
              item.unidade = eq.colecao === "maquinas" ? "h" : "km";
            }
            return item;
          });
          if (!itens.length) throw new Error("Mantenha pelo menos um equipamento no apontamento.");
          Object.assign(patch, { itens, quantidadeItens: itens.length });
        }
      } catch (e) { el("editErro").textContent = e.message; return; }
      salvando = true;
      el("editCampos").disabled = true;
      el("editSalvar").disabled = true;
      el("editSalvar").textContent = "Salvando...";
      try {
        await runTransaction(window.firebaseDb, async (tx) => {
          const snapPerfil = await tx.get(doc(window.firebaseDb, "usuarios", usuario.uid));
          if (window.firebaseAuth?.currentUser?.uid !== usuario.uid || !snapPerfil.exists() || snapPerfil.data().papel !== "admin" || snapPerfil.data().ativo === false) throw new Error("Sua permissão de administrador não está disponível. Entre novamente.");
          const atual = await tx.get(ref);
          if (!atual.exists()) throw new Error("Este registro foi removido. Feche a edição e atualize o histórico.");
          if (assinatura(atual.data()) !== assinatura(original)) throw new Error("Este registro mudou enquanto você editava. Feche e abra a edição novamente para conferir a versão atual.");
          tx.update(ref, { ...patch, atualizadoEm: serverTimestamp(), editadoPorUid: usuario.uid, editadoPor: snapPerfil.data().nome || usuario.email || usuario.uid });
        });
      } catch (e) {
        console.error("Erro ao editar apontamento:", e);
        el("editErro").textContent = e.code ? "Não foi possível salvar. Confira a conexão e as permissões. Seus dados continuam no formulário." : e.message;
        salvando = false;
        el("editCampos").disabled = false;
        el("editSalvar").disabled = false;
        el("editSalvar").textContent = "Salvar alterações";
        return;
      }
      modal.remove();
      await aoSalvar?.();
    };
  };
})();
