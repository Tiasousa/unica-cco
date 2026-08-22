// =========================================================
// VALE (ADIANTAMENTO)
// ---------------------------------------------------------
// Lista global de vales dados aos funcionários — Nome, Data,
// Valor — sempre mostrando o mês vigente por padrão, com opção
// de olhar outros meses. Guardado numa coleção própria (não
// dentro do funcionário) porque precisa ser consultado como
// lista única, de todo mundo, rápido.
//
// Guardado em: vales/{autoId}
// =========================================================

const MESES_VALE = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

let valeMesFiltro = new Date().getMonth() + 1;
let valeAnoFiltro = new Date().getFullYear();
let valeEditandoId = null;
let valeFuncionariosCache = [];
let valeBuscaTexto = "";
let valeFiltroFuncionarioId = "";

function normVale(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHtmlVale(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function formatarMoedaVale(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataVale(dataIso) {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function renderVale() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  const hoje = new Date();
  valeMesFiltro = hoje.getMonth() + 1;
  valeAnoFiltro = hoje.getFullYear();
  valeEditandoId = null;

  area.innerHTML = `
    <section class="painel-cadastro modulo-vale">

      <button type="button" class="btn-vale-adicionar" id="btnAbrirFormVale">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
        Adicionar VALE
      </button>

      <form id="formVale" class="form-vale" hidden>
        <input type="hidden" id="valeEditandoId" value="">
        <div class="campo campo-funcionario-vale">
          <label>Funcionário</label>
          <select id="valeFuncionarioId" required></select>
        </div>
        <div class="campo">
          <label>Data</label>
          <input type="date" id="valeData" required>
        </div>
        <div class="campo">
          <label>Valor</label>
          <input type="number" id="valeValor" step="0.01" min="0" required>
        </div>
        <div class="campo campo-botao-vale">
          <button type="button" class="btn-secundario" id="btnCancelarVale">Cancelar</button>
          <button type="submit" class="btn-primario" id="btnSalvarVale">Salvar</button>
        </div>
      </form>
      <p class="doc-erro" id="valeErro"></p>

      <div class="vale-filtro-mes">
        <button type="button" class="btn-icone" id="valeMesAnterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span id="valeMesAtualLabel"></span>
        <button type="button" class="btn-icone" id="valeMesProximo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>

      <div class="vale-filtros-lista">
        <input type="search" id="buscaVale" placeholder="Buscar funcionário...">
        <select id="filtroFuncionarioVale">
          <option value="">Todos os funcionários</option>
        </select>
      </div>

      <div id="listaVales">
        <p class="doc-carregando">Carregando...</p>
      </div>

    </section>
  `;

  document.getElementById("btnAbrirFormVale").addEventListener("click", abrirFormVale);
  document.getElementById("btnCancelarVale").addEventListener("click", fecharFormVale);
  document.getElementById("formVale").addEventListener("submit", onSubmitVale);
  document.getElementById("valeMesAnterior").addEventListener("click", () => mudarMesVale(-1));
  document.getElementById("valeMesProximo").addEventListener("click", () => mudarMesVale(1));
  document.getElementById("buscaVale").addEventListener("input", (e) => {
    valeBuscaTexto = normVale(e.target.value);
    carregarListaVales();
  });
  document.getElementById("filtroFuncionarioVale").addEventListener("change", (e) => {
    valeFiltroFuncionarioId = e.target.value;
    carregarListaVales();
  });

  await carregarFuncionariosParaVale();
  atualizarLabelMesVale();
  await carregarListaVales();
}

async function carregarFuncionariosParaVale() {
  const { collection, getDocs } = window.fs;
  const snap = await getDocs(collection(window.firebaseDb, "cadastros_funcionarios"));
  valeFuncionariosCache = [];
  snap.forEach((d) => {
    const dados = d.data();
    if (dados.ativo !== false) {
      valeFuncionariosCache.push({ id: d.id, nome: dados.nome || "Sem nome" });
    }
  });
  valeFuncionariosCache.sort((a, b) => a.nome.localeCompare(b.nome));

  const select = document.getElementById("valeFuncionarioId");
  if (select) {
    select.innerHTML = valeFuncionariosCache
      .map((f) => `<option value="${f.id}">${escaparHtmlVale(f.nome)}</option>`)
      .join("");
  }

  const filtro = document.getElementById("filtroFuncionarioVale");
  if (filtro) {
    filtro.innerHTML = `<option value="">Todos os funcionários</option>` + valeFuncionariosCache
      .map((f) => `<option value="${f.id}">${escaparHtmlVale(f.nome)}</option>`)
      .join("");
  }
}

function abrirFormVale() {
  valeEditandoId = null;
  const form = document.getElementById("formVale");
  form.hidden = false;
  form.reset();
  document.getElementById("valeEditandoId").value = "";
  document.getElementById("valeData").value = new Date().toISOString().slice(0, 10);
  document.getElementById("btnSalvarVale").textContent = "Salvar";
  document.getElementById("btnAbrirFormVale").hidden = true;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharFormVale() {
  valeEditandoId = null;
  document.getElementById("formVale").hidden = true;
  document.getElementById("btnAbrirFormVale").hidden = false;
  mostrarErroVale("");
}

function mostrarErroVale(msg) {
  const el = document.getElementById("valeErro");
  if (el) el.textContent = msg || "";
}

function mudarMesVale(delta) {
  valeMesFiltro += delta;
  if (valeMesFiltro > 12) { valeMesFiltro = 1; valeAnoFiltro += 1; }
  if (valeMesFiltro < 1) { valeMesFiltro = 12; valeAnoFiltro -= 1; }
  atualizarLabelMesVale();
  carregarListaVales();
}

function atualizarLabelMesVale() {
  const label = document.getElementById("valeMesAtualLabel");
  if (label) label.textContent = `${MESES_VALE[valeMesFiltro - 1]} de ${valeAnoFiltro}`;
}

function renderGruposPorDataVale(itens, totalPorFuncionario, corPorNome, iniciais) {
  // itens já vem ordenado do mais recente pro mais antigo (carregarListaVales
  // ordena por data desc) — só precisamos juntar quem tem a mesma data.
  const grupos = [];
  itens.forEach((item) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === item.data) {
      ultimo.itens.push(item);
    } else {
      grupos.push({ data: item.data, itens: [item] });
    }
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const ontemIso = ontem.toISOString().slice(0, 10);

  return `
    <div class="lista-vale-por-data">
      ${grupos.map((grupo) => {
        const totalDoDia = grupo.itens.reduce((soma, i) => soma + (Number(i.valor) || 0), 0);
        let rotuloData = formatarDataVale(grupo.data);
        if (grupo.data === hoje) rotuloData = `Hoje, ${rotuloData}`;
        else if (grupo.data === ontemIso) rotuloData = `Ontem, ${rotuloData}`;

        return `
          <div class="grupo-data-vale">
            <div class="grupo-data-vale-cabecalho">
              <span>${escaparHtmlVale(rotuloData)}</span>
              <span class="grupo-data-vale-total">${formatarMoedaVale(totalDoDia)}</span>
            </div>
            ${grupo.itens.map((item) => `
              <div class="linha-vale">
                <span class="card-vale-avatar" style="background:${corPorNome(item.funcionarioNome)}20; color:${corPorNome(item.funcionarioNome)};">${escaparHtmlVale(iniciais(item.funcionarioNome))}</span>
                <div class="linha-vale-info">
                  <strong>${escaparHtmlVale(item.funcionarioNome)}</strong>
                  <span>Total no mês: ${formatarMoedaVale(totalPorFuncionario[item.funcionarioId] || 0)}</span>
                </div>
                <div class="linha-vale-valor">${formatarMoedaVale(item.valor)}</div>
                <div class="linha-vale-acoes">
                  <button class="btn-icone" title="Editar" data-editar-vale="${item.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button class="btn-icone" title="Excluir" data-excluir-vale="${item.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function carregarListaVales() {
  const wrap = document.getElementById("listaVales");
  if (!wrap) return;
  wrap.innerHTML = `<p class="doc-carregando">Carregando...</p>`;

  const { collection, getDocs, query, where } = window.fs;
  let itensDoMes = [];
  try {
    const q = query(
      collection(window.firebaseDb, "vales"),
      where("mes", "==", valeMesFiltro),
      where("ano", "==", valeAnoFiltro)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => itensDoMes.push({ id: d.id, ...d.data() }));
  } catch (erro) {
    console.error("Erro ao carregar vales:", erro);
    wrap.innerHTML = `<p class="doc-erro">Não foi possível carregar os vales.</p>`;
    return;
  }

  itensDoMes.sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  // Indicadores calculados sobre o MÊS TODO, sem filtro de busca/funcionário —
  // pra sempre refletir a realidade do mês, independente do que a pessoa
  // esteja filtrando pra olhar no momento.
  const totalMes = itensDoMes.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
  const funcionariosComVale = new Set(itensDoMes.map((i) => i.funcionarioId)).size;

  // Total acumulado por funcionário no mês (pra mostrar em cada card)
  const totalPorFuncionario = {};
  itensDoMes.forEach((item) => {
    totalPorFuncionario[item.funcionarioId] = (totalPorFuncionario[item.funcionarioId] || 0) + (Number(item.valor) || 0);
  });

  // Agora aplica busca de texto + filtro por funcionário só na LISTAGEM
  let itens = itensDoMes;
  if (valeFiltroFuncionarioId) {
    itens = itens.filter((i) => i.funcionarioId === valeFiltroFuncionarioId);
  }
  if (valeBuscaTexto) {
    itens = itens.filter((i) => normVale(i.funcionarioNome).includes(valeBuscaTexto));
  }

  const cores = ["#FFB800", "#5AA9E6", "#E67E7E", "#7ED6A5", "#B98CE0", "#F2A65A"];
  const corPorNome = (nome) => {
    const chars = String(nome || "?").trim();
    const soma = chars.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    return cores[soma % cores.length];
  };
  const iniciais = (nome) => {
    const partes = String(nome || "?").trim().split(" ").filter(Boolean);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  wrap.innerHTML = `
    <div class="grid-indicadores grid-indicadores-vale">
      <article class="card-indicador">
        <div class="topo">
          <span class="icone-bolha-vale" style="background:rgba(255,184,0,0.14); color:var(--amarelo);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5"/></svg>
          </span>
          <span class="eyebrow">Total do mês</span>
        </div>
        <div class="valor">${formatarMoedaVale(totalMes)}</div>
        <div class="rotulo">Valor total de vales</div>
      </article>
      <article class="card-indicador">
        <div class="topo">
          <span class="icone-bolha-vale" style="background:rgba(90,169,230,0.14); color:#5AA9E6;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <span class="eyebrow">Funcionários</span>
        </div>
        <div class="valor">${funcionariosComVale}</div>
        <div class="rotulo">Com vales no mês</div>
      </article>
      <article class="card-indicador">
        <div class="topo">
          <span class="icone-bolha-vale" style="background:rgba(126,214,165,0.14); color:#7ED6A5;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6M9 16h6M9 8h6"/><rect x="4" y="3" width="16" height="18" rx="2"/></svg>
          </span>
          <span class="eyebrow">Lançamentos</span>
        </div>
        <div class="valor">${itensDoMes.length}</div>
        <div class="rotulo">Total de lançamentos</div>
      </article>
    </div>

    ${itens.length === 0
      ? `<p class="doc-vazio">Nenhum vale encontrado com esse filtro.</p>`
      : renderGruposPorDataVale(itens, totalPorFuncionario, corPorNome, iniciais)}

    <div class="vale-aviso-rodape">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>Os vales registrados são adiantamentos. Utilize a folha de pagamento (ou o painel de Consignados do funcionário) pra realizar os descontos de verdade.</span>
    </div>
  `;

  wrap.querySelectorAll("[data-editar-vale]").forEach((btn) => {
    btn.addEventListener("click", () => iniciarEdicaoVale(btn.dataset.editarVale, itens));
  });
  wrap.querySelectorAll("[data-excluir-vale]").forEach((btn) => {
    btn.addEventListener("click", () => excluirVale(btn.dataset.excluirVale));
  });
}

function iniciarEdicaoVale(id, itens) {
  const item = itens.find((i) => i.id === id);
  if (!item) return;
  valeEditandoId = id;

  const form = document.getElementById("formVale");
  form.hidden = false;
  document.getElementById("btnAbrirFormVale").hidden = true;
  document.getElementById("valeEditandoId").value = id;
  document.getElementById("valeFuncionarioId").value = item.funcionarioId;
  document.getElementById("valeData").value = item.data;
  document.getElementById("valeValor").value = item.valor;
  document.getElementById("btnSalvarVale").textContent = "Salvar alterações";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function onSubmitVale(e) {
  e.preventDefault();
  mostrarErroVale("");

  const funcionarioId = document.getElementById("valeFuncionarioId").value;
  const data = document.getElementById("valeData").value;
  const valor = Number(document.getElementById("valeValor").value);
  const funcionario = valeFuncionariosCache.find((f) => f.id === funcionarioId);

  if (!funcionarioId || !data || !valor) {
    mostrarErroVale("Preenche funcionário, data e valor.");
    return;
  }

  const [ano, mes] = data.split("-").map(Number);

  try {
    const { collection, doc, addDoc, updateDoc, serverTimestamp } = window.fs;
    const dados = {
      funcionarioId,
      funcionarioNome: funcionario ? funcionario.nome : "",
      data,
      valor,
      mes,
      ano,
    };

    if (valeEditandoId) {
      await updateDoc(doc(window.firebaseDb, "vales", valeEditandoId), dados);
    } else {
      await addDoc(collection(window.firebaseDb, "vales"), { ...dados, criadoEm: serverTimestamp() });
    }

    fecharFormVale();
    valeMesFiltro = mes;
    valeAnoFiltro = ano;
    atualizarLabelMesVale();
    await carregarListaVales();
  } catch (erro) {
    console.error("Erro ao salvar vale:", erro);
    mostrarErroVale("Não foi possível salvar. Tente novamente.");
  }
}

async function excluirVale(id) {
  const confirmar = confirm("Excluir este vale? Essa ação não pode ser desfeita.");
  if (!confirmar) return;

  try {
    const { doc, deleteDoc } = window.fs;
    await deleteDoc(doc(window.firebaseDb, "vales", id));
    await carregarListaVales();
  } catch (erro) {
    console.error("Erro ao excluir vale:", erro);
    mostrarErroVale("Não foi possível excluir. Tente novamente.");
  }
}

window.renderVale = renderVale;

// Usado pelo card de resumo dentro do modal de Consignados, pra
// saber quanto aquele funcionário específico recebeu de vale no
// mês vigente, sem duplicar essa consulta em outro arquivo.
window.obterTotalValeMesFuncionario = async function (funcionarioId) {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();
  const { collection, getDocs, query, where } = window.fs;
  try {
    const q = query(
      collection(window.firebaseDb, "vales"),
      where("funcionarioId", "==", funcionarioId),
      where("mes", "==", mes),
      where("ano", "==", ano)
    );
    const snap = await getDocs(q);
    let total = 0;
    snap.forEach((d) => { total += Number(d.data().valor) || 0; });
    return total;
  } catch (erro) {
    console.error("Erro ao calcular vale do mês:", erro);
    return 0;
  }
};
