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
  let dadosFinanceirosAtuais = null; // { salario, totalEmprestimo, totalVale, sobra, telefone }

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
          <button type="button" class="btn-whatsapp-salario" id="btnEnviarSalarioWhats" hidden>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.39 1.3 4.86L2.05 22l5.36-1.4c1.42.77 3.01 1.18 4.63 1.18h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.55-3.7 8.25-8.25 8.25a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.18.83.85-3.1-.2-.32a8.18 8.18 0 0 1-1.25-4.36c0-4.55 3.7-8.25 8.25-8.25zm-4.55 4.6c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.7 2.6 4.12 3.64 2.02.87 2.43.7 2.87.65.44-.05 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.8-.19-.46-.39-.4-.54-.4z"/></svg>
            Enviar salário por WhatsApp
          </button>

          <h4 class="doc-subtitulo">Ativos</h4>
          <div id="listaConsignadosAtivos" class="lista-consignados">
            <p class="doc-carregando">Carregando...</p>
          </div>

          <h4 class="doc-subtitulo doc-subtitulo-quitados" id="tituloQuitados" hidden>Quitados</h4>
          <div id="listaConsignadosQuitados" class="lista-consignados"></div>
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
      const dadosFunc = snapFunc.exists() ? snapFunc.data() : {};
      const salario = Number(dadosFunc.salario) || 0;
      const telefone = dadosFunc.telefone || "";

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
      dadosFinanceirosAtuais = { salario, totalEmprestimo, totalVale, sobra, telefone };

      wrap.innerHTML = `
        ${renderCardResumoCons("Salário", formatarMoeda(salario), "")}
        ${renderCardResumoCons("Empréstimo", formatarMoeda(totalEmprestimo), "tipo-atencao")}
        ${renderCardResumoCons("Vale (mês vigente)", formatarMoeda(totalVale), "tipo-atencao")}
        ${renderCardResumoCons("Sobra", formatarMoeda(sobra), sobra < 0 ? "tipo-atencao" : "tipo-frota")}
      `;

      const botaoWhats = document.getElementById("btnEnviarSalarioWhats");
      if (botaoWhats) {
        botaoWhats.hidden = false;
        botaoWhats.onclick = () => abrirPreviaMensagemSalario();
      }
    } catch (erro) {
      console.error("Erro ao calcular resumo financeiro:", erro);
      wrap.innerHTML = `<p class="doc-erro">Não foi possível calcular o resumo.</p>`;
    }
  }

  async function abrirPreviaMensagemSalario() {
    if (!dadosFinanceirosAtuais) return;
    const { salario, totalEmprestimo, totalVale, sobra, telefone } = dadosFinanceirosAtuais;

    const digitosTelefone = String(telefone).replace(/\D/g, "");
    const telefoneValido = digitosTelefone.length >= 10;

    const primeiroNome = (funcionarioNome || "").trim().split(" ")[0] || "";
    let mensagem = `Olá ${primeiroNome}, segue o resumo do seu salário deste mês:\n\n`;
    mensagem += `Salário: ${formatarMoeda(salario)}\n`;
    if (totalEmprestimo > 0) mensagem += `Desconto de empréstimo: ${formatarMoeda(totalEmprestimo)}\n`;
    if (totalVale > 0) mensagem += `Vale retirado no mês: ${formatarMoeda(totalVale)}\n`;
    mensagem += `\nValor líquido: ${formatarMoeda(sobra)}`;

    // Busca o holerite pra mostrar junto — prioriza o do mês vigente,
    // cai pro mais recente disponível se não tiver o desse mês ainda.
    const MESES_WHATS = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    let holeriteEncontrado = null;
    try {
      const { collection, getDocs } = window.fs;
      const snap = await getDocs(
        collection(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "holerites")
      );
      const itens = [];
      snap.forEach((d) => itens.push({ id: d.id, ...d.data() }));
      itens.sort((a, b) => b.id.localeCompare(a.id));
      const hoje = new Date();
      const idMesVigente = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      holeriteEncontrado = itens.find((i) => i.id === idMesVigente) || itens[0] || null;
    } catch (erro) {
      console.error("Erro ao buscar holerite pra prévia do WhatsApp:", erro);
    }

    const modalHtml = `
      <div class="modal-overlay" id="modalWhatsPrevia">
        <div class="modal-cadastro">
          <div class="modal-cabecalho">
            <h3>Enviar por WhatsApp — ${escaparHtmlCons(funcionarioNome)}</h3>
            <button type="button" class="btn-fechar-modal" id="btnFecharWhatsPrevia">${window.iconeX ? window.iconeX() : "×"}</button>
          </div>
          ${!telefoneValido ? `<p class="doc-erro" style="margin-bottom:10px;">Esse funcionário não tem telefone cadastrado (ou está incompleto). Edita o cadastro antes de continuar, ou digita abaixo manualmente.</p>` : ""}
          <div class="campo">
            <label>Telefone (com DDD)</label>
            <input type="text" id="whatsTelefoneEditavel" value="${escaparHtmlCons(telefone)}" placeholder="Ex: 64 99999-9999">
          </div>
          <div class="campo">
            <label>Mensagem (pode editar antes de enviar)</label>
            <textarea id="whatsMensagemEditavel" rows="7" style="width:100%; background:#141414; border:1px solid #2E2E2E; border-radius:8px; padding:10px; color:var(--branco); font-size:13.5px; font-family:inherit;">${mensagem}</textarea>
          </div>
          <div class="campo">
            <label>Holerite</label>
            ${holeriteEncontrado
              ? `<div class="linha-holerite-whats">
                  <span>${MESES_WHATS[(holeriteEncontrado.mes || 1) - 1]} de ${holeriteEncontrado.ano}</span>
                  <a href="${holeriteEncontrado.url}" target="_blank" rel="noopener" class="btn-secundario" id="btnAbrirHoleriteWhats">Abrir holerite</a>
                </div>
                <p class="doc-data" style="margin-top:6px;">O WhatsApp não deixa anexar arquivo pelo link automaticamente — abre o holerite aqui, e depois anexa ele manualmente dentro da conversa (é só um clique a mais, no ícone de clipe do WhatsApp).</p>`
              : `<p class="doc-vazio">Nenhum holerite cadastrado pra esse funcionário ainda. Sobe em "Documentos" antes, se quiser mandar junto.</p>`}
          </div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarWhatsPrevia">Cancelar</button>
            <button type="button" class="btn-primario" id="btnAbrirWhatsApp">Abrir WhatsApp</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const fechar = () => document.getElementById("modalWhatsPrevia")?.remove();
    document.getElementById("btnFecharWhatsPrevia").addEventListener("click", fechar);
    document.getElementById("btnCancelarWhatsPrevia").addEventListener("click", fechar);
    document.getElementById("modalWhatsPrevia").addEventListener("click", (e) => {
      if (e.target.id === "modalWhatsPrevia") fechar();
    });
    document.getElementById("btnAbrirWhatsApp").addEventListener("click", () => {
      const telDigitado = document.getElementById("whatsTelefoneEditavel").value.replace(/\D/g, "");
      if (telDigitado.length < 10) {
        alert("Telefone inválido. Confirma o DDD + número antes de continuar.");
        return;
      }
      const comCodigoPais = telDigitado.startsWith("55") ? telDigitado : `55${telDigitado}`;
      const textoFinal = document.getElementById("whatsMensagemEditavel").value;
      window.open(`https://wa.me/${comCodigoPais}?text=${encodeURIComponent(textoFinal)}`, "_blank");
      fechar();
    });
  }
})();
