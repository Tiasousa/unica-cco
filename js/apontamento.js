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

// Mesma técnica usada em frota.js: comprime a foto no navegador e guarda
// como texto dentro do próprio registro (não usamos Storage ainda).
function comprimirImagemApont(arquivo, maxLargura = 640, qualidade = 0.6) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = (evento) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLargura / img.width);
        const largura = Math.round(img.width * escala);
        const altura = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        canvas.getContext("2d").drawImage(img, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
      img.src = evento.target.result;
    };
    leitor.onerror = () => reject(new Error("Não foi possível ler esse arquivo."));
    leitor.readAsDataURL(arquivo);
  });
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
                Operador: ${escApont(item.operadorNome || "—")} · ${escApont(item.horaInicial || "—")}–${escApont(item.horaFinal || "—")}
              </p>
              <p style="font-size:12.5px; color:#9A9A97; margin-bottom:6px;">
                Serviço: ${escApont(item.servicoNome || "—")} ${item.quantidadeProduzida ? `· ${fmtNumeroApont(item.quantidadeProduzida)} ${escApont(item.unidadeProducaoNome || "")}` : ""}
              </p>
              ${item.litros ? `<p style="font-size:12.5px; color:#9A9A97; margin-bottom:6px;">Abastecimento: ${fmtNumeroApont(item.litros)} L de ${escApont(item.combustivelNome || "")}</p>` : ""}
              ${item.ocorrencia ? `<p style="font-size:12.5px; color:#F5A623;">Ocorrência: ${escApont(item.ocorrencia)}</p>` : ""}
              ${item.fotoUrl ? `<div class="preview-foto-frota" style="margin-top:8px;"><img src="${escApont(item.fotoUrl)}" alt=""></div>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="modal-acoes">
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
            ${eq.fotoUrl
              ? `<div class="apont-card-foto"><img src="${escApont(eq.fotoUrl)}" alt="" loading="lazy"></div>`
              : `<div class="apont-card-foto apont-card-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/><path d="M8 6l1.5-2h5L16 6"/></svg></div>`}
            <span class="abast-card-tipo">${escApont(eq.tipoRotulo)}</span>
            <strong>${escApont(eq.nome)}</strong>
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
    <section class="painel-cadastro modulo-abastecimentos">
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

    <div class="abast-barra-acao">
      <div>
        <strong>Revise antes de salvar</strong>
        <span>Serviço e o medidor são obrigatórios em cada item</span>
      </div>
      <div class="abast-acoes-finais">
        <button type="button" class="btn-secundario" id="btnVoltarSelecaoApont">Voltar</button>
        <button type="button" class="btn-primario" id="btnSalvarApont">Salvar apontamento</button>
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
        <div class="abast-medidor-anterior">
          <span>${escApont(eq.medidorRotulo)} anterior</span>
          <strong>${fmtNumeroApont(eq.medidorAtual)} ${escApont(eq.unidade)}</strong>
        </div>
      </div>

      <div class="abast-campos-lancamento">
        <div class="campo">
          <label>Operador / motorista</label>
          <select data-campo="operadorId">
            <option value="">Selecione</option>
            ${apontEstado.funcionarios.map((f) => `<option value="${escApont(f.id)}">${escApont(f.nome)}</option>`).join("")}
          </select>
        </div>
        <div class="campo">
          <label>${escApont(eq.medidorRotulo)} atual (${escApont(eq.unidade)}) *</label>
          <input type="number" step="0.01" min="0" data-campo="medidorAtual" placeholder="${fmtNumeroApont(eq.medidorAtual)}">
        </div>
        <div class="campo">
          <label>Hora inicial</label>
          <input type="time" data-campo="horaInicial">
        </div>
        <div class="campo">
          <label>Hora final</label>
          <input type="time" data-campo="horaFinal">
        </div>
        <div class="campo">
          <label>Serviço executado *</label>
          <select data-campo="servicoId">
            <option value="">Selecione</option>
            ${apontEstado.servicos.map((s) => `<option value="${escApont(s.id)}">${escApont(s.nome)}</option>`).join("")}
          </select>
        </div>
        <div class="campo">
          <label>Quantidade produzida</label>
          <input type="number" step="0.01" min="0" data-campo="quantidadeProduzida" placeholder="Ex.: 120">
        </div>
        <div class="campo">
          <label>Unidade de medida</label>
          <select data-campo="unidadeId">
            <option value="">Selecione</option>
            ${apontEstado.unidades.map((u) => `<option value="${escApont(u.id)}">${escApont(u.nome)}${u.sigla ? " (" + escApont(u.sigla) + ")" : ""}</option>`).join("")}
          </select>
        </div>
        <div class="campo">
          <label>Combustível abastecido</label>
          <select data-campo="combustivelId">
            <option value="">Nenhum</option>
            ${apontEstado.combustiveis.map((c) => `<option value="${escApont(c.id)}">${escApont(c.nome)}</option>`).join("")}
          </select>
        </div>
        <div class="campo">
          <label>Litros abastecidos</label>
          <input type="number" step="0.01" min="0" data-campo="litros" placeholder="Ex.: 80">
        </div>
        <div class="campo">
          <label>Motivo de paralisação (se houve)</label>
          <select data-campo="motivoParalisacaoId">
            <option value="">Nenhum</option>
            ${apontEstado.motivos.map((m) => `<option value="${escApont(m.id)}">${escApont(m.nome)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="campo" style="margin-top:12px;">
        <label>Ocorrência</label>
        <textarea data-campo="ocorrencia" rows="2" placeholder="Alguma observação sobre o dia deste equipamento..."></textarea>
      </div>

      <div class="campo" style="margin-top:12px;">
        <label>Foto (opcional)</label>
        <input type="file" accept="image/*" data-campo-foto="arquivo">
        <div class="preview-foto-frota" data-campo-foto="preview">
          <span class="preview-foto-vazio">${obterIconePlaceholderFrota ? obterIconePlaceholderFrota(eq.tipo) : ""}</span>
        </div>
        <input type="hidden" data-campo="fotoUrl">
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

  const campoArquivo = container.querySelector('[data-campo-foto="arquivo"]');
  const campoPreview = container.querySelector('[data-campo-foto="preview"]');
  const campoFotoOculto = container.querySelector('[data-campo="fotoUrl"]');

  campoArquivo?.addEventListener("change", async () => {
    const arquivo = campoArquivo.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      campoArquivo.value = "";
      return;
    }
    try {
      const dataUrl = await comprimirImagemApont(arquivo);
      if (dataUrl.length > 700000) {
        alert("Essa imagem ficou grande demais mesmo comprimida. Tente outra foto.");
        campoArquivo.value = "";
        return;
      }
      campoFotoOculto.value = dataUrl;
      campoPreview.innerHTML = `<img src="${dataUrl}" alt="">`;
    } catch (erro) {
      console.error("Erro ao processar foto:", erro);
      alert("Não foi possível processar essa foto. Tente outra.");
      campoArquivo.value = "";
    }
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

    const servicoId = obterValor("servicoId");
    if (!servicoId) throw new Error(`Selecione o serviço executado para "${eq.nome}".`);

    const medidorTexto = obterValor("medidorAtual");
    const medidorValor = medidorTexto === "" ? null : Number(medidorTexto);
    if (medidorValor === null || !Number.isFinite(medidorValor) || medidorValor < 0) {
      throw new Error(`Informe o ${eq.medidorRotulo.toLowerCase()} atual de "${eq.nome}".`);
    }

    const servico = apontEstado.servicos.find((s) => s.id === servicoId);
    const operadorId = obterValor("operadorId");
    const operador = apontEstado.funcionarios.find((f) => f.id === operadorId);
    const unidadeId = obterValor("unidadeId");
    const unidade = apontEstado.unidades.find((u) => u.id === unidadeId);
    const combustivelId = obterValor("combustivelId");
    const combustivel = apontEstado.combustiveis.find((c) => c.id === combustivelId);
    const motivoParalisacaoId = obterValor("motivoParalisacaoId");
    const motivo = apontEstado.motivos.find((m) => m.id === motivoParalisacaoId);
    const quantidadeTexto = obterValor("quantidadeProduzida");
    const litrosTexto = obterValor("litros");

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
      medidorAtual: medidorValor,
      operadorId: operadorId || null,
      operadorNome: operador?.nome || null,
      horaInicial: obterValor("horaInicial") || null,
      horaFinal: obterValor("horaFinal") || null,
      servicoId,
      servicoNome: servico?.nome || null,
      quantidadeProduzida: quantidadeTexto === "" ? null : Number(quantidadeTexto),
      unidadeProducaoId: unidadeId || null,
      unidadeProducaoNome: unidade?.nome || null,
      combustivelId: combustivelId || null,
      combustivelNome: combustivel?.nome || null,
      litros: litrosTexto === "" ? null : Number(litrosTexto),
      motivoParalisacaoId: motivoParalisacaoId || null,
      motivoParalisacaoNome: motivo?.nome || null,
      ocorrencia: obterValor("ocorrencia") || null,
      fotoUrl: obterValor("fotoUrl") || null,
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
        [item.campoMedidor]: item.medidorAtual,
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
