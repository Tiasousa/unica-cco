/* =========================================================
   CADASTROS GERAIS — motor genérico de CRUD
   ---------------------------------------------------------
   Uma única engine (esta) atende as 12 entidades do menu
   Cadastros. Cada entidade só precisa de uma entrada em
   CADASTROS_CONFIG — nome da coleção no Firestore, título,
   e a lista de campos do formulário. O resto (listar,
   adicionar, editar, desativar/reativar, buscar) é igual
   para todas.

   Regra do projeto: nunca excluir de verdade — "desativar"
   só marca ativo:false. O registro continua existindo pra
   preservar o histórico de tudo que já usou ele.
   ========================================================= */

const CADASTROS_CONFIG = {
  "cad-servicos": {
    colecao: "cadastros_servicos", titulo: "Serviços", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "unidadePadraoId", label: "Unidade padrão", tipo: "referencia", colecaoRef: "cadastros_unidades" },
    ],
  },
  "cad-tipos-equip": {
    colecao: "cadastros_tipos_equipamento", titulo: "Tipos de equipamento", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "categoria", label: "Categoria", tipo: "select", opcoes: [
        { valor: "maquina", rotulo: "Máquina" },
        { valor: "caminhao", rotulo: "Caminhão" },
      ]},
    ],
  },
  "cad-materiais": {
    colecao: "cadastros_materiais", titulo: "Materiais", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "unidadePadraoId", label: "Unidade padrão", tipo: "referencia", colecaoRef: "cadastros_unidades" },
    ],
  },
  "cad-combustiveis": {
    colecao: "cadastros_combustiveis", titulo: "Combustíveis", campoPrincipal: "nome",
    campos: [ { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true } ],
  },
  "cad-unidades": {
    colecao: "cadastros_unidades", titulo: "Unidades de medida", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "sigla", label: "Sigla", tipo: "texto" },
    ],
  },
  "cad-funcionarios": {
    colecao: "cadastros_funcionarios", titulo: "Funcionários", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "funcaoId", label: "Função", tipo: "referencia", colecaoRef: "cadastros_funcoes" },
      { id: "telefone", label: "Telefone", tipo: "texto" },
    ],
  },
  "cad-funcoes": {
    colecao: "cadastros_funcoes", titulo: "Funções", campoPrincipal: "nome",
    campos: [ { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true } ],
  },
  "cad-pecas": {
    colecao: "cadastros_pecas", titulo: "Peças", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "fornecedorId", label: "Fornecedor", tipo: "referencia", colecaoRef: "cadastros_fornecedores" },
      { id: "estoqueMinimo", label: "Estoque mínimo", tipo: "numero" },
    ],
  },
  "cad-fornecedores": {
    colecao: "cadastros_fornecedores", titulo: "Fornecedores", campoPrincipal: "nome",
    campos: [
      { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
      { id: "telefone", label: "Telefone", tipo: "texto" },
      { id: "cidade", label: "Cidade", tipo: "texto" },
    ],
  },
  "cad-tipos-manutencao": {
    colecao: "cadastros_tipos_manutencao", titulo: "Tipos de manutenção", campoPrincipal: "nome",
    campos: [ { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true } ],
  },
  "cad-placas": {
    colecao: "cadastros_placas", titulo: "Placas", campoPrincipal: "placa",
    campos: [ { id: "placa", label: "Placa", tipo: "texto", obrigatorio: true } ],
  },
  "cad-motivos": {
    colecao: "cadastros_motivos", titulo: "Motivos de paralisação", campoPrincipal: "nome",
    campos: [ { id: "nome", label: "Nome", tipo: "texto", obrigatorio: true } ],
  },
};

let cadastroAtual = null;
const cacheReferencias = {};

function iconeLapis() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
}
function iconeCheck() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
}
function iconeX() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
}

// Escapa texto antes de colocar em innerHTML, pra evitar que alguém
// digite algo tipo <script> num campo de cadastro e isso seja executado
// na tela de outra pessoa. Compartilhada por cadastros.js e obras.js —
// frota.js e abastecimentos.js já têm a proteção equivalente própria.
function escaparHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function renderCadastro(chave) {
  const config = CADASTROS_CONFIG[chave];
  const el = document.getElementById("areaPagina");
  if (!config) { renderPlaceholder(chave); return; }

  cadastroAtual = { chave, mostrarInativos: false };

  el.innerHTML = `
    <div class="painel-cadastro">
      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="text" id="buscaCadastro" placeholder="Buscar ${config.titulo.toLowerCase()}...">
        </div>
        <label class="check-inativos">
          <input type="checkbox" id="mostrarInativos"> Mostrar desativados
        </label>
        <button class="btn-primario" id="btnAdicionarCadastro">+ Adicionar</button>
      </div>
      <div id="tabelaCadastroWrap">
        <p class="cadastro-carregando">Carregando...</p>
      </div>
    </div>
  `;

  document.getElementById("btnAdicionarCadastro").addEventListener("click", () => abrirModalCadastro(chave, null));
  document.getElementById("mostrarInativos").addEventListener("change", (e) => {
    cadastroAtual.mostrarInativos = e.target.checked;
    carregarTabelaCadastro(chave);
  });
  document.getElementById("buscaCadastro").addEventListener("input", (e) => filtrarTabelaCadastro(e.target.value));

  await carregarTabelaCadastro(chave);
}

async function obterReferencias(colecaoRef) {
  if (cacheReferencias[colecaoRef]) return cacheReferencias[colecaoRef];
  const { collection, getDocs } = window.fs;
  const snap = await getDocs(collection(window.firebaseDb, colecaoRef));
  const lista = [];
  snap.forEach(d => {
    const dados = d.data();
    if (dados.ativo === false) return;
    lista.push({ id: d.id, ...dados });
  });
  cacheReferencias[colecaoRef] = lista;
  return lista;
}

function formatarValorCampo(item, campo) {
  const valor = item[campo.id];
  if (valor === undefined || valor === null || valor === "") return "—";
  if (campo.tipo === "referencia") return campo._mapaRef?.[valor] || "—";
  if (campo.tipo === "select") return campo.opcoes.find(o => o.valor === valor)?.rotulo || valor;
  return valor;
}

async function carregarTabelaCadastro(chave) {
  const config = CADASTROS_CONFIG[chave];
  const wrap = document.getElementById("tabelaCadastroWrap");
  wrap.innerHTML = `<p class="cadastro-carregando">Carregando...</p>`;

  try {
    const { collection, getDocs } = window.fs;
    const snap = await getDocs(collection(window.firebaseDb, config.colecao));
    const itens = [];
    snap.forEach(d => {
      const dados = d.data();
      if (!cadastroAtual.mostrarInativos && dados.ativo === false) return;
      itens.push({ id: d.id, ...dados });
    });

    for (const campo of config.campos.filter(c => c.tipo === "referencia")) {
      const refs = await obterReferencias(campo.colecaoRef);
      campo._mapaRef = Object.fromEntries(refs.map(r => [r.id, r.nome]));
    }

    itens.sort((a, b) => String(a[config.campoPrincipal] || "").localeCompare(String(b[config.campoPrincipal] || "")));

    if (itens.length === 0) {
      wrap.innerHTML = `<p class="cadastro-vazio">Nenhum registro ${cadastroAtual.mostrarInativos ? "" : "ativo "}encontrado.</p>`;
      return;
    }

    const colPrincipal = config.campos.find(c => c.id === config.campoPrincipal);
    const colsSecundarias = config.campos.filter(c => c.id !== config.campoPrincipal);

    wrap.innerHTML = `
      <table class="tabela-cadastro" id="tabelaCadastro">
        <thead>
          <tr>
            <th>${colPrincipal ? colPrincipal.label : "Nome"}</th>
            ${colsSecundarias.map(c => `<th>${c.label}</th>`).join("")}
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${itens.map(item => `
            <tr data-busca="${escaparHtml(String(item[config.campoPrincipal] || "").toLowerCase())}">
              <td class="celula-principal">${escaparHtml(item[config.campoPrincipal]) || "—"}</td>
              ${colsSecundarias.map(c => `<td>${escaparHtml(formatarValorCampo(item, c))}</td>`).join("")}
              <td>${item.ativo === false ? '<span class="badge parada">Inativo</span>' : '<span class="badge ativa">Ativo</span>'}</td>
              <td class="celula-acoes">
                <button class="btn-icone" title="Editar" data-editar="${item.id}">${iconeLapis()}</button>
                ${item.ativo === false
                  ? `<button class="btn-icone" title="Reativar" data-reativar="${item.id}">${iconeCheck()}</button>`
                  : `<button class="btn-icone" title="Desativar" data-desativar="${item.id}">${iconeX()}</button>`}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-editar]").forEach(btn => {
      btn.addEventListener("click", () => abrirModalCadastro(chave, btn.dataset.editar));
    });
    wrap.querySelectorAll("[data-desativar]").forEach(btn => {
      btn.addEventListener("click", () => alternarAtivo(chave, btn.dataset.desativar, false));
    });
    wrap.querySelectorAll("[data-reativar]").forEach(btn => {
      btn.addEventListener("click", () => alternarAtivo(chave, btn.dataset.reativar, true));
    });
  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<p class="cadastro-erro">Não foi possível carregar os dados. Verifique sua conexão e tente novamente.</p>`;
  }
}

function filtrarTabelaCadastro(termo) {
  const t = termo.toLowerCase();
  document.querySelectorAll("#tabelaCadastro tbody tr").forEach(tr => {
    tr.style.display = tr.dataset.busca.includes(t) ? "" : "none";
  });
}

function renderCampoForm(campo, dados) {
  const valorAtual = dados ? (dados[campo.id] ?? "") : "";
  if (campo.tipo === "referencia") {
    return `
      <div class="campo">
        <label>${campo.label}</label>
        <select id="campo_${campo.id}">
          <option value="">Nenhum</option>
          ${(campo._opcoes || []).map(o => `<option value="${o.id}" ${o.id === valorAtual ? "selected" : ""}>${escaparHtml(o.nome)}</option>`).join("")}
        </select>
      </div>`;
  }
  if (campo.tipo === "select") {
    return `
      <div class="campo">
        <label>${campo.label}</label>
        <select id="campo_${campo.id}">
          <option value="">Selecione</option>
          ${campo.opcoes.map(o => `<option value="${o.valor}" ${o.valor === valorAtual ? "selected" : ""}>${o.rotulo}</option>`).join("")}
        </select>
      </div>`;
  }
  if (campo.tipo === "numero") {
    return `
      <div class="campo">
        <label>${campo.label}</label>
        <input type="number" id="campo_${campo.id}" value="${escaparHtml(valorAtual)}">
      </div>`;
  }
  return `
    <div class="campo">
      <label>${campo.label}${campo.obrigatorio ? " *" : ""}</label>
      <input type="text" id="campo_${campo.id}" value="${escaparHtml(valorAtual)}" ${campo.obrigatorio ? "required" : ""}>
    </div>`;
}

async function abrirModalCadastro(chave, id) {
  const config = CADASTROS_CONFIG[chave];
  let dadosExistentes = null;

  if (id) {
    const { doc, getDoc } = window.fs;
    const snap = await getDoc(doc(window.firebaseDb, config.colecao, id));
    if (snap.exists()) dadosExistentes = { id, ...snap.data() };
  }

  for (const campo of config.campos.filter(c => c.tipo === "referencia")) {
    campo._opcoes = await obterReferencias(campo.colecaoRef);
  }

  const singular = config.titulo.endsWith("s") ? config.titulo.slice(0, -1) : config.titulo;

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro">
        <div class="modal-cabecalho">
          <h3>${dadosExistentes ? "Editar" : "Adicionar"} ${singular}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModal">${iconeX()}</button>
        </div>
        <form id="formCadastro">
          ${config.campos.map(campo => renderCampoForm(campo, dadosExistentes)).join("")}
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
  document.getElementById("formCadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarCadastro(chave, dadosExistentes?.id);
  });
}

function fecharModalCadastro() {
  document.getElementById("modalOverlay")?.remove();
}

async function salvarCadastro(chave, idExistente) {
  const config = CADASTROS_CONFIG[chave];
  const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fs;
  const erro = document.getElementById("modalErro");
  erro.textContent = "";

  const dados = {};
  for (const campo of config.campos) {
    const campoEl = document.getElementById(`campo_${campo.id}`);
    let valor = campoEl.value;
    if (campo.tipo === "numero") valor = valor === "" ? null : Number(valor);
    if (campo.obrigatorio && !valor) {
      erro.textContent = `Preencha o campo "${campo.label}".`;
      return;
    }
    dados[campo.id] = valor;
  }

  const botao = document.querySelector("#formCadastro button[type=submit]");
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
    delete cacheReferencias[config.colecao];
    fecharModalCadastro();
    await carregarTabelaCadastro(chave);
  } catch (err) {
    console.error(err);
    erro.textContent = "Não foi possível salvar. Tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}

async function alternarAtivo(chave, id, novoValor) {
  const config = CADASTROS_CONFIG[chave];
  const { doc, updateDoc, serverTimestamp } = window.fs;
  const acao = novoValor ? "reativar" : "desativar";
  if (!confirm(`Tem certeza que deseja ${acao} este registro?`)) return;

  try {
    await updateDoc(doc(window.firebaseDb, config.colecao, id), { ativo: novoValor, atualizadoEm: serverTimestamp() });
    delete cacheReferencias[config.colecao];
    await carregarTabelaCadastro(chave);
  } catch (err) {
    console.error(err);
    alert("Não foi possível atualizar. Tente novamente.");
  }
}
