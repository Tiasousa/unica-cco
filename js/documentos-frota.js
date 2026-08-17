// =========================================================
// FROTA · DOCUMENTOS
// ---------------------------------------------------------
// Controla vencimento de Licenciamento (CRLV) e Seguro por
// equipamento (máquina ou caminhão). Cada documento guarda a
// data de vencimento + um anexo (foto ou PDF, comprimido e
// salvo como base64 no Firestore — mesmo padrão já usado nos
// documentos de Funcionários, sem depender do Storage).
//
// Guardado em: maquinas/{id}/documentos/{tipo} e
//              caminhoes/{id}/documentos/{tipo}
// tipo: "licenciamento" | "seguro"
//
// Alerta: documento vencido ou vencendo em até 30 dias entra
// no contador do sininho (alertaDocumentosFrota).
// =========================================================

const DOCFROTA_LIMITE_BYTES = 850 * 1024;
const DOCFROTA_DIAS_ALERTA = 30;

const DOCFROTA_TIPOS = [
  { id: "licenciamento", label: "Licenciamento (CRLV)", temVencimento: true },
  { id: "seguro", label: "Seguro", temVencimento: true },
  { id: "nota_fiscal", label: "Nota Fiscal", temVencimento: false },
  { id: "manual", label: "Manual", temVencimento: false },
];

let docFrotaEquipamentos = [];
let docFrotaBusca = "";

function escDocFrota(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function normDocFrota(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmtDataDocFrota(dataIso) {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Status do documento a partir da data de vencimento
function statusDocFrota(dataIso) {
  if (!dataIso) return { chave: "sem_data", rotulo: "Sem data cadastrada", badge: "" };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const vencimento = new Date(ano, mes - 1, dia);
  const diasRestantes = Math.round((vencimento - hoje) / 86400000);

  if (diasRestantes < 0) return { chave: "vencido", rotulo: "Vencido", badge: "parada", diasRestantes };
  if (diasRestantes <= DOCFROTA_DIAS_ALERTA) return { chave: "vence_em_breve", rotulo: `Vence em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`, badge: "atencao", diasRestantes };
  return { chave: "valido", rotulo: "Em dia", badge: "ativa", diasRestantes };
}

// Pra Nota Fiscal, Manual etc — documentos que não vencem, só importa
// se tem o anexo ou não.
function statusAnexoSimples(temArquivo) {
  return temArquivo
    ? { chave: "anexado", rotulo: "Anexado", badge: "ativa" }
    : { chave: "sem_anexo", rotulo: "Sem anexo", badge: "" };
}

function verificarFirebaseDocFrota() {
  if (!window.firebaseDb || !window.fs) {
    throw new Error("O Firebase ainda não está pronto. Recarregue a página.");
  }
}

/* =========================================================
   CARREGAMENTO
   ========================================================= */

async function carregarDocumentosFrota() {
  verificarFirebaseDocFrota();
  const { collection, getDocs } = window.fs;

  const [snapMaquinas, snapCaminhoes] = await Promise.all([
    getDocs(collection(window.firebaseDb, "maquinas")),
    getDocs(collection(window.firebaseDb, "caminhoes")),
  ]);

  const base = [];
  const juntar = (snap, colecao, campoIdent, categoriaRotulo) => {
    snap.forEach((d) => {
      const dados = d.data();
      if (dados.ativo === false) return;
      base.push({
        id: d.id,
        colecao,
        categoriaRotulo,
        nome: dados.nome || "Sem nome",
        identificacao: dados[campoIdent] || "—",
        fotoUrl: dados.fotoUrl || null,
        documentos: {},
      });
    });
  };
  juntar(snapMaquinas, "maquinas", "identificador", "Máquina");
  juntar(snapCaminhoes, "caminhoes", "placa", "Caminhão");
  base.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  // Busca os documentos (licenciamento/seguro) de cada equipamento em paralelo
  await Promise.all(
    base.map(async (equip) => {
      const snapDocs = await getDocs(collection(window.firebaseDb, equip.colecao, equip.id, "documentos"));
      snapDocs.forEach((d) => { equip.documentos[d.id] = d.data(); });
    })
  );

  docFrotaEquipamentos = base;
  atualizarAlertaDocumentosFrota();
}

function atualizarAlertaDocumentosFrota() {
  let contagem = 0;
  docFrotaEquipamentos.forEach((equip) => {
    DOCFROTA_TIPOS.filter((t) => t.temVencimento).forEach((tipo) => {
      const doc = equip.documentos[tipo.id];
      const status = statusDocFrota(doc?.dataVencimento);
      if (status.chave === "vencido" || status.chave === "vence_em_breve") contagem++;
    });
  });
  if (typeof window.atualizarContadorNavegacao === "function") {
    window.atualizarContadorNavegacao("alertaDocumentosFrota", contagem);
  }
}

/* =========================================================
   ENTRADA DO MÓDULO
   ========================================================= */

async function renderDocumentosFrota() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  area.innerHTML = `
    <div class="em-construcao">
      <div class="loading-spinner"></div>
      <p>Carregando documentos...</p>
    </div>
  `;

  try {
    await carregarDocumentosFrota();
    renderTelaDocumentosFrota();
  } catch (erro) {
    console.error("Erro ao carregar documentos da frota:", erro);
    area.innerHTML = `
      <div class="em-construcao estado-erro">
        <h3>Não foi possível carregar</h3>
        <p class="etapa">Verifique sua conexão com a internet e tente novamente.</p>
        <button type="button" class="btn-primario" id="btnTentarDocFrota">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btnTentarDocFrota")?.addEventListener("click", renderDocumentosFrota);
  }
}
window.renderDocumentosFrota = renderDocumentosFrota;

function renderTelaDocumentosFrota() {
  const area = document.getElementById("areaPagina");
  if (!area) return;

  docFrotaBusca = "";

  area.innerHTML = `
    <section class="painel-cadastro">
      <div class="cadastro-topo">
        <div class="cadastro-busca">
          <input type="search" id="buscaDocFrota" placeholder="Buscar por equipamento...">
        </div>
      </div>
      <div id="listaDocFrotaWrap"></div>
    </section>
  `;

  document.getElementById("buscaDocFrota")?.addEventListener("input", (e) => {
    docFrotaBusca = normDocFrota(e.target.value);
    renderizarListaDocFrota();
  });

  renderizarListaDocFrota();
}

function renderizarListaDocFrota() {
  const wrap = document.getElementById("listaDocFrotaWrap");
  if (!wrap) return;

  let itens = docFrotaEquipamentos;
  if (docFrotaBusca) {
    itens = itens.filter((e) => normDocFrota(`${e.nome} ${e.identificacao}`).includes(docFrotaBusca));
  }

  if (itens.length === 0) {
    wrap.innerHTML = `<div class="cadastro-vazio">Nenhum equipamento encontrado.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="lista-doc-frota">
      ${itens.map((equip) => `
        <div class="card-doc-frota">
          <div class="card-doc-frota-cabecalho">
            ${equip.fotoUrl
              ? `<div class="apont-card-foto"><img src="${escDocFrota(equip.fotoUrl)}" alt="" loading="lazy"></div>`
              : `<div class="apont-card-foto apont-card-foto-vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/></svg></div>`}
            <div>
              <h3>${escDocFrota(equip.nome)}</h3>
              <p class="card-obra-info">${escDocFrota(equip.categoriaRotulo)} · ${escDocFrota(equip.identificacao)}</p>
            </div>
          </div>
          <div class="linhas-doc-frota">
            ${DOCFROTA_TIPOS.map((tipo) => {
              const doc = equip.documentos[tipo.id];
              const status = tipo.temVencimento
                ? statusDocFrota(doc?.dataVencimento)
                : statusAnexoSimples(!!doc?.dados);
              return `
                <button type="button" class="linha-doc-frota" data-abrir-doc-frota="${escDocFrota(equip.colecao)}:${escDocFrota(equip.id)}:${tipo.id}">
                  <div class="linha-doc-frota-info">
                    <strong>${tipo.label}</strong>
                    <span class="doc-data">${tipo.temVencimento
                      ? (doc?.dataVencimento ? "Vence em " + fmtDataDocFrota(doc.dataVencimento) : "Sem data cadastrada")
                      : (doc?.dados ? "Arquivo anexado" : "Nenhum arquivo ainda")}</span>
                  </div>
                  ${status.badge ? `<span class="badge ${status.badge}">${escDocFrota(status.rotulo)}</span>` : `<span class="badge-vazio">${tipo.temVencimento ? "Cadastrar" : "Anexar"}</span>`}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  wrap.querySelectorAll("[data-abrir-doc-frota]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [colecao, id, tipoId] = btn.dataset.abrirDocFrota.split(":");
      abrirModalDocFrota(colecao, id, tipoId);
    });
  });
}

/* =========================================================
   MODAL DE EDIÇÃO (data + anexo)
   ========================================================= */

function fecharModalDocFrota() {
  document.getElementById("modalOverlay")?.remove();
}

function abrirModalDocFrota(colecao, id, tipoId) {
  const equip = docFrotaEquipamentos.find((e) => e.colecao === colecao && e.id === id);
  if (!equip) return;
  const tipo = DOCFROTA_TIPOS.find((t) => t.id === tipoId);
  const doc = equip.documentos[tipoId];

  const modalHtml = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-cadastro">
        <div class="modal-cabecalho">
          <h3>${tipo.label} — ${escDocFrota(equip.nome)}</h3>
          <button type="button" class="btn-fechar-modal" id="btnFecharModalDocFrota">${window.iconeX ? window.iconeX() : "×"}</button>
        </div>
        <form id="formDocFrota">
          ${tipo.temVencimento ? `
          <div class="campo">
            <label>Data de vencimento</label>
            <input type="date" id="docFrotaVencimento" value="${doc?.dataVencimento || ""}">
          </div>` : ""}
          <div class="campo">
            <label>Anexo (foto ou PDF)</label>
            ${doc?.dados
              ? `<p class="doc-data" style="margin-bottom:8px;">Arquivo atual: <a href="${doc.dados}" target="_blank" rel="noopener">Ver anexo</a> ${doc.enviadoEm ? "· enviado em " + (doc.enviadoEm.toDate ? doc.enviadoEm.toDate().toLocaleDateString("pt-BR") : "") : ""}</p>`
              : ""}
            <input type="file" id="docFrotaArquivo" accept="image/*,.pdf">
          </div>
          <div class="modal-erro" id="docFrotaErro"></div>
          <div class="modal-acoes">
            <button type="button" class="btn-secundario" id="btnCancelarDocFrota">Cancelar</button>
            <button type="submit" class="btn-primario" id="btnSalvarDocFrota">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("btnFecharModalDocFrota").addEventListener("click", fecharModalDocFrota);
  document.getElementById("btnCancelarDocFrota").addEventListener("click", fecharModalDocFrota);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") fecharModalDocFrota();
  });
  document.getElementById("formDocFrota").addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarDocFrota(colecao, id, tipoId, doc);
  });
}

function comprimirImagemDocFrota(arquivo, maxLargura = 1000, qualidade = 0.7) {
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

function lerArquivoComoBase64DocFrota(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = (evento) => resolve(evento.target.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler esse arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

function tamanhoBase64EmBytesDocFrota(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

async function salvarDocFrota(colecao, id, tipoId, docExistente) {
  const erroEl = document.getElementById("docFrotaErro");
  erroEl.textContent = "";

  const dataVencimento = document.getElementById("docFrotaVencimento")?.value || null;
  const arquivo = document.getElementById("docFrotaArquivo").files[0];

  const botao = document.getElementById("btnSalvarDocFrota");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    const dados = { dataVencimento };

    if (arquivo) {
      const ehImagem = arquivo.type.startsWith("image/");
      const dataUrl = ehImagem
        ? await comprimirImagemDocFrota(arquivo)
        : await lerArquivoComoBase64DocFrota(arquivo);

      const tamanho = tamanhoBase64EmBytesDocFrota(dataUrl);
      if (tamanho > DOCFROTA_LIMITE_BYTES) {
        erroEl.textContent = ehImagem
          ? "Imagem muito pesada mesmo após compressão. Tenta tirar a foto com menos resolução."
          : `PDF muito pesado (${Math.round(tamanho / 1024)}KB). O limite é ~830KB — comprime o PDF ou envia uma foto do documento em vez dele.`;
        botao.disabled = false;
        botao.textContent = "Salvar";
        return;
      }
      dados.dados = dataUrl;
      dados.nomeArquivo = arquivo.name;
    } else if (docExistente?.dados) {
      dados.dados = docExistente.dados;
      dados.nomeArquivo = docExistente.nomeArquivo || null;
    }

    verificarFirebaseDocFrota();
    const { doc, setDoc, serverTimestamp } = window.fs;
    await setDoc(
      doc(window.firebaseDb, colecao, id, "documentos", tipoId),
      { ...dados, enviadoEm: serverTimestamp() }
    );

    fecharModalDocFrota();
    await carregarDocumentosFrota();
    renderizarListaDocFrota();
  } catch (erro) {
    console.error("Erro ao salvar documento da frota:", erro);
    erroEl.textContent = "Não foi possível salvar. Tente novamente.";
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}
