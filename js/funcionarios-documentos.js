// =========================================================
// DOCUMENTOS DO FUNCIONÁRIO
// ---------------------------------------------------------
// Guarda RG, CPF, CTPS, Contrato e Ficha de Registro (versão
// única de cada, substitui ao reenviar) e Holerites (histórico
// mensal completo, nunca substitui). Arquivos vão pro Firebase
// Storage — o Firestore guarda só o link + metadados de cada
// um. Sem limite apertado de tamanho (antes era ~830KB via
// base64 no Firestore; agora só um teto de bom senso pra evitar
// upload gigante por engano).
//
// Guardado em:
//   funcionarios/{id}/documentos/{tipo}.{ext}      (Storage)
//   cadastros_funcionarios/{id}/documentos/{tipo}  (Firestore, metadados)
//   funcionarios/{id}/holerites/{aaaa-mm}.{ext}    (Storage)
//   cadastros_funcionarios/{id}/holerites/{aaaa-mm} (Firestore, metadados)
// =========================================================

(function () {
  const TIPOS_DOC = [
    { id: "rg", label: "RG" },
    { id: "cpf", label: "CPF" },
    { id: "ctps", label: "Carteira de Trabalho (CTPS)" },
    { id: "contrato", label: "Contrato de Trabalho" },
    { id: "ficha_registro", label: "Ficha de Registro do Empregado" },
  ];

  const MESES_HOLERITE = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  // Teto de bom senso (não é mais limitação técnica real, é só
  // pra pegar upload errado por engano — tipo um vídeo).
  const LIMITE_BYTES = 20 * 1024 * 1024; // 20MB

  let funcionarioId = null;
  let funcionarioNome = "";

  function escaparHtmlDoc(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
  }

  function formatarDataDoc(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") return "";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  }

  function extensaoArquivo(nomeArquivo) {
    const partes = String(nomeArquivo || "").split(".");
    return partes.length > 1 ? partes.pop().toLowerCase() : "bin";
  }

  function verificarStorage() {
    if (!window.firebaseStorage || !window.fst) {
      throw new Error("O Storage ainda não está pronto. Recarregue a página.");
    }
  }

  window.abrirDocumentosFuncionario = async function (id, nome) {
    funcionarioId = id;
    funcionarioNome = nome || "";
    renderModalDocumentos();
    await Promise.all([carregarDocumentosUnicos(), carregarHolerites()]);
  };

  function renderModalDocumentos() {
    fecharModalDocumentos();

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    const html = `
      <div class="modal-overlay" id="modalDocumentosOverlay">
        <div class="modal-cadastro modal-documentos">
          <div class="modal-cabecalho">
            <h3>Documentos — ${escaparHtmlDoc(funcionarioNome)}</h3>
            <button class="btn-fechar-modal" id="btnFecharDocumentos" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div id="listaDocumentosUnicos" class="lista-docs-unicos">
            <p class="doc-carregando">Carregando...</p>
          </div>
          <p class="doc-erro" id="docErro"></p>

          <h4 class="doc-subtitulo">Holerites</h4>
          <form id="formHolerite" class="form-consignado-linha">
            <div class="campo">
              <label>Mês</label>
              <select id="holeriteMes">
                ${MESES_HOLERITE.map((m, i) => `<option value="${i + 1}" ${i + 1 === mesAtual ? "selected" : ""}>${m}</option>`).join("")}
              </select>
            </div>
            <div class="campo">
              <label>Ano</label>
              <input type="number" id="holeriteAno" value="${anoAtual}" min="2015" max="2100">
            </div>
            <div class="campo campo-descricao-cons">
              <label>Arquivo</label>
              <input type="file" id="holeriteArquivo" accept=".pdf,image/*">
            </div>
            <div class="campo campo-botao-cons">
              <button type="submit" class="btn-primario">Enviar</button>
            </div>
          </form>
          <p class="doc-erro" id="holeriteErro"></p>
          <div id="listaHolerites" class="lista-consignados">
            <p class="doc-carregando">Carregando...</p>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("btnFecharDocumentos").addEventListener("click", fecharModalDocumentos);
    document.getElementById("modalDocumentosOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalDocumentosOverlay") fecharModalDocumentos();
    });
    document.getElementById("formHolerite").addEventListener("submit", onSubmitHolerite);
  }

  function fecharModalDocumentos() {
    document.getElementById("modalDocumentosOverlay")?.remove();
  }

  function mostrarErroDoc(msg) {
    const el = document.getElementById("docErro");
    if (el) el.textContent = msg || "";
  }

  // ---------- Documentos únicos (RG, CPF, CTPS, Contrato, Ficha) ----------

  async function carregarDocumentosUnicos() {
    const wrap = document.getElementById("listaDocumentosUnicos");
    if (!wrap) return;

    const { collection, getDocs } = window.fs;
    const snap = await getDocs(
      collection(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "documentos")
    );
    const mapa = {};
    snap.forEach((d) => { mapa[d.id] = d.data(); });

    wrap.innerHTML = TIPOS_DOC.map((tipo) => {
      const dado = mapa[tipo.id];
      return `
        <div class="linha-doc-unico">
          <div class="linha-doc-info">
            <strong>${tipo.label}</strong>
            ${dado
              ? `<a href="${dado.url}" target="_blank" rel="noopener">Ver arquivo</a><span class="doc-data">Enviado em ${formatarDataDoc(dado.enviadoEm)}</span>`
              : `<span class="doc-vazio">Nenhum arquivo enviado</span>`}
          </div>
          <label class="btn-secundario btn-upload-doc" data-label-upload="${tipo.id}">
            ${dado ? "Substituir" : "Enviar"}
            <input type="file" accept=".pdf,image/*" data-tipo-doc="${tipo.id}" hidden>
          </label>
        </div>`;
    }).join("");

    wrap.querySelectorAll("[data-tipo-doc]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const arquivo = e.target.files[0];
        if (arquivo) onUploadDocumentoUnico(input.dataset.tipoDoc, arquivo);
        e.target.value = "";
      });
    });
  }

  async function onUploadDocumentoUnico(tipoId, arquivo) {
    mostrarErroDoc("");

    if (arquivo.size > LIMITE_BYTES) {
      mostrarErroDoc(`Arquivo muito pesado (${Math.round(arquivo.size / 1024 / 1024)}MB). O limite é 20MB.`);
      return;
    }

    const label = document.querySelector(`[data-label-upload="${tipoId}"]`);
    const textoOriginal = label ? label.firstChild.textContent : "";
    if (label) label.firstChild.textContent = "Enviando...";

    try {
      verificarStorage();
      const { ref, uploadBytes, getDownloadURL } = window.fst;
      const { doc, setDoc, serverTimestamp } = window.fs;

      const ext = extensaoArquivo(arquivo.name);
      const caminho = `funcionarios/${funcionarioId}/documentos/${tipoId}.${ext}`;
      const storageRef = ref(window.firebaseStorage, caminho);

      await uploadBytes(storageRef, arquivo);
      const url = await getDownloadURL(storageRef);

      await setDoc(
        doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "documentos", tipoId),
        {
          url,
          nomeArquivo: arquivo.name,
          storagePath: caminho,
          enviadoEm: serverTimestamp(),
        }
      );

      await carregarDocumentosUnicos();
    } catch (erro) {
      console.error("Erro ao enviar documento:", erro);
      mostrarErroDoc("Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente.");
      if (label) label.firstChild.textContent = textoOriginal;
    }
  }

  // ---------- Holerites (histórico mensal) ----------

  async function carregarHolerites() {
    const wrap = document.getElementById("listaHolerites");
    if (!wrap) return;

    const { collection, getDocs } = window.fs;
    const snap = await getDocs(
      collection(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "holerites")
    );
    const itens = [];
    snap.forEach((d) => itens.push({ id: d.id, ...d.data() }));
    itens.sort((a, b) => b.id.localeCompare(a.id)); // id é "aaaa-mm", ordena certo como texto

    if (itens.length === 0) {
      wrap.innerHTML = `<p class="doc-vazio">Nenhum holerite enviado ainda.</p>`;
      return;
    }

    wrap.innerHTML = itens.map((item) => {
      const rotuloMes = MESES_HOLERITE[(item.mes || 1) - 1] || "";
      return `
        <div class="linha-consignado">
          <div class="linha-doc-info">
            <strong>${rotuloMes} de ${item.ano}</strong>
            <a href="${item.url}" target="_blank" rel="noopener">Ver arquivo</a>
            <span class="doc-data">Enviado em ${formatarDataDoc(item.enviadoEm)}</span>
          </div>
          <button type="button" class="btn-icone" title="Excluir" data-excluir-holerite="${item.id}" data-storage-path="${escaparHtmlDoc(item.storagePath || "")}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>`;
    }).join("");

    wrap.querySelectorAll("[data-excluir-holerite]").forEach((btn) => {
      btn.addEventListener("click", () => excluirHolerite(btn.dataset.excluirHolerite, btn.dataset.storagePath));
    });
  }

  function mostrarErroHolerite(msg) {
    const el = document.getElementById("holeriteErro");
    if (el) el.textContent = msg || "";
  }

  async function onSubmitHolerite(e) {
    e.preventDefault();
    mostrarErroHolerite("");

    const mes = Number(document.getElementById("holeriteMes").value);
    const ano = Number(document.getElementById("holeriteAno").value);
    const arquivo = document.getElementById("holeriteArquivo").files[0];
    if (!arquivo) {
      mostrarErroHolerite("Escolhe um arquivo antes de enviar.");
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      mostrarErroHolerite(`Arquivo muito pesado (${Math.round(arquivo.size / 1024 / 1024)}MB). O limite é 20MB.`);
      return;
    }

    const anoMes = `${ano}-${String(mes).padStart(2, "0")}`;
    const botao = document.querySelector("#formHolerite button[type=submit]");

    try {
      const { doc, getDoc, setDoc, serverTimestamp } = window.fs;

      const refExistente = doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "holerites", anoMes);
      const snapExistente = await getDoc(refExistente);
      if (snapExistente.exists()) {
        const confirmar = confirm(
          `Já existe um holerite de ${MESES_HOLERITE[mes - 1]}/${ano} pra esse funcionário. Substituir pelo novo arquivo?`
        );
        if (!confirmar) return;
      }

      botao.disabled = true;
      botao.textContent = "Enviando...";

      verificarStorage();
      const { ref, uploadBytes, getDownloadURL } = window.fst;
      const ext = extensaoArquivo(arquivo.name);
      const caminho = `funcionarios/${funcionarioId}/holerites/${anoMes}.${ext}`;
      const storageRef = ref(window.firebaseStorage, caminho);

      await uploadBytes(storageRef, arquivo);
      const url = await getDownloadURL(storageRef);

      await setDoc(refExistente, {
        url,
        nomeArquivo: arquivo.name,
        storagePath: caminho,
        mes,
        ano,
        enviadoEm: serverTimestamp(),
      });

      document.getElementById("formHolerite").reset();
      document.getElementById("holeriteMes").value = String(new Date().getMonth() + 1);
      document.getElementById("holeriteAno").value = String(new Date().getFullYear());
      botao.disabled = false;
      botao.textContent = "Enviar";
      await carregarHolerites();
    } catch (erro) {
      console.error("Erro ao enviar holerite:", erro);
      mostrarErroHolerite("Não foi possível enviar. Verifique sua conexão e tente novamente.");
      botao.disabled = false;
      botao.textContent = "Enviar";
    }
  }

  async function excluirHolerite(anoMes, storagePath) {
    const confirmar = confirm("Excluir este holerite? Essa ação não pode ser desfeita.");
    if (!confirmar) return;

    try {
      const { doc, deleteDoc } = window.fs;
      await deleteDoc(doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "holerites", anoMes));

      if (storagePath) {
        try {
          const { ref, deleteObject } = window.fst;
          await deleteObject(ref(window.firebaseStorage, storagePath));
        } catch (erroStorage) {
          console.warn("Não foi possível excluir o arquivo do Storage:", erroStorage);
        }
      }

      await carregarHolerites();
    } catch (erro) {
      console.error("Erro ao excluir holerite:", erro);
      mostrarErroHolerite("Não foi possível excluir. Tente novamente.");
    }
  }
})();
