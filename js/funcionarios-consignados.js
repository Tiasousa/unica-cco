// =========================================================
// CONSIGNADOS DO FUNCIONÁRIO
// ---------------------------------------------------------
// Controla empréstimos consignados (descontados em folha).
// A parcela atual NUNCA é digitada manualmente — é calculada
// na hora, comparando a data de hoje com o mês/ano de início
// do empréstimo. Assim "6 de 24" vira "7 de 24" sozinho quando
// o mês vira, sem ninguém precisar lembrar de atualizar.
//
// Guardado em: cadastros_funcionarios/{id}/consignados/{autoId}
// =========================================================

(function () {
  const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  let funcionarioId = null;
  let funcionarioNome = "";
  let editandoId = null; // null = criando novo; senão, id do consignado em edição

  function escaparHtmlCons(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
  }

  function formatarMoeda(valor) {
    const n = Number(valor) || 0;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Calcula em qual parcela o empréstimo está, hoje, a partir do
  // mês/ano de início. Parcela 1 é o próprio mês de início.
  function calcularParcelaAtual(mesInicio, anoInicio) {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    return (anoAtual - anoInicio) * 12 + (mesAtual - mesInicio) + 1;
  }

  // Caminho inverso: a pessoa digita a parcela em que o empréstimo
  // está HOJE (o que está escrito no holerite, ex: "8 de 12") — o
  // sistema calcula o mês/ano de início por trás, pra continuar
  // avançando sozinho todo mês sem precisar de conta manual.
  function calcularInicioAPartirDaParcelaAtual(parcelaAtual) {
    const hoje = new Date();
    let mes = hoje.getMonth() + 1;
    let ano = hoje.getFullYear();
    let restante = parcelaAtual - 1;
    mes -= restante;
    while (mes < 1) {
      mes += 12;
      ano -= 1;
    }
    return { mesInicio: mes, anoInicio: ano };
  }

  window.abrirConsignadosFuncionario = async function (id, nome) {
    funcionarioId = id;
    funcionarioNome = nome || "";
    editandoId = null;
    renderModalConsignados();
    await Promise.all([carregarConsignados(), atualizarResumoFinanceiroFunc()]);
  };

  function renderModalConsignados() {
    fecharModalConsignados();

    const html = `
      <div class="modal-overlay" id="modalConsignadosOverlay">
        <div class="modal-cadastro modal-consignados">
          <div class="modal-cabecalho">
            <h3>Consignados — ${escaparHtmlCons(funcionarioNome)}</h3>
            <button class="btn-fechar-modal" id="btnFecharConsignados" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <form id="formConsignado" class="form-consignado form-consignado-linha">
            <input type="hidden" id="consignadoEditandoId" value="">
            <div class="campo campo-descricao-cons">
              <label>Descrição</label>
              <input type="text" id="consDescricao" placeholder="Ex: Empréstimo Consignado, Consignado 2..." required>
            </div>
            <div class="campo">
              <label>Valor da parcela</label>
              <input type="number" id="consValorParcela" step="0.01" min="0" required>
            </div>
            <div class="campo">
              <label>Total de parcelas</label>
              <input type="number" id="consTotalParcelas" min="1" step="1" required>
            </div>
            <div class="campo">
              <label>Parcela atual</label>
              <input type="number" id="consParcelaAtual" min="1" step="1" value="1" required title="Em qual parcela o empréstimo está hoje — o que está escrito no holerite, ex: 8 de 12 → digita 8">
            </div>
            <div class="campo campo-botao-cons">
              <button type="button" class="btn-secundario" id="btnCancelarEdicaoCons" hidden>Cancelar</button>
              <button type="submit" class="btn-primario" id="btnSalvarConsignado">Adicionar</button>
            </div>
          </form>
          <p class="doc-erro" id="consErro"></p>

          <div class="grid-indicadores grid-indicadores-cons" id="resumoFinanceiroFunc">
            <p class="doc-carregando">Carregando resumo...</p>
          </div>

          <div class="colunas-consignados">
            <div class="coluna-consignados">
              <h4 class="doc-subtitulo">Ativos</h4>
              <div id="listaConsignadosAtivos" class="lista-consignados">
                <p class="doc-carregando">Carregando...</p>
              </div>
            </div>
            <div class="coluna-consignados">
              <h4 class="doc-subtitulo doc-subtitulo-quitados" id="tituloQuitados" hidden>Quitados</h4>
              <div id="listaConsignadosQuitados" class="lista-consignados"></div>
            </div>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("btnFecharConsignados").addEventListener("click", fecharModalConsignados);
    document.getElementById("modalConsignadosOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalConsignadosOverlay") fecharModalConsignados();
    });
    document.getElementById("formConsignado").addEventListener("submit", onSubmitConsignado);
    document.getElementById("btnCancelarEdicaoCons").addEventListener("click", cancelarEdicaoConsignado);
  }

  function fecharModalConsignados() {
    document.getElementById("modalConsignadosOverlay")?.remove();
  }

  function mostrarErroCons(msg) {
    const el = document.getElementById("consErro");
    if (el) el.textContent = msg || "";
  }

  function cancelarEdicaoConsignado() {
    editandoId = null;
    document.getElementById("formConsignado").reset();
    document.getElementById("consignadoEditandoId").value = "";
    document.getElementById("consParcelaAtual").value = "1";
    document.getElementById("btnSalvarConsignado").textContent = "Adicionar";
    document.getElementById("btnCancelarEdicaoCons").hidden = true;
  }

  async function carregarConsignados() {
    const wrapAtivos = document.getElementById("listaConsignadosAtivos");
    const wrapQuitados = document.getElementById("listaConsignadosQuitados");
    const tituloQuitados = document.getElementById("tituloQuitados");
    if (!wrapAtivos) return;

    const { collection, getDocs } = window.fs;
    const snap = await getDocs(
      collection(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "consignados")
    );
    const itens = [];
    snap.forEach((d) => itens.push({ id: d.id, ...d.data() }));

    const ativos = [];
    const quitados = [];

    itens.forEach((item) => {
      const parcelaAtual = calcularParcelaAtual(item.mesInicio, item.anoInicio);
      const dados = { ...item, parcelaAtual };
      if (parcelaAtual > item.totalParcelas) {
        quitados.push(dados);
      } else {
        ativos.push(dados);
      }
    });

    wrapAtivos.innerHTML = ativos.length
      ? ativos.map((item) => renderLinhaConsignado(item, false)).join("")
      : `<p class="doc-vazio">Nenhum consignado ativo.</p>`;

    tituloQuitados.hidden = quitados.length === 0;
    wrapQuitados.innerHTML = quitados.map((item) => renderLinhaConsignado(item, true)).join("");

    wrapAtivos.querySelectorAll("[data-editar-cons]").forEach((btn) => {
      btn.addEventListener("click", () => iniciarEdicaoConsignado(btn.dataset.editarCons, itens));
    });
    [wrapAtivos, wrapQuitados].forEach((wrap) => {
      wrap.querySelectorAll("[data-excluir-cons]").forEach((btn) => {
        btn.addEventListener("click", () => excluirConsignado(btn.dataset.excluirCons));
      });
    });
  }

  function renderLinhaConsignado(item, quitado) {
    const parcelaExibida = Math.min(item.parcelaAtual, item.totalParcelas);
    const pct = Math.min(100, Math.round((parcelaExibida / item.totalParcelas) * 100));
    return `
      <div class="linha-consignado ${quitado ? "consignado-quitado" : ""}">
        <div class="linha-doc-info">
          <strong>${escaparHtmlCons(item.descricao)}</strong>
          <span class="cons-valor">${formatarMoeda(item.valorParcela)} / mês</span>
          <div class="cons-progresso">
            <div class="cons-progresso-barra"><div style="width:${pct}%"></div></div>
            <span>${quitado ? "Quitado" : `${parcelaExibida} de ${item.totalParcelas}`}</span>
          </div>
        </div>
        <div class="cons-acoes">
          ${quitado ? "" : `<button type="button" class="btn-icone" title="Editar" data-editar-cons="${item.id}">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'}</button>`}
          <button type="button" class="btn-icone" title="Excluir" data-excluir-cons="${item.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>`;
  }

  function iniciarEdicaoConsignado(id, itens) {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    editandoId = id;
    document.getElementById("consignadoEditandoId").value = id;
    document.getElementById("consDescricao").value = item.descricao || "";
    document.getElementById("consValorParcela").value = item.valorParcela || "";
    document.getElementById("consTotalParcelas").value = item.totalParcelas || "";
    document.getElementById("consParcelaAtual").value = String(
      calcularParcelaAtual(item.mesInicio, item.anoInicio)
    );
    document.getElementById("btnSalvarConsignado").textContent = "Salvar alterações";
    document.getElementById("btnCancelarEdicaoCons").hidden = false;
    document.getElementById("formConsignado").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSubmitConsignado(e) {
    e.preventDefault();
    mostrarErroCons("");

    const descricao = document.getElementById("consDescricao").value.trim();
    const valorParcela = Number(document.getElementById("consValorParcela").value);
    const totalParcelas = Number(document.getElementById("consTotalParcelas").value);
    const parcelaAtualDigitada = Number(document.getElementById("consParcelaAtual").value);

    if (!descricao || !valorParcela || !totalParcelas || !parcelaAtualDigitada) {
      mostrarErroCons("Preenche descrição, valor da parcela, total de parcelas e parcela atual.");
      return;
    }
    if (parcelaAtualDigitada > totalParcelas) {
      mostrarErroCons("A parcela atual não pode ser maior que o total de parcelas.");
      return;
    }

    const { mesInicio, anoInicio } = calcularInicioAPartirDaParcelaAtual(parcelaAtualDigitada);

    try {
      const { collection, doc, addDoc, updateDoc, serverTimestamp } = window.fs;
      const dados = { descricao, valorParcela, totalParcelas, mesInicio, anoInicio };

      if (editandoId) {
        await updateDoc(
          doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "consignados", editandoId),
          dados
        );
      } else {
        await addDoc(
          collection(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "consignados"),
          { ...dados, criadoEm: serverTimestamp() }
        );
      }

      cancelarEdicaoConsignado();
      await Promise.all([carregarConsignados(), atualizarResumoFinanceiroFunc()]);
    } catch (erro) {
      console.error("Erro ao salvar consignado:", erro);
      mostrarErroCons("Não foi possível salvar. Tente novamente.");
    }
  }

  async function excluirConsignado(id) {
    const confirmar = confirm("Excluir este consignado? Essa ação não pode ser desfeita.");
    if (!confirmar) return;

    try {
      const { doc, deleteDoc } = window.fs;
      await deleteDoc(doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "consignados", id));
      await Promise.all([carregarConsignados(), atualizarResumoFinanceiroFunc()]);
    } catch (erro) {
      console.error("Erro ao excluir consignado:", erro);
      mostrarErroCons("Não foi possível excluir. Tente novamente.");
    }
  }

  // ---------- Resumo financeiro (Salário / Empréstimo / Vale / Sobra) ----------

  function renderCardResumoCons(titulo, valor, classe) {
    return `
      <article class="card-indicador ${classe}">
        <div class="topo"><span class="eyebrow">${titulo}</span></div>
        <div class="valor">${valor}</div>
      </article>`;
  }

  async function atualizarResumoFinanceiroFunc() {
    const wrap = document.getElementById("resumoFinanceiroFunc");
    if (!wrap) return;

    try {
      const { doc, getDoc, collection, getDocs } = window.fs;

      // Salário — vem do cadastro do funcionário
      const snapFunc = await getDoc(doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId));
      const salario = snapFunc.exists() ? Number(snapFunc.data().salario) || 0 : 0;

      // Total de empréstimo — soma das parcelas dos consignados ainda ativos
      const snapCons = await getDocs(
        collection(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "consignados")
      );
      let totalEmprestimo = 0;
      snapCons.forEach((d) => {
        const item = d.data();
        const parcelaAtual = calcularParcelaAtual(item.mesInicio, item.anoInicio);
        if (parcelaAtual <= item.totalParcelas) {
          totalEmprestimo += Number(item.valorParcela) || 0;
        }
      });

      // Vale do mês vigente — vem do módulo Vale (vale.js)
      const totalVale = typeof window.obterTotalValeMesFuncionario === "function"
        ? await window.obterTotalValeMesFuncionario(funcionarioId)
        : 0;

      const sobra = salario - totalEmprestimo - totalVale;

      wrap.innerHTML = `
        ${renderCardResumoCons("Salário", formatarMoeda(salario), "")}
        ${renderCardResumoCons("Empréstimo", formatarMoeda(totalEmprestimo), "tipo-atencao")}
        ${renderCardResumoCons("Vale (mês vigente)", formatarMoeda(totalVale), "tipo-atencao")}
        ${renderCardResumoCons("Sobra", formatarMoeda(sobra), sobra < 0 ? "tipo-atencao" : "tipo-frota")}
      `;
    } catch (erro) {
      console.error("Erro ao calcular resumo financeiro:", erro);
      wrap.innerHTML = `<p class="doc-erro">Não foi possível calcular o resumo.</p>`;
    }
  }
})();
