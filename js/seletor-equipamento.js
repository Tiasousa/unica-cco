// =========================================================
// SELETOR VISUAL DE EQUIPAMENTO
// ---------------------------------------------------------
// Componente compartilhado: abre um seletor com foto + nome de
// cada máquina/caminhão, agrupado em duas seções (Máquinas
// acima, Caminhões abaixo). Clicar num card seleciona e fecha.
// Usado hoje em Manutenções; pensado pra ser reaproveitado em
// qualquer outra tela que precise escolher UM equipamento
// (diferente do Apontamento, que seleciona vários de uma vez
// com checkbox e por isso usa seu próprio grid).
//
// Uso:
//   window.abrirSeletorEquipamentoVisual(listaEquipamentos, (equip) => { ... });
//
// Cada item da lista precisa ter: { id, colecao, nome,
// identificacao, categoriaRotulo, fotoUrl }
// =========================================================

function escSeletorEquip(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function fecharSeletorEquipamentoVisual() {
  document.getElementById("seletorEquipOverlay")?.remove();
}

function renderCardSeletorEquip(eq) {
  const chave = `${eq.colecao}:${eq.id}`;
  return `
    <button type="button" class="card-seletor-equip" data-chave-seletor="${escSeletorEquip(chave)}">
      ${eq.fotoUrl
        ? `<div class="apont-card-foto"><img src="${escSeletorEquip(eq.fotoUrl)}" alt="" loading="lazy"></div>`
        : `<div class="apont-card-foto apont-card-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/><path d="M8 6l1.5-2h5L16 6"/></svg></div>`}
      <strong>${escSeletorEquip(eq.nome)}</strong>
      <span class="card-seletor-equip-ident">${escSeletorEquip(eq.identificacao)}</span>
    </button>`;
}

window.abrirSeletorEquipamentoVisual = function (equipamentos, onSelecionar) {
  fecharSeletorEquipamentoVisual();

  const maquinas = equipamentos.filter((e) => e.colecao === "maquinas");
  const caminhoes = equipamentos.filter((e) => e.colecao === "caminhoes");

  const html = `
    <div class="modal-overlay" id="seletorEquipOverlay">
      <div class="modal-cadastro modal-largo">
        <div class="modal-cabecalho">
          <h3>Selecione o equipamento</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharSeletorEquip">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>

        <input type="search" id="buscaSeletorEquip" placeholder="Buscar por nome ou identificação..." class="busca-seletor-equip">

        <div id="conteudoSeletorEquip">
          ${maquinas.length ? `
            <h4 class="doc-subtitulo">Máquinas</h4>
            <div class="grid-seletor-equip" data-grupo="maquinas">
              ${maquinas.map(renderCardSeletorEquip).join("")}
            </div>` : ""}
          ${caminhoes.length ? `
            <h4 class="doc-subtitulo">Caminhões</h4>
            <div class="grid-seletor-equip" data-grupo="caminhoes">
              ${caminhoes.map(renderCardSeletorEquip).join("")}
            </div>` : ""}
          ${equipamentos.length === 0 ? `<p class="doc-vazio">Nenhum equipamento cadastrado.</p>` : ""}
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", html);

  const overlay = document.getElementById("seletorEquipOverlay");
  document.getElementById("btnFecharSeletorEquip").addEventListener("click", fecharSeletorEquipamentoVisual);
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "seletorEquipOverlay") fecharSeletorEquipamentoVisual();
  });

  function ligarCliqueCards() {
    overlay.querySelectorAll("[data-chave-seletor]").forEach((card) => {
      card.addEventListener("click", () => {
        const chave = card.dataset.chaveSeletor;
        const [colecao, id] = chave.split(":");
        const equip = equipamentos.find((e) => e.colecao === colecao && e.id === id);
        if (equip) {
          fecharSeletorEquipamentoVisual();
          onSelecionar(equip);
        }
      });
    });
  }
  ligarCliqueCards();

  document.getElementById("buscaSeletorEquip").addEventListener("input", (e) => {
    const termo = e.target.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const filtrados = equipamentos.filter((eq) =>
      `${eq.nome} ${eq.identificacao}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(termo)
    );

    const maquinasF = filtrados.filter((e) => e.colecao === "maquinas");
    const caminhoesF = filtrados.filter((e) => e.colecao === "caminhoes");

    document.getElementById("conteudoSeletorEquip").innerHTML = `
      ${maquinasF.length ? `
        <h4 class="doc-subtitulo">Máquinas</h4>
        <div class="grid-seletor-equip" data-grupo="maquinas">
          ${maquinasF.map(renderCardSeletorEquip).join("")}
        </div>` : ""}
      ${caminhoesF.length ? `
        <h4 class="doc-subtitulo">Caminhões</h4>
        <div class="grid-seletor-equip" data-grupo="caminhoes">
          ${caminhoesF.map(renderCardSeletorEquip).join("")}
        </div>` : ""}
      ${filtrados.length === 0 ? `<p class="doc-vazio">Nenhum equipamento encontrado.</p>` : ""}
    `;
    ligarCliqueCards();
  });
};
