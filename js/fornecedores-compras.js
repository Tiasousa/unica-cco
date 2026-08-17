// =========================================================
// COMPRAS DO FORNECEDOR
// ---------------------------------------------------------
// Controla compras feitas com um fornecedor, parceladas ou não.
// A parcela atual NUNCA é digitada manualmente — é calculada
// na hora, comparando a data de hoje com o mês/ano de início
// do empréstimo. Assim "6 de 24" vira "7 de 24" sozinho quando
// o mês vira, sem ninguém precisar lembrar de atualizar.
//
// Guardado em: cadastros_fornecedores/{id}/compras/{autoId}
// =========================================================

(function () {
  const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  let fornecedorId = null;
  let fornecedorNome = "";
  let editandoId = null; // null = criando novo; senão, id da compra em edição

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
  // está HOJE, se já tiver parcelas pagas, ex: "8 de 12" — o
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

  window.abrirComprasFornecedor = async function (id, nome) {
    fornecedorId = id;
    fornecedorNome = nome || "";
    editandoId = null;
    renderModalCompras();
    await carregarCompras();
  };

  function renderModalCompras() {
    fecharModalCompras();

    const html = `
      <div class="modal-overlay" id="modalComprasOverlay">
        <div class="modal-cadastro modal-compras">
          <div class="modal-cabecalho">
            <h3>Compras — ${escaparHtmlCons(fornecedorNome)}</h3>
            <button class="btn-fechar-modal" id="btnFecharCompras" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <form id="formCompra" class="form-compra form-compra-linha">
            <input type="hidden" id="compraEditandoId" value="">
            <div class="campo campo-descricao-comp">
              <label>Descrição</label>
              <input type="text" id="compDescricao" placeholder="Ex: Compra de pneus, Compra de óleo..." required>
            </div>
            <div class="campo">
              <label>Valor da parcela</label>
              <input type="number" id="compValorParcela" step="0.01" min="0" required>
            </div>
            <div class="campo">
              <label>Total de parcelas</label>
              <input type="number" id="compTotalParcelas" min="1" step="1" required>
            </div>
            <div class="campo">
              <label>Parcela atual</label>
              <input type="number" id="compParcelaAtual" min="1" step="1" value="1" required title="Em qual parcela a compra está hoje, se já vier de antes — ex: 3 de 12 → digita 3">
            </div>
            <div class="campo campo-botao-comp">
              <button type="button" class="btn-secundario" id="btnCancelarEdicaoComp" hidden>Cancelar</button>
              <button type="submit" class="btn-primario" id="btnSalvarCompra">Adicionar</button>
            </div>
          </form>
          <p class="doc-erro" id="compErro"></p>

          <h4 class="doc-subtitulo">Em aberto</h4>
          <div id="listaComprasAtivas" class="lista-compras">
            <p class="doc-carregando">Carregando...</p>
          </div>

          <h4 class="doc-subtitulo doc-subtitulo-quitados" id="tituloQuitados" hidden>Quitados</h4>
          <div id="listaComprasQuitadas" class="lista-compras"></div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("btnFecharCompras").addEventListener("click", fecharModalCompras);
    document.getElementById("modalComprasOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalComprasOverlay") fecharModalCompras();
    });
    document.getElementById("formCompra").addEventListener("submit", onSubmitCompra);
    document.getElementById("btnCancelarEdicaoComp").addEventListener("click", cancelarEdicaoCompra);
  }

  function fecharModalCompras() {
    document.getElementById("modalComprasOverlay")?.remove();
  }

  function mostrarErroComp(msg) {
    const el = document.getElementById("compErro");
    if (el) el.textContent = msg || "";
  }

  function cancelarEdicaoCompra() {
    editandoId = null;
    document.getElementById("formCompra").reset();
    document.getElementById("compraEditandoId").value = "";
    document.getElementById("compParcelaAtual").value = "1";
    document.getElementById("btnSalvarCompra").textContent = "Adicionar";
    document.getElementById("btnCancelarEdicaoComp").hidden = true;
  }

  async function carregarCompras() {
    const wrapAtivos = document.getElementById("listaComprasAtivas");
    const wrapQuitados = document.getElementById("listaComprasQuitadas");
    const tituloQuitados = document.getElementById("tituloQuitados");
    if (!wrapAtivos) return;

    const { collection, getDocs } = window.fs;
    const snap = await getDocs(
      collection(window.firebaseDb, "cadastros_fornecedores", fornecedorId, "compras")
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
      ? ativos.map((item) => renderLinhaCompra(item, false)).join("")
      : `<p class="doc-vazio">Nenhuma compra em aberto.</p>`;

    tituloQuitados.hidden = quitados.length === 0;
    wrapQuitados.innerHTML = quitados.map((item) => renderLinhaCompra(item, true)).join("");

    wrapAtivos.querySelectorAll("[data-editar-comp]").forEach((btn) => {
      btn.addEventListener("click", () => iniciarEdicaoCompra(btn.dataset.editarComp, itens));
    });
    [wrapAtivos, wrapQuitados].forEach((wrap) => {
      wrap.querySelectorAll("[data-excluir-comp]").forEach((btn) => {
        btn.addEventListener("click", () => excluirCompra(btn.dataset.excluirComp));
      });
    });
  }

  function renderLinhaCompra(item, quitado) {
    const parcelaExibida = Math.min(item.parcelaAtual, item.totalParcelas);
    const pct = Math.min(100, Math.round((parcelaExibida / item.totalParcelas) * 100));
    return `
      <div class="linha-compra ${quitado ? "compra-quitada" : ""}">
        <div class="linha-doc-info">
          <strong>${escaparHtmlCons(item.descricao)}</strong>
          <span class="comp-valor">${formatarMoeda(item.valorParcela)} / mês</span>
          <div class="comp-progresso">
            <div class="comp-progresso-barra"><div style="width:${pct}%"></div></div>
            <span>${quitado ? "Quitado" : `${parcelaExibida} de ${item.totalParcelas}`}</span>
          </div>
        </div>
        <div class="comp-acoes">
          ${quitado ? "" : `<button type="button" class="btn-icone" title="Editar" data-editar-comp="${item.id}">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'}</button>`}
          <button type="button" class="btn-icone" title="Excluir" data-excluir-comp="${item.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>`;
  }

  function iniciarEdicaoCompra(id, itens) {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    editandoId = id;
    document.getElementById("compraEditandoId").value = id;
    document.getElementById("compDescricao").value = item.descricao || "";
    document.getElementById("compValorParcela").value = item.valorParcela || "";
    document.getElementById("compTotalParcelas").value = item.totalParcelas || "";
    document.getElementById("compParcelaAtual").value = String(
      calcularParcelaAtual(item.mesInicio, item.anoInicio)
    );
    document.getElementById("btnSalvarCompra").textContent = "Salvar alterações";
    document.getElementById("btnCancelarEdicaoComp").hidden = false;
    document.getElementById("formCompra").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSubmitCompra(e) {
    e.preventDefault();
    mostrarErroComp("");

    const descricao = document.getElementById("compDescricao").value.trim();
    const valorParcela = Number(document.getElementById("compValorParcela").value);
    const totalParcelas = Number(document.getElementById("compTotalParcelas").value);
    const parcelaAtualDigitada = Number(document.getElementById("compParcelaAtual").value);

    if (!descricao || !valorParcela || !totalParcelas || !parcelaAtualDigitada) {
      mostrarErroComp("Preenche descrição, valor da parcela, total de parcelas e parcela atual.");
      return;
    }
    if (parcelaAtualDigitada > totalParcelas) {
      mostrarErroComp("A parcela atual não pode ser maior que o total de parcelas.");
      return;
    }

    const { mesInicio, anoInicio } = calcularInicioAPartirDaParcelaAtual(parcelaAtualDigitada);

    try {
      const { collection, doc, addDoc, updateDoc, serverTimestamp } = window.fs;
      const dados = { descricao, valorParcela, totalParcelas, mesInicio, anoInicio };

      if (editandoId) {
        await updateDoc(
          doc(window.firebaseDb, "cadastros_fornecedores", fornecedorId, "compras", editandoId),
          dados
        );
      } else {
        await addDoc(
          collection(window.firebaseDb, "cadastros_fornecedores", fornecedorId, "compras"),
          { ...dados, criadoEm: serverTimestamp() }
        );
      }

      cancelarEdicaoCompra();
      await carregarCompras();
    } catch (erro) {
      console.error("Erro ao salvar compra:", erro);
      mostrarErroComp("Não foi possível salvar. Tente novamente.");
    }
  }

  async function excluirCompra(id) {
    const confirmar = confirm("Excluir esta compra? Essa ação não pode ser desfeita.");
    if (!confirmar) return;

    try {
      const { doc, deleteDoc } = window.fs;
      await deleteDoc(doc(window.firebaseDb, "cadastros_fornecedores", fornecedorId, "compras", id));
      await carregarCompras();
    } catch (erro) {
      console.error("Erro ao excluir compra:", erro);
      mostrarErroComp("Não foi possível excluir. Tente novamente.");
    }
  }
})();
