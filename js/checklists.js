// =========================================================
// CHECKLISTS
// ---------------------------------------------------------
// Inspeção de equipamento antes/durante o uso. Pode ser feita
// avulsa (Frota → Checklists) ou de dentro do Apontamento
// Diário (função compartilhada abrirPreenchimentoChecklist).
//
// Os itens do checklist são definidos em Cadastros Gerais →
// Itens de Checklist, cada um vinculado a um Tipo de
// Equipamento — então uma escavadeira vê itens diferentes de
// um caminhão, automaticamente, pelo tipo cadastrado nela.
//
// Guardado em: checklists/{autoId}
// =========================================================

let checklistEquipamentos = [];
let checklistItensCadastro = [];
let checklistHistorico = [];
let checklistBusca = "";
let checklistBaseCarregada = false;

function escChk(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function normChk(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmtDataChk(dataIso) {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function verificarFirebaseChk() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não está pronto. Recarregue a página.");
  }
}

/* =========================================================
   CARREGAMENTO
   ========================================================= */

async function carregarBaseChecklists() {
  verificarFirebaseChk();
  const { collection, getDocs } = window.fs;

  const [snapMaquinas, snapCaminhoes, snapItens, snapHist] = await Promise.all([
    getDocs(collection(window.firebaseDb, "maquinas")),
    getDocs(collection(window.firebaseDb, "caminhoes")),
    getDocs(collection(window.firebaseDb, "cadastros_checklist_itens")),
    getDocs(collection(window.firebaseDb, "checklists")),
  ]);

  checklistEquipamentos = [];
  const juntar = (snap, colecao, campoIdent, categoriaRotulo) => {
    snap.forEach((d) => {
      const dados = d.data();
      if (dados.ativo === false) return;
      checklistEquipamentos.push({
        id: d.id,
        colecao,
        categoriaRotulo,
        nome: dados.nome || "Sem nome",
        identificacao: dados[campoIdent] || "—",
        fotoUrl: dados.fotoUrl || null,
        tipoEquipamentoId: dados.tipoEquipamentoId || null,
      });
    });
  };
  juntar(snapMaquinas, "maquinas", "identificador", "Máquina");
  juntar(snapCaminhoes, "caminhoes", "placa", "Caminhão");
  checklistEquipamentos.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  checklistItensCadastro = [];
  snapItens.forEach((d) => {
    const dados = d.data();
    if (dados.ativo === false) return;
    checklistItensCadastro.push({ id: d.id, ...dados });
  });
  checklistItensCadastro.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));

  checklistHistorico = [];
  snapHist.forEach((d) => checklistHistorico.push({ id: d.id, ...d.data() }));
  checklistHistorico.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  checklistBaseCarregada = true;
  atualizarAlertaChecklists();
}

function itensDoTipo(tipoEquipamentoId) {
  return checklistItensCadastro.filter((i) => Array.isArray(i.tipoEquipamentoIds) && i.tipoEquipamentoIds.includes(tipoEquipamentoId));
}

function atualizarAlertaChecklists() {
  // Conta equipamentos cujo checklist MAIS RECENTE encontrou algum
  // item marcado como "Problema" — mesmo espírito do alerta de
  // Manutenções/Documentos: "isso precisa da sua atenção".
  const maisRecentePorEquip = {};
  checklistHistorico.forEach((c) => {
    const chave = `${c.colecaoEquipamento}:${c.equipamentoId}`;
    if (!maisRecentePorEquip[chave] || String(c.data) > String(maisRecentePorEquip[chave].data)) {
      maisRecentePorEquip[chave] = c;
    }
  });
  const contagem = Object.values(maisRecentePorEquip).filter((c) => c.statusGeral === "atencao").length;
  if (typeof window.atualizarContadorNavegacao === "function") {
    window.atualizarContadorNavegacao("alertaChecklists", contagem);
  }
}

/* =========================================================
   ENTRADA DO MÓDULO (Frota → Checklists)
   ========================================================= */

async function renderChecklists() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <div class="em-construcao">
      <div class="loading-spinner"></div>
      <p>Carregando checklists...</p>
    </div>
  `;

  try {
    await carregarBaseChecklists();
    renderTelaChecklists();
  } catch (erro) {
    console.error("Erro ao carregar checklists:", erro);
    area.innerHTML = `
      <div class="em-construcao estado-erro">
        <h3>Não foi possível carregar</h3>
        <p class="etapa">Verifique sua conexão com a internet e tente novamente.</p>
        <button type="button" class="btn-primario" id="btnTentarChk">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btnTentarChk")?.addEventListener("click", renderChecklists);
  }
}
window.renderChecklists = renderChecklists;

function renderTelaChecklists() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  checklistBusca = "";
  const hoje = new Date().toISOString().slice(0, 10);
  const feitosHoje = checklistHistorico.filter((c) => c.data === hoje).length;
  const comProblema = checklistHistorico.filter((c) => c.data === hoje && c.statusGeral === "atencao").length;

  area.innerHTML = `
    <section class="painel-cadastro">
      <div class="grid-indicadores">
        ${renderCardResumoChk("Hoje", feitosHoje, "Checklists feitos hoje", "tipo-frota")}
        ${renderCardResumoChk("Com problema", comProblema, "Encontraram algo hoje", comProblema > 0 ? "tipo-atencao" : "tipo-frota")}
      </div>

      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="search" id="buscaChk" placeholder="Buscar por equipamento...">
        </div>
        <button type="button" class="btn-primario" id="btnNovoChecklist">+ Novo checklist</button>
      </div>
      <div id="listaChkWrap"></div>
    </section>
  `;

  document.getElementById("btnNovoChecklist")?.addEventListener("click", iniciarNovoChecklistAvulso);
  document.getElementById("buscaChk")?.addEventListener("input", (e) => {
    checklistBusca = normChk(e.target.value);
    renderizarListaChecklists();
  });

  renderizarListaChecklists();
}

function renderCardResumoChk(rotulo, valor, sub, classe) {
  return `
    <article class="card-indicador ${classe}">
      <div class="topo"><span class="eyebrow">${rotulo}</span></div>
      <div class="valor">${valor}</div>
      <div class="rotulo">${sub}</div>
    </article>`;
}

function renderizarListaChecklists() {
  const wrap = document.getElementById("listaChkWrap");
  if (!wrap) return;

  let itens = checklistHistorico;
  if (checklistBusca) {
    itens = itens.filter((c) => normChk(`${c.equipamentoNome} ${c.identificacao}`).includes(checklistBusca));
  }
  itens = itens.slice(0, 60); // histórico recente — evita lista infinita

  if (itens.length === 0) {
    wrap.innerHTML = `<div class="cadastro-vazio">Nenhum checklist registrado ainda.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="grid-obras">
      ${itens.map((c) => `
        <div class="card-obra">
          <div class="card-obra-topo">
            <span class="badge ${c.statusGeral === "atencao" ? "atencao" : "ativa"}">${c.statusGeral === "atencao" ? "Com problema" : "Tudo certo"}</span>
          </div>
          <h3>${escChk(c.equipamentoNome)} · ${escChk(c.identificacao)}</h3>
          <p class="card-obra-info">${fmtDataChk(c.data)}${c.realizadoPor ? " · " + escChk(c.realizadoPor) : ""}</p>
          <button type="button" class="btn-secundario" data-ver-chk="${escChk(c.id)}" style="width:100%; margin-top:8px;">Ver detalhes</button>
        </div>
      `).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-ver-chk]").forEach((b) => b.addEventListener("click", () => verDetalhesChecklist(b.dataset.verChk)));
}

/* =========================================================
   NOVO CHECKLIST AVULSO — escolhe equipamento primeiro
   ========================================================= */

function iniciarNovoChecklistAvulso() {
  if (typeof window.abrirSeletorEquipamentoVisual !== "function") {
    alert("O seletor de equipamento ainda não carregou. Recarregue a página.");
    return;
  }
  window.abrirSeletorEquipamentoVisual(checklistEquipamentos, (equip) => {
    abrirPreenchimentoChecklist(equip.id, equip.colecao, () => {
      carregarBaseChecklists().then(renderizarListaChecklists);
    });
  });
}

// Ponto de entrada compartilhado — pode ser chamado de qualquer
// módulo (Apontamento Diário, por exemplo) já sabendo o equipamento,
// sem passar pelo seletor visual de novo.
window.abrirPreenchimentoChecklist = async function (equipamentoId, colecaoEquipamento, onSalvo) {
  if (!checklistBaseCarregada) {
    try {
      await carregarBaseChecklists();
    } catch (erro) {
      console.error("Erro ao carregar base de checklists:", erro);
      alert("Não foi possível carregar os dados do checklist. Verifique sua conexão e tente novamente.");
      return;
    }
  }

  const equip = checklistEquipamentos.find((e) => e.id === equipamentoId && e.colecao === colecaoEquipamento);
  if (!equip) {
    alert("Equipamento não encontrado. Recarregue a página e tente de novo.");
    return;
  }
  const itens = itensDoTipo(equip.tipoEquipamentoId);
  if (itens.length === 0) {
    alert(`Nenhum item de checklist cadastrado para o tipo desse equipamento ainda.\nCadastra em: Cadastros → Itens de Checklist.`);
    return;
  }

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro">
        <div class="modal-cabecalho">
          <h3>Checklist — ${escChk(equip.nome)} · ${escChk(equip.identificacao)}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModalChk">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <form id="formChecklist">
          <div class="campo">
            <label>Realizado por (opcional)</label>
            <input type="text" id="chkRealizadoPor" placeholder="Nome de quem está fazendo a inspeção">
          </div>
          <div class="lista-itens-checklist">
            ${itens.map((item) => `
              <div class="linha-item-checklist">
                <strong>${escChk(item.nome)}</strong>
                <div class="opcoes-item-checklist">
                  <label><input type="radio" name="item_${item.id}" value="ok" checked> OK</label>
                  <label><input type="radio" name="item_${item.id}" value="problema"> Problema</label>
                  <label><input type="radio" name="item_${item.id}" value="na"> N/A</label>
                </div>
                <input type="text" class="obs-item-checklist" data-obs-item="${escChk(item.id)}" placeholder="Observação (opcional)">
              </div>
            `).join("")}
          </div>
          <div class="modal-erro" id="modalErroChk"></div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarModalChk">Cancelar</button>
            <button type="submit" class="btn-primario">Salvar checklist</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharModalChk").addEventListener("click", () => document.getElementById("modalOverlay")?.remove());
  document.getElementById("btnCancelarModalChk").addEventListener("click", () => document.getElementById("modalOverlay")?.remove());
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") document.getElementById("modalOverlay")?.remove();
  });
  document.getElementById("formChecklist").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarChecklist(equip, itens, onSalvo);
  });
};

async function salvarChecklist(equip, itensDefinidos, onSalvo) {
  const erro = document.getElementById("modalErroChk");
  erro.textContent = "";

  const realizadoPor = document.getElementById("chkRealizadoPor").value.trim() || null;
  const itensRespondidos = itensDefinidos.map((item) => {
    const radioSelecionado = document.querySelector(`input[name="item_${item.id}"]:checked`);
    const observacao = document.querySelector(`[data-obs-item="${item.id}"]`)?.value.trim() || null;
    return {
      itemId: item.id,
      nome: item.nome,
      status: radioSelecionado ? radioSelecionado.value : "ok",
      observacao,
    };
  });

  const statusGeral = itensRespondidos.some((i) => i.status === "problema") ? "atencao" : "ok";

  const botao = document.querySelector("#formChecklist button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    verificarFirebaseChk();
    const { collection, addDoc, serverTimestamp } = window.fs;
    await addDoc(collection(window.firebaseDb, "checklists"), {
      equipamentoId: equip.id,
      colecaoEquipamento: equip.colecao,
      equipamentoNome: equip.nome,
      identificacao: equip.identificacao,
      categoriaRotulo: equip.categoriaRotulo,
      data: new Date().toISOString().slice(0, 10),
      realizadoPor,
      itens: itensRespondidos,
      statusGeral,
      criadoEm: serverTimestamp(),
    });

    document.getElementById("modalOverlay")?.remove();
    if (typeof onSalvo === "function") onSalvo();
  } catch (erroFirebase) {
    console.error("Erro ao salvar checklist:", erroFirebase);
    erro.textContent = "Não foi possível salvar. Verifique sua conexão e tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar checklist";
  }
}

/* =========================================================
   VER DETALHES DE UM CHECKLIST JÁ FEITO
   ========================================================= */

function verDetalhesChecklist(id) {
  const registro = checklistHistorico.find((c) => c.id === id);
  if (!registro) return;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro">
        <div class="modal-cabecalho">
          <h3>${escChk(registro.equipamentoNome)} · ${fmtDataChk(registro.data)}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharDetalheChk">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <p class="doc-data" style="margin-bottom:12px;">${registro.realizadoPor ? "Realizado por " + escChk(registro.realizadoPor) : "Sem responsável informado"}</p>
        <div class="lista-itens-checklist">
          ${(registro.itens || []).map((item) => `
            <div class="linha-item-checklist linha-item-checklist-leitura">
              <strong>${escChk(item.nome)}</strong>
              <span class="badge ${item.status === "problema" ? "atencao" : item.status === "na" ? "" : "ativa"}">${item.status === "problema" ? "Problema" : item.status === "na" ? "N/A" : "OK"}</span>
              ${item.observacao ? `<p class="card-obra-info" style="margin-top:4px;">${escChk(item.observacao)}</p>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn-primario" id="btnFecharDetalheChk2">Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharDetalheChk").addEventListener("click", () => document.getElementById("modalOverlay")?.remove());
  document.getElementById("btnFecharDetalheChk2").addEventListener("click", () => document.getElementById("modalOverlay")?.remove());
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") document.getElementById("modalOverlay")?.remove();
  });
}
