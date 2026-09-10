/* Apontamento de viagens: independente do apontamento diário e dos medidores. */
(() => {
  const PADRAO = ["Terra", "Cascalho", "Entulho", "Massa asfáltica", "Brita"];
  const normalizar = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  const escapar = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const dataTexto = (v) => String(v || "").split("-").reverse().join("/");
  const quantidadeTexto = (n) => `${Number(n).toLocaleString("pt-BR")} ${Number(n) === 1 ? "viagem" : "viagens"}`;
  const listar = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }));

  window.renderViagens = async function () {
    const area = document.getElementById("areaPagina");
    if (!area) return;
    // Cada abertura tem seu próprio estado; respostas antigas não substituem outra página.
    const raiz = document.createElement("section");
    raiz.className = "painel-cadastro modulo-abastecimentos";
    area.replaceChildren(raiz);
    raiz.innerHTML = '<div class="abast-carregando">Carregando viagens...</div>';
    const el = (id) => raiz.querySelector(`#${id}`);
    let obras, caminhoes, categorias, registros;
    try {
      if (!window.fs || !window.firebaseDb) throw new Error("Firebase indisponível");
      const { collection, getDocs } = window.fs;
      const snaps = await Promise.all(["obras", "caminhoes", "cadastros_materiais_viagens", "apontamentos_viagens"].map((nome) => getDocs(collection(window.firebaseDb, nome))));
      [obras, caminhoes] = snaps.slice(0, 2).map((snap) => listar(snap).filter((d) => d.ativo !== false).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR")));
      categorias = PADRAO.map((nome, i) => ({ id: `padrao-${i}`, nome }));
      listar(snaps[2]).filter((d) => d.ativo !== false).forEach((c) => {
        if (!categorias.some((p) => normalizar(p.nome) === normalizar(c.nome))) categorias.push(c);
      });
      registros = listar(snaps[3]);
    } catch (erro) {
      console.error("Erro ao carregar viagens:", erro);
      if (!raiz.isConnected) return;
      raiz.innerHTML = '<div class="cadastro-vazio" role="alert">Não foi possível carregar as viagens. Verifique a conexão e as permissões de acesso.</div><button type="button" class="btn-primario" id="viagensTentar">Tentar novamente</button>';
      el("viagensTentar").onclick = window.renderViagens;
      return;
    }
    if (!raiz.isConnected) return;

    function historico(mensagem = "") {
      raiz.innerHTML = `
        <div class="abast-cabecalho-interno">
          <div><span class="abast-eyebrow">Operação</span><h2>Apontamento de Viagens</h2><p>Registre quantas viagens cada caminhão fez por obra e material.</p></div>
          <button type="button" class="btn-primario" id="viagensNovo">+ Novo apontamento</button>
        </div>
        <p role="status">${escapar(mensagem)}</p>
        <div class="cadastro-topo"><div class="cadastro-busca"><input type="search" id="viagensBusca" aria-label="Buscar viagens" placeholder="Buscar por obra, caminhão, placa ou material..."></div></div>
        <p id="viagensTotal" class="card-obra-info"></p><div id="viagensLista"></div>`;
      el("viagensNovo").onclick = formulario;
      el("viagensBusca").oninput = atualizarLista;
      atualizarLista();
    }

    function atualizarLista() {
      const busca = normalizar(el("viagensBusca").value);
      const itens = registros.filter((r) => normalizar(`${r.obraNome} ${r.caminhaoNome} ${r.placa} ${r.materialNome}`).includes(busca)).sort((a, b) => String(b.data).localeCompare(String(a.data)));
      const total = itens.reduce((s, r) => s + (Number(r.quantidadeViagens) || 0), 0);
      el("viagensTotal").textContent = `Total: ${quantidadeTexto(total)} · ${itens.length} lançamento(s)`;
      el("viagensLista").innerHTML = itens.length ? `<div class="grid-obras">${itens.map((r) => `
        <div class="card-obra">
          <div class="card-obra-topo"><span class="badge ativa">${quantidadeTexto(r.quantidadeViagens)}</span></div>
          <h3>${escapar(r.obraNome)}</h3>
          <p class="card-obra-info">${escapar(dataTexto(r.data))} · ${escapar(r.materialNome)}</p>
          <p class="card-obra-info">${escapar(r.caminhaoNome)} · ${escapar(r.placa || "Sem placa")}</p>
          ${r.observacao ? `<p class="card-obra-info" style="overflow-wrap:anywhere;white-space:pre-wrap">${escapar(r.observacao)}</p>` : ""}
          <div class="card-obra-rodape"><span>${escapar(r.responsavel || "—")}</span></div>
          <button type="button" class="btn-secundario" data-editar-viagem="${escapar(r.id)}" style="margin-top:12px">Editar apontamento</button>
        </div>`).join("")}</div>` : '<div class="cadastro-vazio">Nenhum apontamento de viagens encontrado.</div>';
      el("viagensLista").querySelectorAll("[data-editar-viagem]").forEach((b) => {
        b.onclick = () => window.editarApontamentoSalvo("viagens", b.dataset.editarViagem, window.renderViagens);
      });
    }

    function formulario() {
      let salvando = false;
      let salvandoCategoria = false;
      let referencia = null;
      const opcoes = (itens, rotulo) => itens.map((i) => `<option value="${escapar(i.id)}">${escapar(rotulo(i))}</option>`).join("");
      raiz.innerHTML = `
        <div class="abast-cabecalho-interno"><div><span class="abast-eyebrow">Novo apontamento</span><h2>Viagens do caminhão</h2><p>Exemplo: 5 viagens de terra para a obra. Para outro material, faça um novo lançamento.</p></div></div>
        <form id="viagensForm">
          <fieldset id="viagensCampos" style="border:0;padding:0;margin:0;min-width:0">
            <div class="abast-dados-gerais">
              <div class="campo"><label for="viagensObra">Obra *</label><select id="viagensObra" required><option value="">Selecione a obra</option>${opcoes(obras, (o) => o.nome)}</select></div>
              <div class="campo"><label for="viagensData">Data *</label><input type="date" id="viagensData" value="${hoje()}" required></div>
              <div class="campo"><label for="viagensCaminhao">Caminhão *</label><select id="viagensCaminhao" required><option value="">Selecione o caminhão</option>${opcoes(caminhoes, (c) => `${c.nome} · ${c.placa || "Sem placa"}`)}</select></div>
              <div class="campo"><label for="viagensMaterial">Material *</label><select id="viagensMaterial" required></select><button type="button" class="btn-secundario" id="viagensAdicionar" style="margin-top:8px">+ Adicionar categoria</button></div>
              <div class="campo"><label for="viagensQuantidade">Quantidade de viagens *</label><input type="number" id="viagensQuantidade" min="1" step="1" max="9007199254740991" inputmode="numeric" placeholder="Ex.: 5" required></div>
            </div>
            <div id="viagensCategoriaPainel" hidden>
              <div class="campo"><label for="viagensCategoriaNome">Nome da nova categoria</label><input type="text" id="viagensCategoriaNome" maxlength="80" placeholder="Ex.: Areia"></div>
              <div class="abast-acoes-finais"><button type="button" class="btn-secundario" id="viagensCategoriaVoltar">Fechar</button><button type="button" class="btn-primario" id="viagensCategoriaSalvar">Salvar categoria</button></div>
              <p class="abast-erro" id="viagensCategoriaErro" role="status"></p>
            </div>
            <div class="campo"><label for="viagensObservacao">Observação (opcional)</label><textarea id="viagensObservacao" rows="3" maxlength="2000" placeholder="Informações adicionais sobre as viagens"></textarea></div>
          </fieldset>
          <p class="abast-erro" id="viagensErro" role="alert"></p>
          <div class="abast-acoes-finais"><button type="button" class="btn-secundario" id="viagensVoltar">Voltar</button><button type="submit" class="btn-primario" id="viagensSalvar">Salvar apontamento</button></div>
        </form>`;
      function materiais(selecionado = "") {
        el("viagensMaterial").innerHTML = '<option value="">Selecione o material</option>' + opcoes(categorias, (c) => c.nome);
        el("viagensMaterial").value = selecionado;
      }
      materiais();
      el("viagensVoltar").onclick = () => { if (!salvando && !salvandoCategoria) historico(); };
      el("viagensAdicionar").onclick = () => { el("viagensCategoriaPainel").hidden = false; el("viagensCategoriaNome").focus(); };
      el("viagensCategoriaVoltar").onclick = () => { if (!salvandoCategoria) el("viagensCategoriaPainel").hidden = true; };
      el("viagensCategoriaSalvar").onclick = async () => {
        if (salvandoCategoria || salvando) return;
        const nome = el("viagensCategoriaNome").value.trim().replace(/\s+/g, " ");
        const erro = el("viagensCategoriaErro");
        erro.textContent = "";
        if (!nome || nome.length > 80) { erro.textContent = "Informe um nome de até 80 caracteres."; return; }
        const existente = categorias.find((c) => normalizar(c.nome) === normalizar(nome));
        if (existente) { materiais(existente.id); erro.textContent = "Esta categoria já existe e foi selecionada."; return; }
        salvandoCategoria = true;
        el("viagensCategoriaSalvar").disabled = true;
        el("viagensSalvar").disabled = true;
        el("viagensVoltar").disabled = true;
        try {
          const { doc, collection, setDoc, serverTimestamp } = window.fs;
          // ID estável evita duplicar a categoria em tentativas ou cadastros simultâneos.
          const id = `categoria-${encodeURIComponent(normalizar(nome))}`;
          await setDoc(doc(collection(window.firebaseDb, "cadastros_materiais_viagens"), id), { nome, ativo: true, atualizadoEm: serverTimestamp() });
          if (!raiz.isConnected) return;
          categorias.push({ id, nome });
          materiais(id);
          el("viagensCategoriaNome").value = "";
          el("viagensCategoriaPainel").hidden = true;
        } catch (e) {
          console.error("Erro ao salvar categoria de viagens:", e);
          erro.textContent = "Não foi possível salvar a categoria. Verifique a conexão e as permissões e tente novamente.";
        } finally {
          salvandoCategoria = false;
          if (raiz.isConnected) {
            el("viagensCategoriaSalvar").disabled = false;
            el("viagensSalvar").disabled = false;
            el("viagensVoltar").disabled = false;
          }
        }
      };
      el("viagensForm").onsubmit = async (evento) => {
        evento.preventDefault();
        if (salvando || salvandoCategoria) return;
        const erro = el("viagensErro");
        erro.textContent = "";
        const obra = obras.find((o) => o.id === el("viagensObra").value);
        const caminhao = caminhoes.find((c) => c.id === el("viagensCaminhao").value);
        const material = categorias.find((c) => c.id === el("viagensMaterial").value);
        const data = el("viagensData").value;
        const quantidadeViagens = Number(el("viagensQuantidade").value);
        if (!obra || !caminhao || !material || !data || !Number.isSafeInteger(quantidadeViagens) || quantidadeViagens < 1) {
          erro.textContent = "Selecione obra, data, caminhão e material e informe um número inteiro de viagens maior que zero.";
          return;
        }
        const registro = { obraId: obra.id, obraNome: obra.nome, caminhaoId: caminhao.id, caminhaoNome: caminhao.nome, placa: caminhao.placa || "", materialId: material.id, materialNome: material.nome, data, quantidadeViagens, observacao: el("viagensObservacao").value.trim(), responsavel: document.getElementById("usuarioNome")?.textContent?.trim() || "" };
        salvando = true;
        el("viagensCampos").disabled = true;
        el("viagensSalvar").disabled = true;
        el("viagensVoltar").disabled = true;
        el("viagensSalvar").textContent = "Salvando...";
        try {
          const { doc, collection, setDoc, serverTimestamp } = window.fs;
          // Reutilizar a referência em uma tentativa evita duplicar uma escrita já recebida.
          referencia ||= doc(collection(window.firebaseDb, "apontamentos_viagens"));
          await setDoc(referencia, { ...registro, criadoEm: serverTimestamp() });
          registros.push({ ...registro, id: referencia.id });
          if (raiz.isConnected) historico(`${quantidadeTexto(quantidadeViagens)} de ${material.nome} registradas com sucesso.`);
        } catch (e) {
          console.error("Erro ao salvar viagens:", e);
          erro.textContent = "Não foi possível salvar. Seus dados foram mantidos; verifique a conexão e as permissões e tente novamente.";
          if (raiz.isConnected) {
            el("viagensCampos").disabled = false;
            el("viagensSalvar").disabled = false;
            el("viagensVoltar").disabled = false;
            el("viagensSalvar").textContent = "Tentar salvar novamente";
          }
        } finally { salvando = false; }
      };
    }
    historico();
  };
})();
