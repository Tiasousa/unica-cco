/* =========================================================
   FROTA — Máquinas e Caminhões
   ---------------------------------------------------------
   Reaproveita helpers já existentes em cadastros.js (iconeX,
   iconeLapis, fecharModalCadastro) — por isso este script
   precisa carregar DEPOIS de cadastros.js no app.html.

   Máquinas e Caminhões são quase idênticos (nome, tipo de
   equipamento, status, um medidor), então uma engine só
   atende os dois — como o motor de Cadastros Gerais.
   ========================================================= */

const FROTA_CONFIG = {
  maquinas: {
    colecao: "maquinas",
    titulo: "Máquinas",
    categoriaEquip: "maquina",
    campoIdentificador: { id: "identificador", label: "Identificador (ex: EQ-04)" },
    campoMedidor: { id: "horimetroAtual", label: "Horímetro atual (h)" },
  },
  caminhoes: {
    colecao: "caminhoes",
    titulo: "Caminhões",
    categoriaEquip: "caminhao",
    campoIdentificador: { id: "placa", label: "Placa" },
    campoMedidor: { id: "kmAtual", label: "Quilometragem atual (km)" },
  },
};

const STATUS_FROTA = [
  { valor: "disponivel", rotulo: "Disponível", badge: "ativa" },
  { valor: "em_uso", rotulo: "Em uso", badge: "concluida" },
  { valor: "manutencao", rotulo: "Manutenção", badge: "atencao" },
];

let frotaAtual = null;
let frotaCache = [];
let frotaFiltro = { busca: "" };
const cacheTiposEquip = {};

function statusFrotaInfo(valor) {
  return STATUS_FROTA.find(s => s.valor === valor) || STATUS_FROTA[0];
}

async function obterTiposEquipamento(categoria) {
  if (cacheTiposEquip[categoria]) return cacheTiposEquip[categoria];
  const { collection, getDocs } = window.fs;
  const snap = await getDocs(collection(window.firebaseDb, "cadastros_tipos_equipamento"));
  const lista = [];
  snap.forEach(d => {
    const dados = d.data();
    if (dados.ativo === false) return;
    if (dados.categoria !== categoria) return;
    lista.push({ id: d.id, nome: dados.nome });
  });
  cacheTiposEquip[categoria] = lista;
  return lista;
}

async function renderFrota(chave) {
  const config = FROTA_CONFIG[chave];
  const el = document.getElementById("areaPagina");
  if (!config) { renderPlaceholder(chave); return; }

  frotaAtual = chave;
  frotaFiltro = { busca: "" };

  el.innerHTML = `
    <div class="painel-cadastro">
      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="text" id="buscaFrota" placeholder="Buscar ${config.titulo.toLowerCase()}...">
        </div>
        <button class="btn-primario" id="btnAdicionarFrota">+ Adicionar</button>
      </div>
      <div id="listaFrotaWrap">
        <p class="cadastro-carregando">Carregando...</p>
      </div>
    </div>
  `;

  document.getElementById("btnAdicionarFrota").addEventListener("click", () => abrirModalFrota(chave, null));
  document.getElementById("buscaFrota").addEventListener("input", (e) => {
    frotaFiltro.busca = e.target.value.toLowerCase();
    renderizarListaFrota();
  });

  await carregarFrota(chave);
}

async function carregarFrota(chave) {
  const config = FROTA_CONFIG[chave];
  const wrap = document.getElementById("listaFrotaWrap");
  wrap.innerHTML = `<p class="cadastro-carregando">Carregando...</p>`;

  try {
    const { collection, getDocs } = window.fs;
    const snap = await getDocs(collection(window.firebaseDb, config.colecao));
    frotaCache = [];
    snap.forEach(d => frotaCache.push({ id: d.id, ...d.data() }));

    const tipos = await obterTiposEquipamento(config.categoriaEquip);
    const mapaTipos = Object.fromEntries(tipos.map(t => [t.id, t.nome]));
    frotaCache.forEach(item => { item._tipoNome = mapaTipos[item.tipoEquipamentoId] || "—"; });

    frotaCache.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
    renderizarListaFrota();
  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<p class="cadastro-erro">Não foi possível carregar os dados. Verifique sua conexão e tente novamente.</p>`;
  }
}

function renderizarListaFrota() {
  const config = FROTA_CONFIG[frotaAtual];
  const wrap = document.getElementById("listaFrotaWrap");
  let itens = frotaCache;

  if (frotaFiltro.busca) {
    itens = itens.filter(item =>
      String(item.nome || "").toLowerCase().includes(frotaFiltro.busca) ||
      String(item[config.campoIdentificador.id] || "").toLowerCase().includes(frotaFiltro.busca)
    );
  }

  if (itens.length === 0) {
    wrap.innerHTML = `<p class="cadastro-vazio">Nenhum registro encontrado.</p>`;
    return;
  }

  wrap.innerHTML = `
    <div class="grid-frota">
      ${itens.map(item => {
        const status = statusFrotaInfo(item.status);
        const medidorValor = item[config.campoMedidor.id];
        return `
        <div class="card-frota">
          <div class="card-frota-topo">
            <span class="badge ${status.badge}">${status.rotulo}</span>
            <button class="btn-icone" title="Editar" data-editar-frota="${item.id}">${iconeLapis()}</button>
          </div>
          <h3>${item.nome || "Sem nome"}</h3>
          <p class="card-frota-info">${item[config.campoIdentificador.id] || "—"} · ${item._tipoNome}</p>
          <div class="card-frota-rodape">
            <span>${config.campoMedidor.label.split(" (")[0]}</span>
            <span>${medidorValor !== undefined && medidorValor !== null && medidorValor !== "" ? medidorValor : "—"}</span>
          </div>
        </div>
      `;
      }).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-editar-frota]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalFrota(frotaAtual, btn.dataset.editarFrota));
  });
}

async function abrirModalFrota(chave, id) {
  const config = FROTA_CONFIG[chave];
  const dados = id ? frotaCache.find(item => item.id === id) : null;
  const tipos = await obterTiposEquipamento(config.categoriaEquip);

  const singular = config.titulo.endsWith("s") ? config.titulo.slice(0, -1) : config.titulo;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro modal-obra">
        <div class="modal-cabecalho">
          <h3>${dados ? "Editar" : "Adicionar"} ${singular}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModal">${iconeX()}</button>
        </div>
        <form id="formFrota">
          <div class="campo">
            <label>Nome *</label>
            <input type="text" id="frotaNome" value="${dados?.nome || ""}" required>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>${config.campoIdentificador.label}</label>
              <input type="text" id="frotaIdentificador" value="${dados?.[config.campoIdentificador.id] || ""}">
            </div>
            <div class="campo">
              <label>Tipo de equipamento</label>
              <select id="frotaTipo">
                <option value="">Nenhum</option>
                ${tipos.map(t => `<option value="${t.id}" ${t.id === dados?.tipoEquipamentoId ? "selected" : ""}>${t.nome}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Status</label>
              <select id="frotaStatus">
                ${STATUS_FROTA.map(s => `<option value="${s.valor}" ${(dados?.status || "disponivel") === s.valor ? "selected" : ""}>${s.rotulo}</option>`).join("")}
              </select>
            </div>
            <div class="campo">
              <label>${config.campoMedidor.label}</label>
              <input type="number" id="frotaMedidor" value="${dados?.[config.campoMedidor.id] ?? ""}">
            </div>
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
  document.getElementById("formFrota").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarFrota(chave, id);
  });
}

async function salvarFrota(chave, idExistente) {
  const config = FROTA_CONFIG[chave];
  const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;
  const erro = document.getElementById("modalErro");
  erro.textContent = "";

  const nome = document.getElementById("frotaNome").value.trim();
  if (!nome) {
    erro.textContent = 'Preencha o campo "Nome".';
    return;
  }

  const medidorValor = document.getElementById("frotaMedidor").value;

  const dados = {
    nome,
    [config.campoIdentificador.id]: document.getElementById("frotaIdentificador").value.trim(),
    tipoEquipamentoId: document.getElementById("frotaTipo").value,
    status: document.getElementById("frotaStatus").value,
    [config.campoMedidor.id]: medidorValor === "" ? null : Number(medidorValor),
  };

  const botao = document.querySelector("#formFrota button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    if (idExistente) {
      dados.atualizadoEm = serverTimestamp();
      await updateDoc(doc(window.firebaseDb, config.colecao, idExistente), dados);
    } else {
      dados.ativo = true;
      dados.criadoEm = serverTimestamp();
      await addDoc(collection(window.firebaseDb, config.colecao), dados);
    }
    fecharModalCadastro();
    await carregarFrota(chave);
  } catch (err) {
    console.error(err);
    erro.textContent = "Não foi possível salvar. Tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}
