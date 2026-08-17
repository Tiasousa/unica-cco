// =========================================================
// MATERIAIS
// ---------------------------------------------------------
// Catálogo de materiais (cimento, brita, areia, cal etc.) com
// controle de estoque de verdade: cada material guarda um saldo
// atual (estoqueAtual), atualizado por movimentações de entrada
// (compra) e saída (uso — opcionalmente vinculado a uma Obra).
// Estoque abaixo do mínimo cadastrado entra no alerta do
// sininho, mesmo padrão de Manutenções/Checklists/Documentos.
//
// Guardado em:
//   cadastros_materiais/{id}                        — catálogo
//   cadastros_materiais/{id}/movimentacoes/{autoId}  — histórico
// =========================================================

const UNIDADES_MATERIAL = ["m³", "ton", "kg", "saco", "m²", "m", "un", "L"];

let materiaisCache = [];
let obrasParaMateriaisCache = [];
let materiaisBusca = "";
let materiaisMostrarInativos = false;

function escMat(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function normMat(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmtNumMat(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function fmtDataMat(dataIso) {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function verificarFirebaseMat() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não está pronto. Recarregue a página.");
  }
}

/* =========================================================
   CARREGAMENTO
   ========================================================= */

async function carregarMateriais() {
  verificarFirebaseMat();
  const { collection, getDocs } = window.fs;

  const [snapMat, snapObras] = await Promise.all([
    getDocs(collection(window.firebaseDb, "cadastros_materiais")),
    getDocs(collection(window.firebaseDb, "obras")),
  ]);

  materiaisCache = [];
  snapMat.forEach((d) => materiaisCache.push({ id: d.id, ...d.data() }));
  materiaisCache.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  obrasParaMateriaisCache = [];
  snapObras.forEach((d) => {
    const dados = d.data();
    if (dados.ativo === false) return;
    obrasParaMateriaisCache.push({ id: d.id, nome: dados.nome || "Sem nome" });
  });
  obrasParaMateriaisCache.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  atualizarAlertaMateriais();
}

function estoqueBaixo(material) {
  const atual = Number(material.estoqueAtual) || 0;
  const minimo = Number(material.estoqueMinimo) || 0;
  return minimo > 0 && atual <= minimo;
}

function atualizarAlertaMateriais() {
  const contagem = materiaisCache.filter((m) => m.ativo !== false && estoqueBaixo(m)).length;
  if (typeof window.atualizarContadorNavegacao === "function") {
    window.atualizarContadorNavegacao("alertaMateriais", contagem);
  }
}

/* =========================================================
   ENTRADA DO MÓDULO
   ========================================================= */

async function renderMateriais() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <div class="em-construcao">
      <div class="loading-spinner"></div>
      <p>Carregando materiais...</p>
    </div>
  `;

  try {
    await carregarMateriais();
    renderTelaMateriais();
  } catch (erro) {
    console.error("Erro ao carregar materiais:", erro);
    area.innerHTML = `
      <div class="em-construcao estado-erro">
        <h3>Não foi possível carregar</h3>
        <p class="etapa">Verifique sua conexão com a internet e tente novamente.</p>
        <button type="button" class="btn-primario" id="btnTentarMat">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btnTentarMat")?.addEventListener("click", renderMateriais);
  }
}
window.renderMateriais = renderMateriais;

function renderTelaMateriais() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  materiaisBusca = "";
  materiaisMostrarInativos = false;

  const totalMateriais = materiaisCache.filter((m) => m.ativo !== false).length;
  const baixoEstoque = materiaisCache.filter((m) => m.ativo !== false && estoqueBaixo(m)).length;

  area.innerHTML = `
    <section class="painel-cadastro">
      <div class="grid-indicadores">
        ${renderCardResumoMat("Total", totalMateriais, "Materiais cadastrados", "tipo-frota")}
        ${renderCardResumoMat("Estoque baixo", baixoEstoque, "Precisam de reposição", baixoEstoque > 0 ? "tipo-atencao" : "tipo-frota")}
      </div>

      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="search" id="buscaMat" placeholder="Buscar material...">
        </div>
        <label class="check-inativos">
          <input type="checkbox" id="mostrarMatInativos"> Mostrar desativados
        </label>
        <button type="button" class="btn-primario" id="btnNovoMaterial">+ Novo material</button>
      </div>
      <div id="listaMatWrap"></div>
    </section>
  `;

  document.getElementById("btnNovoMaterial")?.addEventListener("click", () => abrirModalMaterial(null));
  document.getElementById("buscaMat")?.addEventListener("input", (e) => {
    materiaisBusca = normMat(e.target.value);
    renderizarListaMateriais();
  });
  document.getElementById("mostrarMatInativos")?.addEventListener("change", (e) => {
    materiaisMostrarInativos = e.target.checked;
    renderizarListaMateriais();
  });

  renderizarListaMateriais();
}

function renderCardResumoMat(rotulo, valor, sub, classe) {
  return `
    <article class="card-indicador ${classe}">
      <div class="topo"><span class="eyebrow">${rotulo}</span></div>
      <div class="valor">${valor}</div>
      <div class="rotulo">${sub}</div>
    </article>`;
}

function renderizarListaMateriais() {
  const wrap = document.getElementById("listaMatWrap");
  if (!wrap) return;

  let itens = materiaisCache;
  if (!materiaisMostrarInativos) itens = itens.filter((m) => m.ativo !== false);
  if (materiaisBusca) itens = itens.filter((m) => normMat(m.nome).includes(materiaisBusca));

  if (itens.length === 0) {
    wrap.innerHTML = `<div class="cadastro-vazio">Nenhum material encontrado.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="grid-obras">
      ${itens.map((m) => {
        const baixo = estoqueBaixo(m);
        return `
        <div class="card-obra${m.ativo === false ? " card-obra-inativa" : ""}">
          <div class="card-obra-topo">
            <span class="badge ${m.ativo === false ? "parada" : (baixo ? "atencao" : "ativa")}">${m.ativo === false ? "Desativado" : (baixo ? "Estoque baixo" : "Em estoque")}</span>
            <div class="celula-acoes">
              <button class="btn-icone" title="Editar" data-editar-mat="${escMat(m.id)}">${typeof iconeLapis === "function" ? iconeLapis() : "✎"}</button>
              ${m.ativo === false
                ? `<button class="btn-icone" title="Reativar" data-reativar-mat="${escMat(m.id)}">${typeof iconeCheck === "function" ? iconeCheck() : "✓"}</button>`
                : `<button class="btn-icone" title="Desativar" data-desativar-mat="${escMat(m.id)}">${typeof iconeX === "function" ? iconeX() : "×"}</button>`}
            </div>
          </div>
          <h3>${escMat(m.nome)}</h3>
          <p class="card-obra-info">Mínimo: ${fmtNumMat(m.estoqueMinimo)} ${escMat(m.unidadeMedida)}</p>
          <div class="mat-saldo">
            <strong>${fmtNumMat(m.estoqueAtual)}</strong>
            <span>${escMat(m.unidadeMedida)}</span>
          </div>
          <div class="mat-acoes-rapidas">
            <button type="button" class="btn-secundario" data-mov-mat="entrada:${escMat(m.id)}">+ Entrada</button>
            <button type="button" class="btn-secundario" data-mov-mat="saida:${escMat(m.id)}">− Saída</button>
            <button type="button" class="btn-icone" title="Histórico" data-historico-mat="${escMat(m.id)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/></svg>
            </button>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-editar-mat]").forEach((b) => b.addEventListener("click", () => abrirModalMaterial(b.dataset.editarMat)));
  wrap.querySelectorAll("[data-desativar-mat]").forEach((b) => b.addEventListener("click", () => alternarAtivoMaterial(b.dataset.desativarMat, false)));
  wrap.querySelectorAll("[data-reativar-mat]").forEach((b) => b.addEventListener("click", () => alternarAtivoMaterial(b.dataset.reativarMat, true)));
  wrap.querySelectorAll("[data-mov-mat]").forEach((b) => {
    b.addEventListener("click", () => {
      const [tipo, id] = b.dataset.movMat.split(":");
      abrirModalMovimentacao(tipo, id);
    });
  });
  wrap.querySelectorAll("[data-historico-mat]").forEach((b) => b.addEventListener("click", () => abrirHistoricoMaterial(b.dataset.historicoMat)));
}

async function alternarAtivoMaterial(id, novoValor) {
  const acao = novoValor ? "reativar" : "desativar";
  if (!confirm(`Tem certeza que deseja ${acao} este material?`)) return;
  try {
    verificarFirebaseMat();
    const { doc, updateDoc, serverTimestamp } = window.fs;
    await updateDoc(doc(window.firebaseDb, "cadastros_materiais", id), { ativo: novoValor, atualizadoEm: serverTimestamp() });
    await carregarMateriais();
    renderizarListaMateriais();
  } catch (erro) {
    console.error("Erro ao atualizar material:", erro);
    alert("Não foi possível atualizar. Tente novamente.");
  }
}

/* =========================================================
   MODAL DE CADASTRO/EDIÇÃO DO MATERIAL
   ========================================================= */

function fecharModalMat() {
  document.getElementById("modalOverlay")?.remove();
}

function abrirModalMaterial(id) {
  const dados = id ? materiaisCache.find((m) => m.id === id) : null;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro">
        <div class="modal-cabecalho">
          <h3>${dados ? "Editar" : "Novo"} material</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModalMat">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <form id="formMaterial">
          <div class="campo">
            <label>Nome *</label>
            <input type="text" id="matNome" value="${escMat(dados?.nome || "")}" required>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Unidade de medida</label>
              <select id="matUnidade">
                ${UNIDADES_MATERIAL.map((u) => `<option value="${u}" ${dados?.unidadeMedida === u ? "selected" : ""}>${u}</option>`).join("")}
              </select>
            </div>
            <div class="campo">
              <label>Estoque mínimo</label>
              <input type="number" step="0.01" min="0" id="matEstoqueMinimo" value="${dados?.estoqueMinimo ?? ""}">
            </div>
          </div>
          ${!dados ? `
          <div class="campo">
            <label>Estoque inicial</label>
            <input type="number" step="0.01" min="0" id="matEstoqueInicial" value="0">
          </div>` : ""}
          <div class="modal-erro" id="modalErroMat"></div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarModalMat">Cancelar</button>
            <button type="submit" class="btn-primario">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharModalMat").addEventListener("click", fecharModalMat);
  document.getElementById("btnCancelarModalMat").addEventListener("click", fecharModalMat);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") fecharModalMat();
  });
  document.getElementById("formMaterial").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarMaterial(id);
  });
}

async function salvarMaterial(idExistente) {
  const erro = document.getElementById("modalErroMat");
  erro.textContent = "";

  const nome = document.getElementById("matNome").value.trim();
  if (!nome) {
    erro.textContent = "Informe o nome do material.";
    return;
  }
  const unidadeMedida = document.getElementById("matUnidade").value;
  const estoqueMinimo = Number(document.getElementById("matEstoqueMinimo").value) || 0;

  const botao = document.querySelector("#formMaterial button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    verificarFirebaseMat();
    const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;

    if (idExistente) {
      await updateDoc(doc(window.firebaseDb, "cadastros_materiais", idExistente), {
        nome, unidadeMedida, estoqueMinimo, atualizadoEm: serverTimestamp(),
      });
    } else {
      const estoqueInicial = Number(document.getElementById("matEstoqueInicial").value) || 0;
      await addDoc(collection(window.firebaseDb, "cadastros_materiais"), {
        nome, unidadeMedida, estoqueMinimo,
        estoqueAtual: estoqueInicial,
        ativo: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    }

    fecharModalMat();
    await carregarMateriais();
    renderizarListaMateriais();
  } catch (erroFirebase) {
    console.error("Erro ao salvar material:", erroFirebase);
    erro.textContent = "Não foi possível salvar. Verifique sua conexão e tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}

/* =========================================================
   MODAL DE MOVIMENTAÇÃO (entrada / saída)
   ========================================================= */

function abrirModalMovimentacao(tipo, materialId) {
  const material = materiaisCache.find((m) => m.id === materialId);
  if (!material) return;
  const ehSaida = tipo === "saida";

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro">
        <div class="modal-cabecalho">
          <h3>${ehSaida ? "Saída" : "Entrada"} — ${escMat(material.nome)}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModalMov">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <form id="formMovimentacao">
          <p class="doc-data" style="margin-bottom:10px;">Saldo atual: <strong>${fmtNumMat(material.estoqueAtual)} ${escMat(material.unidadeMedida)}</strong></p>
          <div class="linha-campos">
            <div class="campo">
              <label>Quantidade (${escMat(material.unidadeMedida)}) *</label>
              <input type="number" step="0.01" min="0.01" id="movQuantidade" required>
            </div>
            <div class="campo">
              <label>Data</label>
              <input type="date" id="movData" value="${new Date().toISOString().slice(0, 10)}">
            </div>
          </div>
          ${ehSaida ? `
          <div class="campo">
            <label>Obra (opcional)</label>
            <select id="movObra">
              <option value="">Não vincular a uma obra</option>
              ${obrasParaMateriaisCache.map((o) => `<option value="${escMat(o.id)}">${escMat(o.nome)}</option>`).join("")}
            </select>
          </div>` : ""}
          <div class="campo">
            <label>Observação</label>
            <input type="text" id="movObservacao" placeholder="Opcional">
          </div>
          <div class="modal-erro" id="modalErroMov"></div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarModalMov">Cancelar</button>
            <button type="submit" class="btn-primario">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharModalMov").addEventListener("click", fecharModalMat);
  document.getElementById("btnCancelarModalMov").addEventListener("click", fecharModalMat);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") fecharModalMat();
  });
  document.getElementById("formMovimentacao").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarMovimentacao(tipo, materialId);
  });
}

async function salvarMovimentacao(tipo, materialId) {
  const erro = document.getElementById("modalErroMov");
  erro.textContent = "";

  const quantidade = Number(document.getElementById("movQuantidade").value);
  if (!quantidade || quantidade <= 0) {
    erro.textContent = "Informe uma quantidade válida.";
    return;
  }
  const material = materiaisCache.find((m) => m.id === materialId);
  const saldoAtual = Number(material.estoqueAtual) || 0;

  if (tipo === "saida" && quantidade > saldoAtual) {
    const confirmar = confirm(
      `Isso deixaria o saldo negativo (${fmtNumMat(saldoAtual)} disponível, tentando tirar ${fmtNumMat(quantidade)}). Quer registrar mesmo assim? Pode ser que o estoque físico esteja desatualizado no sistema.`
    );
    if (!confirmar) return;
  }

  const data = document.getElementById("movData").value || null;
  const obraId = tipo === "saida" ? document.getElementById("movObra")?.value || null : null;
  const obra = obraId ? obrasParaMateriaisCache.find((o) => o.id === obraId) : null;
  const observacao = document.getElementById("movObservacao").value.trim() || null;

  const botao = document.querySelector("#formMovimentacao button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    verificarFirebaseMat();
    const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;

    await addDoc(collection(window.firebaseDb, "cadastros_materiais", materialId, "movimentacoes"), {
      tipo, quantidade, data, obraId, obraNome: obra?.nome || null, observacao,
      criadoEm: serverTimestamp(),
    });

    const novoSaldo = tipo === "entrada" ? saldoAtual + quantidade : saldoAtual - quantidade;
    await updateDoc(doc(window.firebaseDb, "cadastros_materiais", materialId), {
      estoqueAtual: novoSaldo,
      atualizadoEm: serverTimestamp(),
    });

    fecharModalMat();
    await carregarMateriais();
    renderizarListaMateriais();
  } catch (erroFirebase) {
    console.error("Erro ao registrar movimentação:", erroFirebase);
    erro.textContent = "Não foi possível salvar. Tente novamente.";
    botao.disabled = false;
    botao.textContent = "Registrar";
  }
}

/* =========================================================
   HISTÓRICO
   ========================================================= */

async function abrirHistoricoMaterial(materialId) {
  const material = materiaisCache.find((m) => m.id === materialId);
  if (!material) return;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro modal-largo">
        <div class="modal-cabecalho">
          <h3>Histórico — ${escMat(material.nome)}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModalHist">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <div id="listaHistoricoMat"><p class="doc-carregando">Carregando...</p></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharModalHist").addEventListener("click", fecharModalMat);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") fecharModalMat();
  });

  try {
    verificarFirebaseMat();
    const { collection, getDocs } = window.fs;
    const snap = await getDocs(collection(window.firebaseDb, "cadastros_materiais", materialId, "movimentacoes"));
    const itens = [];
    snap.forEach((d) => itens.push({ id: d.id, ...d.data() }));
    itens.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

    const wrap = document.getElementById("listaHistoricoMat");
    if (!wrap) return;

    if (itens.length === 0) {
      wrap.innerHTML = `<p class="doc-vazio">Nenhuma movimentação registrada ainda.</p>`;
      return;
    }

    wrap.innerHTML = `
      <div class="lista-vales">
        ${itens.map((m) => `
          <div class="linha-holerite">
            <div class="linha-doc-info">
              <strong>${m.tipo === "entrada" ? "+ Entrada" : "− Saída"} · ${fmtNumMat(m.quantidade)} ${escMat(material.unidadeMedida)}</strong>
              <span class="doc-data">${fmtDataMat(m.data)}${m.obraNome ? " · " + escMat(m.obraNome) : ""}${m.observacao ? " · " + escMat(m.observacao) : ""}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);
    const wrap = document.getElementById("listaHistoricoMat");
    if (wrap) wrap.innerHTML = `<p class="doc-erro">Não foi possível carregar o histórico.</p>`;
  }
}
