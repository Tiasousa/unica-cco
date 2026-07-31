/* =========================================================
   ABASTECIMENTOS
   Única Construtora — Centro Operacional
   ========================================================= */


/* =========================================================
   CONFIGURAÇÃO DOS EQUIPAMENTOS
   ========================================================= */

const ABASTECIMENTO_CONFIG = {
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


/* =========================================================
   ESTADO DO MÓDULO
   ========================================================= */

let abastecimentoEstado = criarEstadoAbastecimento();


function criarEstadoAbastecimento() {
  return {
    etapa: 1,

    obras: [],

    equipamentos: [],

    selecionados: new Set(),

    filtroTipo: "todos",

    busca: "",

    dadosGerais: {
      obraId: "",
      data: "",
      responsavel: "",
    },

    salvando: false,
  };
}


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function abastEscaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function abastNormalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function abastConverterNumero(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


function abastFormatarNumero(valor) {
  const numero = abastConverterNumero(valor);

  if (numero === null) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero);
}


function abastDataHoje() {
  const agora = new Date();

  const ano = agora.getFullYear();

  const mes = String(
    agora.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    agora.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function abastFormatarData(dataIso) {
  if (!dataIso) {
    return "—";
  }

  const partes = dataIso.split("-");

  if (partes.length !== 3) {
    return dataIso;
  }

  const [ano, mes, dia] = partes;

  return `${dia}/${mes}/${ano}`;
}


function abastObterUsuarioAtual() {
  const elementoNome = document.getElementById(
    "usuarioNome"
  );

  const nome =
    elementoNome?.textContent?.trim() || "";

  if (
    !nome ||
    nome === "—" ||
    nome === "Usuário"
  ) {
    return "";
  }

  return nome;
}


function abastChaveEquipamento(equipamento) {
  return `${equipamento.colecao}:${equipamento.id}`;
}


function abastObterAreaPagina() {
  return document.getElementById(
    "areaPagina"
  );
}


function abastVerificarFirebase() {
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
   ÍCONES
   ========================================================= */

function abastIconeMaquina() {
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
      <path d="M3 17h13"></path>
      <path d="M5 17V9h8l3 4v4"></path>
      <path d="M13 9V5h4l3 4"></path>
      <circle cx="7" cy="19" r="2"></circle>
      <circle cx="15" cy="19" r="2"></circle>
    </svg>
  `;
}


function abastIconeCaminhao() {
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
      <rect x="2" y="6" width="13" height="10" rx="1.5"></rect>
      <path d="M15 9h4l3 3v4h-7z"></path>
      <circle cx="6" cy="18" r="2"></circle>
      <circle cx="18" cy="18" r="2"></circle>
    </svg>
  `;
}


function abastIconeCheck() {
  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l4 4L19 6"></path>
    </svg>
  `;
}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

async function renderAbastecimentos() {
  const area = abastObterAreaPagina();

  if (!area) {
    return;
  }

  abastecimentoEstado =
    criarEstadoAbastecimento();

  area.innerHTML = `
    <section class="modulo-abastecimentos">

      <div class="abast-cabecalho-interno">

        <div>
          <span class="abast-eyebrow">
            Novo lançamento
          </span>

          <h2>
            Registrar abastecimento
          </h2>

          <p>
            Selecione a obra e marque os equipamentos abastecidos.
          </p>
        </div>

        <div
          class="abast-etapas"
          aria-label="Etapas do abastecimento"
        >
          <span
            class="ativo"
            data-abast-indicador="1"
          >
            1
          </span>

          <i></i>

          <span
            data-abast-indicador="2"
          >
            2
          </span>
        </div>

      </div>

      <div id="abastConteudo">

        <div class="abast-carregando">

          <div
            class="loading-spinner"
            aria-hidden="true"
          ></div>

          <p>
            Carregando obras e equipamentos...
          </p>

        </div>

      </div>

    </section>
  `;

  try {
    await abastCarregarDados();

    abastRenderEtapaSelecao();

  } catch (erro) {
    console.error(
      "Erro ao carregar o módulo de abastecimentos:",
      erro
    );

    abastRenderErroCarregamento(erro);
  }
}


/* Disponibiliza a função para o nav.js */
window.renderAbastecimentos =
  renderAbastecimentos;


/* =========================================================
   CARREGAMENTO DOS DADOS
   ========================================================= */

async function abastCarregarDados() {
  abastVerificarFirebase();

  const {
    collection,
    getDocs,
  } = window.fs;

  const [
    snapshotObras,
    snapshotMaquinas,
    snapshotCaminhoes,
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
  ]);

  abastecimentoEstado.obras = [];

  snapshotObras.forEach((documento) => {
    const dados = documento.data();

    if (dados.ativo === false) {
      return;
    }

    abastecimentoEstado.obras.push({
      id: documento.id,
      ...dados,
    });
  });

  abastecimentoEstado.obras.sort(
    (a, b) => {
      const nomeA =
        a.nome ||
        a.titulo ||
        "";

      const nomeB =
        b.nome ||
        b.titulo ||
        "";

      return String(nomeA).localeCompare(
        String(nomeB),
        "pt-BR"
      );
    }
  );

  abastecimentoEstado.equipamentos = [];

  abastAdicionarEquipamentos(
    snapshotMaquinas,
    "maquinas"
  );

  abastAdicionarEquipamentos(
    snapshotCaminhoes,
    "caminhoes"
  );

  abastecimentoEstado.equipamentos.sort(
    (a, b) => {
      return String(
        a.nome || ""
      ).localeCompare(
        String(b.nome || ""),
        "pt-BR"
      );
    }
  );
}


function abastAdicionarEquipamentos(
  snapshot,
  chaveConfig
) {
  const config =
    ABASTECIMENTO_CONFIG[chaveConfig];

  snapshot.forEach((documento) => {
    const dados = documento.data();

    if (dados.ativo === false) {
      return;
    }

    abastecimentoEstado.equipamentos.push({
      id: documento.id,

      colecao: config.colecao,

      tipo: config.tipo,

      tipoRotulo: config.tipoRotulo,

      nome:
        dados.nome ||
        "Sem nome",

      identificacao:
        dados[
          config.campoIdentificador
        ] ||
        "Sem identificação",

      medidorAtual:
        abastConverterNumero(
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

      status:
        dados.status ||
        "disponivel",
    });
  });
}


/* =========================================================
   ETAPA 1 — SELEÇÃO DOS EQUIPAMENTOS
   ========================================================= */

function abastRenderEtapaSelecao() {
  abastecimentoEstado.etapa = 1;

  abastAtualizarIndicadorEtapa();

  const conteudo = document.getElementById(
    "abastConteudo"
  );

  if (!conteudo) {
    return;
  }

  const responsavelSalvo =
    abastecimentoEstado.dadosGerais
      .responsavel ||
    abastObterUsuarioAtual();

  const dataSalva =
    abastecimentoEstado.dadosGerais
      .data ||
    abastDataHoje();

  const obraSalva =
    abastecimentoEstado.dadosGerais
      .obraId ||
    "";

  conteudo.innerHTML = `
    <div class="abast-dados-gerais">

      <div class="campo">
        <label for="abastObra">
          Obra *
        </label>

        <select id="abastObra">

          <option value="">
            Selecione a obra
          </option>

          ${abastecimentoEstado.obras
            .map((obra) => {
              const nome =
                obra.nome ||
                obra.titulo ||
                "Obra sem nome";

              const selecionada =
                obra.id === obraSalva
                  ? "selected"
                  : "";

              return `
                <option
                  value="${abastEscaparHtml(obra.id)}"
                  ${selecionada}
                >
                  ${abastEscaparHtml(nome)}
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
          value="${abastEscaparHtml(dataSalva)}"
        >
      </div>

      <div class="campo">
        <label for="abastResponsavel">
          Responsável *
        </label>

        <input
          type="text"
          id="abastResponsavel"
          value="${abastEscaparHtml(responsavelSalvo)}"
          placeholder="Nome do responsável"
          maxlength="100"
          autocomplete="off"
        >
      </div>

    </div>

    <div class="abast-selecao-topo">

      <div class="cadastro-busca abast-busca">

        <input
          type="search"
          id="abastBusca"
          value="${abastEscaparHtml(
            abastecimentoEstado.busca
          )}"
          placeholder="Pesquisar equipamento..."
          autocomplete="off"
        >

      </div>

      <div
        class="filtro-status abast-filtros"
        id="abastFiltros"
      >

        <button
          type="button"
          class="chip-status ${
            abastecimentoEstado.filtroTipo ===
            "todos"
              ? "ativo"
              : ""
          }"
          data-abast-tipo="todos"
        >
          Todos
        </button>

        <button
          type="button"
          class="chip-status ${
            abastecimentoEstado.filtroTipo ===
            "maquina"
              ? "ativo"
              : ""
          }"
          data-abast-tipo="maquina"
        >
          Máquinas
        </button>

        <button
          type="button"
          class="chip-status ${
            abastecimentoEstado.filtroTipo ===
            "caminhao"
              ? "ativo"
              : ""
          }"
          data-abast-tipo="caminhao"
        >
          Caminhões
        </button>

      </div>

    </div>

    <div id="abastListaEquipamentos"></div>

    <div class="abast-barra-acao">

      <div>

        <strong
          id="abastContadorSelecionados"
        >
          Nenhum equipamento selecionado
        </strong>

        <span>
          Toque nos cards para marcar.
        </span>

      </div>

      <button
        type="button"
        class="btn-primario"
        id="btnAbastContinuar"
        disabled
      >
        Continuar
      </button>

    </div>
  `;

  abastConfigurarEventosSelecao();

  abastRenderListaEquipamentos();
}


function abastConfigurarEventosSelecao() {
  const busca = document.getElementById(
    "abastBusca"
  );

  const filtros = document.getElementById(
    "abastFiltros"
  );

  const continuar = document.getElementById(
    "btnAbastContinuar"
  );

  if (busca) {
    busca.addEventListener(
      "input",
      (evento) => {
        abastecimentoEstado.busca =
          evento.target.value;

        abastRenderListaEquipamentos();
      }
    );
  }

  if (filtros) {
    filtros.addEventListener(
      "click",
      (evento) => {
        const botao =
          evento.target.closest(
            "[data-abast-tipo]"
          );

        if (!botao) {
          return;
        }

        abastecimentoEstado.filtroTipo =
          botao.dataset.abastTipo;

        filtros
          .querySelectorAll(
            "[data-abast-tipo]"
          )
          .forEach((item) => {
            item.classList.toggle(
              "ativo",
              item === botao
            );
          });

        abastRenderListaEquipamentos();
      }
    );
  }

  if (continuar) {
    continuar.addEventListener(
      "click",
      abastAvancarParaLancamento
    );
  }
}


function abastObterEquipamentosFiltrados() {
  const busca =
    abastNormalizarTexto(
      abastecimentoEstado.busca
    );

  return abastecimentoEstado
    .equipamentos
    .filter((equipamento) => {
      const correspondeTipo =
        abastecimentoEstado.filtroTipo ===
          "todos" ||
        equipamento.tipo ===
          abastecimentoEstado.filtroTipo;

      if (!correspondeTipo) {
        return false;
      }

      if (!busca) {
        return true;
      }

      const textoEquipamento =
        abastNormalizarTexto([
          equipamento.nome,
          equipamento.identificacao,
          equipamento.tipoRotulo,
          equipamento.medidorRotulo,
        ].join(" "));

      return textoEquipamento.includes(
        busca
      );
    });
}


function abastRenderListaEquipamentos() {
  const lista = document.getElementById(
    "abastListaEquipamentos"
  );

  if (!lista) {
    return;
  }

  const equipamentos =
    abastObterEquipamentosFiltrados();

  if (equipamentos.length === 0) {
    lista.innerHTML = `
      <div class="cadastro-vazio">
        Nenhum equipamento encontrado.
      </div>
    `;

    abastAtualizarBarraSelecao();

    return;
  }

  lista.innerHTML = `
    <div class="abast-grid-equipamentos">

      ${equipamentos
        .map((equipamento) => {
          const chave =
            abastChaveEquipamento(
              equipamento
            );

          const selecionado =
            abastecimentoEstado
              .selecionados
              .has(chave);

          const icone =
            equipamento.tipo ===
            "maquina"
              ? abastIconeMaquina()
              : abastIconeCaminhao();

          return `
            <button
              type="button"
              class="abast-card-equipamento ${
                selecionado
                  ? "selecionado"
                  : ""
              }"
              data-abast-equipamento="${abastEscaparHtml(
                chave
              )}"
              aria-pressed="${
                selecionado
                  ? "true"
                  : "false"
              }"
            >

              <span class="abast-card-icone">
                ${icone}
              </span>

              <span
                class="abast-card-check"
                aria-hidden="true"
              >
                ${abastIconeCheck()}
              </span>

              <span class="abast-card-tipo">
                ${abastEscaparHtml(
                  equipamento.tipoRotulo
                )}
              </span>

              <strong>
                ${abastEscaparHtml(
                  equipamento.nome
                )}
              </strong>

              <span
                class="abast-card-identificacao"
              >
                ${abastEscaparHtml(
                  equipamento.identificacao
                )}
              </span>

              <span class="abast-card-medidor">

                <small>
                  ${abastEscaparHtml(
                    equipamento.medidorRotulo
                  )} atual
                </small>

                <b>
                  ${abastFormatarNumero(
                    equipamento.medidorAtual
                  )}

                  ${
                    equipamento.medidorAtual !==
                    null
                      ? abastEscaparHtml(
                          equipamento.unidade
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
      "[data-abast-equipamento]"
    )
    .forEach((card) => {
      card.addEventListener(
        "click",
        () => {
          abastAlternarEquipamento(
            card.dataset
              .abastEquipamento
          );
        }
      );
    });

  abastAtualizarBarraSelecao();
}


function abastAlternarEquipamento(chave) {
  if (
    abastecimentoEstado
      .selecionados
      .has(chave)
  ) {
    abastecimentoEstado
      .selecionados
      .delete(chave);

  } else {
    abastecimentoEstado
      .selecionados
      .add(chave);
  }

  abastRenderListaEquipamentos();
}


function abastAtualizarBarraSelecao() {
  const quantidade =
    abastecimentoEstado
      .selecionados
      .size;

  const contador = document.getElementById(
    "abastContadorSelecionados"
  );

  const botao = document.getElementById(
    "btnAbastContinuar"
  );

  if (contador) {
    if (quantidade === 0) {
      contador.textContent =
        "Nenhum equipamento selecionado";

    } else if (quantidade === 1) {
      contador.textContent =
        "1 equipamento selecionado";

    } else {
      contador.textContent =
        `${quantidade} equipamentos selecionados`;
    }
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


/* =========================================================
   VALIDAÇÃO DA ETAPA 1
   ========================================================= */

function abastAvancarParaLancamento() {
  const campoObra = document.getElementById(
    "abastObra"
  );

  const campoData = document.getElementById(
    "abastData"
  );

  const campoResponsavel =
    document.getElementById(
      "abastResponsavel"
    );

  const obraId =
    campoObra?.value || "";

  const data =
    campoData?.value || "";

  const responsavel =
    campoResponsavel?.value?.trim() ||
    "";

  if (!obraId) {
    alert(
      "Selecione a obra."
    );

    campoObra?.focus();

    return;
  }

  if (!data) {
    alert(
      "Informe a data do abastecimento."
    );

    campoData?.focus();

    return;
  }

  if (!responsavel) {
    alert(
      "Informe o responsável pelo abastecimento."
    );

    campoResponsavel?.focus();

    return;
  }

  if (
    abastecimentoEstado
      .selecionados
      .size === 0
  ) {
    alert(
      "Selecione pelo menos um equipamento."
    );

    return;
  }

  abastecimentoEstado.dadosGerais = {
    obraId,
    data,
    responsavel,
  };

  abastRenderEtapaLancamento();
}


/* =========================================================
   ETAPA 2 — PREENCHIMENTO
   ========================================================= */

function abastObterEquipamentosSelecionados() {
  return abastecimentoEstado
    .equipamentos
    .filter((equipamento) => {
      return abastecimentoEstado
        .selecionados
        .has(
          abastChaveEquipamento(
            equipamento
          )
        );
    });
}


function abastRenderEtapaLancamento() {
  abastecimentoEstado.etapa = 2;

  abastAtualizarIndicadorEtapa();

  const conteudo = document.getElementById(
    "abastConteudo"
  );

  if (!conteudo) {
    return;
  }

  const equipamentos =
    abastObterEquipamentosSelecionados();

  const obra =
    abastecimentoEstado
      .obras
      .find((item) => {
        return (
          item.id ===
          abastecimentoEstado
            .dadosGerais
            .obraId
        );
      });

  const obraNome =
    obra?.nome ||
    obra?.titulo ||
    "Obra";

  conteudo.innerHTML = `
    <div class="abast-resumo-lancamento">

      <div>
        <span>
          Obra
        </span>

        <strong>
          ${abastEscaparHtml(
            obraNome
          )}
        </strong>
      </div>

      <div>
        <span>
          Data
        </span>

        <strong>
          ${abastEscaparHtml(
            abastFormatarData(
              abastecimentoEstado
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
          ${abastEscaparHtml(
            abastecimentoEstado
              .dadosGerais
              .responsavel
          )}
        </strong>
      </div>

    </div>

    <form id="formAbastecimento">

      <div class="abast-lista-lancamentos">

        ${equipamentos
          .map((equipamento, indice) => {
            return abastRenderItemLancamento(
              equipamento,
              indice
            );
          })
          .join("")}

      </div>

      <div
        class="abast-erro"
        id="abastErro"
        role="alert"
      ></div>

      <div class="abast-acoes-finais">

        <button
          type="button"
          class="btn-secundario"
          id="btnAbastVoltar"
        >
          Voltar
        </button>

        <button
          type="submit"
          class="btn-primario"
          id="btnAbastSalvar"
        >
          Salvar ${
            equipamentos.length
          } ${
            equipamentos.length === 1
              ? "abastecimento"
              : "abastecimentos"
          }
        </button>

      </div>

    </form>
  `;

  const botaoVoltar =
    document.getElementById(
      "btnAbastVoltar"
    );

  const formulario =
    document.getElementById(
      "formAbastecimento"
    );

  if (botaoVoltar) {
    botaoVoltar.addEventListener(
      "click",
      () => {
        abastRenderEtapaSelecao();
      }
    );
  }

  if (formulario) {
    formulario.addEventListener(
      "submit",
      async (evento) => {
        evento.preventDefault();

        await abastSalvar();
      }
    );
  }
}


function abastRenderItemLancamento(
  equipamento,
  indice
) {
  const medidorAtual =
    equipamento.medidorAtual === null
      ? ""
      : equipamento.medidorAtual;

  return `
    <article
      class="abast-item-lancamento"
      data-abast-indice="${indice}"
    >

      <div class="abast-item-cabecalho">

        <div>

          <span>
            ${abastEscaparHtml(
              equipamento.tipoRotulo
            )}
            ·
            ${abastEscaparHtml(
              equipamento.identificacao
            )}
          </span>

          <h3>
            ${abastEscaparHtml(
              equipamento.nome
            )}
          </h3>

        </div>

        <div class="abast-medidor-anterior">

          <span>
            ${abastEscaparHtml(
              equipamento.medidorRotulo
            )} atual
          </span>

          <strong>
            ${abastFormatarNumero(
              equipamento.medidorAtual
            )}

            ${
              equipamento.medidorAtual !==
              null
                ? abastEscaparHtml(
                    equipamento.unidade
                  )
                : ""
            }
          </strong>

        </div>

      </div>

      <div class="abast-campos-lancamento">

        <div class="campo">

          <label
            for="abastMedidor${indice}"
          >
            Novo
            ${abastEscaparHtml(
              equipamento.medidorRotulo
                .toLowerCase()
            )}
            (${abastEscaparHtml(
              equipamento.unidade
            )}) *
          </label>

          <input
            type="number"
            id="abastMedidor${indice}"
            data-abast-medidor="${indice}"
            value="${abastEscaparHtml(
              medidorAtual
            )}"
            min="0"
            step="0.01"
            inputmode="decimal"
            required
          >

        </div>

        <div class="campo">

          <label
            for="abastLitros${indice}"
          >
            Litros abastecidos *
          </label>

          <input
            type="number"
            id="abastLitros${indice}"
            data-abast-litros="${indice}"
            placeholder="Ex.: 120"
            min="0.01"
            step="0.01"
            inputmode="decimal"
            required
          >

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   COLETA E VALIDAÇÃO
   ========================================================= */

function abastColetarItens() {
  const equipamentos =
    abastObterEquipamentosSelecionados();

  const itens = [];

  equipamentos.forEach(
    (equipamento, indice) => {
      const campoMedidor =
        document.querySelector(
          `[data-abast-medidor="${indice}"]`
        );

      const campoLitros =
        document.querySelector(
          `[data-abast-litros="${indice}"]`
        );

      const novoMedidor =
        abastConverterNumero(
          campoMedidor?.value
        );

      const litros =
        abastConverterNumero(
          campoLitros?.value
        );

      if (
        novoMedidor === null ||
        novoMedidor < 0
      ) {
        campoMedidor?.focus();

        throw new Error(
          `Informe o novo ${equipamento.medidorRotulo.toLowerCase()} de ${equipamento.nome}.`
        );
      }

      if (
        equipamento.medidorAtual !==
          null &&
        novoMedidor <
          equipamento.medidorAtual
      ) {
        campoMedidor?.focus();

        throw new Error(
          `O novo ${equipamento.medidorRotulo.toLowerCase()} de ${equipamento.nome} não pode ser menor que o valor atual.`
        );
      }

      if (
        litros === null ||
        litros <= 0
      ) {
        campoLitros?.focus();

        throw new Error(
          `Informe os litros abastecidos de ${equipamento.nome}.`
        );
      }

      itens.push({
        equipamentoId:
          equipamento.id,

        colecaoEquipamento:
          equipamento.colecao,

        tipoEquipamento:
          equipamento.tipo,

        tipoRotulo:
          equipamento.tipoRotulo,

        nomeEquipamento:
          equipamento.nome,

        identificacao:
          equipamento.identificacao,

        campoMedidor:
          equipamento.campoMedidor,

        medidorRotulo:
          equipamento.medidorRotulo,

        unidadeMedidor:
          equipamento.unidade,

        medidorAnterior:
          equipamento.medidorAtual,

        medidorAtual:
          novoMedidor,

        litros,
      });
    }
  );

  return itens;
}


/* =========================================================
   SALVAMENTO NO FIRESTORE
   ========================================================= */

async function abastSalvar() {
  const areaErro =
    document.getElementById(
      "abastErro"
    );

  const botaoSalvar =
    document.getElementById(
      "btnAbastSalvar"
    );

  if (
    !areaErro ||
    !botaoSalvar ||
    abastecimentoEstado.salvando
  ) {
    return;
  }

  areaErro.textContent = "";

  let itens;

  try {
    itens = abastColetarItens();

  } catch (erroValidacao) {
    areaErro.textContent =
      erroValidacao.message;

    return;
  }

  abastecimentoEstado.salvando = true;

  botaoSalvar.disabled = true;

  botaoSalvar.textContent =
    "Salvando...";

  try {
    abastVerificarFirebase();

    const {
      collection,
      addDoc,
      doc,
      updateDoc,
      serverTimestamp,
    } = window.fs;

    const obra =
      abastecimentoEstado
        .obras
        .find((item) => {
          return (
            item.id ===
            abastecimentoEstado
              .dadosGerais
              .obraId
          );
        });

    const obraNome =
      obra?.nome ||
      obra?.titulo ||
      "Obra";

    const totalLitros =
      itens.reduce(
        (soma, item) => {
          return soma + item.litros;
        },
        0
      );

    const dadosRegistro = {
      obraId:
        abastecimentoEstado
          .dadosGerais
          .obraId,

      obraNome,

      data:
        abastecimentoEstado
          .dadosGerais
          .data,

      responsavel:
        abastecimentoEstado
          .dadosGerais
          .responsavel,

      quantidadeEquipamentos:
        itens.length,

      totalLitros,

      itens,

      ativo: true,

      criadoEm:
        serverTimestamp(),

      atualizadoEm:
        serverTimestamp(),
    };

    const documentoAbastecimento =
      await addDoc(
        collection(
          window.firebaseDb,
          "abastecimentos"
        ),
        dadosRegistro
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
              documentoAbastecimento.id,

            ultimoAbastecimentoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp(),
          }
        );
      })
    );

    abastRenderSucesso(
      itens.length,
      totalLitros
    );

  } catch (erroFirebase) {
    console.error(
      "Erro ao salvar abastecimento:",
      erroFirebase
    );

    areaErro.textContent =
      "Não foi possível salvar. Verifique sua conexão com a internet e tente novamente.";

    botaoSalvar.disabled = false;

    botaoSalvar.textContent =
      "Tentar salvar novamente";

  } finally {
    abastecimentoEstado.salvando = false;
  }
}


/* =========================================================
   TELA DE SUCESSO
   ========================================================= */

function abastRenderSucesso(
  quantidade,
  totalLitros
) {
  const conteudo = document.getElementById(
    "abastConteudo"
  );

  if (!conteudo) {
    return;
  }

  conteudo.innerHTML = `
    <div class="abast-sucesso">

      <div class="abast-sucesso-icone">
        ${abastIconeCheck()}
      </div>

      <h2>
        Abastecimento salvo
      </h2>

      <p>
        ${
          quantidade === 1
            ? "1 equipamento foi atualizado"
            : `${quantidade} equipamentos foram atualizados`
        }
        com
        <strong>
          ${abastFormatarNumero(
            totalLitros
          )} litros
        </strong>
        no total.
      </p>

      <button
        type="button"
        class="btn-primario"
        id="btnNovoAbastecimento"
      >
        Registrar novo abastecimento
      </button>

    </div>
  `;

  abastecimentoEstado.etapa = 2;

  abastAtualizarIndicadorEtapa();

  const botaoNovo =
    document.getElementById(
      "btnNovoAbastecimento"
    );

  if (botaoNovo) {
    botaoNovo.addEventListener(
      "click",
      () => {
        renderAbastecimentos();
      }
    );
  }
}


/* =========================================================
   ERRO DE CARREGAMENTO
   ========================================================= */

function abastRenderErroCarregamento(
  erro
) {
  const conteudo = document.getElementById(
    "abastConteudo"
  );

  if (!conteudo) {
    return;
  }

  const mensagem =
    erro?.message ||
    "Não foi possível carregar o módulo.";

  conteudo.innerHTML = `
    <div class="em-construcao estado-erro">

      <h3>
        Não foi possível carregar
      </h3>

      <p>
        Verifique sua conexão com a internet
        e tente novamente.
      </p>

      <div class="etapa">
        ${abastEscaparHtml(mensagem)}
      </div>

      <button
        type="button"
        class="btn-primario"
        id="btnRecarregarAbastecimentos"
      >
        Tentar novamente
      </button>

    </div>
  `;

  const botao =
    document.getElementById(
      "btnRecarregarAbastecimentos"
    );

  if (botao) {
    botao.addEventListener(
      "click",
      () => {
        renderAbastecimentos();
      }
    );
  }
}


/* =========================================================
   INDICADOR DE ETAPAS
   ========================================================= */

function abastAtualizarIndicadorEtapa() {
  document
    .querySelectorAll(
      "[data-abast-indicador]"
    )
    .forEach((indicador) => {
      const etapa = Number(
        indicador.dataset
          .abastIndicador
      );

      indicador.classList.toggle(
        "ativo",
        etapa <=
          abastecimentoEstado.etapa
      );
    });
}


/* =========================================================
   CONFIRMAÇÃO DE CARREGAMENTO
   ========================================================= */

console.log(
  "Módulo abastecimentos.js carregado com sucesso."
);
