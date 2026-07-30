/* =========================================================
   FROTA — MÁQUINAS E CAMINHÕES
   Única Construtora — Centro Operacional
   ---------------------------------------------------------
   Este arquivo precisa carregar DEPOIS de cadastros.js,
   pois reaproveita os helpers:
   - iconeX()
   - iconeLapis()
   - fecharModalCadastro()
   ========================================================= */


/* =========================================================
   CONFIGURAÇÃO DOS MÓDULOS
   ========================================================= */

const FROTA_CONFIG = {

  maquinas: {
    colecao: "maquinas",
    titulo: "Máquinas",
    singular: "Máquina",
    categoriaEquip: "maquina",

    campoIdentificador: {
      id: "identificador",
      label: "Identificador",
      placeholder: "Ex.: EQ-04",
    },

    campoMedidor: {
      id: "horimetroAtual",
      label: "Horímetro atual",
      unidade: "h",
      placeholder: "Ex.: 1520",
    },

    contadorMenu: "contadorMaquinas",
  },

  caminhoes: {
    colecao: "caminhoes",
    titulo: "Caminhões",
    singular: "Caminhão",
    categoriaEquip: "caminhao",

    campoIdentificador: {
      id: "placa",
      label: "Placa",
      placeholder: "Ex.: ABC1D23",
    },

    campoMedidor: {
      id: "kmAtual",
      label: "Quilometragem atual",
      unidade: "km",
      placeholder: "Ex.: 85000",
    },

    contadorMenu: "contadorCaminhoes",
  },

};


/* =========================================================
   STATUS DISPONÍVEIS
   ========================================================= */

const STATUS_FROTA = [
  {
    valor: "disponivel",
    rotulo: "Disponível",
    badge: "ativa",
  },

  {
    valor: "em_uso",
    rotulo: "Em uso",
    badge: "concluida",
  },

  {
    valor: "manutencao",
    rotulo: "Manutenção",
    badge: "atencao",
  },
];


/* =========================================================
   ESTADO DO MÓDULO
   ========================================================= */

let frotaAtual = null;
let frotaCache = [];

let frotaFiltro = {
  busca: "",
  status: "todos",
};

const cacheTiposEquip = {};


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function formatarNumeroFrota(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return "—";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(numero);
}


function statusFrotaInfo(valor) {
  return (
    STATUS_FROTA.find(
      (status) => status.valor === valor
    ) || STATUS_FROTA[0]
  );
}


function obterConfigFrota(chave) {
  return FROTA_CONFIG[chave] || null;
}


function obterAreaPagina() {
  return document.getElementById("areaPagina");
}


function obterIconeLapisFrota() {
  if (typeof window.iconeLapis === "function") {
    return window.iconeLapis();
  }

  if (typeof iconeLapis === "function") {
    return iconeLapis();
  }

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  `;
}


function obterIconeFecharFrota() {
  if (typeof window.iconeX === "function") {
    return window.iconeX();
  }

  if (typeof iconeX === "function") {
    return iconeX();
  }

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <path d="M18 6L6 18"/>
      <path d="M6 6l12 12"/>
    </svg>
  `;
}


function fecharModalFrota() {
  if (
    typeof window.fecharModalCadastro === "function"
  ) {
    window.fecharModalCadastro();
    return;
  }

  if (
    typeof fecharModalCadastro === "function"
  ) {
    fecharModalCadastro();
    return;
  }

  const modal = document.getElementById(
    "modalOverlay"
  );

  if (modal) {
    modal.remove();
  }
}


function verificarFirebaseFrota() {
  if (!window.firebaseDb) {
    throw new Error(
      "O banco de dados Firebase ainda não foi inicializado."
    );
  }

  if (!window.fs) {
    throw new Error(
      "As funções do Firestore ainda não estão disponíveis."
    );
  }
}


/* =========================================================
   TIPOS DE EQUIPAMENTO
   ========================================================= */

async function obterTiposEquipamento(categoria) {
  if (cacheTiposEquip[categoria]) {
    return cacheTiposEquip[categoria];
  }

  verificarFirebaseFrota();

  const {
    collection,
    getDocs,
  } = window.fs;

  const referencia = collection(
    window.firebaseDb,
    "cadastros_tipos_equipamento"
  );

  const snapshot = await getDocs(referencia);
  const lista = [];

  snapshot.forEach((documento) => {
    const dados = documento.data();

    if (dados.ativo === false) {
      return;
    }

    if (dados.categoria !== categoria) {
      return;
    }

    lista.push({
      id: documento.id,
      nome: dados.nome || "Sem nome",
    });
  });

  lista.sort((a, b) =>
    String(a.nome).localeCompare(
      String(b.nome),
      "pt-BR"
    )
  );

  cacheTiposEquip[categoria] = lista;

  return lista;
}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

async function renderFrota(chave) {
  const config = obterConfigFrota(chave);
  const area = obterAreaPagina();

  if (!area) {
    return;
  }

  if (!config) {
    if (
      typeof window.renderPlaceholder === "function"
    ) {
      window.renderPlaceholder(chave);
    }

    return;
  }

  frotaAtual = chave;

  frotaFiltro = {
    busca: "",
    status: "todos",
  };

  area.innerHTML = `
    <section class="painel-cadastro modulo-frota">

      <div
        class="grid-indicadores grid-indicadores-frota"
        id="resumoFrota"
      >
        ${renderResumoFrotaVazio()}
      </div>

      <div class="cadastro-topo">

        <div class="cadastro-busca">
          <input
            type="search"
            id="buscaFrota"
            placeholder="Buscar ${config.titulo.toLowerCase()}..."
            autocomplete="off"
          >
        </div>

        <div
          class="filtro-status"
          id="filtroStatusFrota"
        >
          ${renderBotoesFiltroStatus()}
        </div>

        <button
          type="button"
          class="btn-primario"
          id="btnAdicionarFrota"
        >
          + Adicionar ${config.singular.toLowerCase()}
        </button>

      </div>

      <div id="listaFrotaWrap">
        <p class="cadastro-carregando">
          Carregando ${config.titulo.toLowerCase()}...
        </p>
      </div>

    </section>
  `;

  configurarEventosTelaFrota(chave);

  await carregarFrota(chave);
}


/* Torna a função acessível ao nav.js */
window.renderFrota = renderFrota;


/* =========================================================
   EVENTOS DA TELA
   ========================================================= */

function configurarEventosTelaFrota(chave) {
  const botaoAdicionar = document.getElementById(
    "btnAdicionarFrota"
  );

  const campoBusca = document.getElementById(
    "buscaFrota"
  );

  const filtroStatus = document.getElementById(
    "filtroStatusFrota"
  );

  if (botaoAdicionar) {
    botaoAdicionar.addEventListener(
      "click",
      () => abrirModalFrota(chave, null)
    );
  }

  if (campoBusca) {
    campoBusca.addEventListener(
      "input",
      (evento) => {
        frotaFiltro.busca = normalizarTexto(
          evento.target.value
        );

        renderizarListaFrota();
      }
    );
  }

  if (filtroStatus) {
    filtroStatus.addEventListener(
      "click",
      (evento) => {
        const botao = evento.target.closest(
          "[data-status-frota]"
        );

        if (!botao) {
          return;
        }

        frotaFiltro.status =
          botao.dataset.statusFrota;

        document
          .querySelectorAll(
            "[data-status-frota]"
          )
          .forEach((item) => {
            item.classList.remove("ativo");
          });

        botao.classList.add("ativo");

        renderizarListaFrota();
      }
    );
  }
}


/* =========================================================
   FILTROS DE STATUS
   ========================================================= */

function renderBotoesFiltroStatus() {
  return `
    <button
      type="button"
      class="chip-status ativo"
      data-status-frota="todos"
    >
      Todos
    </button>

    ${STATUS_FROTA.map(
      (status) => `
        <button
          type="button"
          class="chip-status"
          data-status-frota="${status.valor}"
        >
          ${status.rotulo}
        </button>
      `
    ).join("")}
  `;
}


/* =========================================================
   RESUMO DA FROTA
   ========================================================= */

function renderResumoFrotaVazio() {
  return `
    ${renderCardResumoFrota(
      "Total",
      "—",
      "Equipamentos cadastrados",
      "tipo-frota"
    )}

    ${renderCardResumoFrota(
      "Disponíveis",
      "—",
      "Prontos para operação",
      "tipo-frota"
    )}

    ${renderCardResumoFrota(
      "Em uso",
      "—",
      "Em operação",
      "tipo-frota"
    )}

    ${renderCardResumoFrota(
      "Manutenção",
      "—",
      "Precisam de atenção",
      "tipo-atencao"
    )}
  `;
}


function renderCardResumoFrota(
  titulo,
  valor,
  rotulo,
  classe = ""
) {
  return `
    <article class="card-indicador ${classe}">
      <div class="topo">
        <span class="eyebrow">
          ${titulo}
        </span>
      </div>

      <div class="valor">
        ${valor}
      </div>

      <div class="rotulo">
        ${rotulo}
      </div>
    </article>
  `;
}


function atualizarResumoFrota() {
  const resumo = document.getElementById(
    "resumoFrota"
  );

  if (!resumo) {
    return;
  }

  const total = frotaCache.length;

  const disponiveis = frotaCache.filter(
    (item) => item.status === "disponivel"
  ).length;

  const emUso = frotaCache.filter(
    (item) => item.status === "em_uso"
  ).length;

  const manutencao = frotaCache.filter(
    (item) => item.status === "manutencao"
  ).length;

  resumo.innerHTML = `
    ${renderCardResumoFrota(
      "Total",
      total,
      "Equipamentos cadastrados",
      "tipo-frota"
    )}

    ${renderCardResumoFrota(
      "Disponíveis",
      disponiveis,
      "Prontos para operação",
      "tipo-frota"
    )}

    ${renderCardResumoFrota(
      "Em uso",
      emUso,
      "Em operação",
      "tipo-frota"
    )}

    ${renderCardResumoFrota(
      "Manutenção",
      manutencao,
      "Precisam de atenção",
      "tipo-atencao"
    )}
  `;
}


/* =========================================================
   CARREGAMENTO DO FIRESTORE
   ========================================================= */

async function carregarFrota(chave) {
  const config = obterConfigFrota(chave);
  const wrap = document.getElementById(
    "listaFrotaWrap"
  );

  if (!config || !wrap) {
    return;
  }

  wrap.innerHTML = `
    <p class="cadastro-carregando">
      Carregando ${config.titulo.toLowerCase()}...
    </p>
  `;

  try {
    verificarFirebaseFrota();

    const {
      collection,
      getDocs,
    } = window.fs;

    const snapshot = await getDocs(
      collection(
        window.firebaseDb,
        config.colecao
      )
    );

    /*
      Impede que uma consulta anterior desenhe
      dados depois que o usuário mudou de página.
    */
    if (frotaAtual !== chave) {
      return;
    }

    frotaCache = [];

    snapshot.forEach((documento) => {
      const dados = documento.data();

      if (dados.ativo === false) {
        return;
      }

      frotaCache.push({
        id: documento.id,
        ...dados,
      });
    });

    const tipos = await obterTiposEquipamento(
      config.categoriaEquip
    );

    const mapaTipos = Object.fromEntries(
      tipos.map((tipo) => [
        tipo.id,
        tipo.nome,
      ])
    );

    frotaCache.forEach((item) => {
      item._tipoNome =
        mapaTipos[item.tipoEquipamentoId] ||
        "Sem tipo";
    });

    frotaCache.sort((a, b) =>
      String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      )
    );

    atualizarResumoFrota();
    atualizarContadorMenuFrota(config);
    renderizarListaFrota();

  } catch (erro) {
    console.error(
      "Erro ao carregar a frota:",
      erro
    );

    wrap.innerHTML = `
      <div class="cadastro-erro">
        <strong>
          Não foi possível carregar os dados.
        </strong>

        <br>

        Verifique sua conexão com a internet
        e tente novamente.

        <br><br>

        <button
          type="button"
          class="btn-secundario"
          id="btnTentarFrota"
        >
          Tentar novamente
        </button>
      </div>
    `;

    const botaoTentar = document.getElementById(
      "btnTentarFrota"
    );

    if (botaoTentar) {
      botaoTentar.addEventListener(
        "click",
        () => carregarFrota(chave)
      );
    }
  }
}


/* =========================================================
   CONTADOR DO MENU
   ========================================================= */

function atualizarContadorMenuFrota(config) {
  if (
    typeof window.atualizarContadorNavegacao ===
    "function"
  ) {
    window.atualizarContadorNavegacao(
      config.contadorMenu,
      frotaCache.length
    );

    return;
  }

  const contador = document.getElementById(
    config.contadorMenu
  );

  if (!contador) {
    return;
  }

  contador.textContent = String(
    frotaCache.length
  );

  contador.hidden = frotaCache.length === 0;
}


/* =========================================================
   FILTRAGEM DOS REGISTROS
   ========================================================= */

function obterItensFrotaFiltrados() {
  const config = obterConfigFrota(frotaAtual);

  if (!config) {
    return [];
  }

  return frotaCache.filter((item) => {
    const correspondeStatus =
      frotaFiltro.status === "todos" ||
      item.status === frotaFiltro.status;

    if (!correspondeStatus) {
      return false;
    }

    if (!frotaFiltro.busca) {
      return true;
    }

    const textoItem = normalizarTexto([
      item.nome,
      item[config.campoIdentificador.id],
      item._tipoNome,
      statusFrotaInfo(item.status).rotulo,
    ].join(" "));

    return textoItem.includes(
      frotaFiltro.busca
    );
  });
}


/* =========================================================
   LISTAGEM DOS CARDS
   ========================================================= */

function renderizarListaFrota() {
  const config = obterConfigFrota(frotaAtual);

  const wrap = document.getElementById(
    "listaFrotaWrap"
  );

  if (!config || !wrap) {
    return;
  }

  const itens = obterItensFrotaFiltrados();

  if (itens.length === 0) {
    const possuiFiltro =
      Boolean(frotaFiltro.busca) ||
      frotaFiltro.status !== "todos";

    wrap.innerHTML = `
      <div class="cadastro-vazio">
        ${
          possuiFiltro
            ? "Nenhum registro corresponde aos filtros selecionados."
            : `Nenhuma ${config.singular.toLowerCase()} cadastrada.`
        }
      </div>
    `;

    return;
  }

  wrap.innerHTML = `
    <div class="grid-frota">

      ${itens.map((item) => {
        const status = statusFrotaInfo(
          item.status
        );

        const identificador =
          item[config.campoIdentificador.id] ||
          "Sem identificação";

        const medidor =
          formatarNumeroFrota(
            item[config.campoMedidor.id]
          );

        return `
          <article class="card-frota">

            <div class="card-frota-topo">

              <span class="badge ${status.badge}">
                ${status.rotulo}
              </span>

              <button
                type="button"
                class="btn-icone"
                title="Editar ${config.singular.toLowerCase()}"
                aria-label="Editar ${escaparHtml(item.nome || config.singular)}"
                data-editar-frota="${item.id}"
              >
                ${obterIconeLapisFrota()}
              </button>

            </div>

            <h3>
              ${escaparHtml(item.nome || "Sem nome")}
            </h3>

            <p class="card-frota-info">
              ${escaparHtml(identificador)}
              <span aria-hidden="true"> · </span>
              ${escaparHtml(item._tipoNome)}
            </p>

            <div class="card-frota-rodape">

              <span>
                ${config.campoMedidor.label}
              </span>

              <strong>
                ${medidor}
                ${
                  medidor !== "—"
                    ? escaparHtml(config.campoMedidor.unidade)
                    : ""
                }
              </strong>

            </div>

          </article>
        `;
      }).join("")}

    </div>
  `;

  wrap
    .querySelectorAll("[data-editar-frota]")
    .forEach((botao) => {
      botao.addEventListener(
        "click",
        () => {
          abrirModalFrota(
            frotaAtual,
            botao.dataset.editarFrota
          );
        }
      );
    });
}


/* =========================================================
   MODAL DE CADASTRO
   ========================================================= */

async function abrirModalFrota(chave, id) {
  const config = obterConfigFrota(chave);

  if (!config) {
    return;
  }

  const dados = id
    ? frotaCache.find(
        (item) => item.id === id
      )
    : null;

  try {
    const tipos = await obterTiposEquipamento(
      config.categoriaEquip
    );

    const modalAnterior =
      document.getElementById("modalOverlay");

    if (modalAnterior) {
      modalAnterior.remove();
    }

    const modalHtml = `
      <div
        class="modal-overlay"
        id="modalOverlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tituloModalFrota"
      >

        <div class="modal-cadastro modal-obra">

          <div class="modal-cabecalho">

            <h3 id="tituloModalFrota">
              ${dados ? "Editar" : "Adicionar"}
              ${config.singular}
            </h3>

            <button
              type="button"
              class="btn-fechar-modal"
              id="btnFecharModal"
              aria-label="Fechar"
            >
              ${obterIconeFecharFrota()}
            </button>

          </div>

          <form id="formFrota">

            <div class="campo">
              <label for="frotaNome">
                Nome *
              </label>

              <input
                type="text"
                id="frotaNome"
                value="${escaparHtml(dados?.nome || "")}"
                placeholder="Nome ou modelo do equipamento"
                maxlength="100"
                autocomplete="off"
                required
              >
            </div>

            <div class="linha-campos">

              <div class="campo">
                <label for="frotaIdentificador">
                  ${config.campoIdentificador.label}
                </label>

                <input
                  type="text"
                  id="frotaIdentificador"
                  value="${escaparHtml(
                    dados?.[
                      config.campoIdentificador.id
                    ] || ""
                  )}"
                  placeholder="${config.campoIdentificador.placeholder}"
                  maxlength="30"
                  autocomplete="off"
                >
              </div>

              <div class="campo">
                <label for="frotaTipo">
                  Tipo de equipamento
                </label>

                <select id="frotaTipo">
                  <option value="">
                    Nenhum
                  </option>

                  ${tipos.map(
                    (tipo) => `
                      <option
                        value="${tipo.id}"
                        ${
                          tipo.id ===
                          dados?.tipoEquipamentoId
                            ? "selected"
                            : ""
                        }
                      >
                        ${escaparHtml(tipo.nome)}
                      </option>
                    `
                  ).join("")}
                </select>
              </div>

            </div>

            <div class="linha-campos">

              <div class="campo">
                <label for="frotaStatus">
                  Status
                </label>

                <select id="frotaStatus">

                  ${STATUS_FROTA.map(
                    (status) => `
                      <option
                        value="${status.valor}"
                        ${
                          (
                            dados?.status ||
                            "disponivel"
                          ) === status.valor
                            ? "selected"
                            : ""
                        }
                      >
                        ${status.rotulo}
                      </option>
                    `
                  ).join("")}

                </select>
              </div>

              <div class="campo">
                <label for="frotaMedidor">
                  ${config.campoMedidor.label}
                  (${config.campoMedidor.unidade})
                </label>

                <input
                  type="number"
                  id="frotaMedidor"
                  value="${
                    dados?.[
                      config.campoMedidor.id
                    ] ?? ""
                  }"
                  placeholder="${config.campoMedidor.placeholder}"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                >
              </div>

            </div>

            <div
              class="modal-erro"
              id="modalErro"
              role="alert"
            ></div>

            <div class="modal-acoes">

              <button
                type="button"
                class="btn-secundario"
                id="btnCancelarModal"
              >
                Cancelar
              </button>

              <button
                type="submit"
                class="btn-primario"
                id="btnSalvarFrota"
              >
                Salvar
              </button>

            </div>

          </form>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML(
      "beforeend",
      modalHtml
    );

    configurarEventosModalFrota(chave, id);

    const campoNome =
      document.getElementById("frotaNome");

    if (campoNome) {
      campoNome.focus();
    }

  } catch (erro) {
    console.error(
      "Erro ao abrir o cadastro da frota:",
      erro
    );

    alert(
      "Não foi possível abrir o cadastro. Verifique sua conexão e tente novamente."
    );
  }
}


/* =========================================================
   EVENTOS DO MODAL
   ========================================================= */

function configurarEventosModalFrota(
  chave,
  id
) {
  const modal = document.getElementById(
    "modalOverlay"
  );

  const botaoFechar = document.getElementById(
    "btnFecharModal"
  );

  const botaoCancelar =
    document.getElementById(
      "btnCancelarModal"
    );

  const formulario = document.getElementById(
    "formFrota"
  );

  const identificador =
    document.getElementById(
      "frotaIdentificador"
    );

  if (botaoFechar) {
    botaoFechar.addEventListener(
      "click",
      fecharModalFrota
    );
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener(
      "click",
      fecharModalFrota
    );
  }

  if (modal) {
    modal.addEventListener(
      "click",
      (evento) => {
        if (evento.target === modal) {
          fecharModalFrota();
        }
      }
    );
  }

  if (identificador) {
    identificador.addEventListener(
      "input",
      (evento) => {
        evento.target.value =
          evento.target.value.toUpperCase();
      }
    );
  }

  if (formulario) {
    formulario.addEventListener(
      "submit",
      async (evento) => {
        evento.preventDefault();

        await salvarFrota(chave, id);
      }
    );
  }
}


/* =========================================================
   SALVAMENTO NO FIRESTORE
   ========================================================= */

async function salvarFrota(
  chave,
  idExistente
) {
  const config = obterConfigFrota(chave);

  const erro = document.getElementById(
    "modalErro"
  );

  const botao = document.getElementById(
    "btnSalvarFrota"
  );

  if (!config || !erro || !botao) {
    return;
  }

  erro.textContent = "";

  const campoNome = document.getElementById(
    "frotaNome"
  );

  const campoIdentificador =
    document.getElementById(
      "frotaIdentificador"
    );

  const campoTipo = document.getElementById(
    "frotaTipo"
  );

  const campoStatus = document.getElementById(
    "frotaStatus"
  );

  const campoMedidor =
    document.getElementById(
      "frotaMedidor"
    );

  const nome = campoNome.value.trim();

  if (!nome) {
    erro.textContent =
      'Preencha o campo "Nome".';

    campoNome.focus();
    return;
  }

  const medidorTexto =
    campoMedidor.value.trim();

  const medidorValor =
    medidorTexto === ""
      ? null
      : Number(medidorTexto);

  if (
    medidorValor !== null &&
    (
      !Number.isFinite(medidorValor) ||
      medidorValor < 0
    )
  ) {
    erro.textContent =
      `${config.campoMedidor.label} deve ser um número igual ou maior que zero.`;

    campoMedidor.focus();
    return;
  }

  const identificador =
    campoIdentificador.value
      .trim()
      .toUpperCase();

  const dados = {
    nome,

    [config.campoIdentificador.id]:
      identificador,

    tipoEquipamentoId:
      campoTipo.value,

    status:
      campoStatus.value,

    [config.campoMedidor.id]:
      medidorValor,
  };

  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    verificarFirebaseFrota();

    const {
      collection,
      addDoc,
      doc,
      updateDoc,
      serverTimestamp,
    } = window.fs;

    if (idExistente) {
      dados.atualizadoEm =
        serverTimestamp();

      await updateDoc(
        doc(
          window.firebaseDb,
          config.colecao,
          idExistente
        ),
        dados
      );

    } else {
      dados.ativo = true;
      dados.criadoEm = serverTimestamp();
      dados.atualizadoEm =
        serverTimestamp();

      await addDoc(
        collection(
          window.firebaseDb,
          config.colecao
        ),
        dados
      );
    }

    fecharModalFrota();

    await carregarFrota(chave);

  } catch (erroFirebase) {
    console.error(
      "Erro ao salvar registro da frota:",
      erroFirebase
    );

    erro.textContent =
      "Não foi possível salvar. Verifique sua conexão e tente novamente.";

    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}
