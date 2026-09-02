/* =========================================================
   CENTRAL OPERACIONAL
   ---------------------------------------------------------
   Painel principal, com dados reais lidos do Firestore —
   Obras, Frota, Manutenções, Apontamentos, Checklists e
   Materiais. Substitui os mocks que existiam antes (o layout
   é o mesmo, só trocou de onde vêm os números).
   ========================================================= */

function iconeSvg(caminho, viewBox = "0 0 24 24") {
  return `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${caminho}</svg>`;
}

function escCentral(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function fmtNumCentral(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function verificarFirebaseCentral() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não está pronto. Recarregue a página.");
  }
}

/* =========================================================
   CARREGAMENTO
   ========================================================= */

async function carregarDadosCentral() {
  verificarFirebaseCentral();
  const { collection, getDocs } = window.fs;

  const [
    snapObras, snapMaquinas, snapCaminhoes, snapManut,
    snapApont, snapChecklists, snapMateriais,
  ] = await Promise.all([
    getDocs(collection(window.firebaseDb, "obras")),
    getDocs(collection(window.firebaseDb, "maquinas")),
    getDocs(collection(window.firebaseDb, "caminhoes")),
    getDocs(collection(window.firebaseDb, "manutencoes")),
    getDocs(collection(window.firebaseDb, "apontamentos")),
    getDocs(collection(window.firebaseDb, "checklists")),
    getDocs(collection(window.firebaseDb, "materiais_estoque")),
  ]);

  const obras = [];
  snapObras.forEach((d) => { const dd = d.data(); if (dd.ativo !== false) obras.push({ id: d.id, ...dd }); });

  const maquinas = [];
  snapMaquinas.forEach((d) => { const dd = d.data(); if (dd.ativo !== false) maquinas.push({ id: d.id, ...dd }); });

  const caminhoes = [];
  snapCaminhoes.forEach((d) => { const dd = d.data(); if (dd.ativo !== false) caminhoes.push({ id: d.id, ...dd }); });

  const manutencoes = [];
  snapManut.forEach((d) => { const dd = d.data(); if (dd.ativo !== false) manutencoes.push({ id: d.id, ...dd }); });

  const apontamentos = [];
  snapApont.forEach((d) => apontamentos.push({ id: d.id, ...d.data() }));
  apontamentos.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  const checklists = [];
  snapChecklists.forEach((d) => checklists.push({ id: d.id, ...d.data() }));

  const materiais = [];
  snapMateriais.forEach((d) => { const dd = d.data(); if (dd.ativo !== false) materiais.push({ id: d.id, ...dd }); });

  return { obras, maquinas, caminhoes, manutencoes, apontamentos, checklists, materiais };
}

function calcularIndicadores(dados) {
  const { obras, maquinas, caminhoes, manutencoes, apontamentos, checklists, materiais } = dados;

  const obrasAtivas = obras.filter((o) => (o.status || "ativa") === "ativa").length;
  const maquinasTrabalhando = maquinas.filter((m) => m.status === "em_uso").length;
  const caminhoesTrabalhando = caminhoes.filter((c) => c.status === "em_uso").length;
  const emManutencao = [...maquinas, ...caminhoes].filter((e) => e.status === "manutencao").length;

  const hoje = new Date().toISOString().slice(0, 10);
  const percentuaisHoje = [];
  apontamentos.filter((a) => a.data === hoje).forEach((a) => {
    (a.itens || []).forEach((item) => {
      if (item.percentualTrabalhado !== undefined && item.percentualTrabalhado !== null) {
        percentuaisHoje.push(Number(item.percentualTrabalhado));
      }
    });
  });
  const utilizacaoHoje = percentuaisHoje.length
    ? Math.round(percentuaisHoje.reduce((soma, v) => soma + v, 0) / percentuaisHoje.length) + "%"
    : "—";

  const manutencoesPendentes = manutencoes.filter((m) => m.status === "agendada" || m.status === "em_andamento").length;

  const maisRecenteChkPorEquip = {};
  checklists.forEach((c) => {
    const chave = `${c.colecaoEquipamento}:${c.equipamentoId}`;
    if (!maisRecenteChkPorEquip[chave] || String(c.data) > String(maisRecenteChkPorEquip[chave].data)) {
      maisRecenteChkPorEquip[chave] = c;
    }
  });
  const checklistsComProblema = Object.values(maisRecenteChkPorEquip).filter((c) => c.statusGeral === "atencao").length;

  const materiaisEstoqueBaixo = materiais.filter((m) => {
    const atual = Number(m.estoqueAtual) || 0;
    const minimo = Number(m.estoqueMinimo) || 0;
    return minimo > 0 && atual <= minimo;
  }).length;

  const alertas = manutencoesPendentes + checklistsComProblema + materiaisEstoqueBaixo;

  return { obrasAtivas, maquinasTrabalhando, caminhoesTrabalhando, emManutencao, utilizacaoHoje, alertas };
}

function calcularProducaoSemana(apontamentos) {
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const rotulo = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
    dias.push({ iso, dia: rotulo, percentuais: [] });
  }
  apontamentos.forEach((a) => {
    const diaEncontrado = dias.find((d) => d.iso === a.data);
    if (!diaEncontrado) return;
    (a.itens || []).forEach((item) => {
      if (item.percentualTrabalhado !== undefined && item.percentualTrabalhado !== null) {
        diaEncontrado.percentuais.push(Number(item.percentualTrabalhado));
      }
    });
  });
  dias.forEach((d) => {
    d.valor = d.percentuais.length
      ? Math.round(d.percentuais.reduce((soma, v) => soma + v, 0) / d.percentuais.length)
      : 0;
  });
  return dias;
}

function formatarQuandoCentral(dataIso, criadoEm) {
  if (criadoEm?.toDate) {
    const d = criadoEm.toDate();
    const hoje = new Date();
    const ehHoje = d.toDateString() === hoje.toDateString();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const ehOntem = d.toDateString() === ontem.toDateString();
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (ehHoje) return `Hoje, ${hora}`;
    if (ehOntem) return `Ontem, ${hora}`;
    return d.toLocaleDateString("pt-BR");
  }
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/* =========================================================
   ENTRADA DO MÓDULO
   ========================================================= */

async function renderCentral() {
  const el = document.getElementById("areaPagina");
  if (!el) return;

  el.innerHTML = `
    <div class="em-construcao">
      <div class="loading-spinner"></div>
      <p>Carregando painel...</p>
    </div>
  `;

  try {
    const dados = await carregarDadosCentral();
    renderTelaCentral(dados);
  } catch (erro) {
    console.error("Erro ao carregar Central Operacional:", erro);
    el.innerHTML = `
      <div class="em-construcao estado-erro">
        <h3>Não foi possível carregar</h3>
        <p class="etapa">Verifique sua conexão com a internet e tente novamente.</p>
        <button type="button" class="btn-primario" id="btnTentarCentral">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btnTentarCentral")?.addEventListener("click", renderCentral);
  }
}
window.renderCentral = renderCentral;

function renderTelaCentral(dados) {
  const el = document.getElementById("areaPagina");
  if (!el) return;

  const i = calcularIndicadores(dados);
  const producaoSemana = calcularProducaoSemana(dados.apontamentos);
  const maxProd = 100;

  const ultimosApontamentos = dados.apontamentos.slice(0, 4).map((a) => ({
    obra: a.obraNome || "Obra",
    resp: (a.itens && a.itens[0]?.operadorNome) || "—",
    quando: formatarQuandoCentral(a.data, a.criadoEm),
  }));

  const obrasAndamento = dados.obras
    .filter((o) => (o.status || "ativa") !== "concluida")
    .slice(0, 4)
    .map((o) => ({
      nome: o.nome || "Obra",
      cidade: [o.cidade, o.estado].filter(Boolean).join(" — ") || "—",
      status: o.status || "ativa",
    }));

  const resumoManutencao = dados.manutencoes
    .filter((m) => m.status === "agendada" || m.status === "em_andamento")
    .slice(0, 4)
    .map((m) => ({
      equipamento: `${m.equipamentoNome || "Equipamento"} (${m.identificacao || "—"})`,
      status: m.status === "em_andamento" ? "Em andamento" : "Agendada",
      secundario: m.dataAgendada ? "Prevista: " + m.dataAgendada.split("-").reverse().join("/") : "",
    }));

  el.innerHTML = `
    <div class="grid-indicadores">

      <div class="card-indicador">
        <div class="topo">
          <span class="eyebrow">Obras</span>
          <span class="icone-indicador">${iconeSvg('<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>')}</span>
        </div>
        <div class="valor">${i.obrasAtivas}</div>
        <div class="rotulo">Obras ativas</div>
      </div>

      <div class="card-indicador tipo-frota">
        <div class="topo">
          <span class="eyebrow">Frota</span>
          <span class="icone-indicador">${iconeSvg('<rect x="3" y="8" width="13" height="10" rx="1.5"/><path d="M16 11h3l2 2v5h-5z"/><circle cx="7.5" cy="19.5" r="1.5"/><circle cx="18" cy="19.5" r="1.5"/>')}</span>
        </div>
        <div class="valor">${i.maquinasTrabalhando}</div>
        <div class="rotulo">Máquinas trabalhando</div>
      </div>

      <div class="card-indicador tipo-frota">
        <div class="topo">
          <span class="eyebrow">Frota</span>
          <span class="icone-indicador">${iconeSvg('<rect x="1" y="7" width="14" height="10" rx="1.5"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>')}</span>
        </div>
        <div class="valor">${i.caminhoesTrabalhando}</div>
        <div class="rotulo">Caminhões trabalhando</div>
      </div>

      <div class="card-indicador ${i.emManutencao > 0 ? "tipo-atencao" : ""}">
        <div class="topo">
          <span class="eyebrow">Manutenção</span>
          <span class="icone-indicador">${iconeSvg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>')}</span>
        </div>
        <div class="valor">${i.emManutencao}</div>
        <div class="rotulo">Em manutenção</div>
      </div>

      <div class="card-indicador">
        <div class="topo">
          <span class="eyebrow">Produção</span>
          <span class="icone-indicador">${iconeSvg('<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.1-3-3L4 15.6"/>')}</span>
        </div>
        <div class="valor">${i.utilizacaoHoje}</div>
        <div class="rotulo">Utilização da frota hoje</div>
      </div>

      <div class="card-indicador ${i.alertas > 0 ? "tipo-atencao" : ""}">
        <div class="topo">
          <span class="eyebrow">Alertas</span>
          <span class="icone-indicador">${iconeSvg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>')}</span>
        </div>
        <div class="valor">${i.alertas}</div>
        <div class="rotulo">Alertas importantes</div>
      </div>

    </div>

    <div class="grid-paineis">

      <div class="painel">
        <div class="painel-titulo">
          <h2>Utilização da frota na semana</h2>
          <a href="#" data-pagina="relatorios">Ver relatórios</a>
        </div>
        <div class="grafico-barras">
          ${producaoSemana.map((d) => `
            <div class="barra-col">
              <div class="barra${d.valor === 0 ? " fraca" : ""}" style="height:${(d.valor / maxProd * 100) || 2}%" title="${d.valor}%"></div>
              <span>${d.dia}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="painel">
        <div class="painel-titulo">
          <h2>Últimos apontamentos</h2>
          <a href="#" data-pagina="apontamento">Ver todos</a>
        </div>
        <div class="lista-simples">
          ${ultimosApontamentos.length ? ultimosApontamentos.map((a) => `
            <div class="item-lista">
              <span class="item-icone">${iconeSvg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>')}</span>
              <span class="principal">${escCentral(a.obra)}</span>
              <span class="secundario">${escCentral(a.quando)}</span>
            </div>
          `).join("") : `<p class="doc-vazio">Nenhum apontamento registrado ainda.</p>`}
        </div>
      </div>

      <div class="painel">
        <div class="painel-titulo">
          <h2>Obras em andamento</h2>
          <a href="#" data-pagina="obras">Ver todas</a>
        </div>
        <div class="lista-simples">
          ${obrasAndamento.length ? obrasAndamento.map((o) => `
            <div class="item-lista">
              <span class="principal">${escCentral(o.nome)}<br><span class="secundario">${escCentral(o.cidade)}</span></span>
              <span class="badge ${o.status}">${o.status === "ativa" ? "Ativa" : o.status === "atencao" ? "Atenção" : "Parada"}</span>
            </div>
          `).join("") : `<p class="doc-vazio">Nenhuma obra cadastrada ainda.</p>`}
        </div>
      </div>

      <div class="painel">
        <div class="painel-titulo">
          <h2>Resumo de manutenção</h2>
          <a href="#" data-pagina="manutencoes">Ver todas</a>
        </div>
        <div class="lista-simples">
          ${resumoManutencao.length ? resumoManutencao.map((m) => `
            <div class="item-lista">
              <span class="item-icone">${iconeSvg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>')}</span>
              <span class="principal">${escCentral(m.equipamento)}<br><span class="secundario">${escCentral(m.status)}${m.secundario ? " · " + escCentral(m.secundario) : ""}</span></span>
            </div>
          `).join("") : `<p class="doc-vazio">Nenhuma manutenção pendente. 🎉</p>`}
        </div>
      </div>

    </div>
  `;

  el.querySelectorAll("[data-pagina]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const alvo = link.dataset.pagina;
      document.querySelector(`.nav-item[data-pagina="${alvo}"], .nav-sublink[data-pagina="${alvo}"]`)?.click();
    });
  });
}
