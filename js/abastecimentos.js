/* =========================================================
   ABASTECIMENTOS
   Única Construtora — Centro Operacional
   Histórico, lançamento em lote, detalhes e cancelamento
   ========================================================= */

const ABAST_CONFIG = {
  maquinas: {
    colecao: "maquinas",
    tipo: "maquina",
    tipoRotulo: "Máquina",
    campoIdentificador: "identificador",
    campoMedidor: "horimetroAtual",
    medidorRotulo: "Horímetro",
    unidade: "h",
  },

  caminhoes: {
    colecao: "caminhoes",
    tipo: "caminhao",
    tipoRotulo: "Caminhão",
    campoIdentificador: "placa",
    campoMedidor: "kmAtual",
    medidorRotulo: "Quilometragem",
    unidade: "km",
  },
};


let abastEstado = criarEstadoAbastecimentos();


function criarEstadoAbastecimentos() {
  return {
    tela: "historico",

    etapa: 1,

    obras: [],

    equipamentos: [],

    abastecimentos: [],

    selecionados: new Set(),

    filtroTipo: "todos",

    buscaEquipamento: "",

    buscaHistorico: "",

    obraFiltro: "",

    periodoFiltro: "mes",

    dadosGerais: {
      obraId: "",
      data: dataHojeAbast(),
      responsavel: "",
    },

    salvando: false,
  };
}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escAbast(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normAbast(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function numAbast(valor) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


function fmtNumeroAbast(valor) {
  const numero = numAbast(valor);

  if (numero === null) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero);
}


function dataHojeAbast() {
  const hoje = new Date();

  const ano = hoje.getFullYear();

  const mes = String(
    hoje.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    hoje.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function dataLocalAbast(dataIso) {
  if (!dataIso) {
    return null;
  }

  const partes = String(dataIso)
    .split("-")
    .map(Number);

  if (
    partes.length !== 3 ||
    partes.some((parte) => !Number.isFinite(parte))
  ) {
    return null;
  }

  return new Date(
    partes[0],
    partes[1] - 1,
    partes[2],
    12,
    0,
    0
  );
}


function fmtDataAbast(dataIso) {
  const data = dataLocalAbast(dataIso);

  if (!data) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(data);
}


function usuarioAtualAbast() {
  const nome =
    document
      .getElementById("usuarioNome")
      ?.textContent
      ?.trim() || "";

  if (
    nome &&
    nome !== "—" &&
    nome !== "Usuário"
  ) {
    return nome;
  }

  return "";
}


function chaveEquipAbast(item) {
  return `${item.colecao}:${item.id}`;
}


function verificarFirebaseAbast() {
  if (
    !window.firebaseDb ||
    !window.fs
  ) {
    throw new Error(
      "O Firebase ainda não foi inicializado."
    );
  }
}


function statusCanceladoAbast(registro) {
  return (
    registro.ativo === false ||
    registro.status === "cancelado"
  );
}


function itensRegistroAbast(registro) {
  return Array.isArray(registro.itens)
    ? registro.itens
    : [];
}


function totalLitrosRegistroAbast(registro) {
  const totalSalvo =
    numAbast(registro.totalLitros);

  if (totalSalvo !== null) {
    return totalSalvo;
  }

  return itensRegistroAbast(registro)
    .reduce((soma, item) => {
      return (
        soma +
        (numAbast(item.litros) || 0)
      );
    }, 0);
}


/* =========================================================
   ESTILOS EXCLUSIVOS DO MÓDULO
   ========================================================= */

function injetarEstilosAbastecimentos() {
  if (
    document.getElementById(
      "estilosAbastecimentosV2"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "estilosAbastecimentosV2";

  style.textContent = `
    .abast-modulo {
      padding-bottom: 96px;
    }

    .abast-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 20px;
    }

    .abast-topo h2 {
      font-size: 21px;
      margin-bottom: 5px;
    }

    .abast-topo p {
      color: #85857f;
      font-size: 12.5px;
    }

    .abast-acoes-topo {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .abast-resumo-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .abast-resumo-card {
      background: var(--preto-card);
      border: 1px solid var(--borda-card);
      border-left: 3px solid var(--amarelo);
      border-radius: var(--radius);
      padding: 16px;
    }

    .abast-resumo-card span {
      display: block;
      color: #777771;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      margin-bottom: 9px;
    }

    .abast-resumo-card strong {
      font-size: 23px;
      line-height: 1;
    }

    .abast-resumo-card small {
      color: #8b8b85;
      font-size: 11px;
      margin-left: 4px;
    }

    .abast-filtros-historico {
      display: grid;
      grid-template-columns:
        minmax(220px, 1fr)
        minmax(180px, 0.55fr)
        minmax(160px, 0.45fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .abast-filtros-historico input,
    .abast-filtros-historico select {
      width: 100%;
      min-height: 42px;
      background: var(--preto-card);
      border: 1px solid var(--borda-card);
      color: var(--branco);
      border-radius: var(--radius-sm);
      padding: 10px 13px;
      font-size: 13px;
    }

    .abast-historico-lista {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .abast-historico-card {
      position: relative;
      background: var(--preto-card);
      border: 1px solid var(--borda-card);
      border-radius: var(--radius);
      padding: 17px;
      text-align: left;
      color: var(--branco);
      transition:
        transform var(--transicao),
        border-color var(--transicao);
    }

    .abast-historico-card:hover {
      transform: translateY(-1px);
      border-color: #3a3b40;
    }

    .abast-historico-card.cancelado {
      opacity: 0.62;
      border-left: 3px solid var(--perigo);
    }

    .abast-historico-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 13px;
    }

    .abast-historico-data {
      font-size: 15px;
      font-weight: 800;
    }

    .abast-status {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      border-radius: 999px;
      padding: 4px 8px;
      color: var(--sucesso);
      border: 1px solid
        rgba(52, 199, 123, 0.35);
      background:
        rgba(52, 199, 123, 0.07);
    }

    .abast-status.cancelado {
      color: #ff9c9c;
      border-color:
        rgba(239, 68, 68, 0.35);
      background:
        rgba(239, 68, 68, 0.07);
    }

    .abast-historico-obra {
      display: block;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .abast-historico-responsavel {
      display: block;
      color: #85857f;
      font-size: 11.5px;
      margin-bottom: 14px;
    }

    .abast-historico-rodape {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding-top: 12px;
      border-top:
        1px solid var(--borda-suave);
    }

    .abast-historico-rodape span {
      display: flex;
      flex-direction: column;
      gap: 3px;
      color: #70716b;
      font-size: 10px;
    }

    .abast-historico-rodape strong {
      color: var(--branco);
      font-size: 13px;
    }

    .abast-vazio {
      padding: 55px 20px;
      text-align: center;
      color: #777771;
      background: var(--preto-card);
      border: 1px dashed #303136;
      border-radius: var(--radius);
    }

    .abast-dados-gerais {
      display: grid;
      grid-template-columns:
        minmax(220px, 1.4fr)
        minmax(160px, 0.65fr)
        minmax(220px, 1fr);
      gap: 14px;
      padding: 18px;
      margin-bottom: 18px;
      background: var(--preto-card);
      border: 1px solid var(--borda-card);
      border-radius: var(--radius);
    }

    .abast-dados-gerais .campo,
    .abast-campos-lancamento .campo {
      margin-bottom: 0;
    }

    .abast-dados-gerais input,
    .abast-dados-gerais select,
    .abast-campos-lancamento input {
      width: 100%;
      min-height: 44px;
      background: #141414;
      border: 1px solid #2e2e2e;
      color: var(--branco);
      border-radius: var(--radius-sm);
      padding: 11px 13px;
      font-size: 14px;
    }

    .abast-selecao-topo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .abast-busca {
      flex: 1;
    }

    .abast-grid-equipamentos {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .abast-card-equipamento {
      position: relative;
      min-height: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 16px;
      text-align: left;
      color: var(--branco);
      background: var(--preto-card);
      border: 1px solid var(--borda-card);
      border-radius: var(--radius);
    }

    .abast-card-equipamento.selecionado {
      background:
        linear-gradient(
          145deg,
          rgba(52, 199, 123, 0.13),
          rgba(52, 199, 123, 0.035)
        );
      border-color: var(--sucesso);
    }

    .abast-card-check {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      background: #18191c;
      border: 1px solid #34353a;
      border-radius: 50%;
      font-weight: 900;
    }

    .abast-card-equipamento.selecionado
    .abast-card-check {
      color: #07150d;
      background: var(--sucesso);
      border-color: var(--sucesso);
    }

    .abast-card-tipo {
      margin-bottom: 2px;
      color: #777871;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .cabecalho-card-equip {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .cabecalho-card-equip-texto {
      min-width: 0;
      flex: 1;
    }

    .cabecalho-card-equip-texto strong {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .abast-card-foto {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #1c1d20;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .abast-card-foto img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .abast-card-foto-vazia svg {
      width: 18px;
      height: 18px;
      color: #4A4A44;
    }

    .abast-card-equipamento strong {
      max-width: calc(100% - 28px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
    }

    .abast-card-identificacao {
      color: #969690;
      font-size: 12px;
      margin-top: 4px;
    }

    .abast-card-medidor {
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 8px;
      padding-top: 12px;
      margin-top: auto;
      border-top:
        1px solid var(--borda-suave);
    }

    .abast-card-medidor small {
      color: #686963;
      font-size: 10px;
    }

    .abast-card-medidor b {
      font-size: 12.5px;
    }

    .abast-barra-acao {
      position: fixed;
      right: 0;
      bottom: 0;
      left: var(--sidebar-w);
      z-index: 29;
      min-height: 74px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 12px 32px;
      background:
        rgba(13, 14, 16, 0.96);
      border-top: 1px solid #292a2e;
      backdrop-filter: blur(10px);
    }

    .sidebar.recolhida
    ~ .btn-recolher
    ~ .conteudo
    .abast-barra-acao {
      left: var(--sidebar-w-collapsed);
    }

    .abast-barra-acao div {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .abast-barra-acao span {
      color: #777771;
      font-size: 11px;
    }

    .abast-resumo-lancamento {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .abast-resumo-lancamento > div {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 13px 15px;
      background: #101114;
      border: 1px solid var(--borda-card);
      border-radius: var(--radius-sm);
    }

    .abast-resumo-lancamento span {
      color: #72736e;
      font-size: 10px;
      text-transform: uppercase;
    }

    .abast-resumo-lancamento strong {
      font-size: 13px;
    }

    .abast-lista-lancamentos {
      display: grid;
      gap: 11px;
    }

    .abast-item-lancamento {
      padding: 17px;
      background: var(--preto-card);
      border: 1px solid var(--borda-card);
      border-left: 3px solid var(--sucesso);
      border-radius: var(--radius);
    }

    .abast-item-cabecalho {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }

    .abast-item-cabecalho span {
      display: block;
      color: #7d7d77;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .abast-item-cabecalho h3 {
      font-size: 15px;
    }

    .abast-medidor-anterior {
      text-align: right;
    }

    .abast-campos-lancamento {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .abast-erro {
      min-height: 18px;
      margin-top: 12px;
      color: #ff9c9c;
      font-size: 12.5px;
    }

    .abast-acoes-finais {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 16px;
    }

    .abast-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 120;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0, 0, 0, 0.72);
    }

    .abast-modal {
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      overflow: auto;
      background: var(--preto-card);
      border: 1px solid #303136;
      border-radius: 14px;
      padding: 22px;
    }

    .abast-modal-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 18px;
    }

    .abast-modal-topo h3 {
      font-size: 17px;
    }

    .abast-modal-fechar {
      width: 32px;
      height: 32px;
      background: transparent;
      border: 1px solid var(--borda-card);
      color: #aaa;
      border-radius: 8px;
    }

    .abast-detalhe-resumo {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .abast-detalhe-resumo div {
      padding: 11px;
      background: #101114;
      border: 1px solid var(--borda-suave);
      border-radius: 8px;
    }

    .abast-detalhe-resumo span {
      display: block;
      color: #71716c;
      font-size: 9px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .abast-detalhe-resumo strong {
      font-size: 12px;
    }

    .abast-detalhe-itens {
      display: grid;
      gap: 9px;
    }

    .abast-detalhe-item {
      padding: 13px;
      background: #101114;
      border: 1px solid var(--borda-suave);
      border-radius: 9px;
    }

    .abast-detalhe-item-topo {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 9px;
    }

    .abast-detalhe-item-topo strong {
      font-size: 13px;
    }

    .abast-detalhe-item-topo span {
      color: var(--amarelo);
      font-weight: 800;
      font-size: 13px;
    }

    .abast-detalhe-medidor {
      color: #898983;
      font-size: 11.5px;
    }

    .abast-modal-acoes {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
      margin-top: 18px;
      padding-top: 15px;
      border-top:
        1px solid var(--borda-suave);
    }

    .abast-btn-perigo {
      background:
        rgba(239, 68, 68, 0.09);
      border: 1px solid
        rgba(239, 68, 68, 0.35);
      color: #ff9c9c;
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-weight: 700;
    }

    .abast-sucesso {
      min-height: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .abast-sucesso-icone {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sucesso);
      color: #07150d;
      border-radius: 50%;
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 16px;
    }

    .abast-sucesso p {
      color: #8b8b85;
      font-size: 13px;
      margin: 8px 0 20px;
    }

    .abast-cancelado-info {
      color: #ff9c9c;
      font-size: 11px;
      margin-top: 8px;
    }

    .abast-carregando {
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #777771;
    }

    .abast-confirmacao {
      padding: 15px;
      background:
        rgba(239, 68, 68, 0.06);
      border: 1px solid
        rgba(239, 68, 68, 0.25);
      border-radius: 9px;
      color: #d8d8d3;
      font-size: 12.5px;
      line-height: 1.5;
      margin-bottom: 14px;
    }

    @media (max-width: 1180px) {
      .abast-grid-equipamentos {
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
      }

      .abast-resumo-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .abast-historico-lista {
        grid-template-columns: 1fr;
      }

      .abast-filtros-historico {
        grid-template-columns: 1fr 1fr;
      }

      .abast-filtros-historico input {
        grid-column: 1 / -1;
      }

      .abast-dados-gerais {
        grid-template-columns: 1fr 1fr;
      }

      .abast-dados-gerais
      .campo:first-child {
        grid-column: 1 / -1;
      }

      .abast-selecao-topo {
        align-items: stretch;
        flex-direction: column;
      }

      .abast-grid-equipamentos {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .abast-barra-acao {
        left: 0;
        padding-left: 16px;
        padding-right: 16px;
      }
    }

    @media (max-width: 560px) {
      .abast-topo {
        flex-direction: column;
      }

      .abast-acoes-topo {
        width: 100%;
      }

      .abast-acoes-topo button {
        flex: 1;
      }

      .abast-resumo-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .abast-resumo-card {
        padding: 13px;
      }

      .abast-resumo-card strong {
        font-size: 19px;
      }

      .abast-filtros-historico {
        grid-template-columns: 1fr;
      }

      .abast-filtros-historico input {
        grid-column: auto;
      }

      .abast-dados-gerais,
      .abast-resumo-lancamento,
      .abast-campos-lancamento,
      .abast-detalhe-resumo {
        grid-template-columns: 1fr;
      }

      .abast-dados-gerais
      .campo:first-child {
        grid-column: auto;
      }

      .abast-grid-equipamentos {
        gap: 8px;
      }

      .abast-card-equipamento {
        min-height: 145px;
        padding: 13px;
      }

      .abast-barra-acao span {
        display: none;
      }

      .abast-item-cabecalho {
        flex-direction: column;
      }

      .abast-medidor-anterior {
        text-align: left;
      }

      .abast-acoes-finais,
      .abast-modal-acoes {
        flex-direction: column-reverse;
      }

      .abast-acoes-finais button,
      .abast-modal-acoes button {
        width: 100%;
      }
    }

    @media (max-width: 370px) {
      .abast-grid-equipamentos,
      .abast-resumo-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

async function renderAbastecimentos() {
  injetarEstilosAbastecimentos();

  const area =
    document.getElementById(
      "areaPagina"
    );

  if (!area) {
    return;
  }

  abastEstado =
    criarEstadoAbastecimentos();

  area.innerHTML = `
    <section class="abast-modulo">

      <div id="abastConteudo">

        <div class="abast-carregando">

          <div
            class="loading-spinner"
            aria-hidden="true"
          ></div>

          <p>
            Carregando abastecimentos...
          </p>

        </div>

      </div>

    </section>
  `;

  try {
    await carregarBaseAbastecimentos();

    renderHistoricoAbastecimentos();

  } catch (erro) {
    console.error(
      "Erro no módulo de abastecimentos:",
      erro
    );

    renderErroAbastecimentos(erro);
  }
}


window.renderAbastecimentos =
  renderAbastecimentos;


/* =========================================================
   CARREGAMENTO DOS DADOS
   ========================================================= */

async function carregarBaseAbastecimentos() {
  verificarFirebaseAbast();

  const {
    collection,
    getDocs,
  } = window.fs;

  const [
    snapObras,
    snapMaquinas,
    snapCaminhoes,
    snapAbastecimentos,
  ] = await Promise.all([
    getDocs(
      collection(
        window.firebaseDb,
        "obras"
      )
    ),

    getDocs(
      collection(
        window.firebaseDb,
        "maquinas"
      )
    ),

    getDocs(
      collection(
        window.firebaseDb,
        "caminhoes"
      )
    ),

    getDocs(
      collection(
        window.firebaseDb,
        "abastecimentos"
      )
    ),
  ]);

  abastEstado.obras = [];

  snapObras.forEach((documento) => {
    const dados = documento.data();

    if (dados.ativo === false) {
      return;
    }

    abastEstado.obras.push({
      id: documento.id,
      ...dados,
    });
  });

  abastEstado.obras.sort((a, b) => {
    return String(
      a.nome ||
      a.titulo ||
      ""
    ).localeCompare(
      String(
        b.nome ||
        b.titulo ||
        ""
      ),
      "pt-BR"
    );
  });

  abastEstado.equipamentos = [];

  adicionarSnapshotEquipamentos(
    snapMaquinas,
    "maquinas"
  );

  adicionarSnapshotEquipamentos(
    snapCaminhoes,
    "caminhoes"
  );

  abastEstado.equipamentos.sort(
    (a, b) => {
      return String(
        a.nome
      ).localeCompare(
        String(b.nome),
        "pt-BR"
      );
    }
  );

  abastEstado.abastecimentos = [];

  snapAbastecimentos.forEach(
    (documento) => {
      abastEstado
        .abastecimentos
        .push({
          id: documento.id,
          ...documento.data(),
        });
    }
  );

  abastEstado.abastecimentos.sort(
    (a, b) => {
      return String(
        b.data || ""
      ).localeCompare(
        String(a.data || "")
      );
    }
  );
}


function adicionarSnapshotEquipamentos(
  snapshot,
  chaveConfig
) {
  const config =
    ABAST_CONFIG[chaveConfig];

  snapshot.forEach((documento) => {
    const dados = documento.data();

    if (dados.ativo === false) {
      return;
    }

    abastEstado.equipamentos.push({
      id: documento.id,

      colecao:
        config.colecao,

      tipo:
        config.tipo,

      tipoRotulo:
        config.tipoRotulo,

      nome:
        dados.nome ||
        "Sem nome",

      identificacao:
        dados[
          config.campoIdentificador
        ] ||
        "Sem identificação",

      medidorAtual:
        numAbast(
          dados[
            config.campoMedidor
          ]
        ),

      campoMedidor:
        config.campoMedidor,

      medidorRotulo:
        config.medidorRotulo,

      unidade:
        config.unidade,

      fotoUrl:
        dados.fotoUrl ||
        null,

      status:
        dados.status ||
        "disponivel",
    });
  });
}


/* =========================================================
   HISTÓRICO E DASHBOARD
   ========================================================= */

function renderHistoricoAbastecimentos() {
  abastEstado.tela = "historico";

  const conteudo =
    document.getElementById(
      "abastConteudo"
    );

  if (!conteudo) {
    return;
  }

  conteudo.innerHTML = `
    <div class="abast-topo">

      <div>

        <h2>
          Abastecimentos
        </h2>

        <p>
          Histórico, consumo e novos lançamentos.
        </p>

      </div>

      <div class="abast-acoes-topo">

        <button
          type="button"
          class="btn-primario"
          id="btnNovoAbast"
        >
          + Novo abastecimento
        </button>

      </div>

    </div>

    <div
      class="abast-resumo-grid"
      id="abastResumoGrid"
    ></div>

    <div class="abast-filtros-historico">

      <input
        type="search"
        id="abastBuscaHistorico"
        placeholder="Pesquisar obra, responsável ou equipamento..."
        autocomplete="off"
      >

      <select id="abastObraFiltro">

        <option value="">
          Todas as obras
        </option>

        ${abastEstado.obras
          .map((obra) => {
            return `
              <option
                value="${escAbast(obra.id)}"
              >
                ${escAbast(
                  obra.nome ||
                  obra.titulo ||
                  "Obra sem nome"
                )}
              </option>
            `;
          })
          .join("")}

      </select>

      <select id="abastPeriodoFiltro">

        <option value="mes">
          Este mês
        </option>

        <option value="semana">
          Esta semana
        </option>

        <option value="hoje">
          Hoje
        </option>

        <option value="todos">
          Todo o período
        </option>

      </select>

    </div>

    <div id="abastHistoricoLista"></div>
  `;

  document
    .getElementById("btnNovoAbast")
    ?.addEventListener(
      "click",
      iniciarNovoAbastecimento
    );

  document
    .getElementById(
      "abastBuscaHistorico"
    )
    ?.addEventListener(
      "input",
      (evento) => {
        abastEstado.buscaHistorico =
          evento.target.value;

        atualizarHistoricoAbastecimentos();
      }
    );

  document
    .getElementById(
      "abastObraFiltro"
    )
    ?.addEventListener(
      "change",
      (evento) => {
        abastEstado.obraFiltro =
          evento.target.value;

        atualizarHistoricoAbastecimentos();
      }
    );

  document
    .getElementById(
      "abastPeriodoFiltro"
    )
    ?.addEventListener(
      "change",
      (evento) => {
        abastEstado.periodoFiltro =
          evento.target.value;

        atualizarHistoricoAbastecimentos();
      }
    );

  atualizarHistoricoAbastecimentos();
}


function registroNoPeriodoAbast(
  registro,
  periodo
) {
  if (periodo === "todos") {
    return true;
  }

  const data =
    dataLocalAbast(registro.data);

  if (!data) {
    return false;
  }

  const hoje = new Date();

  hoje.setHours(
    12,
    0,
    0,
    0
  );

  if (periodo === "hoje") {
    return (
      data.toDateString() ===
      hoje.toDateString()
    );
  }

  if (periodo === "semana") {
    const inicio =
      new Date(hoje);

    const diaSemana =
      inicio.getDay();

    const deslocamento =
      diaSemana === 0
        ? -6
        : 1 - diaSemana;

    inicio.setDate(
      inicio.getDate() +
      deslocamento
    );

    const fim =
      new Date(inicio);

    fim.setDate(
      fim.getDate() + 6
    );

    return (
      data >= inicio &&
      data <= fim
    );
  }

  return (
    data.getFullYear() ===
      hoje.getFullYear() &&
    data.getMonth() ===
      hoje.getMonth()
  );
}


function abastecimentosFiltrados() {
  const busca =
    normAbast(
      abastEstado.buscaHistorico
    );

  return abastEstado
    .abastecimentos
    .filter((registro) => {
      if (
        abastEstado.obraFiltro &&
        registro.obraId !==
          abastEstado.obraFiltro
      ) {
        return false;
      }

      if (
        !registroNoPeriodoAbast(
          registro,
          abastEstado.periodoFiltro
        )
      ) {
        return false;
      }

      if (!busca) {
        return true;
      }

      const textoItens =
        itensRegistroAbast(registro)
          .map((item) => {
            return `
              ${item.nomeEquipamento || ""}
              ${item.identificacao || ""}
            `;
          })
          .join(" ");

      const texto =
        normAbast(`
          ${registro.obraNome || ""}
          ${registro.responsavel || ""}
          ${textoItens}
        `);

      return texto.includes(busca);
    });
}


function calcularResumoAbast() {
  const ativos =
    abastEstado.abastecimentos
      .filter((registro) => {
        return !statusCanceladoAbast(
          registro
        );
      });

  const litros = (periodo) => {
    return ativos
      .filter((registro) => {
        return registroNoPeriodoAbast(
          registro,
          periodo
        );
      })
      .reduce((soma, registro) => {
        return (
          soma +
          totalLitrosRegistroAbast(
            registro
          )
        );
      }, 0);
  };

  return {
    hoje:
      litros("hoje"),

    semana:
      litros("semana"),

    mes:
      litros("mes"),

    lancamentos:
      ativos.filter((registro) => {
        return registroNoPeriodoAbast(
          registro,
          "mes"
        );
      }).length,
  };
}


function atualizarHistoricoAbastecimentos() {
  const resumo =
    calcularResumoAbast();

  const resumoGrid =
    document.getElementById(
      "abastResumoGrid"
    );

  if (resumoGrid) {
    resumoGrid.innerHTML = `
      ${cardResumoAbast(
        "Hoje",
        resumo.hoje,
        "L"
      )}

      ${cardResumoAbast(
        "Semana",
        resumo.semana,
        "L"
      )}

      ${cardResumoAbast(
        "Mês",
        resumo.mes,
        "L"
      )}

      ${cardResumoAbast(
        "Lançamentos",
        resumo.lancamentos,
        "no mês"
      )}
    `;
  }

  const lista =
    document.getElementById(
      "abastHistoricoLista"
    );

  if (!lista) {
    return;
  }

  const registros =
    abastecimentosFiltrados();

  if (registros.length === 0) {
    lista.innerHTML = `
      <div class="abast-vazio">

        <strong>
          Nenhum abastecimento encontrado.
        </strong>

        <br><br>

        Use o botão “Novo abastecimento”
        para fazer o primeiro lançamento.

      </div>
    `;

    return;
  }

  lista.innerHTML = `
    <div class="abast-historico-lista">

      ${registros
        .map((registro) => {
          const cancelado =
            statusCanceladoAbast(
              registro
            );

          const quantidadeSalva =
            numAbast(
              registro
                .quantidadeEquipamentos
            );

          const quantidade =
            quantidadeSalva !== null
              ? quantidadeSalva
              : itensRegistroAbast(
                  registro
                ).length;

          return `
            <button
              type="button"
              class="abast-historico-card ${
                cancelado
                  ? "cancelado"
                  : ""
              }"
              data-abast-detalhe="${escAbast(
                registro.id
              )}"
            >

              <div class="abast-historico-topo">

                <span class="abast-historico-data">
                  ${escAbast(
                    fmtDataAbast(
                      registro.data
                    )
                  )}
                </span>

                <span
                  class="abast-status ${
                    cancelado
                      ? "cancelado"
                      : ""
                  }"
                >
                  ${
                    cancelado
                      ? "Cancelado"
                      : "Ativo"
                  }
                </span>

              </div>

              <strong class="abast-historico-obra">
                ${escAbast(
                  registro.obraNome ||
                  "Obra não informada"
                )}
              </strong>

              <span class="abast-historico-responsavel">
                Responsável:
                ${escAbast(
                  registro.responsavel ||
                  "Não informado"
                )}
              </span>

              <div class="abast-historico-rodape">

                <span>
                  Equipamentos

                  <strong>
                    ${quantidade}
                  </strong>
                </span>

                <span>
                  Total abastecido

                  <strong>
                    ${fmtNumeroAbast(
                      totalLitrosRegistroAbast(
                        registro
                      )
                    )} L
                  </strong>
                </span>

              </div>

            </button>
          `;
        })
        .join("")}

    </div>
  `;

  lista
    .querySelectorAll(
      "[data-abast-detalhe]"
    )
    .forEach((card) => {
      card.addEventListener(
        "click",
        () => {
          abrirDetalhesAbastecimento(
            card.dataset.abastDetalhe
          );
        }
      );
    });
}


function cardResumoAbast(
  rotulo,
  valor,
  unidade
) {
  return `
    <div class="abast-resumo-card">

      <span>
        ${escAbast(rotulo)}
      </span>

      <strong>
        ${fmtNumeroAbast(valor)}
      </strong>

      <small>
        ${escAbast(unidade)}
      </small>

    </div>
  `;
}


/* =========================================================
   DETALHES DO ABASTECIMENTO
   ========================================================= */

function abrirDetalhesAbastecimento(id) {
  const registro =
    abastEstado
      .abastecimentos
      .find((item) => {
        return item.id === id;
      });

  if (!registro) {
    return;
  }

  fecharModalAbast();

  const cancelado =
    statusCanceladoAbast(registro);

  const overlay =
    document.createElement("div");

  overlay.className =
    "abast-modal-overlay";

  overlay.id =
    "abastModalOverlay";

  overlay.innerHTML = `
    <div
      class="abast-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do abastecimento"
    >

      <div class="abast-modal-topo">

        <div>

          <h3>
            Detalhes do abastecimento
          </h3>

          <p
            style="
              color:#7d7d77;
              font-size:11.5px;
              margin-top:4px;
            "
          >
            ${escAbast(
              fmtDataAbast(
                registro.data
              )
            )}
          </p>

        </div>

        <button
          type="button"
          class="abast-modal-fechar"
          data-fechar-abast
        >
          ×
        </button>

      </div>

      <div class="abast-detalhe-resumo">

        <div>

          <span>
            Obra
          </span>

          <strong>
            ${escAbast(
              registro.obraNome ||
              "—"
            )}
          </strong>

        </div>

        <div>

          <span>
            Responsável
          </span>

          <strong>
            ${escAbast(
              registro.responsavel ||
              "—"
            )}
          </strong>

        </div>

        <div>

          <span>
            Total
          </span>

          <strong>
            ${fmtNumeroAbast(
              totalLitrosRegistroAbast(
                registro
              )
            )} L
          </strong>

        </div>

      </div>

      <div class="abast-detalhe-itens">

        ${
          itensRegistroAbast(registro)
            .map((item) => {
              return `
                <div class="abast-detalhe-item">

                  <div class="abast-detalhe-item-topo">

                    <strong>
                      ${escAbast(
                        item.nomeEquipamento ||
                        "Equipamento"
                      )}

                      ${
                        item.identificacao
                          ? ` · ${escAbast(
                              item.identificacao
                            )}`
                          : ""
                      }
                    </strong>

                    <span>
                      ${fmtNumeroAbast(
                        item.litros
                      )} L
                    </span>

                  </div>

                  <div class="abast-detalhe-medidor">

                    ${escAbast(
                      item.medidorRotulo ||
                      (
                        item.tipoEquipamento ===
                        "caminhao"
                          ? "Quilometragem"
                          : "Horímetro"
                      )
                    )}:

                    ${fmtNumeroAbast(
                      item.medidorAnterior
                    )}

                    →

                    ${fmtNumeroAbast(
                      item.medidorAtual
                    )}

                    ${escAbast(
                      item.unidadeMedidor ||
                      ""
                    )}

                  </div>

                </div>
              `;
            })
            .join("") ||
          `
            <div class="abast-vazio">
              Este registro não possui
              itens detalhados.
            </div>
          `
        }

      </div>

      ${
        cancelado
          ? `
            <div class="abast-cancelado-info">
              Este lançamento foi cancelado
              e permanece no histórico.
            </div>
          `
          : ""
      }

      <div class="abast-modal-acoes">

        <button
          type="button"
          class="btn-secundario"
          data-fechar-abast
        >
          Fechar
        </button>

        ${
          cancelado
            ? ""
            : `
              <button
                type="button"
                class="abast-btn-perigo"
                id="btnCancelarAbast"
              >
                Cancelar lançamento
              </button>
            `
        }

      </div>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  overlay
    .querySelectorAll(
      "[data-fechar-abast]"
    )
    .forEach((botao) => {
      botao.addEventListener(
        "click",
        fecharModalAbast
      );
    });

  overlay.addEventListener(
    "click",
    (evento) => {
      if (
        evento.target === overlay
      ) {
        fecharModalAbast();
      }
    }
  );

  overlay
    .querySelector(
      "#btnCancelarAbast"
    )
    ?.addEventListener(
      "click",
      () => {
        confirmarCancelamentoAbast(
          registro.id
        );
      }
    );
}


function fecharModalAbast() {
  document
    .getElementById(
      "abastModalOverlay"
    )
    ?.remove();
}


/* =========================================================
   CANCELAMENTO
   ========================================================= */

function confirmarCancelamentoAbast(id) {
  const registro =
    abastEstado
      .abastecimentos
      .find((item) => {
        return item.id === id;
      });

  const modal =
    document.querySelector(
      "#abastModalOverlay .abast-modal"
    );

  if (
    !registro ||
    !modal
  ) {
    return;
  }

  modal.innerHTML = `
    <div class="abast-modal-topo">

      <div>

        <h3>
          Cancelar abastecimento
        </h3>

      </div>

      <button
        type="button"
        class="abast-modal-fechar"
        data-fechar-abast
      >
        ×
      </button>

    </div>

    <div class="abast-confirmacao">

      O lançamento ficará marcado
      como cancelado e continuará
      aparecendo no histórico.

      Os horímetros e quilômetros
      atuais da Frota não serão
      reduzidos automaticamente.

    </div>

    <div class="campo">

      <label for="motivoCancelamentoAbast">
        Motivo do cancelamento *
      </label>

      <textarea
        id="motivoCancelamentoAbast"
        rows="3"
        placeholder="Informe o motivo"
      ></textarea>

    </div>

    <div
      class="abast-erro"
      id="erroCancelarAbast"
    ></div>

    <div class="abast-modal-acoes">

      <button
        type="button"
        class="btn-secundario"
        data-fechar-abast
      >
        Voltar
      </button>

      <button
        type="button"
        class="abast-btn-perigo"
        id="confirmarCancelarAbast"
      >
        Confirmar cancelamento
      </button>

    </div>
  `;

  modal
    .querySelectorAll(
      "[data-fechar-abast]"
    )
    .forEach((botao) => {
      botao.addEventListener(
        "click",
        fecharModalAbast
      );
    });

  modal
    .querySelector(
      "#confirmarCancelarAbast"
    )
    ?.addEventListener(
      "click",
      () => {
        cancelarAbastecimento(id);
      }
    );
}


async function cancelarAbastecimento(id) {
  const motivo =
    document
      .getElementById(
        "motivoCancelamentoAbast"
      )
      ?.value
      ?.trim() || "";

  const erro =
    document.getElementById(
      "erroCancelarAbast"
    );

  const botao =
    document.getElementById(
      "confirmarCancelarAbast"
    );

  if (!motivo) {
    if (erro) {
      erro.textContent =
        "Informe o motivo do cancelamento.";
    }

    return;
  }

  try {
    verificarFirebaseAbast();

    if (botao) {
      botao.disabled = true;
      botao.textContent =
        "Cancelando...";
    }

    const {
      doc,
      updateDoc,
      serverTimestamp,
    } = window.fs;

    await updateDoc(
      doc(
        window.firebaseDb,
        "abastecimentos",
        id
      ),
      {
        ativo: false,

        status: "cancelado",

        motivoCancelamento:
          motivo,

        canceladoPor:
          usuarioAtualAbast(),

        canceladoEm:
          serverTimestamp(),

        atualizadoEm:
          serverTimestamp(),
      }
    );

    const registro =
      abastEstado
        .abastecimentos
        .find((item) => {
          return item.id === id;
        });

    if (registro) {
      registro.ativo = false;

      registro.status =
        "cancelado";

      registro
        .motivoCancelamento =
        motivo;
    }

    fecharModalAbast();

    atualizarHistoricoAbastecimentos();

  } catch (erroFirebase) {
    console.error(
      "Erro ao cancelar abastecimento:",
      erroFirebase
    );

    if (erro) {
      erro.textContent =
        "Não foi possível cancelar. Tente novamente.";
    }

    if (botao) {
      botao.disabled = false;

      botao.textContent =
        "Confirmar cancelamento";
    }
  }
}


/* =========================================================
   NOVO ABASTECIMENTO
   ========================================================= */

function iniciarNovoAbastecimento() {
  abastEstado.tela = "novo";

  abastEstado.etapa = 1;

  abastEstado.selecionados =
    new Set();

  abastEstado.filtroTipo =
    "todos";

  abastEstado.buscaEquipamento =
    "";

  abastEstado.dadosGerais = {
    obraId: "",
    data: dataHojeAbast(),
    responsavel:
      usuarioAtualAbast(),
  };

  renderSelecaoNovoAbastecimento();
}


function renderSelecaoNovoAbastecimento() {
  const conteudo =
    document.getElementById(
      "abastConteudo"
    );

  if (!conteudo) {
    return;
  }

  const dados =
    abastEstado.dadosGerais;

  conteudo.innerHTML = `
    <div class="abast-topo">

      <div>

        <h2>
          Novo abastecimento
        </h2>

        <p>
          Selecione a obra e marque
          todos os equipamentos abastecidos.
        </p>

      </div>

      <div class="abast-acoes-topo">

        <button
          type="button"
          class="btn-secundario"
          id="btnVoltarHistoricoAbast"
        >
          Voltar ao histórico
        </button>

      </div>

    </div>

    <div class="abast-dados-gerais">

      <div class="campo">

        <label for="abastObra">
          Obra *
        </label>

        <select id="abastObra">

          <option value="">
            Selecione a obra
          </option>

          ${abastEstado.obras
            .map((obra) => {
              return `
                <option
                  value="${escAbast(
                    obra.id
                  )}"
                  ${
                    obra.id ===
                    dados.obraId
                      ? "selected"
                      : ""
                  }
                >
                  ${escAbast(
                    obra.nome ||
                    obra.titulo ||
                    "Obra sem nome"
                  )}
                </option>
              `;
            })
            .join("")}

        </select>

      </div>

      <div class="campo">

        <label for="abastData">
          Data *
        </label>

        <input
          type="date"
          id="abastData"
          value="${escAbast(
            dados.data
          )}"
        >

      </div>

      <div class="campo">

        <label for="abastResponsavel">
          Responsável *
        </label>

        <input
          type="text"
          id="abastResponsavel"
          value="${escAbast(
            dados.responsavel
          )}"
          placeholder="Nome do responsável"
        >

      </div>

    </div>

    <div class="abast-selecao-topo">

      <div class="cadastro-busca abast-busca">

        <input
          type="search"
          id="abastBuscaEquip"
          placeholder="Pesquisar equipamento..."
          autocomplete="off"
        >

      </div>

      <div
        class="filtro-status"
        id="abastFiltroTipo"
      >

        <button
          type="button"
          class="chip-status ativo"
          data-tipo="todos"
        >
          Todos
        </button>

        <button
          type="button"
          class="chip-status"
          data-tipo="maquina"
        >
          Máquinas
        </button>

        <button
          type="button"
          class="chip-status"
          data-tipo="caminhao"
        >
          Caminhões
        </button>

      </div>

    </div>

    <div id="abastListaEquip"></div>

    <div class="abast-barra-acao">

      <div>

        <strong id="abastQtdSelecionados">
          Nenhum equipamento selecionado
        </strong>

        <span>
          Toque nos cards para selecionar.
        </span>

      </div>

      <button
        type="button"
        class="btn-primario"
        id="btnContinuarAbast"
        disabled
      >
        Continuar
      </button>

    </div>
  `;

  document
    .getElementById(
      "btnVoltarHistoricoAbast"
    )
    ?.addEventListener(
      "click",
      renderHistoricoAbastecimentos
    );

  document
    .getElementById(
      "abastBuscaEquip"
    )
    ?.addEventListener(
      "input",
      (evento) => {
        abastEstado.buscaEquipamento =
          evento.target.value;

        renderCardsEquipamentosAbast();
      }
    );

  document
    .getElementById(
      "abastFiltroTipo"
    )
    ?.addEventListener(
      "click",
      (evento) => {
        const botao =
          evento.target.closest(
            "[data-tipo]"
          );

        if (!botao) {
          return;
        }

        abastEstado.filtroTipo =
          botao.dataset.tipo;

        document
          .querySelectorAll(
            "#abastFiltroTipo [data-tipo]"
          )
          .forEach((item) => {
            item.classList.toggle(
              "ativo",
              item === botao
            );
          });

        renderCardsEquipamentosAbast();
      }
    );

  document
    .getElementById(
      "btnContinuarAbast"
    )
    ?.addEventListener(
      "click",
      avancarLancamentoAbast
    );

  renderCardsEquipamentosAbast();
}


function equipamentosFiltradosAbast() {
  const busca =
    normAbast(
      abastEstado.buscaEquipamento
    );

  return abastEstado
    .equipamentos
    .filter((item) => {
      if (
        abastEstado.filtroTipo !==
          "todos" &&
        item.tipo !==
          abastEstado.filtroTipo
      ) {
        return false;
      }

      if (!busca) {
        return true;
      }

      return normAbast(`
        ${item.nome}
        ${item.identificacao}
        ${item.tipoRotulo}
      `).includes(busca);
    });
}


function renderCardsEquipamentosAbast() {
  const lista =
    document.getElementById(
      "abastListaEquip"
    );

  if (!lista) {
    return;
  }

  const itens =
    equipamentosFiltradosAbast();

  if (itens.length === 0) {
    lista.innerHTML = `
      <div class="abast-vazio">
        Nenhum equipamento encontrado.
      </div>
    `;

    atualizarContadorSelecaoAbast();

    return;
  }

  lista.innerHTML = `
    <div class="abast-grid-equipamentos">

      ${itens
        .map((item) => {
          const chave =
            chaveEquipAbast(item);

          const selecionado =
            abastEstado
              .selecionados
              .has(chave);

          return `
            <button
              type="button"
              class="abast-card-equipamento ${
                selecionado
                  ? "selecionado"
                  : ""
              }"
              data-equip="${escAbast(
                chave
              )}"
              aria-pressed="${selecionado}"
            >

              <span class="abast-card-check">
                ✓
              </span>

              <div class="cabecalho-card-equip">
                ${item.fotoUrl
                  ? `<div class="abast-card-foto"><img src="${escAbast(item.fotoUrl)}" alt="" loading="lazy"></div>`
                  : `<div class="abast-card-foto abast-card-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/><path d="M8 6l1.5-2h5L16 6"/></svg></div>`}
                <div class="cabecalho-card-equip-texto">
                  <span class="abast-card-tipo">
                    ${escAbast(
                      item.tipoRotulo
                    )}
                  </span>

                  <strong>
                    ${escAbast(
                      item.nome
                    )}
                  </strong>
                </div>
              </div>

              <span class="abast-card-identificacao">
                ${escAbast(
                  item.identificacao
                )}
              </span>

              <span class="abast-card-medidor">

                <small>
                  ${escAbast(
                    item.medidorRotulo
                  )} atual
                </small>

                <b>
                  ${fmtNumeroAbast(
                    item.medidorAtual
                  )}

                  ${
                    item.medidorAtual !==
                    null
                      ? escAbast(
                          item.unidade
                        )
                      : ""
                  }
                </b>

              </span>

            </button>
          `;
        })
        .join("")}

    </div>
  `;

  lista
    .querySelectorAll(
      "[data-equip]"
    )
    .forEach((card) => {
      card.addEventListener(
        "click",
        () => {
          const chave =
            card.dataset.equip;

          if (
            abastEstado
              .selecionados
              .has(chave)
          ) {
            abastEstado
              .selecionados
              .delete(chave);

          } else {
            abastEstado
              .selecionados
              .add(chave);
          }

          renderCardsEquipamentosAbast();
        }
      );
    });

  atualizarContadorSelecaoAbast();
}


function atualizarContadorSelecaoAbast() {
  const quantidade =
    abastEstado
      .selecionados
      .size;

  const contador =
    document.getElementById(
      "abastQtdSelecionados"
    );

  const botao =
    document.getElementById(
      "btnContinuarAbast"
    );

  if (contador) {
    contador.textContent =
      quantidade === 0
        ? "Nenhum equipamento selecionado"
        : `${quantidade} ${
            quantidade === 1
              ? "equipamento selecionado"
              : "equipamentos selecionados"
          }`;
  }

  if (botao) {
    botao.disabled =
      quantidade === 0;

    botao.textContent =
      quantidade === 0
        ? "Continuar"
        : `Continuar (${quantidade})`;
  }
}


function avancarLancamentoAbast() {
  const obraId =
    document
      .getElementById("abastObra")
      ?.value || "";

  const data =
    document
      .getElementById("abastData")
      ?.value || "";

  const responsavel =
    document
      .getElementById(
        "abastResponsavel"
      )
      ?.value
      ?.trim() || "";

  if (!obraId) {
    alert("Selecione a obra.");
    return;
  }

  if (!data) {
    alert("Informe a data.");
    return;
  }

  if (!responsavel) {
    alert(
      "Informe o responsável."
    );

    return;
  }

  if (
    abastEstado
      .selecionados
      .size === 0
  ) {
    alert(
      "Selecione pelo menos um equipamento."
    );

    return;
  }

  abastEstado.dadosGerais = {
    obraId,
    data,
    responsavel,
  };

  renderLancamentoAbast();
}


/* =========================================================
   LANÇAMENTO
   ========================================================= */

function selecionadosAbast() {
  return abastEstado
    .equipamentos
    .filter((item) => {
      return abastEstado
        .selecionados
        .has(
          chaveEquipAbast(item)
        );
    });
}


function renderLancamentoAbast() {
  const conteudo =
    document.getElementById(
      "abastConteudo"
    );

  if (!conteudo) {
    return;
  }

  const equipamentos =
    selecionadosAbast();

  const obra =
    abastEstado
      .obras
      .find((item) => {
        return (
          item.id ===
          abastEstado
            .dadosGerais
            .obraId
        );
      });

  conteudo.innerHTML = `
    <div class="abast-topo">

      <div>

        <h2>
          Informar abastecimento
        </h2>

        <p>
          Preencha litros e o novo
          medidor de cada equipamento.
        </p>

      </div>

    </div>

    <div class="abast-resumo-lancamento">

      <div>

        <span>
          Obra
        </span>

        <strong>
          ${escAbast(
            obra?.nome ||
            obra?.titulo ||
            "Obra"
          )}
        </strong>

      </div>

      <div>

        <span>
          Data
        </span>

        <strong>
          ${escAbast(
            fmtDataAbast(
              abastEstado
                .dadosGerais
                .data
            )
          )}
        </strong>

      </div>

      <div>

        <span>
          Responsável
        </span>

        <strong>
          ${escAbast(
            abastEstado
              .dadosGerais
              .responsavel
          )}
        </strong>

      </div>

    </div>

    <form id="formSalvarAbast">

      <div class="abast-lista-lancamentos">

        ${equipamentos
          .map((item, indice) => {
            return renderItemLancamentoAbast(
              item,
              indice
            );
          })
          .join("")}

      </div>

      <div
        class="abast-erro"
        id="erroSalvarAbast"
      ></div>

      <div class="abast-acoes-finais">

        <button
          type="button"
          class="btn-secundario"
          id="btnVoltarSelecaoAbast"
        >
          Voltar
        </button>

        <button
          type="submit"
          class="btn-primario"
          id="btnSalvarAbast"
        >
          Salvar
          ${equipamentos.length}
          ${
            equipamentos.length === 1
              ? "abastecimento"
              : "abastecimentos"
          }
        </button>

      </div>

    </form>
  `;

  document
    .getElementById(
      "btnVoltarSelecaoAbast"
    )
    ?.addEventListener(
      "click",
      renderSelecaoNovoAbastecimento
    );

  document
    .getElementById(
      "formSalvarAbast"
    )
    ?.addEventListener(
      "submit",
      async (evento) => {
        evento.preventDefault();

        await salvarNovoAbastecimento();
      }
    );
}


function renderItemLancamentoAbast(
  item,
  indice
) {
  return `
    <article class="abast-item-lancamento">

      <div class="abast-item-cabecalho">

        <div>

          <span>
            ${escAbast(
              item.tipoRotulo
            )}
            ·
            ${escAbast(
              item.identificacao
            )}
          </span>

          <h3>
            ${escAbast(
              item.nome
            )}
          </h3>

        </div>

        <div class="abast-medidor-anterior">

          <span>
            ${escAbast(
              item.medidorRotulo
            )} atual
          </span>

          <strong>
            ${fmtNumeroAbast(
              item.medidorAtual
            )}

            ${
              item.medidorAtual !==
              null
                ? escAbast(
                    item.unidade
                  )
                : ""
            }
          </strong>

        </div>

      </div>

      <div class="abast-campos-lancamento">

        <div class="campo">

          <label for="medidorAbast${indice}">
            Novo
            ${escAbast(
              item.medidorRotulo
                .toLowerCase()
            )}
            (${escAbast(
              item.unidade
            )}) *
          </label>

          <input
            type="number"
            id="medidorAbast${indice}"
            data-medidor="${indice}"
            value="${
              item.medidorAtual ??
              ""
            }"
            min="0"
            step="0.01"
            required
          >

        </div>

        <div class="campo">

          <label for="litrosAbast${indice}">
            Litros abastecidos *
          </label>

          <input
            type="number"
            id="litrosAbast${indice}"
            data-litros="${indice}"
            min="0.01"
            step="0.01"
            placeholder="Ex.: 120"
            required
          >

        </div>

      </div>

    </article>
  `;
}


function coletarItensNovoAbast() {
  return selecionadosAbast()
    .map((item, indice) => {
      const medidor =
        numAbast(
          document.querySelector(
            `[data-medidor="${indice}"]`
          )?.value
        );

      const litros =
        numAbast(
          document.querySelector(
            `[data-litros="${indice}"]`
          )?.value
        );

      if (
        medidor === null ||
        medidor < 0
      ) {
        throw new Error(
          `Informe o novo ${item.medidorRotulo.toLowerCase()} de ${item.nome}.`
        );
      }

      if (
        item.medidorAtual !== null &&
        medidor <
          item.medidorAtual
      ) {
        throw new Error(
          `O novo ${item.medidorRotulo.toLowerCase()} de ${item.nome} não pode ser menor que o atual.`
        );
      }

      if (
        litros === null ||
        litros <= 0
      ) {
        throw new Error(
          `Informe os litros abastecidos de ${item.nome}.`
        );
      }

      return {
        equipamentoId:
          item.id,

        colecaoEquipamento:
          item.colecao,

        tipoEquipamento:
          item.tipo,

        tipoRotulo:
          item.tipoRotulo,

        nomeEquipamento:
          item.nome,

        identificacao:
          item.identificacao,

        campoMedidor:
          item.campoMedidor,

        medidorRotulo:
          item.medidorRotulo,

        unidadeMedidor:
          item.unidade,

        medidorAnterior:
          item.medidorAtual,

        medidorAtual:
          medidor,

        litros,
      };
    });
}


/* =========================================================
   SALVAMENTO
   ========================================================= */

async function salvarNovoAbastecimento() {
  const erro =
    document.getElementById(
      "erroSalvarAbast"
    );

  const botao =
    document.getElementById(
      "btnSalvarAbast"
    );

  if (
    !erro ||
    !botao ||
    abastEstado.salvando
  ) {
    return;
  }

  erro.textContent = "";

  let itens;

  try {
    itens =
      coletarItensNovoAbast();

  } catch (erroValidacao) {
    erro.textContent =
      erroValidacao.message;

    return;
  }

  try {
    verificarFirebaseAbast();

    abastEstado.salvando = true;

    botao.disabled = true;

    botao.textContent =
      "Salvando...";

    const {
      collection,
      addDoc,
      doc,
      updateDoc,
      serverTimestamp,
    } = window.fs;

    const obra =
      abastEstado
        .obras
        .find((item) => {
          return (
            item.id ===
            abastEstado
              .dadosGerais
              .obraId
          );
        });

    const registro = {
      obraId:
        abastEstado
          .dadosGerais
          .obraId,

      obraNome:
        obra?.nome ||
        obra?.titulo ||
        "Obra",

      data:
        abastEstado
          .dadosGerais
          .data,

      responsavel:
        abastEstado
          .dadosGerais
          .responsavel,

      quantidadeEquipamentos:
        itens.length,

      totalLitros:
        itens.reduce(
          (soma, item) => {
            return (
              soma +
              item.litros
            );
          },
          0
        ),

      itens,

      status: "ativo",

      ativo: true,

      criadoEm:
        serverTimestamp(),

      atualizadoEm:
        serverTimestamp(),
    };

    const salvo =
      await addDoc(
        collection(
          window.firebaseDb,
          "abastecimentos"
        ),
        registro
      );

    await Promise.all(
      itens.map((item) => {
        return updateDoc(
          doc(
            window.firebaseDb,
            item.colecaoEquipamento,
            item.equipamentoId
          ),
          {
            [item.campoMedidor]:
              item.medidorAtual,

            ultimoAbastecimentoId:
              salvo.id,

            ultimoAbastecimentoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp(),
          }
        );
      })
    );

    abastEstado
      .abastecimentos
      .unshift({
        id: salvo.id,
        ...registro,
      });

    itens.forEach((item) => {
      const equipamento =
        abastEstado
          .equipamentos
          .find((equipamentoAtual) => {
            return (
              equipamentoAtual.id ===
                item.equipamentoId &&
              equipamentoAtual.colecao ===
                item.colecaoEquipamento
            );
          });

      if (equipamento) {
        equipamento.medidorAtual =
          item.medidorAtual;
      }
    });

    renderSucessoNovoAbast(
      registro
    );

  } catch (erroFirebase) {
    console.error(
      "Erro ao salvar abastecimento:",
      erroFirebase
    );

    erro.textContent =
      "Não foi possível salvar. Verifique a conexão e tente novamente.";

    botao.disabled = false;

    botao.textContent =
      "Tentar salvar novamente";

  } finally {
    abastEstado.salvando = false;
  }
}


/* =========================================================
   TELA DE SUCESSO
   ========================================================= */

function renderSucessoNovoAbast(
  registro
) {
  const conteudo =
    document.getElementById(
      "abastConteudo"
    );

  if (!conteudo) {
    return;
  }

  conteudo.innerHTML = `
    <div class="abast-sucesso">

      <div class="abast-sucesso-icone">
        ✓
      </div>

      <h2>
        Abastecimento salvo
      </h2>

      <p>

        ${registro
          .quantidadeEquipamentos}

        ${
          registro
            .quantidadeEquipamentos ===
          1
            ? "equipamento atualizado"
            : "equipamentos atualizados"
        }

        com

        <strong>
          ${fmtNumeroAbast(
            registro.totalLitros
          )} litros
        </strong>

        no total.

      </p>

      <div class="abast-acoes-topo">

        <button
          type="button"
          class="btn-secundario"
          id="btnHistoricoDepoisAbast"
        >
          Ver histórico
        </button>

        <button
          type="button"
          class="btn-primario"
          id="btnNovoDepoisAbast"
        >
          Novo abastecimento
        </button>

      </div>

    </div>
  `;

  document
    .getElementById(
      "btnHistoricoDepoisAbast"
    )
    ?.addEventListener(
      "click",
      renderHistoricoAbastecimentos
    );

  document
    .getElementById(
      "btnNovoDepoisAbast"
    )
    ?.addEventListener(
      "click",
      iniciarNovoAbastecimento
    );
}


/* =========================================================
   ERRO DE CARREGAMENTO
   ========================================================= */

function renderErroAbastecimentos(
  erro
) {
  const conteudo =
    document.getElementById(
      "abastConteudo"
    );

  if (!conteudo) {
    return;
  }

  conteudo.innerHTML = `
    <div class="em-construcao estado-erro">

      <h3>
        Não foi possível carregar
      </h3>

      <p>
        Verifique a conexão com o Firebase
        e tente novamente.
      </p>

      <div class="etapa">
        ${escAbast(
          erro?.message ||
          "Erro ao carregar o módulo."
        )}
      </div>

      <button
        type="button"
        class="btn-primario"
        id="btnRecarregarAbast"
      >
        Tentar novamente
      </button>

    </div>
  `;

  document
    .getElementById(
      "btnRecarregarAbast"
    )
    ?.addEventListener(
      "click",
      renderAbastecimentos
    );
}


console.log(
  "Módulo abastecimentos.js v2 carregado com sucesso."
);
