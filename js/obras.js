/* =========================================================
   OBRAS
   ---------------------------------------------------------
   Reaproveita helpers já existentes em cadastros.js (iconeX,
   iconeLapis, fecharModalCadastro) — por isso este script
   precisa carregar DEPOIS de cadastros.js no app.html.
   ========================================================= */

const CIDADES_GOIAS = [
  "Abadia de Goiás",
  "Abadiânia",
  "Acreúna",
  "Adelândia",
  "Água Fria de Goiás",
  "Água Limpa",
  "Águas Lindas de Goiás",
  "Alexânia",
  "Aloândia",
  "Alto Horizonte",
  "Alto Paraíso de Goiás",
  "Alvorada do Norte",
  "Amaralina",
  "Americano do Brasil",
  "Amorinópolis",
  "Anápolis",
  "Anhanguera",
  "Anicuns",
  "Aparecida de Goiânia",
  "Aparecida do Rio Doce",
  "Aporé",
  "Araçu",
  "Aragarças",
  "Aragoiânia",
  "Araguapaz",
  "Arenópolis",
  "Aruanã",
  "Aurilândia",
  "Avelinópolis",
  "Baliza",
  "Barro Alto",
  "Bela Vista de Goiás",
  "Bom Jardim de Goiás",
  "Bom Jesus de Goiás",
  "Bonfinópolis",
  "Bonópolis",
  "Brazabrantes",
  "Britânia",
  "Buriti Alegre",
  "Buriti de Goiás",
  "Buritinópolis",
  "Cabeceiras",
  "Cachoeira Alta",
  "Cachoeira de Goiás",
  "Cachoeira Dourada",
  "Caçu",
  "Caiapônia",
  "Caldas Novas",
  "Caldazinha",
  "Campestre de Goiás",
  "Campinaçu",
  "Campinorte",
  "Campo Alegre de Goiás",
  "Campo Limpo de Goiás",
  "Campos Belos",
  "Campos Verdes",
  "Carmo do Rio Verde",
  "Castelândia",
  "Catalão",
  "Caturaí",
  "Cavalcante",
  "Ceres",
  "Cezarina",
  "Chapadão do Céu",
  "Cidade Ocidental",
  "Cocalzinho de Goiás",
  "Colinas do Sul",
  "Córrego do Ouro",
  "Corumbá de Goiás",
  "Corumbaíba",
  "Cristalina",
  "Cristianópolis",
  "Crixás",
  "Cromínia",
  "Cumari",
  "Damianópolis",
  "Damolândia",
  "Davinópolis",
  "Diorama",
  "Divinópolis de Goiás",
  "Doverlândia",
  "Edealina",
  "Edéia",
  "Estrela do Norte",
  "Faina",
  "Fazenda Nova",
  "Firminópolis",
  "Flores de Goiás",
  "Formosa",
  "Formoso",
  "Gameleira de Goiás",
  "Goianápolis",
  "Goiandira",
  "Goianésia",
  "Goiânia",
  "Goianira",
  "Goiás",
  "Goiatuba",
  "Gouvelândia",
  "Guapó",
  "Guaraíta",
  "Guarani de Goiás",
  "Guarinos",
  "Heitoraí",
  "Hidrolândia",
  "Hidrolina",
  "Iaciara",
  "Inaciolândia",
  "Indiara",
  "Inhumas",
  "Ipameri",
  "Ipiranga de Goiás",
  "Iporá",
  "Israelândia",
  "Itaberaí",
  "Itaguari",
  "Itaguaru",
  "Itajá",
  "Itapaci",
  "Itapirapuã",
  "Itapuranga",
  "Itarumã",
  "Itauçu",
  "Itumbiara",
  "Ivolândia",
  "Jandaia",
  "Jaraguá",
  "Jataí",
  "Jaupaci",
  "Jesúpolis",
  "Joviânia",
  "Jussara",
  "Lagoa Santa",
  "Leopoldo de Bulhões",
  "Luziânia",
  "Mairipotaba",
  "Mambaí",
  "Mara Rosa",
  "Marzagão",
  "Matrinchã",
  "Maurilândia",
  "Mimoso de Goiás",
  "Minaçu",
  "Mineiros",
  "Moiporá",
  "Monte Alegre de Goiás",
  "Montes Claros de Goiás",
  "Montividiu",
  "Montividiu do Norte",
  "Morrinhos",
  "Morro Agudo de Goiás",
  "Mossâmedes",
  "Mozarlândia",
  "Mundo Novo",
  "Mutunópolis",
  "Nazário",
  "Nerópolis",
  "Niquelândia",
  "Nova América",
  "Nova Aurora",
  "Nova Crixás",
  "Nova Glória",
  "Nova Iguaçu de Goiás",
  "Nova Roma",
  "Nova Veneza",
  "Novo Brasil",
  "Novo Gama",
  "Novo Planalto",
  "Orizona",
  "Ouro Verde de Goiás",
  "Ouvidor",
  "Padre Bernardo",
  "Palestina de Goiás",
  "Palmeiras de Goiás",
  "Palmelo",
  "Palminópolis",
  "Panamá",
  "Paranaiguara",
  "Paraúna",
  "Perolândia",
  "Petrolina de Goiás",
  "Pilar de Goiás",
  "Piracanjuba",
  "Piranhas",
  "Pirenópolis",
  "Pires do Rio",
  "Planaltina",
  "Pontalina",
  "Porangatu",
  "Porteirão",
  "Portelândia",
  "Posse",
  "Professor Jamil",
  "Quirinópolis",
  "Rialma",
  "Rianápolis",
  "Rio Quente",
  "Rio Verde",
  "Rubiataba",
  "Sanclerlândia",
  "Santa Bárbara de Goiás",
  "Santa Cruz de Goiás",
  "Santa Fé de Goiás",
  "Santa Helena de Goiás",
  "Santa Isabel",
  "Santa Rita do Araguaia",
  "Santa Rita do Novo Destino",
  "Santa Rosa de Goiás",
  "Santa Tereza de Goiás",
  "Santa Terezinha de Goiás",
  "Santo Antônio da Barra",
  "Santo Antônio de Goiás",
  "Santo Antônio do Descoberto",
  "São Domingos",
  "São Francisco de Goiás",
  "São João da Paraúna",
  "São João d'Aliança",
  "São Luís de Montes Belos",
  "São Luiz do Norte",
  "São Miguel do Araguaia",
  "São Miguel do Passa Quatro",
  "São Patrício",
  "São Simão",
  "Senador Canedo",
  "Serranópolis",
  "Silvânia",
  "Simolândia",
  "Sítio d'Abadia",
  "Taquaral de Goiás",
  "Teresina de Goiás",
  "Terezópolis de Goiás",
  "Três Ranchos",
  "Trindade",
  "Trombas",
  "Turvânia",
  "Turvelândia",
  "Uirapuru",
  "Uruaçu",
  "Uruana",
  "Urutaí",
  "Valparaíso de Goiás",
  "Varjão",
  "Vianópolis",
  "Vicentinópolis",
  "Vila Boa",
  "Vila Propício"
];

const STATUS_OBRA = [
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "atencao", rotulo: "Atenção" },
  { valor: "parada", rotulo: "Parada" },
  { valor: "concluida", rotulo: "Concluída" },
];

let obrasFiltro = { status: "todas", busca: "", mostrarInativas: false };
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
        <label class="check-inativos">
          <input type="checkbox" id="mostrarObrasInativas"> Mostrar desativadas
        </label>
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
  document.getElementById("mostrarObrasInativas").addEventListener("change", (e) => {
    obrasFiltro.mostrarInativas = e.target.checked;
    renderizarListaObras();
  });

  obrasFiltro = { status: "todas", busca: "", mostrarInativas: false };
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

  if (!obrasFiltro.mostrarInativas) itens = itens.filter(o => o.ativo !== false);
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
        <div class="card-obra${o.ativo === false ? " card-obra-inativa" : ""}">
          <div class="card-obra-topo">
            <span class="badge ${o.ativo === false ? "parada" : badgeClasseObra(o.status)}">${o.ativo === false ? "Desativada" : rotuloStatusObra(o.status)}</span>
            <div class="celula-acoes">
              <button class="btn-icone" title="Editar" data-editar-obra="${o.id}">${iconeLapis()}</button>
              ${o.ativo === false
                ? `<button class="btn-icone" title="Reativar" data-reativar-obra="${o.id}">${iconeCheck()}</button>`
                : `<button class="btn-icone" title="Desativar" data-desativar-obra="${o.id}">${iconeX()}</button>`}
              <button class="btn-icone btn-icone-perigo" title="Excluir permanentemente" data-excluir-obra="${o.id}" data-nome-obra="${escaparHtml(o.nome)}">${iconeLixeira()}</button>
            </div>
          </div>
          <h3>${escaparHtml(o.nome) || "Sem nome"}</h3>
          <p class="card-obra-info">${o.cliente ? escaparHtml(o.cliente) + " · " : ""}${escaparHtml(o.cidade) || "—"}</p>
          <div class="card-obra-rodape">
            <span>${escaparHtml(o._responsavelNome)}</span>
            <span>${formatarDataObra(o.dataInicio)}${o.previsaoTermino ? " → " + formatarDataObra(o.previsaoTermino) : ""}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-editar-obra]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalObra(btn.dataset.editarObra));
  });
  wrap.querySelectorAll("[data-desativar-obra]").forEach(btn => {
    btn.addEventListener("click", () => alternarAtivoObra(btn.dataset.desativarObra, false));
  });
  wrap.querySelectorAll("[data-reativar-obra]").forEach(btn => {
    btn.addEventListener("click", () => alternarAtivoObra(btn.dataset.reativarObra, true));
  });
  wrap.querySelectorAll("[data-excluir-obra]").forEach(btn => {
    btn.addEventListener("click", () => excluirObraPermanente(btn.dataset.excluirObra, btn.dataset.nomeObra));
  });
}

function iconeLixeira() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
}

async function excluirObraPermanente(id, nomeObra) {
  // Exclusão de verdade — o padrão do sistema é sempre "desativar",
  // mas por pedido explícito existe esta opção pra casos de engano
  // (obra de teste, duplicada etc.). Por ser irreversível, exige
  // digitar o nome da obra pra confirmar, não só um clique de "OK".
  const digitado = prompt(
    `Isso vai excluir "${nomeObra}" PERMANENTEMENTE — sem volta, diferente de desativar.\n\nPara confirmar, digite o nome exato da obra abaixo:`
  );
  if (digitado === null) return;
  if (digitado.trim() !== nomeObra) {
    alert("Nome digitado não confere. Nada foi excluído.");
    return;
  }

  const { doc, deleteDoc } = window.fs;
  try {
    await deleteDoc(doc(window.firebaseDb, "obras", id));
    await carregarObras();
  } catch (err) {
    console.error(err);
    alert("Não foi possível excluir. Tente novamente.");
  }
}

async function alternarAtivoObra(id, novoValor) {
  const { doc, updateDoc, serverTimestamp } = window.fs;
  const acao = novoValor ? "reativar" : "desativar";
  if (!confirm(`Tem certeza que deseja ${acao} esta obra?`)) return;

  try {
    await updateDoc(doc(window.firebaseDb, "obras", id), { ativo: novoValor, atualizadoEm: serverTimestamp() });
    await carregarObras();
  } catch (err) {
    console.error(err);
    alert("Não foi possível atualizar. Tente novamente.");
  }
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
            <input type="text" id="obraNome" value="${escaparHtml(dados?.nome)}" required>
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label>Cliente</label>
              <input type="text" id="obraCliente" value="${escaparHtml(dados?.cliente)}">
            </div>
            <div class="campo">
              <label>Cidade</label>
              <input type="text" id="obraCidade" list="listaCidadesGoias" value="${escaparHtml(dados?.cidade)}" placeholder="Digite ou escolha...">
              <datalist id="listaCidadesGoias">
                ${CIDADES_GOIAS.map(c => `<option value="${c}"></option>`).join("")}
              </datalist>
            </div>
          </div>
          <div class="campo">
            <label>Endereço</label>
            <input type="text" id="obraEndereco" value="${escaparHtml(dados?.endereco)}">
          </div>
          <div class="campo">
            <label>Responsável</label>
            <select id="obraResponsavel">
              <option value="">Nenhum</option>
              ${responsaveis.map(r => `<option value="${r.id}" ${r.id === dados?.responsavelId ? "selected" : ""}>${escaparHtml(r.nome)}</option>`).join("")}
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
            <textarea id="obraObservacoes" rows="3">${escaparHtml(dados?.observacoes)}</textarea>
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
