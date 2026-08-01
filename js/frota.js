/* =========================================================
   FROTA — MÁQUINAS E CAMINHÕES
   Única Construtora — Centro Operacional

   Regras do modal:
   - Centralizado horizontal e verticalmente.
   - Não fecha ao clicar fora.
   - Não fecha pela tecla Esc.
   - Fecha somente pelo X, Cancelar ou após salvar.
   ========================================================= */


/* =========================================================
   CONFIGURAÇÃO
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

  {
    valor: "parado",
    rotulo: "Parado",
    badge: "parada",
  },
];


/* =========================================================
   ESTADO
   ========================================================= */

let frotaAtual = null;

let frotaCache = [];

let frotaFiltro = {
  busca: "",
  status: "todos",
  mostrarInativos: false,
};

const cacheTiposEquipamento = {};

let cacheObrasFrota = null;

// ícones de placeholder por categoria, usados quando o equipamento
// não tem foto cadastrada (nunca fica espaço vazio no card)
function obterIconePlaceholderFrota(categoria) {
  if (categoria === "caminhao") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="14" height="10" rx="1.5"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10l6-5 6 5v10"/><path d="M4 20h16"/><path d="M10 20v-6h4v6"/></svg>`;
}

async function obterObrasFrota() {
  if (cacheObrasFrota) return cacheObrasFrota;
  verificarFirebaseFrota();
  const { collection, getDocs } = window.fs;
  const snapshot = await getDocs(collection(window.firebaseDb, "obras"));
  const lista = [];
  snapshot.forEach((documento) => {
    const dados = documento.data();
    if (dados.ativo === false) return;
    lista.push({ id: documento.id, nome: dados.nome || "Sem nome" });
  });
  lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  cacheObrasFrota = lista;
  return lista;
}

// Comprime a foto no próprio navegador antes de salvar (sem Firebase
// Storage, a foto vira texto e vai junto com o resto do cadastro no
// Firestore — por isso precisa ser pequena, não em resolução total).
function comprimirImagemFrota(arquivo, maxLargura = 640, qualidade = 0.65) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = (evento) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLargura / img.width);
        const largura = Math.round(img.width * escala);
        const altura = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
      img.src = evento.target.result;
    };
    leitor.onerror = () => reject(new Error("Não foi possível ler esse arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function escaparHtmlFrota(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normalizarTextoFrota(valor) {
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


function obterConfigFrota(chave) {
  return FROTA_CONFIG[chave] || null;
}


function obterStatusFrota(valor) {
  return (
    STATUS_FROTA.find(
      (status) => status.valor === valor
    ) ||
    STATUS_FROTA[0]
  );
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


function obterIconeLapisFrota() {
  if (
    typeof window.iconeLapis ===
    "function"
  ) {
    return window.iconeLapis();
  }

  if (
    typeof iconeLapis ===
    "function"
  ) {
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
      aria-hidden="true"
    >
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path>
    </svg>
  `;
}


function obterIconeFecharFrota() {
  if (
    typeof window.iconeX ===
    "function"
  ) {
    return window.iconeX();
  }

  if (
    typeof iconeX ===
    "function"
  ) {
    return iconeX();
  }

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18"></path>
      <path d="M6 6l12 12"></path>
    </svg>
  `;
}


/* =========================================================
   ESTILOS DE SEGURANÇA DO MODAL

   Estes estilos garantem a centralização mesmo que exista
   alguma regra antiga no style.css.
   ========================================================= */

function garantirEstilosModalFrota() {
  if (
    document.getElementById(
      "estilosModalFrotaSeguro"
    )
  ) {
    return;
  }

  const estilo =
    document.createElement("style");

  estilo.id =
    "estilosModalFrotaSeguro";

  estilo.textContent = `
    #modalOverlay.modal-overlay {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      overflow-y: auto !important;
      background: rgba(0, 0, 0, 0.72) !important;
      z-index: 1000 !important;
    }

    #modalOverlay .modal-cadastro {
      position: relative !important;
      top: auto !important;
      right: auto !important;
      bottom: auto !important;
      left: auto !important;
      transform: none !important;
      margin: auto !important;
      width: 100% !important;
      max-width: 520px !important;
      max-height: calc(100vh - 40px) !important;
      overflow-y: auto !important;
    }

    body.modal-frota-aberto {
      overflow: hidden !important;
    }

    @media (max-width: 560px) {
      #modalOverlay.modal-overlay {
        align-items: center !important;
        padding: 12px !important;
      }

      #modalOverlay .modal-cadastro {
        max-height: calc(100vh - 24px) !important;
        padding: 20px !important;
      }
    }
  `;

  document.head.appendChild(estilo);
}


/* =========================================================
   ABRIR E FECHAR MODAL
   ========================================================= */

function fecharModalFrota() {
  const modal =
    document.getElementById(
      "modalOverlay"
    );

  if (modal) {
    modal.remove();
  }

  document.body.classList.remove(
    "modal-frota-aberto"
  );
}


/*
  Disponibiliza o fechamento para outros arquivos,
  sem depender do fecharModalCadastro().
*/
window.fecharModalFrota =
  fecharModalFrota;


/* =========================================================
   TIPOS DE EQUIPAMENTO
   ========================================================= */

async function obterTiposEquipamentoFrota(
  categoria
) {
  if (
    cacheTiposEquipamento[categoria]
  ) {
    return cacheTiposEquipamento[
      categoria
    ];
  }

  verificarFirebaseFrota();

  const {
    collection,
    getDocs,
  } = window.fs;

  const snapshot =
    await getDocs(
      collection(
        window.firebaseDb,
        "cadastros_tipos_equipamento"
      )
    );

  const tipos = [];

  snapshot.forEach((documento) => {
    const dados =
      documento.data();

    if (dados.ativo === false) {
      return;
    }

    if (
      dados.categoria !== categoria
    ) {
      return;
    }

    tipos.push({
      id: documento.id,
      nome:
        dados.nome ||
        "Sem nome",
    });
  });

  tipos.sort((a, b) => {
    return String(a.nome).localeCompare(
      String(b.nome),
      "pt-BR"
    );
  });

  cacheTiposEquipamento[categoria] =
    tipos;

  return tipos;
}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

async function renderFrota(chave) {
  const config =
    obterConfigFrota(chave);

  const area =
    document.getElementById(
      "areaPagina"
    );

  if (!area) {
    return;
  }

  if (!config) {
    if (
      typeof window.renderPlaceholder ===
      "function"
    ) {
      window.renderPlaceholder(chave);
    }

    return;
  }

  fecharModalFrota();

  frotaAtual = chave;

  frotaCache = [];

  frotaFiltro = {
    busca: "",
    status: "todos",
    mostrarInativos: false,
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
            placeholder="Buscar ${escaparHtmlFrota(
              config.titulo.toLowerCase()
            )}..."
            autocomplete="off"
          >

        </div>

        <div
          class="filtro-status"
          id="filtroStatusFrota"
        >
          ${renderBotoesFiltroFrota()}
        </div>

        <label class="check-inativos">
          <input type="checkbox" id="mostrarFrotaInativos"> Mostrar desativados
        </label>

        <button
          type="button"
          class="btn-primario"
          id="btnAdicionarFrota"
        >
          + Adicionar
          ${escaparHtmlFrota(
            config.singular.toLowerCase()
          )}
        </button>

      </div>

      <div id="listaFrotaWrap">

        <p class="cadastro-carregando">
          Carregando
          ${escaparHtmlFrota(
            config.titulo.toLowerCase()
          )}...
        </p>

      </div>

    </section>
  `;

  configurarEventosTelaFrota(chave);

  await carregarFrota(chave);
}


window.renderFrota = renderFrota;


/* =========================================================
   EVENTOS DA TELA
   ========================================================= */

function configurarEventosTelaFrota(
  chave
) {
  const botaoAdicionar =
    document.getElementById(
      "btnAdicionarFrota"
    );

  const campoBusca =
    document.getElementById(
      "buscaFrota"
    );

  const filtroStatus =
    document.getElementById(
      "filtroStatusFrota"
    );

  botaoAdicionar?.addEventListener(
    "click",
    () => {
      abrirModalFrota(
        chave,
        null
      );
    }
  );

  campoBusca?.addEventListener(
    "input",
    (evento) => {
      frotaFiltro.busca =
        normalizarTextoFrota(
          evento.target.value
        );

      renderizarListaFrota();
    }
  );

  filtroStatus?.addEventListener(
    "click",
    (evento) => {
      const botao =
        evento.target.closest(
          "[data-status-frota]"
        );

      if (!botao) {
        return;
      }

      frotaFiltro.status =
        botao.dataset.statusFrota;

      filtroStatus
        .querySelectorAll(
          "[data-status-frota]"
        )
        .forEach((item) => {
          item.classList.toggle(
            "ativo",
            item === botao
          );
        });

      renderizarListaFrota();
    }
  );

  document.getElementById("mostrarFrotaInativos")?.addEventListener("change", (evento) => {
    frotaFiltro.mostrarInativos = evento.target.checked;
    renderizarListaFrota();
  });
}


/* =========================================================
   FILTROS
   ========================================================= */

function renderBotoesFiltroFrota() {
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
          data-status-frota="${escaparHtmlFrota(
            status.valor
          )}"
        >
          ${escaparHtmlFrota(
            status.rotulo
          )}
        </button>
      `
    ).join("")}
  `;
}


/* =========================================================
   RESUMO
   ========================================================= */

function renderCardResumoFrota(
  titulo,
  valor,
  rotulo,
  classe = ""
) {
  return `
    <article
      class="card-indicador ${classe}"
    >

      <div class="topo">

        <span class="eyebrow">
          ${escaparHtmlFrota(titulo)}
        </span>

      </div>

      <div class="valor">
        ${escaparHtmlFrota(valor)}
      </div>

      <div class="rotulo">
        ${escaparHtmlFrota(rotulo)}
      </div>

    </article>
  `;
}


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


function atualizarResumoFrota() {
  const resumo =
    document.getElementById(
      "resumoFrota"
    );

  if (!resumo) {
    return;
  }

  const ativos =
    frotaCache.filter(
      (item) => item.ativo !== false
    );

  const total =
    ativos.length;

  const disponiveis =
    ativos.filter(
      (item) =>
        item.status ===
        "disponivel"
    ).length;

  const emUso =
    ativos.filter(
      (item) =>
        item.status ===
        "em_uso"
    ).length;

  const manutencao =
    ativos.filter(
      (item) =>
        item.status ===
        "manutencao"
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
  const config =
    obterConfigFrota(chave);

  const wrap =
    document.getElementById(
      "listaFrotaWrap"
    );

  if (
    !config ||
    !wrap
  ) {
    return;
  }

  wrap.innerHTML = `
    <p class="cadastro-carregando">
      Carregando
      ${escaparHtmlFrota(
        config.titulo.toLowerCase()
      )}...
    </p>
  `;

  try {
    verificarFirebaseFrota();

    const {
      collection,
      getDocs,
    } = window.fs;

    const snapshot =
      await getDocs(
        collection(
          window.firebaseDb,
          config.colecao
        )
      );

    /*
      Evita que uma consulta antiga desenhe
      depois que o usuário mudou de página.
    */
    if (frotaAtual !== chave) {
      return;
    }

    frotaCache = [];

    snapshot.forEach((documento) => {
      const dados =
        documento.data();

      frotaCache.push({
        id: documento.id,
        ...dados,
      });
    });

    const tipos =
      await obterTiposEquipamentoFrota(
        config.categoriaEquip
      );

    const mapaTipos =
      Object.fromEntries(
        tipos.map((tipo) => [
          tipo.id,
          tipo.nome,
        ])
      );

    frotaCache.forEach((item) => {
      item._tipoNome =
        mapaTipos[
          item.tipoEquipamentoId
        ] ||
        "Sem tipo";
    });

    const obrasFrota = await obterObrasFrota();
    const mapaObrasFrota = Object.fromEntries(
      obrasFrota.map((obra) => [obra.id, obra.nome])
    );
    frotaCache.forEach((item) => {
      item._obraNome = item.obraId ? (mapaObrasFrota[item.obraId] || null) : null;
    });

    frotaCache.sort((a, b) => {
      return String(
        a.nome || ""
      ).localeCompare(
        String(
          b.nome || ""
        ),
        "pt-BR"
      );
    });

    atualizarResumoFrota();

    atualizarContadorMenuFrota(
      config
    );

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

    document
      .getElementById(
        "btnTentarFrota"
      )
      ?.addEventListener(
        "click",
        () => {
          carregarFrota(chave);
        }
      );
  }
}


/* =========================================================
   CONTADOR DO MENU
   ========================================================= */

function atualizarContadorMenuFrota(
  config
) {
  if (
    typeof window
      .atualizarContadorNavegacao ===
    "function"
  ) {
    window.atualizarContadorNavegacao(
      config.contadorMenu,
      frotaCache.length
    );

    return;
  }

  const contador =
    document.getElementById(
      config.contadorMenu
    );

  if (!contador) {
    return;
  }

  contador.textContent =
    String(frotaCache.length);

  contador.hidden =
    frotaCache.length === 0;
}


/* =========================================================
   FILTRAGEM
   ========================================================= */

function obterItensFrotaFiltrados() {
  const config =
    obterConfigFrota(
      frotaAtual
    );

  if (!config) {
    return [];
  }

  return frotaCache.filter((item) => {
    if (!frotaFiltro.mostrarInativos && item.ativo === false) {
      return false;
    }

    const correspondeStatus =
      frotaFiltro.status ===
        "todos" ||
      item.status ===
        frotaFiltro.status;

    if (!correspondeStatus) {
      return false;
    }

    if (!frotaFiltro.busca) {
      return true;
    }

    const textoItem =
      normalizarTextoFrota(
        [
          item.nome,
          item[
            config
              .campoIdentificador
              .id
          ],
          item._tipoNome,
          obterStatusFrota(
            item.status
          ).rotulo,
        ].join(" ")
      );

    return textoItem.includes(
      frotaFiltro.busca
    );
  });
}


/* =========================================================
   CARDS DA FROTA
   ========================================================= */

function renderizarListaFrota() {
  const config =
    obterConfigFrota(
      frotaAtual
    );

  const wrap =
    document.getElementById(
      "listaFrotaWrap"
    );

  if (
    !config ||
    !wrap
  ) {
    return;
  }

  const itens =
    obterItensFrotaFiltrados();

  if (itens.length === 0) {
    const possuiFiltro =
      Boolean(
        frotaFiltro.busca
      ) ||
      frotaFiltro.status !==
        "todos";

    wrap.innerHTML = `
      <div class="cadastro-vazio">

        ${
          possuiFiltro
            ? "Nenhum registro corresponde aos filtros selecionados."
            : `Nenhuma ${escaparHtmlFrota(
                config.singular.toLowerCase()
              )} cadastrada.`
        }

      </div>
    `;

    return;
  }

  wrap.innerHTML = `
    <div class="grid-frota">

      ${itens.map((item) => {
        const status =
          obterStatusFrota(
            item.status
          );

        const identificador =
          item[
            config
              .campoIdentificador
              .id
          ] ||
          "Sem identificação";

        const medidor =
          formatarNumeroFrota(
            item[
              config
                .campoMedidor
                .id
            ]
          );

        return `
          <article class="card-frota${item.ativo === false ? " card-frota-inativa" : ""}">

            <div class="card-frota-foto${item.fotoUrl ? "" : " sem-foto"}">
              ${item.fotoUrl
                ? `<img src="${escaparHtmlFrota(item.fotoUrl)}" alt="${escaparHtmlFrota(item.nome || "")}" loading="lazy" onerror="this.closest('.card-frota-foto').classList.add('sem-foto'); this.remove();">`
                : obterIconePlaceholderFrota(config.categoriaEquip)
              }
            </div>

            <div class="card-frota-topo">

              <span
                class="badge ${item.ativo === false ? "parada" : escaparHtmlFrota(status.badge)}"
              >
                ${item.ativo === false ? "Desativado" : escaparHtmlFrota(status.rotulo)}
              </span>

              <div class="celula-acoes">

                <button
                  type="button"
                  class="btn-icone"
                  title="Editar ${escaparHtmlFrota(
                    config.singular.toLowerCase()
                  )}"
                  aria-label="Editar ${escaparHtmlFrota(
                    item.nome ||
                    config.singular
                  )}"
                  data-editar-frota="${escaparHtmlFrota(
                    item.id
                  )}"
                >
                  ${obterIconeLapisFrota()}
                </button>

                <button
                  type="button"
                  class="btn-icone"
                  title="Mais opções"
                  aria-label="Mais opções"
                  data-mais-opcoes-frota="${escaparHtmlFrota(item.id)}"
                >⋮</button>

                <div class="menu-mais-opcoes" data-menu-frota="${escaparHtmlFrota(item.id)}" hidden>
                  ${item.ativo === false
                    ? `<button type="button" data-reativar-frota="${escaparHtmlFrota(item.id)}">Reativar</button>`
                    : `<button type="button" data-desativar-frota="${escaparHtmlFrota(item.id)}">Desativar</button>`}
                </div>

              </div>

            </div>

            <h3>
              ${escaparHtmlFrota(
                item.nome ||
                "Sem nome"
              )}
            </h3>

            <p class="card-frota-info">

              ${escaparHtmlFrota(
                identificador
              )}

              <span aria-hidden="true">
                ·
              </span>

              ${escaparHtmlFrota(
                item._tipoNome ||
                "Sem tipo"
              )}

            </p>

            ${item._obraNome ? `
              <p class="card-frota-obra">
                <span aria-hidden="true">▣</span> ${escaparHtmlFrota(item._obraNome)}
              </p>
            ` : ""}

            <div class="card-frota-rodape card-frota-medidor-destaque">

              <span>
                ${escaparHtmlFrota(
                  config
                    .campoMedidor
                    .label
                )}
              </span>

              <strong>

                ${medidor}

                ${
                  medidor !== "—"
                    ? escaparHtmlFrota(
                        config
                          .campoMedidor
                          .unidade
                      )
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
    .querySelectorAll(
      "[data-editar-frota]"
    )
    .forEach((botao) => {
      botao.addEventListener(
        "click",
        () => {
          abrirModalFrota(
            frotaAtual,
            botao.dataset
              .editarFrota
          );
        }
      );
    });

  wrap.querySelectorAll("[data-mais-opcoes-frota]").forEach((botao) => {
    botao.addEventListener("click", (evento) => {
      evento.stopPropagation();
      const menu = wrap.querySelector(`[data-menu-frota="${botao.dataset.maisOpcoesFrota}"]`);
      const jaAberto = menu && !menu.hidden;
      wrap.querySelectorAll(".menu-mais-opcoes").forEach((m) => { m.hidden = true; });
      if (menu) menu.hidden = jaAberto;
    });
  });
  wrap.querySelectorAll("[data-desativar-frota]").forEach((botao) => {
    botao.addEventListener("click", () => alternarAtivoFrota(botao.dataset.desativarFrota, false));
  });
  wrap.querySelectorAll("[data-reativar-frota]").forEach((botao) => {
    botao.addEventListener("click", () => alternarAtivoFrota(botao.dataset.reativarFrota, true));
  });
  if (!window._fechaMenuFrotaGlobal) {
    window._fechaMenuFrotaGlobal = true;
    document.addEventListener("click", () => {
      document.querySelectorAll(".menu-mais-opcoes").forEach((m) => { m.hidden = true; });
    });
  }
}

async function alternarAtivoFrota(id, novoValor) {
  const config = obterConfigFrota(frotaAtual);
  if (!config) return;
  const acao = novoValor ? "reativar" : "desativar";
  if (!confirm(`Tem certeza que deseja ${acao} este equipamento?`)) return;
  try {
    verificarFirebaseFrota();
    const { doc, updateDoc, serverTimestamp } = window.fs;
    await updateDoc(doc(window.firebaseDb, config.colecao, id), {
      ativo: novoValor,
      atualizadoEm: serverTimestamp(),
    });
    await carregarFrota(frotaAtual);
  } catch (erro) {
    console.error("Erro ao atualizar equipamento:", erro);
    alert("Não foi possível atualizar. Tente novamente.");
  }
}


/* =========================================================
   MODAL
   ========================================================= */

async function abrirModalFrota(
  chave,
  id
) {
  const config =
    obterConfigFrota(chave);

  if (!config) {
    return;
  }

  const dados = id
    ? frotaCache.find(
        (item) =>
          item.id === id
      )
    : null;

  try {
    garantirEstilosModalFrota();

    const tipos =
      await obterTiposEquipamentoFrota(
        config.categoriaEquip
      );

    const obrasDisponiveis = await obterObrasFrota();

    fecharModalFrota();

    const modalHtml = `
      <div
        class="modal-overlay"
        id="modalOverlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tituloModalFrota"
      >

        <div
          class="modal-cadastro modal-obra"
          role="document"
        >

          <div class="modal-cabecalho">

            <h3 id="tituloModalFrota">

              ${
                dados
                  ? "Editar"
                  : "Adicionar"
              }

              ${escaparHtmlFrota(
                config.singular
              )}

            </h3>

            <button
              type="button"
              class="btn-fechar-modal"
              id="btnFecharModalFrota"
              aria-label="Fechar"
              title="Fechar"
            >
              ${obterIconeFecharFrota()}
            </button>

          </div>

          <form
            id="formFrota"
            autocomplete="off"
          >

            <div class="campo">

              <label for="frotaNome">
                Nome *
              </label>

              <input
                type="text"
                id="frotaNome"
                value="${escaparHtmlFrota(
                  dados?.nome || ""
                )}"
                placeholder="Nome ou modelo do equipamento"
                maxlength="100"
                autocomplete="off"
                required
              >

            </div>

            <div class="campo">
              <label for="frotaFotoArquivo">Foto (opcional)</label>
              <input type="file" id="frotaFotoArquivo" accept="image/*" capture="environment">
              <input type="hidden" id="frotaFotoUrl" value="${escaparHtmlFrota(dados?.fotoUrl || "")}">
              <div class="preview-foto-frota" id="previewFotoFrota">
                ${dados?.fotoUrl
                  ? `<img src="${escaparHtmlFrota(dados.fotoUrl)}" alt="">`
                  : `<span class="preview-foto-vazio">${obterIconePlaceholderFrota(config.categoriaEquip)}</span>`}
              </div>
              <button type="button" class="btn-secundario" id="btnRemoverFotoFrota" style="margin-top:8px;">Remover foto</button>
              <span class="campo-ajuda">Tire uma foto ou escolha da galeria. Ela é comprimida automaticamente antes de salvar.</span>
            </div>

            <div class="linha-campos">

              <div class="campo">

                <label for="frotaIdentificador">

                  ${escaparHtmlFrota(
                    config
                      .campoIdentificador
                      .label
                  )}

                </label>

                <input
                  type="text"
                  id="frotaIdentificador"
                  value="${escaparHtmlFrota(
                    dados?.[
                      config
                        .campoIdentificador
                        .id
                    ] ||
                    ""
                  )}"
                  placeholder="${escaparHtmlFrota(
                    config
                      .campoIdentificador
                      .placeholder
                  )}"
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

                  ${tipos.map((tipo) => {
                    const selecionado =
                      tipo.id ===
                      dados?.tipoEquipamentoId;

                    return `
                      <option
                        value="${escaparHtmlFrota(
                          tipo.id
                        )}"
                        ${
                          selecionado
                            ? "selected"
                            : ""
                        }
                      >
                        ${escaparHtmlFrota(
                          tipo.nome
                        )}
                      </option>
                    `;
                  }).join("")}

                </select>

              </div>

            </div>

            <div class="campo">
              <label for="frotaObra">Obra vinculada (opcional)</label>
              <select id="frotaObra">
                <option value="">Nenhuma</option>
                ${obrasDisponiveis.map((obra) => `
                  <option value="${escaparHtmlFrota(obra.id)}" ${obra.id === dados?.obraId ? "selected" : ""}>${escaparHtmlFrota(obra.nome)}</option>
                `).join("")}
              </select>
            </div>

            <div class="linha-campos">

              <div class="campo">

                <label for="frotaStatus">
                  Status
                </label>

                <select id="frotaStatus">

                  ${STATUS_FROTA.map(
                    (status) => {
                      const statusAtual =
                        dados?.status ||
                        "disponivel";

                      return `
                        <option
                          value="${escaparHtmlFrota(
                            status.valor
                          )}"
                          ${
                            statusAtual ===
                            status.valor
                              ? "selected"
                              : ""
                          }
                        >
                          ${escaparHtmlFrota(
                            status.rotulo
                          )}
                        </option>
                      `;
                    }
                  ).join("")}

                </select>

              </div>

              <div class="campo">

                <label for="frotaMedidor">

                  ${escaparHtmlFrota(
                    config
                      .campoMedidor
                      .label
                  )}

                  (${escaparHtmlFrota(
                    config
                      .campoMedidor
                      .unidade
                  )})

                </label>

                <input
                  type="number"
                  id="frotaMedidor"
                  value="${escaparHtmlFrota(
                    dados?.[
                      config
                        .campoMedidor
                        .id
                    ] ??
                    ""
                  )}"
                  placeholder="${escaparHtmlFrota(
                    config
                      .campoMedidor
                      .placeholder
                  )}"
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
                id="btnCancelarModalFrota"
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

    document.body.classList.add(
      "modal-frota-aberto"
    );

    configurarEventosModalFrota(
      chave,
      id
    );

    /*
      O foco é aplicado após a montagem completa,
      sem mover ou desalojar o modal.
    */
    requestAnimationFrame(() => {
      document
        .getElementById(
          "frotaNome"
        )
        ?.focus({
          preventScroll: true,
        });
    });

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

   Não existe evento para fechar clicando no overlay.
   Não existe evento de tecla Esc.
   ========================================================= */

function configurarEventosModalFrota(
  chave,
  id
) {
  const modal =
    document.getElementById(
      "modalOverlay"
    );

  const botaoFechar =
    document.getElementById(
      "btnFecharModalFrota"
    );

  const botaoCancelar =
    document.getElementById(
      "btnCancelarModalFrota"
    );

  const formulario =
    document.getElementById(
      "formFrota"
    );

  const identificador =
    document.getElementById(
      "frotaIdentificador"
    );

  /*
    O overlay captura o clique apenas para impedir
    propagação. Ele nunca fecha o modal.
  */
  modal?.addEventListener(
    "click",
    (evento) => {
      if (
        evento.target === modal
      ) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    }
  );

  /*
    O clique dentro da caixa também não deve
    chegar a nenhum evento externo.
  */
  modal
    ?.querySelector(
      ".modal-cadastro"
    )
    ?.addEventListener(
      "click",
      (evento) => {
        evento.stopPropagation();
      }
    );

  botaoFechar?.addEventListener(
    "click",
    fecharModalFrota
  );

  botaoCancelar?.addEventListener(
    "click",
    fecharModalFrota
  );

  identificador?.addEventListener(
    "input",
    (evento) => {
      evento.target.value =
        evento.target.value
          .toUpperCase();
    }
  );

  const campoFotoArquivo = document.getElementById("frotaFotoArquivo");
  const campoFotoUrlOculto = document.getElementById("frotaFotoUrl");
  const previewFoto = document.getElementById("previewFotoFrota");
  const botaoRemoverFoto = document.getElementById("btnRemoverFotoFrota");

  function limparPreviewFoto() {
    if (!previewFoto) return;
    const categoria = obterConfigFrota(chave)?.categoriaEquip;
    previewFoto.innerHTML = `<span class="preview-foto-vazio">${obterIconePlaceholderFrota(categoria)}</span>`;
  }

  campoFotoArquivo?.addEventListener("change", async () => {
    const arquivo = campoFotoArquivo.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      campoFotoArquivo.value = "";
      return;
    }

    try {
      const dataUrl = await comprimirImagemFrota(arquivo);

      if (dataUrl.length > 700000) {
        alert("Essa imagem ficou grande demais mesmo depois de comprimida. Tente outra foto.");
        campoFotoArquivo.value = "";
        return;
      }

      campoFotoUrlOculto.value = dataUrl;
      if (previewFoto) previewFoto.innerHTML = `<img src="${dataUrl}" alt="">`;
    } catch (erro) {
      console.error("Erro ao processar foto:", erro);
      alert("Não foi possível processar essa foto. Tente outra.");
      campoFotoArquivo.value = "";
    }
  });

  botaoRemoverFoto?.addEventListener("click", () => {
    if (campoFotoUrlOculto) campoFotoUrlOculto.value = "";
    if (campoFotoArquivo) campoFotoArquivo.value = "";
    limparPreviewFoto();
  });

  formulario?.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();

      await salvarFrota(
        chave,
        id
      );
    }
  );
}


/* =========================================================
   SALVAMENTO
   ========================================================= */

async function salvarFrota(
  chave,
  idExistente
) {
  const config =
    obterConfigFrota(chave);

  const erro =
    document.getElementById(
      "modalErro"
    );

  const botao =
    document.getElementById(
      "btnSalvarFrota"
    );

  const campoNome =
    document.getElementById(
      "frotaNome"
    );

  const campoIdentificador =
    document.getElementById(
      "frotaIdentificador"
    );

  const campoTipo =
    document.getElementById(
      "frotaTipo"
    );

  const campoStatus =
    document.getElementById(
      "frotaStatus"
    );

  const campoMedidor =
    document.getElementById(
      "frotaMedidor"
    );

  if (
    !config ||
    !erro ||
    !botao ||
    !campoNome ||
    !campoIdentificador ||
    !campoTipo ||
    !campoStatus ||
    !campoMedidor
  ) {
    return;
  }

  erro.textContent = "";

  const nome =
    campoNome.value.trim();

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
      !Number.isFinite(
        medidorValor
      ) ||
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

    obraId:
      document.getElementById("frotaObra")?.value || "",

    fotoUrl:
      document.getElementById("frotaFotoUrl")?.value.trim() || "",

    status:
      campoStatus.value,

    [config.campoMedidor.id]:
      medidorValor,
  };

  botao.disabled = true;

  botao.textContent =
    "Salvando...";

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

      dados.criadoEm =
        serverTimestamp();

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

    /*
      O modal somente fecha depois que o Firestore
      confirma que o salvamento foi concluído.
    */
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

    botao.textContent =
      "Salvar";
  }
}


/* =========================================================
   CONFIRMAÇÃO DE CARREGAMENTO
   ========================================================= */

console.log(
  "Módulo frota.js carregado com modal protegido."
);
