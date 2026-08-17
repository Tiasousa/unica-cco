/* =========================================================
   FROTA · MANUTENÇÕES
   Única Construtora — Centro Operacional
   ---------------------------------------------------------
   Ordens de manutenção vinculadas a um equipamento (máquina
   ou caminhão). Quando uma manutenção fica "Agendada" ou
   "Em andamento", o equipamento correspondente é marcado
   automaticamente como "Manutenção" lá na Frota. Quando a
   manutenção é concluída, o equipamento volta a "Disponível".
   ========================================================= */

const STATUS_MANUTENCAO = [
  { valor: "agendada", rotulo: "Agendada", badge: "atencao" },
  { valor: "em_andamento", rotulo: "Em andamento", badge: "parada" },
  { valor: "concluida", rotulo: "Concluída", badge: "ativa" },
];

let manutEstado = {
  itens: [],
  equipamentos: [],
  tiposManutencao: [],
  busca: "",
  status: "todas",
  mostrarInativas: false,
};

function escManut(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normManut(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmtDataManut(dataIso) {
  if (!dataIso) return "—";
  try {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataIso;
  }
}

function verificarFirebaseManut() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não está pronto. Recarregue a página.");
  }
}

function statusManutInfo(valor) {
  return STATUS_MANUTENCAO.find((s) => s.valor === valor) || STATUS_MANUTENCAO[0];
}

/* =========================================================
   CARREGAMENTO
   ========================================================= */

async function carregarBaseManutencoes() {
  verificarFirebaseManut();
  const { collection, getDocs } = window.fs;

  const [snapMaquinas, snapCaminhoes, snapTipos, snapManut] = await Promise.all([
    getDocs(collection(window.firebaseDb, "maquinas")),
    getDocs(collection(window.firebaseDb, "caminhoes")),
    getDocs(collection(window.firebaseDb, "cadastros_tipos_manutencao")),
    getDocs(collection(window.firebaseDb, "manutencoes")),
  ]);

  manutEstado.equipamentos = [];
  const juntarEquip = (snap, colecao, campoIdent, categoriaRotulo) => {
    snap.forEach((d) => {
      const dados = d.data();
      if (dados.ativo === false) return;
      manutEstado.equipamentos.push({
        id: d.id,
        colecao,
        categoriaRotulo,
        nome: dados.nome || "Sem nome",
        identificacao: dados[campoIdent] || "—",
        fotoUrl: dados.fotoUrl || null,
      });
    });
  };
  juntarEquip(snapMaquinas, "maquinas", "identificador", "Máquina");
  juntarEquip(snapCaminhoes, "caminhoes", "placa", "Caminhão");
  manutEstado.equipamentos.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  manutEstado.tiposManutencao = [];
  snapTipos.forEach((d) => {
    const dados = d.data();
    if (dados.ativo === false) return;
    manutEstado.tiposManutencao.push({ id: d.id, nome: dados.nome || "Sem nome" });
  });
  manutEstado.tiposManutencao.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  manutEstado.itens = [];
  snapManut.forEach((d) => manutEstado.itens.push({ id: d.id, ...d.data() }));
  manutEstado.itens.sort((a, b) => String(b.dataAgendada || "").localeCompare(String(a.dataAgendada || "")));
}

function atualizarContadorAlertaManutencoes() {
  const pendentes = manutEstado.itens.filter(
    (m) => m.ativo !== false && (m.status === "agendada" || m.status === "em_andamento")
  ).length;
  if (typeof window.atualizarContadorNavegacao === "function") {
    window.atualizarContadorNavegacao("alertaManutencoes", pendentes);
  }
}

/* =========================================================
   ENTRADA DO MÓDULO
   ========================================================= */

async function renderManutencoes() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <div class="em-construcao">
      <div class="loading-spinner"></div>
      <p>Carregando manutenções...</p>
    </div>
  `;

  try {
    await carregarBaseManutencoes();
    atualizarContadorAlertaManutencoes();
    renderTelaManutencoes();
  } catch (erro) {
    console.error("Erro ao carregar manutenções:", erro);
    area.innerHTML = `
      <div class="em-construcao estado-erro">
        <h3>Não foi possível carregar</h3>
        <p class="etapa">Verifique sua conexão com a internet e tente novamente.</p>
        <button type="button" class="btn-primario" id="btnTentarManut">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btnTentarManut")?.addEventListener("click", renderManutencoes);
  }
}

window.renderManutencoes = renderManutencoes;

function renderTelaManutencoes() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  manutEstado.busca = "";
  manutEstado.status = "todas";
  manutEstado.mostrarInativas = false;

  area.innerHTML = `
    <section class="painel-cadastro">
      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="search" id="buscaManut" placeholder="Buscar por equipamento...">
        </div>
        <div class="filtro-status" id="filtroStatusManut">
          <button type="button" class="chip-status ativo" data-status-manut="todas">Todas</button>
          ${STATUS_MANUTENCAO.map((s) => `<button type="button" class="chip-status" data-status-manut="${s.valor}">${escManut(s.rotulo)}</button>`).join("")}
        </div>
        <label class="check-inativos">
          <input type="checkbox" id="mostrarManutInativas"> Mostrar desativadas
        </label>
        <button type="button" class="btn-primario" id="btnNovaManutencao">+ Nova manutenção</button>
      </div>
      <div id="listaManutWrap"></div>
    </section>
  `;

  document.getElementById("btnNovaManutencao")?.addEventListener("click", () => abrirModalManutencao(null));
  document.getElementById("buscaManut")?.addEventListener("input", (e) => {
    manutEstado.busca = normManut(e.target.value);
    renderizarListaManutencoes();
  });
  document.getElementById("filtroStatusManut")?.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-status-manut]");
    if (!botao) return;
    manutEstado.status = botao.dataset.statusManut;
    document.querySelectorAll("#filtroStatusManut [data-status-manut]").forEach((b) => b.classList.toggle("ativo", b === botao));
    renderizarListaManutencoes();
  });
  document.getElementById("mostrarManutInativas")?.addEventListener("change", (e) => {
    manutEstado.mostrarInativas = e.target.checked;
    renderizarListaManutencoes();
  });

  renderizarListaManutencoes();
}

function renderizarListaManutencoes() {
  const wrap = document.getElementById("listaManutWrap");
  if (!wrap) return;

  let itens = manutEstado.itens;
  if (!manutEstado.mostrarInativas) itens = itens.filter((m) => m.ativo !== false);
  if (manutEstado.status !== "todas") itens = itens.filter((m) => m.status === manutEstado.status);
  if (manutEstado.busca) {
    itens = itens.filter((m) => normManut(`${m.equipamentoNome} ${m.identificacao}`).includes(manutEstado.busca));
  }

  if (itens.length === 0) {
    wrap.innerHTML = `<div class="cadastro-vazio">Nenhuma manutenção encontrada.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="grid-obras">
      ${itens.map((m) => {
        const status = statusManutInfo(m.status);
        return `
          <div class="card-obra${m.ativo === false ? " card-obra-inativa" : ""}">
            <div class="card-obra-topo">
              <span class="badge ${m.ativo === false ? "parada" : status.badge}">${m.ativo === false ? "Desativada" : escManut(status.rotulo)}</span>
              <div class="celula-acoes">
                <button class="btn-icone" title="Editar" data-editar-manut="${escManut(m.id)}">${typeof iconeLapis === "function" ? iconeLapis() : "✎"}</button>
                ${m.ativo === false
                  ? `<button class="btn-icone" title="Reativar" data-reativar-manut="${escManut(m.id)}">${typeof iconeCheck === "function" ? iconeCheck() : "✓"}</button>`
                  : `<button class="btn-icone" title="Desativar" data-desativar-manut="${escManut(m.id)}">${typeof iconeX === "function" ? iconeX() : "×"}</button>`}
              </div>
            </div>
            <h3>${escManut(m.equipamentoNome)} · ${escManut(m.identificacao)}</h3>
            <p class="card-obra-info">${escManut(m.tipoManutencaoNome || "Manutenção")} · ${escManut(m.categoriaRotulo || "")}</p>
            <div class="card-obra-rodape">
              <span>Agendada: ${fmtDataManut(m.dataAgendada)}</span>
              <span>${m.dataConclusao ? "Concluída: " + fmtDataManut(m.dataConclusao) : ""}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-editar-manut]").forEach((b) => b.addEventListener("click", () => abrirModalManutencao(b.dataset.editarManut)));
  wrap.querySelectorAll("[data-desativar-manut]").forEach((b) => b.addEventListener("click", () => alternarAtivoManutencao(b.dataset.desativarManut, false)));
  wrap.querySelectorAll("[data-reativar-manut]").forEach((b) => b.addEventListener("click", () => alternarAtivoManutencao(b.dataset.reativarManut, true)));
}

async function alternarAtivoManutencao(id, novoValor) {
  const acao = novoValor ? "reativar" : "desativar";
  if (!confirm(`Tem certeza que deseja ${acao} esta manutenção?`)) return;
  try {
    verificarFirebaseManut();
    const { doc, updateDoc, serverTimestamp } = window.fs;
    await updateDoc(doc(window.firebaseDb, "manutencoes", id), { ativo: novoValor, atualizadoEm: serverTimestamp() });
    await renderManutencoes();
  } catch (erro) {
    console.error("Erro ao atualizar manutenção:", erro);
    alert("Não foi possível atualizar. Tente novamente.");
  }
}

/* =========================================================
   MODAL
   ========================================================= */

function fecharModalManutencao() {
  document.getElementById("modalOverlay")?.remove();
}

function abrirModalManutencao(id) {
  const dados = id ? manutEstado.itens.find((m) => m.id === id) : null;
  const chaveEquipAtual = dados ? `${dados.colecaoEquipamento}:${dados.equipamentoId}` : "";
  const equipAtual = dados
    ? manutEstado.equipamentos.find((e) => e.colecao === dados.colecaoEquipamento && e.id === dados.equipamentoId)
    : null;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro modal-obra">
        <div class="modal-cabecalho">
          <h3>${dados ? "Editar" : "Nova"} manutenção</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModalManut">${typeof iconeX === "function" ? iconeX() : "×"}</button>
        </div>
        <form id="formManutencao">
          <div class="campo">
            <label>Equipamento *</label>
            <input type="hidden" id="manutEquipamento" value="${chaveEquipAtual}" required>
            <button type="button" class="seletor-equip-botao" id="btnAbrirSeletorEquipManut">
              ${equipAtual ? `
                ${equipAtual.fotoUrl
                  ? `<span class="seletor-equip-botao-foto"><img src="${escManut(equipAtual.fotoUrl)}" alt=""></span>`
                  : `<span class="seletor-equip-botao-foto seletor-equip-botao-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/></svg></span>`}
                <span class="seletor-equip-botao-texto"><strong>${escManut(equipAtual.nome)}</strong><small>${escManut(equipAtual.identificacao)}</small></span>
              ` : `<span class="seletor-equip-botao-texto seletor-equip-botao-vazio">Toque para escolher o equipamento</span>`}
            </button>
          </div>
          <div class="campo">
            <label>Tipo de manutenção</label>
            <select id="manutTipo">
              <option value="">Selecione</option>
              ${manutEstado.tiposManutencao.map((t) => `<option value="${escManut(t.id)}" ${t.id === dados?.tipoManutencaoId ? "selected" : ""}>${escManut(t.nome)}</option>`).join("")}
            </select>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Data agendada *</label>
              <input type="date" id="manutDataAgendada" value="${dados?.dataAgendada || ""}" required>
            </div>
            <div class="campo">
              <label>Data de conclusão</label>
              <input type="date" id="manutDataConclusao" value="${dados?.dataConclusao || ""}">
            </div>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Status</label>
              <select id="manutStatus">
                ${STATUS_MANUTENCAO.map((s) => `<option value="${s.valor}" ${(dados?.status || "agendada") === s.valor ? "selected" : ""}>${escManut(s.rotulo)}</option>`).join("")}
              </select>
            </div>
            <div class="campo">
              <label>Custo (R$, opcional)</label>
              <input type="number" step="0.01" min="0" id="manutCusto" value="${dados?.custo ?? ""}">
            </div>
          </div>
          <div class="campo">
            <label>Descrição</label>
            <textarea id="manutDescricao" rows="3">${escManut(dados?.descricao || "")}</textarea>
          </div>
          <div class="modal-erro" id="modalErro"></div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarModalManut">Cancelar</button>
            <button type="submit" class="btn-primario">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharModalManut")?.addEventListener("click", fecharModalManutencao);
  document.getElementById("btnCancelarModalManut")?.addEventListener("click", fecharModalManutencao);
  document.getElementById("btnAbrirSeletorEquipManut")?.addEventListener("click", () => {
    window.abrirSeletorEquipamentoVisual(manutEstado.equipamentos, (equip) => {
      document.getElementById("manutEquipamento").value = `${equip.colecao}:${equip.id}`;
      const botao = document.getElementById("btnAbrirSeletorEquipManut");
      botao.innerHTML = `
        ${equip.fotoUrl
          ? `<span class="seletor-equip-botao-foto"><img src="${escManut(equip.fotoUrl)}" alt=""></span>`
          : `<span class="seletor-equip-botao-foto seletor-equip-botao-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/></svg></span>`}
        <span class="seletor-equip-botao-texto"><strong>${escManut(equip.nome)}</strong><small>${escManut(equip.identificacao)}</small></span>
      `;
    });
  });
  document.getElementById("modalOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") fecharModalManutencao();
  });
  document.getElementById("formManutencao")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarManutencao(id);
  });
}

async function salvarManutencao(idExistente) {
  const erro = document.getElementById("modalErro");
  erro.textContent = "";

  const chaveEquip = document.getElementById("manutEquipamento").value;
  if (!chaveEquip) {
    erro.textContent = "Selecione o equipamento.";
    return;
  }
  const [colecaoEquipamento, equipamentoId] = chaveEquip.split(":");
  const equipamento = manutEstado.equipamentos.find((e) => e.colecao === colecaoEquipamento && e.id === equipamentoId);

  const dataAgendada = document.getElementById("manutDataAgendada").value;
  if (!dataAgendada) {
    erro.textContent = "Informe a data agendada.";
    return;
  }

  const tipoId = document.getElementById("manutTipo").value;
  const tipo = manutEstado.tiposManutencao.find((t) => t.id === tipoId);
  const status = document.getElementById("manutStatus").value;
  const custoTexto = document.getElementById("manutCusto").value.trim();

  const dados = {
    colecaoEquipamento,
    equipamentoId,
    equipamentoNome: equipamento?.nome || "Equipamento",
    identificacao: equipamento?.identificacao || "—",
    categoriaRotulo: equipamento?.categoriaRotulo || "",
    tipoManutencaoId: tipoId || null,
    tipoManutencaoNome: tipo?.nome || null,
    dataAgendada,
    dataConclusao: document.getElementById("manutDataConclusao").value || null,
    status,
    custo: custoTexto === "" ? null : Number(custoTexto),
    descricao: document.getElementById("manutDescricao").value.trim() || null,
  };

  const botao = document.querySelector("#formManutencao button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    verificarFirebaseManut();
    const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;

    if (idExistente) {
      dados.atualizadoEm = serverTimestamp();
      await updateDoc(doc(window.firebaseDb, "manutencoes", idExistente), dados);
    } else {
      dados.ativo = true;
      dados.criadoEm = serverTimestamp();
      dados.atualizadoEm = serverTimestamp();
      await addDoc(collection(window.firebaseDb, "manutencoes"), dados);
    }

    // Reflete o status da manutenção no equipamento correspondente
    const statusEquipamento = status === "concluida" ? "disponivel" : "manutencao";
    await updateDoc(doc(window.firebaseDb, colecaoEquipamento, equipamentoId), {
      status: statusEquipamento,
      atualizadoEm: serverTimestamp(),
    });

    fecharModalManutencao();
    await renderManutencoes();
  } catch (erroFirebase) {
    console.error("Erro ao salvar manutenção:", erroFirebase);
    erro.textContent = "Não foi possível salvar. Verifique sua conexão e tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}
