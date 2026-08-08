// =========================================================
// DOCUMENTOS DO FUNCIONÁRIO
// ---------------------------------------------------------
// Guarda RG, CPF, CTPS e Contrato — versão única de cada,
// substitui ao reenviar. Sem Firebase Storage (não habilitado
// no projeto): imagens são comprimidas no navegador e viram
// texto base64, salvo direto no Firestore, no mesmo padrão que
// a Frota já usa pra foto de equipamento. PDF é aceito também,
// mas sem compressão possível — arquivo grande pode ser
// recusado (limite de 1MB por documento do Firestore).
//
// Guardado em: cadastros_funcionarios/{id}/documentos/{tipo}
// =========================================================

(function () {
  const TIPOS_DOC = [
    { id: "rg", label: "RG" },
    { id: "cpf", label: "CPF" },
    { id: "ctps", label: "Carteira de Trabalho (CTPS)" },
    { id: "contrato", label: "Contrato de Trabalho" },
    { id: "ficha_registro", label: "Ficha de Registro do Empregado" },
  ];

  // Deixa uma margem folgada em relação ao limite real de 1MB do
  // Firestore (o base64 já inflado + o resto do documento).
  const LIMITE_BYTES = 850 * 1024;

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

  // Comprime imagem via canvas (mesmo padrão do frota.js). PDF não
  // passa por aqui — é lido direto como base64, sem compressão.
  function comprimirImagemDoc(arquivo, maxLargura = 1000, qualidade = 0.7) {
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

  function lerArquivoComoBase64(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = (evento) => resolve(evento.target.result);
      leitor.onerror = () => reject(new Error("Não foi possível ler esse arquivo."));
      leitor.readAsDataURL(arquivo);
    });
  }

  function tamanhoBase64EmBytes(dataUrl) {
    const base64 = dataUrl.split(",")[1] || "";
    return Math.round((base64.length * 3) / 4);
  }

  window.abrirDocumentosFuncionario = async function (id, nome) {
    funcionarioId = id;
    funcionarioNome = nome || "";
    renderModalDocumentos();
    await carregarDocumentosUnicos();
  };

  function renderModalDocumentos() {
    fecharModalDocumentos();

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
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("btnFecharDocumentos").addEventListener("click", fecharModalDocumentos);
    document.getElementById("modalDocumentosOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalDocumentosOverlay") fecharModalDocumentos();
    });
  }

  function fecharModalDocumentos() {
    document.getElementById("modalDocumentosOverlay")?.remove();
  }

  function mostrarErroDoc(msg) {
    const el = document.getElementById("docErro");
    if (el) el.textContent = msg || "";
  }

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
              ? `<a href="${dado.dados}" target="_blank" rel="noopener">Ver arquivo</a><span class="doc-data">Enviado em ${formatarDataDoc(dado.enviadoEm)}</span>`
              : `<span class="doc-vazio">Nenhum arquivo enviado</span>`}
          </div>
          <label class="btn-secundario btn-upload-doc">
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
    try {
      const ehImagem = arquivo.type.startsWith("image/");
      const dataUrl = ehImagem
        ? await comprimirImagemDoc(arquivo)
        : await lerArquivoComoBase64(arquivo);

      const tamanho = tamanhoBase64EmBytes(dataUrl);
      if (tamanho > LIMITE_BYTES) {
        mostrarErroDoc(
          ehImagem
            ? "Imagem muito pesada mesmo após compressão. Tenta tirar a foto com menos resolução."
            : `PDF muito pesado (${Math.round(tamanho / 1024)}KB). O limite é ~830KB — tenta comprimir o PDF antes, ou envie uma foto do documento em vez do PDF.`
        );
        return;
      }

      const { doc, setDoc, serverTimestamp } = window.fs;
      await setDoc(
        doc(window.firebaseDb, "cadastros_funcionarios", funcionarioId, "documentos", tipoId),
        {
          dados: dataUrl,
          nomeArquivo: arquivo.name,
          enviadoEm: serverTimestamp(),
        }
      );

      await carregarDocumentosUnicos();
    } catch (erro) {
      console.error("Erro ao enviar documento:", erro);
      mostrarErroDoc("Não foi possível enviar o arquivo. Tente novamente.");
    }
  }
})();
