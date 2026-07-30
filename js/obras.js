/* =========================================================
   OBRAS
   ---------------------------------------------------------
   Reaproveita helpers já existentes em cadastros.js (iconeX,
   iconeLapis, fecharModalCadastro) — por isso este script
   precisa carregar DEPOIS de cadastros.js no app.html.
   ========================================================= */

const STATUS_OBRA = [
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "atencao", rotulo: "Atenção" },
  { valor: "parada", rotulo: "Parada" },
  { valor: "concluida", rotulo: "Concluída" },
];

let obrasFiltro = { status: "todas", busca: "" };
let obrasCache = [];
let cacheResponsaveis = null;

async function obterResponsaveis() {
  if (cacheResponsaveis) return cacheResponsaveis;
  const { collection, getDocs } = window.fs;
  const snap = await getDocs(collection(window.firebaseDb, "usuarios"));
  const lista = [];
  snap.forEach(d => {
    const dados = d.data();
    if (dados.ativo === false) return;
    lista.push({ id: d.id, nome: dados.nome });
  });
  cacheResponsaveis = lista;
  return lista;
}

function badgeClasseObra(status) {
  if (["ativa", "atencao", "parada", "concluida"].includes(status)) return status;
  return "ativa";
}
function rotuloStatusObra(status) {
  return STATUS_OBRA.find(s => s.valor === status)?.rotulo || "Ativa";
}
function formatarDataObra(valor) {
  if (!valor) return "";
  try {
    const d = new Date(valor + "T00:00:00");
    return d.toLocaleDateString("pt-BR");
  } catch {
    return valor;
  }
}

async function renderObras() {
  const el = document.getElementById("areaPagina");

  el.innerHTML = `
    <div class="painel-cadastro">
      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="text" id="buscaObras" placeholder="Buscar por nome, cliente ou cidade...">
        </div>
        <div class="filtro-status" id="filtroStatusObras">
          <button type="button" class="chip-status ativo" data-status="todas">Todas</button>
          <button type="button" class="chip-status" data-status="ativa">Ativas</button>
          <button type="button" class="chip-status" data-status="atencao">Atenção</button>
          <button type="button" class="chip-status" data-status="parada">Paradas</button>
          <button type="button" class="chip-status" data-status="concluida">Concluídas</button>
        </div>
        <button class="btn-primario" id="btnAdicionarObra">+ Adicionar obra</button>
      </div>
      <div id="listaObrasWrap">
        <p class="cadastro-carregando">Carregando...</p>
      </div>
    </div>
  `;

  document.getElementById("btnAdicionarObra").addEventListener("click", () => abrirModalObra(null));
  document.getElementById("buscaObras").addEventListener("input", (e) => {
    obrasFiltro.busca = e.target.value.toLowerCase();
    renderizarListaObras();
  });
  document.querySelectorAll("#filtroStatusObras .chip-status").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#filtroStatusObras .chip-status").forEach(c => c.classList.remove("ativo"));
      chip.classList.add("ativo");
      obrasFiltro.status = chip.dataset.status;
      renderizarListaObras();
    });
  });

  obrasFiltro = { status: "todas", busca: "" };
  await carregarObras();
}

async function carregarObras() {
  const wrap = document.getElementById("listaObrasWrap");
  wrap.innerHTML = `<p class="cadastro-carregando">Carregando...</p>`;

  try {
    const { collection, getDocs } = window.fs;
    const snap = await getDocs(collection(window.firebaseDb, "obras"));
    obrasCache = [];
    snap.forEach(d => obrasCache.push({ id: d.id, ...d.data() }));

    const responsaveis = await obterResponsaveis();
    const mapaResp = Object.fromEntries(responsaveis.map(r => [r.id, r.nome]));
    obrasCache.forEach(o => { o._responsavelNome = mapaResp[o.responsavelId] || "—"; });

    obrasCache.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
    renderizarListaObras();
  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<p class="cadastro-erro">Não foi possível carregar as obras. Verifique sua conexão e tente novamente.</p>`;
  }
}

function renderizarListaObras() {
  const wrap = document.getElementById("listaObrasWrap");
  let itens = obrasCache;

  if (obrasFiltro.status !== "todas") itens = itens.filter(o => o.status === obrasFiltro.status);
  if (obrasFiltro.busca) {
    itens = itens.filter(o =>
      String(o.nome || "").toLowerCase().includes(obrasFiltro.busca) ||
      String(o.cliente || "").toLowerCase().includes(obrasFiltro.busca) ||
      String(o.cidade || "").toLowerCase().includes(obrasFiltro.busca)
    );
  }

  if (itens.length === 0) {
    wrap.innerHTML = `<p class="cadastro-vazio">Nenhuma obra encontrada.</p>`;
    return;
  }

  wrap.innerHTML = `
    <div class="grid-obras">
      ${itens.map(o => `
        <div class="card-obra">
          <div class="card-obra-topo">
            <span class="badge ${badgeClasseObra(o.status)}">${rotuloStatusObra(o.status)}</span>
            <button class="btn-icone" title="Editar" data-editar-obra="${o.id}">${iconeLapis()}</button>
          </div>
          <h3>${o.nome || "Sem nome"}</h3>
          <p class="card-obra-info">${o.cliente ? o.cliente + " · " : ""}${o.cidade || "—"}</p>
          <div class="card-obra-rodape">
            <span>${o._responsavelNome}</span>
            <span>${formatarDataObra(o.dataInicio)}${o.previsaoTermino ? " → " + formatarDataObra(o.previsaoTermino) : ""}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-editar-obra]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalObra(btn.dataset.editarObra));
  });
}

async function abrirModalObra(id) {
  const dados = id ? obrasCache.find(o => o.id === id) : null;
  const responsaveis = await obterResponsaveis();

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro modal-obra">
        <div class="modal-cabecalho">
          <h3>${dados ? "Editar obra" : "Adicionar obra"}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModal">${iconeX()}</button>
        </div>
        <form id="formObra">
          <div class="campo">
            <label>Nome da obra *</label>
            <input type="text" id="obraNome" value="${dados?.nome || ""}" required>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Cliente</label>
              <input type="text" id="obraCliente" value="${dados?.cliente || ""}">
            </div>
            <div class="campo">
              <label>Cidade</label>
              <input type="text" id="obraCidade" value="${dados?.cidade || ""}">
            </div>
          </div>
          <div class="campo">
            <label>Endereço</label>
            <input type="text" id="obraEndereco" value="${dados?.endereco || ""}">
          </div>
          <div class="campo">
            <label>Responsável</label>
            <select id="obraResponsavel">
              <option value="">Nenhum</option>
              ${responsaveis.map(r => `<option value="${r.id}" ${r.id === dados?.responsavelId ? "selected" : ""}>${r.nome}</option>`).join("")}
            </select>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Data de início</label>
              <input type="date" id="obraInicio" value="${dados?.dataInicio || ""}">
            </div>
            <div class="campo">
              <label>Previsão de término</label>
              <input type="date" id="obraTermino" value="${dados?.previsaoTermino || ""}">
            </div>
          </div>
          <div class="campo">
            <label>Status</label>
            <select id="obraStatus">
              ${STATUS_OBRA.map(s => `<option value="${s.valor}" ${(dados?.status || "ativa") === s.valor ? "selected" : ""}>${s.rotulo}</option>`).join("")}
            </select>
          </div>
          <div class="campo">
            <label>Observações</label>
            <textarea id="obraObservacoes" rows="3">${dados?.observacoes || ""}</textarea>
          </div>
          <div class="modal-erro" id="modalErro"></div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarModal">Cancelar</button>
            <button type="submit" class="btn-primario">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("btnFecharModal").addEventListener("click", fecharModalCadastro);
  document.getElementById("btnCancelarModal").addEventListener("click", fecharModalCadastro);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") fecharModalCadastro();
  });
  document.getElementById("formObra").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarObra(id);
  });
}

async function salvarObra(idExistente) {
  const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;
  const erro = document.getElementById("modalErro");
  erro.textContent = "";

  const nome = document.getElementById("obraNome").value.trim();
  if (!nome) {
    erro.textContent = 'Preencha o campo "Nome da obra".';
    return;
  }

  const dados = {
    nome,
    cliente: document.getElementById("obraCliente").value.trim(),
    cidade: document.getElementById("obraCidade").value.trim(),
    endereco: document.getElementById("obraEndereco").value.trim(),
    responsavelId: document.getElementById("obraResponsavel").value,
    dataInicio: document.getElementById("obraInicio").value,
    previsaoTermino: document.getElementById("obraTermino").value,
    status: document.getElementById("obraStatus").value,
    observacoes: document.getElementById("obraObservacoes").value.trim(),
  };

  const botao = document.querySelector("#formObra button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    if (idExistente) {
      dados.atualizadoEm = serverTimestamp();
      await updateDoc(doc(window.firebaseDb, "obras", idExistente), dados);
    } else {
      dados.ativo = true;
      dados.criadoEm = serverTimestamp();
      await addDoc(collection(window.firebaseDb, "obras"), dados);
    }
    fecharModalCadastro();
    await carregarObras();
  } catch (err) {
    console.error(err);
    erro.textContent = "Não foi possível salvar. Tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}
