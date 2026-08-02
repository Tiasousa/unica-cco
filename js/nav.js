/* =========================================================
   NAVEGAÇÃO
   Menu lateral, submenus e roteamento dos módulos
   Única Construtora — Centro Operacional
   ========================================================= */


/* =========================================================
   CONFIGURAÇÃO DAS PÁGINAS
   ========================================================= */

const PAGINAS_CONFIG = {

  /* Operação */
  central: {
    titulo: "Central Operacional",
    subtitulo: "Visão geral das operações",
    grupo: null,
  },

  obras: {
    titulo: "Obras",
    subtitulo: "Cadastro e acompanhamento das obras",
    grupo: null,
  },

  apontamento: {
    titulo: "Apontamento Diário",
    subtitulo: "Registro diário das atividades operacionais",
    grupo: "operacao",
  },


  /* Frota */
  "frota-visao-geral": {
    titulo: "Frota",
    subtitulo: "Visão geral, disponibilidade e alertas",
    grupo: "frota",
  },

  maquinas: {
    titulo: "Frota · Máquinas",
    subtitulo: "Cadastro e controle das máquinas",
    grupo: "frota",
  },

  caminhoes: {
    titulo: "Frota · Caminhões",
    subtitulo: "Cadastro e controle dos caminhões",
    grupo: "frota",
  },

  abastecimentos: {
    titulo: "Frota · Abastecimentos",
    subtitulo: "Controle de abastecimentos e consumo",
    grupo: "frota",
  },

  manutencoes: {
    titulo: "Frota · Manutenções",
    subtitulo: "Ordens, serviços e histórico de manutenção",
    grupo: "frota",
  },

  checklists: {
    titulo: "Frota · Checklists",
    subtitulo: "Inspeções e verificações dos equipamentos",
    grupo: "frota",
  },

  "documentos-frota": {
    titulo: "Frota · Documentos",
    subtitulo: "Licenciamentos, seguros e vencimentos",
    grupo: "frota",
  },


  /* Compatibilidade com os nomes antigos */
  combustivel: {
    titulo: "Frota · Abastecimentos",
    subtitulo: "Controle de abastecimentos e consumo",
    grupo: "frota",
    redirecionarPara: "abastecimentos",
  },

  manutencao: {
    titulo: "Frota · Manutenções",
    subtitulo: "Ordens, serviços e histórico de manutenção",
    grupo: "frota",
    redirecionarPara: "manutencoes",
  },


  /* Gestão */
  materiais: {
    titulo: "Materiais",
    subtitulo: "Controle de materiais e movimentações",
    grupo: null,
  },

  relatorios: {
    titulo: "Relatórios",
    subtitulo: "Indicadores e análises operacionais",
    grupo: null,
  },


  /* Cadastros */
  "cad-servicos": {
    titulo: "Cadastros · Serviços",
    subtitulo: "Serviços utilizados nas operações",
    grupo: "cadastros",
  },

  "cad-tipos-equip": {
    titulo: "Cadastros · Tipos de equipamento",
    subtitulo: "Categorias de máquinas e caminhões",
    grupo: "cadastros",
  },

  "cad-materiais": {
    titulo: "Cadastros · Materiais",
    subtitulo: "Materiais utilizados nas obras",
    grupo: "cadastros",
  },

  "cad-combustiveis": {
    titulo: "Cadastros · Combustíveis",
    subtitulo: "Tipos de combustíveis utilizados",
    grupo: "cadastros",
  },

  "cad-unidades": {
    titulo: "Cadastros · Unidades de medida",
    subtitulo: "Unidades utilizadas nos registros",
    grupo: "cadastros",
  },

  "cad-funcionarios": {
    titulo: "Cadastros · Funcionários",
    subtitulo: "Equipe e colaboradores",
    grupo: "cadastros",
  },

  "cad-funcoes": {
    titulo: "Cadastros · Funções",
    subtitulo: "Funções e cargos dos colaboradores",
    grupo: "cadastros",
  },

  "cad-pecas": {
    titulo: "Cadastros · Peças",
    subtitulo: "Peças utilizadas nas manutenções",
    grupo: "cadastros",
  },

  "cad-fornecedores": {
    titulo: "Cadastros · Fornecedores",
    subtitulo: "Fornecedores de materiais e serviços",
    grupo: "cadastros",
  },

  "cad-tipos-manutencao": {
    titulo: "Cadastros · Tipos de manutenção",
    subtitulo: "Classificações dos serviços de manutenção",
    grupo: "cadastros",
  },

  "cad-placas": {
    titulo: "Cadastros · Placas",
    subtitulo: "Placas e identificações dos veículos",
    grupo: "cadastros",
  },

  "cad-motivos": {
    titulo: "Cadastros · Motivos de paralisação",
    subtitulo: "Motivos utilizados nos apontamentos",
    grupo: "cadastros",
  },


  /* Sistema */
  configuracoes: {
    titulo: "Configurações",
    subtitulo: "Preferências e configurações do sistema",
    grupo: null,
  },

};


/* =========================================================
   ETAPAS DOS MÓDULOS AINDA NÃO CONSTRUÍDOS
   ========================================================= */

const ETAPA_MODULO = {
  "frota-visao-geral": "Etapa 5 — Dashboard da Frota",
  manutencoes: "Etapa 5 — Manutenções",
  checklists: "Etapa 5 — Checklists",
  "documentos-frota": "Etapa 5 — Documentos da Frota",

  materiais: "Etapa 7 — Materiais",
  relatorios: "Etapa final — Relatórios e indicadores",
  configuracoes: "Etapa 2 — Login, usuários e acessos",
};


/* =========================================================
   ESTADO DA NAVEGAÇÃO
   ========================================================= */

let paginaAtual = "central";
let navegacaoInicializada = false;


/* =========================================================
   ÍCONES E COMPONENTES AUXILIARES
   ========================================================= */

function iconeConstrucao() {
  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  `;
}


function iconeErro() {
  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v5"/>
      <path d="M12 17h.01"/>
    </svg>
  `;
}


/* =========================================================
   OBTENÇÃO SEGURA DE ELEMENTOS
   ========================================================= */

function obterElemento(id) {
  return document.getElementById(id);
}


/* =========================================================
   ATUALIZAÇÃO DO CABEÇALHO
   ========================================================= */

function atualizarCabecalho(pagina) {
  const config = PAGINAS_CONFIG[pagina] || {
    titulo: "Página",
    subtitulo: "",
  };

  const titulo = obterElemento("tituloPagina");
  const subtitulo = obterElemento("subtituloPagina");

  if (titulo) {
    titulo.textContent = config.titulo;
  }

  if (subtitulo) {
    subtitulo.textContent = config.subtitulo || "";
    subtitulo.hidden = !config.subtitulo;
  }

  document.title = `${config.titulo} — Única Construtora`;
}


/* =========================================================
   TELA DE CARREGAMENTO
   ========================================================= */

function renderCarregando(mensagem = "Carregando...") {
  const area = obterElemento("areaPagina");

  if (!area) {
    return;
  }

  area.innerHTML = `
    <div class="em-construcao">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>${mensagem}</p>
    </div>
  `;
}


/* =========================================================
   PLACEHOLDER DOS MÓDULOS FUTUROS
   ========================================================= */

function renderPlaceholder(pagina) {
  const area = obterElemento("areaPagina");

  if (!area) {
    return;
  }

  const config = PAGINAS_CONFIG[pagina] || {};
  const etapa = ETAPA_MODULO[pagina] || "Próxima etapa";

  area.innerHTML = `
    <div class="em-construcao">

      ${iconeConstrucao()}

      <h3>Módulo em desenvolvimento</h3>

      <p>
        A tela de
        <strong>${config.titulo || "este módulo"}</strong>
        está preparada no menu e será conectada ao banco de dados
        durante a próxima etapa de desenvolvimento.
      </p>

      <div class="etapa">
        ${etapa}
      </div>

    </div>
  `;
}


/* =========================================================
   TELA DE ERRO
   ========================================================= */

function renderErroModulo(pagina, erro) {
  const area = obterElemento("areaPagina");

  if (!area) {
    return;
  }

  const config = PAGINAS_CONFIG[pagina] || {};
  const mensagem =
    erro && erro.message
      ? erro.message
      : "Não foi possível carregar este módulo.";

  console.error(`Erro ao carregar a página "${pagina}":`, erro);

  area.innerHTML = `
    <div class="em-construcao estado-erro">

      ${iconeErro()}

      <h3>Não foi possível carregar</h3>

      <p>
        O módulo
        <strong>${config.titulo || pagina}</strong>
        encontrou um problema durante o carregamento.
      </p>

      <div class="etapa">
        ${mensagem}
      </div>

      <button
        type="button"
        class="btn-primario"
        onclick="irParaPagina('${pagina}')"
      >
        Tentar novamente
      </button>

    </div>
  `;
}


/* =========================================================
   VERIFICAÇÃO DE FUNÇÕES DOS MÓDULOS
   ========================================================= */

function executarModulo(nomeFuncao, argumentos = []) {
  const funcao = window[nomeFuncao];

  if (typeof funcao !== "function") {
    throw new Error(
      `A função ${nomeFuncao}() não está disponível. Verifique se o arquivo do módulo foi carregado.`
    );
  }

  return funcao(...argumentos);
}


/* =========================================================
   ROTEAMENTO DOS MÓDULOS
   ========================================================= */

async function renderizarPagina(pagina) {
  switch (pagina) {

    /* Central */
    case "central":
      return executarModulo("renderCentral");


    /* Obras */
    case "obras":
      return executarModulo("renderObras");


    /* Frota já implementada */
    case "maquinas":
      return executarModulo("renderFrota", ["maquinas"]);

    case "caminhoes":
      return executarModulo("renderFrota", ["caminhoes"]);

    case "abastecimentos":
      return executarModulo("renderAbastecimentos");

    case "apontamento":
      return executarModulo("renderApontamento");

    case "frota-visao-geral":
      return executarModulo("renderFrotaVisaoGeral");


    /* Cadastros gerais */
    case "cad-servicos":
    case "cad-tipos-equip":
    case "cad-materiais":
    case "cad-combustiveis":
    case "cad-unidades":
    case "cad-funcionarios":
    case "cad-funcoes":
    case "cad-pecas":
    case "cad-fornecedores":
    case "cad-tipos-manutencao":
    case "cad-placas":
    case "cad-motivos":
      return executarModulo("renderCadastro", [pagina]);


    /* Módulos preparados para desenvolvimento */
    case "manutencoes":
    case "checklists":
    case "documentos-frota":
    case "materiais":
    case "relatorios":
    case "configuracoes":
      return renderPlaceholder(pagina);


    /* Página desconhecida */
    default:
      return renderPlaceholder(pagina);
  }
}


/* =========================================================
   CONTROLE VISUAL DO MENU
   ========================================================= */

function limparMenuAtivo() {
  document
    .querySelectorAll(".nav-item, .nav-sublink")
    .forEach((item) => {
      item.classList.remove("ativo");
    });
}


function fecharTodosSubmenus() {
  document
    .querySelectorAll(".nav-grupo")
    .forEach((grupo) => {
      grupo.classList.remove("aberto");
    });
}


function ativarItemMenu(pagina) {
  limparMenuAtivo();

  const alvo = document.querySelector(
    `[data-pagina="${pagina}"]`
  );

  if (!alvo) {
    return;
  }

  alvo.classList.add("ativo");

  const grupo = alvo.closest(".nav-grupo");

  if (!grupo) {
    return;
  }

  if (alvo.classList.contains("nav-sublink")) {
    grupo.classList.add("aberto");

    const itemPai = grupo.querySelector(
      ":scope > .nav-item"
    );

    if (itemPai) {
      itemPai.classList.add("ativo");
    }
  }
}


/* =========================================================
   MENU MOBILE
   ========================================================= */

function fecharMenuMobile() {
  const sidebar = obterElemento("sidebar");
  const overlay = obterElemento("overlayMobile");

  if (sidebar) {
    sidebar.classList.remove("aberta-mobile");
  }

  if (overlay) {
    overlay.classList.remove("ativo");
  }

  document.body.classList.remove("menu-mobile-aberto");
}


/* =========================================================
   ENDEREÇO DA PÁGINA
   ========================================================= */

function obterPaginaDoEndereco() {
  const hash = window.location.hash.replace("#", "").trim();

  if (!hash) {
    return "central";
  }

  if (!PAGINAS_CONFIG[hash]) {
    return "central";
  }

  const config = PAGINAS_CONFIG[hash];

  return config.redirecionarPara || hash;
}


function atualizarEndereco(pagina) {
  const novoHash = `#${pagina}`;

  if (window.location.hash !== novoHash) {
    history.pushState(
      { pagina },
      "",
      novoHash
    );
  }
}


/* =========================================================
   NAVEGAÇÃO PRINCIPAL
   ========================================================= */

async function irParaPagina(
  pagina,
  opcoes = {}
) {
  const {
    atualizarUrl = true,
  } = opcoes;

  let paginaDestino = pagina;

  const configSolicitada = PAGINAS_CONFIG[paginaDestino];

  if (
    configSolicitada &&
    configSolicitada.redirecionarPara
  ) {
    paginaDestino = configSolicitada.redirecionarPara;
  }

  if (!PAGINAS_CONFIG[paginaDestino]) {
    paginaDestino = "central";
  }

  paginaAtual = paginaDestino;

  atualizarCabecalho(paginaDestino);
  ativarItemMenu(paginaDestino);
  fecharMenuMobile();

  if (atualizarUrl) {
    atualizarEndereco(paginaDestino);
  }

  window.scrollTo({
    top: 0,
    behavior: "auto",
  });

  try {
    renderCarregando();

    await renderizarPagina(paginaDestino);

  } catch (erro) {
    renderErroModulo(paginaDestino, erro);
  }
}


/* Torna a função acessível aos botões inline */
window.irParaPagina = irParaPagina;


/* =========================================================
   USUÁRIO AUTENTICADO
   ========================================================= */

function atualizarUsuario(usuario = {}) {
  const nome = usuario.nome || "Usuário";
  const cargo = usuario.cargo || "";

  const usuarioNome = obterElemento("usuarioNome");
  const usuarioCargo = obterElemento("usuarioCargo");
  const avatar = obterElemento("avatarIniciais");

  if (usuarioNome) {
    usuarioNome.textContent = nome;
  }

  if (usuarioCargo) {
    usuarioCargo.textContent = cargo;
  }

  if (avatar) {
    const iniciais = nome
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();

    avatar.textContent = iniciais || "--";
  }
}


window.addEventListener("usuarioPronto", (evento) => {
  atualizarUsuario(evento.detail || {});

  /*
   Só abre a página inicial caso a navegação ainda
   não tenha sido inicializada pelo DOMContentLoaded.
  */
  if (!navegacaoInicializada) {
    const paginaInicial = obterPaginaDoEndereco();

    irParaPagina(paginaInicial, {
      atualizarUrl: false,
    });
  }
});


/* =========================================================
   DATA ATUAL
   ========================================================= */

function atualizarDataHoje() {
  const elemento = obterElemento("dataHoje");

  if (!elemento) {
    return;
  }

  const texto = new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }
  ).format(new Date());

  elemento.textContent =
    texto.charAt(0).toUpperCase() +
    texto.slice(1);
}


/* =========================================================
   CLIQUES DO MENU
   ========================================================= */

function configurarLinksPaginas() {
  const links = document.querySelectorAll(
    "[data-pagina]"
  );

  links.forEach((link) => {
    link.addEventListener("click", (evento) => {
      evento.preventDefault();

      const pagina = link.dataset.pagina;

      if (!pagina) {
        return;
      }

      irParaPagina(pagina);
    });
  });
}


/* =========================================================
   ABERTURA DOS SUBMENUS
   ========================================================= */

function configurarSubmenus() {
  const toggles = document.querySelectorAll(
    "[data-toggle]"
  );

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", (evento) => {
      evento.preventDefault();

      const grupo = toggle.closest(".nav-grupo");

      if (!grupo) {
        return;
      }

      const estavaAberto =
        grupo.classList.contains("aberto");

      document
        .querySelectorAll(".nav-grupo")
        .forEach((outroGrupo) => {
          if (outroGrupo !== grupo) {
            outroGrupo.classList.remove("aberto");
          }
        });

      grupo.classList.toggle(
        "aberto",
        !estavaAberto
      );
    });
  });
}


/* =========================================================
   RECOLHER MENU NO COMPUTADOR
   ========================================================= */

function configurarBotaoRecolher() {
  const botao = obterElemento("btnRecolher");
  const sidebar = obterElemento("sidebar");

  if (!botao || !sidebar) {
    return;
  }

  botao.addEventListener("click", () => {
    sidebar.classList.toggle("recolhida");

    const recolhida =
      sidebar.classList.contains("recolhida");

    botao.title = recolhida
      ? "Expandir menu"
      : "Recolher menu";

    botao.setAttribute(
      "aria-label",
      recolhida
        ? "Expandir menu"
        : "Recolher menu"
    );

    localStorage.setItem(
      "unica_sidebar_recolhida",
      recolhida ? "1" : "0"
    );
  });

  const estavaRecolhida =
    localStorage.getItem(
      "unica_sidebar_recolhida"
    ) === "1";

  if (estavaRecolhida) {
    sidebar.classList.add("recolhida");
    botao.title = "Expandir menu";
  }
}


/* =========================================================
   MENU MOBILE
   ========================================================= */

function configurarMenuMobile() {
  const sidebar = obterElemento("sidebar");
  const overlay = obterElemento("overlayMobile");
  const botaoAbrir = obterElemento("btnMenuMobile");

  if (!sidebar || !overlay || !botaoAbrir) {
    return;
  }

  botaoAbrir.addEventListener("click", () => {
    sidebar.classList.add("aberta-mobile");
    overlay.classList.add("ativo");
    document.body.classList.add(
      "menu-mobile-aberto"
    );
  });

  overlay.addEventListener(
    "click",
    fecharMenuMobile
  );

  document.addEventListener(
    "keydown",
    (evento) => {
      if (evento.key === "Escape") {
        fecharMenuMobile();
      }
    }
  );
}


/* =========================================================
   BOTÃO DE NOTIFICAÇÕES
   ========================================================= */

function configurarNotificacoes() {
  const botao = obterElemento("btnNotificacoes");

  if (!botao) {
    return;
  }

  botao.addEventListener("click", () => {
    mostrarPainelNotificacoes();
  });
}


function mostrarPainelNotificacoes() {
  const alertas = [];

  const manutencoes = obterNumeroContador(
    "alertaManutencoes"
  );

  const checklists = obterNumeroContador(
    "alertaChecklists"
  );

  const documentos = obterNumeroContador(
    "alertaDocumentosFrota"
  );

  if (manutencoes > 0) {
    alertas.push({
      pagina: "manutencoes",
      titulo: "Manutenções pendentes",
      quantidade: manutencoes,
    });
  }

  if (checklists > 0) {
    alertas.push({
      pagina: "checklists",
      titulo: "Checklists pendentes",
      quantidade: checklists,
    });
  }

  if (documentos > 0) {
    alertas.push({
      pagina: "documentos-frota",
      titulo: "Documentos próximos do vencimento",
      quantidade: documentos,
    });
  }

  const area = obterElemento("areaPagina");

  if (!area) {
    return;
  }

  atualizarCabecalhoTemporario(
    "Central de Alertas",
    "Pendências que precisam de atenção"
  );

  limparMenuAtivo();

  if (alertas.length === 0) {
    area.innerHTML = `
      <div class="em-construcao">

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>

        <h3>Nenhum alerta pendente</h3>

        <p>
          No momento, não existem registros que
          precisem de atenção.
        </p>

        <button
          type="button"
          class="btn-primario"
          onclick="irParaPagina('${paginaAtual}')"
        >
          Voltar
        </button>

      </div>
    `;

    return;
  }

  area.innerHTML = `
    <div class="painel-alertas">

      <div class="alertas-topo">
        <div>
          <h2>Central de Alertas</h2>
          <p>
            Pendências operacionais identificadas no sistema.
          </p>
        </div>

        <button
          type="button"
          class="btn-secundario"
          onclick="irParaPagina('${paginaAtual}')"
        >
          Voltar
        </button>
      </div>

      <div class="alertas-lista">

        ${alertas
          .map(
            (alerta) => `
              <button
                type="button"
                class="alerta-card"
                onclick="irParaPagina('${alerta.pagina}')"
              >
                <div class="alerta-card-icone">
                  !
                </div>

                <div class="alerta-card-conteudo">
                  <strong>${alerta.titulo}</strong>
                  <span>
                    ${alerta.quantidade}
                    ${
                      alerta.quantidade === 1
                        ? "registro"
                        : "registros"
                    }
                  </span>
                </div>

                <div class="alerta-card-seta">
                  ›
                </div>
              </button>
            `
          )
          .join("")}

      </div>

    </div>
  `;
}


function atualizarCabecalhoTemporario(
  tituloTexto,
  subtituloTexto
) {
  const titulo = obterElemento("tituloPagina");
  const subtitulo = obterElemento("subtituloPagina");

  if (titulo) {
    titulo.textContent = tituloTexto;
  }

  if (subtitulo) {
    subtitulo.textContent = subtituloTexto || "";
    subtitulo.hidden = !subtituloTexto;
  }
}


/* =========================================================
   CONTADORES E ALERTAS
   ========================================================= */

function obterNumeroContador(id) {
  const elemento = obterElemento(id);

  if (!elemento) {
    return 0;
  }

  const numero = Number(
    elemento.textContent.trim()
  );

  return Number.isFinite(numero)
    ? numero
    : 0;
}


function atualizarContador(id, quantidade) {
  const elemento = obterElemento(id);

  if (!elemento) {
    return;
  }

  const numero = Math.max(
    0,
    Number(quantidade) || 0
  );

  elemento.textContent = String(numero);
  elemento.hidden = numero === 0;

  atualizarTotalNotificacoes();
}


function atualizarTotalNotificacoes() {
  const idsAlertas = [
    "alertaManutencoes",
    "alertaChecklists",
    "alertaDocumentosFrota",
  ];

  const total = idsAlertas.reduce(
    (soma, id) => {
      return soma + obterNumeroContador(id);
    },
    0
  );

  const contadorTopo = obterElemento(
    "contadorNotificacoes"
  );

  const alertaFrota = obterElemento(
    "alertaFrota"
  );

  if (contadorTopo) {
    contadorTopo.textContent = String(total);
    contadorTopo.hidden = total === 0;
  }

  if (alertaFrota) {
    alertaFrota.textContent = String(total);
    alertaFrota.hidden = total === 0;
  }
}


/*
  Função global preparada para os módulos futuros.

  Exemplos de uso:

  atualizarContadorNavegacao(
    "alertaManutencoes",
    3
  );

  atualizarContadorNavegacao(
    "contadorMaquinas",
    12
  );
*/
window.atualizarContadorNavegacao =
  atualizarContador;


/* =========================================================
   NAVEGAÇÃO DO HISTÓRICO DO NAVEGADOR
   ========================================================= */

function configurarHistorico() {
  window.addEventListener("popstate", () => {
    const pagina = obterPaginaDoEndereco();

    irParaPagina(pagina, {
      atualizarUrl: false,
    });
  });

  window.addEventListener("hashchange", () => {
    const pagina = obterPaginaDoEndereco();

    if (pagina !== paginaAtual) {
      irParaPagina(pagina, {
        atualizarUrl: false,
      });
    }
  });
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    atualizarDataHoje();

    configurarLinksPaginas();
    configurarSubmenus();
    configurarBotaoRecolher();
    configurarMenuMobile();
    configurarNotificacoes();
    configurarHistorico();

    atualizarTotalNotificacoes();

    navegacaoInicializada = true;

    const paginaInicial =
      obterPaginaDoEndereco();

    irParaPagina(paginaInicial, {
      atualizarUrl: false,
    });
  }
);
