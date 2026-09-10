/* Relatórios de apontamentos e viagens. Este módulo apenas consulta dados. */
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const numero = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const dataTexto = (d) => String(d || "").split("-").reverse().join("/");
  const categorias = [25, 50, 75, 100];
  const observacaoBase = "Dia sem apontamento não significa equipamento parado. Os totais consideram somente registros não cancelados no período e na obra selecionados.";
  const listar = (snap) => {
    const itens = [];
    snap.forEach((d) => itens.push({ ...d.data(), id: d.id }));
    return itens;
  };
  const valido = (r) => r && r.ativo !== false && String(r.status || "").toLowerCase() !== "cancelado";
  const valorNumerico = (v) => v === null || v === undefined || String(v).trim() === "" ? null : Number(v);
  const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + "T12:00:00Z")) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;

  function normalizar(registros, tipo) {
    const linhas = [];
    registros.filter(valido).forEach((registro) => {
      const obraId = registro.obraId ? `obra:${registro.obraId}` : `nome:${registro.obraNome || "Obra não informada"}`;
      const base = { data: registro.data, obraId, obraNome: registro.obraNome || "Obra não informada", responsavel: registro.responsavel || "—" };
      if (tipo === "viagens") {
        const n = valorNumerico(registro.quantidadeViagens);
        linhas.push({ ...base, chave: registro.caminhaoId ? `caminhoes:${registro.caminhaoId}` : `sem-id:${registro.id}`, nome: registro.caminhaoNome || "Caminhão não informado", identificacao: registro.placa || "", tipo: "Caminhão", valor: Number.isSafeInteger(n) && n >= 0 ? n : null, material: registro.materialNome || "Material não informado", observacao: registro.observacao || "" });
      } else {
        (Array.isArray(registro.itens) ? registro.itens : []).filter(valido).forEach((item, indice) => {
          const colecao = item.colecaoEquipamento || (item.tipoItem === "caminhao" ? "caminhoes" : item.tipoItem === "maquina" ? "maquinas" : "equipamentos");
          const n = valorNumerico(item.percentualTrabalhado);
          linhas.push({ ...base, chave: item.equipamentoId ? `${colecao}:${item.equipamentoId}` : `sem-id:${registro.id}:${indice}`, nome: item.equipamentoNome || "Equipamento não informado", identificacao: item.identificacao || "", tipo: item.tipoRotulo || (colecao === "caminhoes" ? "Caminhão" : colecao === "maquinas" ? "Máquina" : "Equipamento"), valor: [0, ...categorias].includes(n) ? n : null, observacao: item.ocorrencia || "" });
        });
      }
    });
    return linhas;
  }

  function resumo(linhas, tipo) {
    const contagens = Object.fromEntries(categorias.map((c) => [c, linhas.filter((r) => r.valor === c).length]));
    const total = linhas.reduce((s, r) => s + (r.valor ?? 0), 0) / (tipo === "diario" ? 100 : 1);
    const porDia = new Map();
    linhas.forEach((r) => {
      const chave = `${r.chave}|${r.data}`;
      porDia.set(chave, (porDia.get(chave) || 0) + (r.valor ?? 0));
    });
    return { contagens, total, dias: new Set(linhas.map((r) => r.data)).size, semValor: linhas.filter((r) => r.valor === null).length, zeros: linhas.filter((r) => r.valor === 0).length, excesso: tipo === "diario" ? [...porDia.values()].filter((v) => v > 100).length : 0 };
  }

  const estilos = `
    #moduloRelatorios .rel-filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;background:var(--preto-card);border:1px solid var(--borda-card);padding:18px;border-radius:10px;margin:18px 0}
    #moduloRelatorios .rel-filtros .campo{margin:0;min-width:0}
    #moduloRelatorios .rel-filtros input,#moduloRelatorios .rel-filtros select{width:100%;min-width:0}
    #moduloRelatorios .rel-filtros input[type="month"]{color-scheme:dark}
    #moduloRelatorios .rel-acoes{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px 0}
    #moduloRelatorios .rel-metricas{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}
    #moduloRelatorios .rel-metrica,#moduloRelatorios .rel-painel{background:var(--preto-card);border:1px solid var(--borda-card);padding:18px;border-radius:10px}
    #moduloRelatorios .rel-metrica span,#moduloRelatorios .rel-nota{color:var(--cinza-claro);font-size:12px}
    #moduloRelatorios .rel-metrica strong{display:block;font-size:28px;margin-top:6px;font-variant-numeric:tabular-nums}
    #moduloRelatorios .rel-painel{margin-top:16px;min-width:0}
    #moduloRelatorios .rel-tabela-wrap{overflow-x:auto;margin-top:12px}
    #moduloRelatorios table{border-collapse:collapse;width:100%;font-size:13px}
    #moduloRelatorios th,#moduloRelatorios td{text-align:left;padding:12px 8px;border-bottom:1px solid var(--borda-card);vertical-align:top}
    #moduloRelatorios th{color:var(--cinza-claro);font-weight:500;white-space:nowrap}
    #moduloRelatorios td{min-width:50px;font-variant-numeric:tabular-nums}
    #moduloRelatorios .rel-nome{min-width:180px}
    #moduloRelatorios .rel-sub{display:block;color:var(--cinza-claro);font-size:12px;margin-top:4px}
    #moduloRelatorios .rel-nota{margin:12px 0;line-height:1.6}
    #moduloRelatorios .rel-aviso{color:#f5c46a}
    #moduloRelatorios .rel-observacao{white-space:pre-wrap;overflow-wrap:anywhere;min-width:130px}
    #moduloRelatorios .rel-categorias{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0;font-size:13px}
    #moduloRelatorios [hidden]{display:none!important}
    #moduloRelatorios .rel-selecionado{background:rgba(255,184,0,.06)}
    @media(max-width:540px){#moduloRelatorios .rel-filtros{grid-template-columns:1fr;padding:12px}#moduloRelatorios .rel-painel{padding:12px}#moduloRelatorios .rel-acoes button{flex:1}#moduloRelatorios .rel-metrica{padding:12px}}
  `;

  window.renderRelatorios = async function () {
    const area = document.getElementById("areaPagina");
    if (!area) return;
    const raiz = document.createElement("section");
    raiz.id = "moduloRelatorios";
    raiz.className = "painel-cadastro modulo-abastecimentos";
    area.replaceChildren(raiz);
    const el = (id) => raiz.querySelector(`#${id}`);
    const agora = new Date();
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    let tipo = "diario", linhas = [], obras = [], equipamentos = [], selecao = "", consulta = null, sequencia = 0;
    raiz.innerHTML = `<style>${estilos}</style>
      <div class="abast-cabecalho-interno"><div><span class="abast-eyebrow">Relatórios</span><h2>Apontamentos e viagens</h2><p>Consulte os registros por período, obra e equipamento.</p></div></div>
      <div class="rel-acoes" aria-label="Tipo de relatório"><button type="button" class="btn-primario" id="relDiario" aria-pressed="true">Apontamento Diário</button><button type="button" class="btn-secundario" id="relViagens" aria-pressed="false">Apontamento de Viagens</button></div>
      <form id="relForm"><div class="rel-filtros">
        <div class="campo" id="relInicioWrap"><label for="relInicio">Data inicial</label><input type="date" id="relInicio" value="${mesAtual}-01" required></div>
        <div class="campo" id="relFimWrap"><label for="relFim">Data final</label><input type="date" id="relFim" value="${mesAtual}-${String(agora.getDate()).padStart(2, "0")}" required></div>
        <div class="campo"><label for="relObra">Obra</label><select id="relObra"><option value="">Todas as obras</option></select></div>
        <div class="campo"><label for="relEquipamento">Máquina ou caminhão</label><select id="relEquipamento"><option value="">Todos os equipamentos</option></select></div>
      </div><p class="rel-nota">O intervalo inclui a data inicial e a final. Para consultar um único dia, informe a mesma data nos dois campos.</p><div class="rel-acoes"><button type="submit" class="btn-primario" id="relConsultar">Consultar / atualizar</button></div></form>
      <p class="abast-erro" id="relErro" role="alert"></p><div id="relResultados" aria-live="polite"></div>`;

    function datas() {
      const inicio = el("relInicio").value, fim = el("relFim").value;
      if (!dataValida(inicio) || !dataValida(fim) || inicio > fim) throw new Error("Informe as datas inicial e final em ordem válida.");
      return { inicio, fim };
    }

    function preencherSelect(id, opcoes, padrao) {
      const anterior = el(id).value;
      el(id).innerHTML = `<option value="">${padrao}</option>` + [...opcoes].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([chave, nome]) => `<option value="${esc(chave)}">${esc(nome)}</option>`).join("");
      if (opcoes.has(anterior)) el(id).value = anterior;
    }

    function opcoes() {
      const listaObras = new Map(obras.map((o) => [`obra:${o.id}`, o.nome || "Obra sem nome"]));
      const listaEquip = new Map(equipamentos.filter((e) => tipo === "diario" || e.colecao === "caminhoes").map((e) => [e.chave, `${e.nome} · ${e.identificacao || e.tipo}`]));
      linhas.forEach((r) => {
        if (!listaObras.has(r.obraId)) listaObras.set(r.obraId, r.obraNome);
        if (!listaEquip.has(r.chave)) listaEquip.set(r.chave, `${r.nome} · ${r.identificacao || r.tipo}`);
      });
      preencherSelect("relObra", listaObras, "Todas as obras");
      preencherSelect("relEquipamento", listaEquip, tipo === "diario" ? "Todos os equipamentos" : "Todos os caminhões");
    }

    function invalidar() {
      sequencia++;
      consulta = null;
      el("relConsultar").disabled = false;
      el("relResultados").innerHTML = '<p class="rel-nota">Clique em Consultar / atualizar para aplicar o período.</p>';
    }

    async function carregar() {
      const token = ++sequencia;
      consulta = null;
      el("relErro").textContent = "";
      el("relResultados").innerHTML = "";
      let intervalo;
      try { intervalo = datas(); } catch (e) { el("relErro").textContent = e.message; return; }
      el("relConsultar").disabled = true;
      el("relResultados").innerHTML = '<div class="abast-carregando">Consultando registros...</div>';
      const tipoConsulta = tipo;
      try {
        if (!window.fs || !window.firebaseDb) throw new Error("Firebase indisponível");
        const { collection, getDocs, query, where } = window.fs;
        const colecao = tipoConsulta === "diario" ? "apontamentos" : "apontamentos_viagens";
        const [snap, snapObras, snapMaquinas, snapCaminhoes] = await Promise.all([
          getDocs(query(collection(window.firebaseDb, colecao), where("data", ">=", intervalo.inicio), where("data", "<=", intervalo.fim))),
          getDocs(collection(window.firebaseDb, "obras")),
          getDocs(collection(window.firebaseDb, "maquinas")),
          getDocs(collection(window.firebaseDb, "caminhoes")),
        ]);
        if (!raiz.isConnected || token !== sequencia) return;
        obras = listar(snapObras);
        equipamentos = [[snapMaquinas, "maquinas", "Máquina"], [snapCaminhoes, "caminhoes", "Caminhão"]].flatMap(([s, colecao, tipo]) => listar(s).map((e) => ({ ...e, colecao, tipo, chave: `${colecao}:${e.id}`, identificacao: e.placa || e.identificador || "", nome: e.nome || "Sem nome" })));
        linhas = normalizar(listar(snap), tipoConsulta).filter((r) => dataValida(r.data) && r.data >= intervalo.inicio && r.data <= intervalo.fim);
        consulta = { ...intervalo, tipo: tipoConsulta };
        opcoes();
        mostrar();
      } catch (e) {
        console.error("Erro ao consultar relatórios:", e);
        if (!raiz.isConnected || token !== sequencia) return;
        el("relResultados").innerHTML = "";
        el("relErro").textContent = "Não foi possível consultar os registros. Verifique a conexão e as permissões e clique em Consultar / atualizar para tentar novamente.";
      } finally {
        if (raiz.isConnected && token === sequencia) el("relConsultar").disabled = false;
      }
    }

    function avisos(items) {
      const r = resumo(items, tipo);
      return `${r.semValor ? `<p class="rel-nota rel-aviso">${r.semValor} lançamento(s) sem ${tipo === "diario" ? "percentual válido" : "quantidade válida"}: exibidos nos detalhes, sem entrar no total.</p>` : ""}${r.zeros ? `<p class="rel-nota">${r.zeros} lançamento(s) com ${tipo === "diario" ? "0%" : "zero viagens"} registrado(s).</p>` : ""}${r.excesso ? `<p class="rel-nota rel-aviso">Há ${r.excesso} combinação(ões) de equipamento e data com mais de 100% somado. Revise os lançamentos; as diárias equivalentes abaixo somam os percentuais registrados.</p>` : ""}`;
    }

    function descricao() {
      const periodo = consulta.inicio === consulta.fim ? dataTexto(consulta.inicio) : `${dataTexto(consulta.inicio)} a ${dataTexto(consulta.fim)}`;
      return `${periodo} · ${el("relObra").selectedOptions[0].textContent} · ${el("relEquipamento").selectedOptions[0].textContent}`;
    }

    function detalheHTML(items) {
      const r = resumo(items, tipo);
      const materiais = new Map();
      if (tipo === "viagens") items.forEach((i) => materiais.set(i.material, (materiais.get(i.material) || 0) + (i.valor ?? 0)));
      return `<p class="rel-nota">${items.length} lançamento(s) · ${r.dias} dia(s) com registro · <strong>${numero(r.total)} ${tipo === "diario" ? "diárias equivalentes" : "viagens"}</strong></p>
        ${tipo === "diario" ? `<div class="rel-categorias">${categorias.map((c) => `<span><strong>${c}%:</strong> ${r.contagens[c]} lançamento(s)</span>`).join("")}</div>` : `<div class="rel-categorias">${[...materiais].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).map(([m, n]) => `<span>${esc(m)}: <strong>${numero(n)} viagens</strong></span>`).join("")}</div>`}
        ${avisos(items)}<div class="rel-tabela-wrap"><table><thead><tr><th>Data</th><th>Equipamento / placa</th><th>Obra</th>${tipo === "viagens" ? "<th>Material</th>" : ""}<th>${tipo === "diario" ? "Trabalhou" : "Viagens"}</th><th>Responsável</th><th>Observação</th></tr></thead><tbody>${[...items].sort((a, b) => a.data.localeCompare(b.data)).map((i) => `<tr><td>${dataTexto(i.data)}</td><td class="rel-nome">${esc(i.nome)}<span class="rel-sub">${esc(i.tipo)} · ${esc(i.identificacao || "Sem identificação")}</span></td><td>${esc(i.obraNome)}</td>${tipo === "viagens" ? `<td>${esc(i.material)}</td>` : ""}<td>${i.valor === null ? "Não informado / inválido" : numero(i.valor) + (tipo === "diario" ? "%" : "")}</td><td>${esc(i.responsavel)}</td><td class="rel-observacao">${esc(i.observacao || "—")}</td></tr>`).join("")}</tbody></table></div>`;
    }

    function imprimir(titulo, conteudo) {
      const frame = document.createElement("iframe");
      frame.title = "Impressão do relatório";
      frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;border:0";
      frame.srcdoc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#111}h1{font-size:19px}h2{font-size:16px}p{line-height:1.5}table{border-collapse:collapse;width:100%;font-size:11px}th,td{padding:7px;border-bottom:1px solid #ccc;text-align:left;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid}.rel-sub{display:block;font-size:10px}.rel-categorias{display:flex;gap:16px;flex-wrap:wrap;margin:12px 0}.rel-observacao{white-space:pre-wrap;overflow-wrap:anywhere;max-width:180px}button{display:none}.rel-aviso{font-weight:bold}</style></head><body><h1>Única Construtora — ${esc(titulo)}</h1><p>${esc(descricao())}</p>${conteudo}<p>${esc(observacaoBase)}</p>${tipo === "diario" ? "<p>Diárias equivalentes = soma dos percentuais ÷ 100. Exemplo: 25% + 75% = 1 diária equivalente. Não representa a quantidade de dias de calendário.</p>" : ""}</body></html>`;
      frame.onload = () => {
        frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
        frame.contentWindow.print();
      };
      document.body.appendChild(frame);
    }

    function mostrar() {
      if (!consulta) return;
      const items = linhas.filter((r) => (!el("relObra").value || r.obraId === el("relObra").value) && (!el("relEquipamento").value || r.chave === el("relEquipamento").value));
      const grupos = new Map();
      items.forEach((r) => { if (!grupos.has(r.chave)) grupos.set(r.chave, []); grupos.get(r.chave).push(r); });
      const ordenados = [...grupos].sort((a, b) => a[1][0].nome.localeCompare(b[1][0].nome, "pt-BR"));
      const r = resumo(items, tipo);
      const cabecalhoTabela = `<tr><th>Equipamento</th>${tipo === "diario" ? categorias.map((c) => `<th>${c}%<span class="rel-sub">Lançamentos</span></th>`).join("") + "<th>Diárias equiv.</th>" : "<th>Viagens</th>"}<th>Dias com registro</th></tr>`;
      const linhasTabela = ordenados.map(([chave, grupo]) => {
        const total = resumo(grupo, tipo), e = grupo[0];
        return `<tr data-grupo-rel="${esc(chave)}"><td class="rel-nome">${esc(e.nome)}<span class="rel-sub">${esc(e.tipo)} · ${esc(e.identificacao || "Sem identificação")}</span><button type="button" class="btn-secundario" data-individual-rel="${esc(chave)}" style="margin-top:8px">Ver individual</button></td>${tipo === "diario" ? categorias.map((c) => `<td>${total.contagens[c]}</td>`).join("") : ""}<td>${numero(total.total)}</td><td>${total.dias}</td></tr>`;
      }).join("");
      const tabela = `<div class="rel-tabela-wrap"><table><thead>${cabecalhoTabela}</thead><tbody>${linhasTabela}</tbody></table></div>`;
      el("relResultados").innerHTML = `<p class="rel-nota">${esc(descricao())}</p><div class="rel-metricas"><div class="rel-metrica"><span>${tipo === "diario" ? "Diárias equivalentes" : "Total de viagens"}</span><strong>${numero(r.total)}</strong></div><div class="rel-metrica"><span>Total de lançamentos</span><strong>${items.length}</strong></div><div class="rel-metrica"><span>${tipo === "diario" ? "Equipamentos com registro" : "Caminhões com registro"}</span><strong>${grupos.size}</strong></div></div>
        <p class="rel-nota">${observacaoBase}</p>${tipo === "diario" ? '<p class="rel-nota">Diárias equivalentes = soma dos percentuais ÷ 100. Exemplo: 25% + 75% = 1 diária equivalente. Cada coluna percentual conta lançamentos, e não dias de calendário.</p>' : ""}${avisos(items)}
        ${items.length ? `<section class="rel-painel"><h3>Resumo por ${tipo === "diario" ? "equipamento" : "caminhão"}</h3><div class="rel-acoes"><button type="button" class="btn-secundario" id="relImprimirResumo">Imprimir resumo / PDF</button></div>${tabela}</section><section class="rel-painel" id="relIndividual"></section>` : '<div class="cadastro-vazio">Nenhum registro encontrado com estes filtros.</div>'}`;
      if (!items.length) return;
      el("relImprimirResumo").onclick = () => imprimir(tipo === "diario" ? "Resumo de Apontamento Diário" : "Resumo de Viagens", `<p>Total: ${numero(r.total)} ${tipo === "diario" ? "diárias equivalentes" : "viagens"}</p>${avisos(items)}${tabela}`);
      selecao = el("relEquipamento").value;
      function individual() {
        const grupo = selecao ? grupos.get(selecao) : items, e = grupo[0];
        const titulo = `${tipo === "diario" ? "Apontamento Diário" : "Viagens"} — ${selecao ? `${e.nome} · ${e.identificacao || e.tipo}` : "Todos os equipamentos selecionados"}`;
        const html = detalheHTML(grupo);
        el("relIndividual").innerHTML = `<h3>${selecao ? `Relatório individual · ${esc(e.nome)}` : "Relatório detalhado · Todos os equipamentos"}</h3><span class="rel-sub">${selecao ? `${esc(e.tipo)} · ${esc(e.identificacao || "Sem identificação")}` : `${grupos.size} equipamento(s) · Todos os lançamentos dos filtros acima`}</span><div class="rel-acoes"><button type="button" class="btn-primario" id="relImprimirIndividual">${selecao ? "Imprimir individual / PDF" : "Imprimir todos / PDF"}</button>${selecao ? '<button type="button" class="btn-secundario" id="relVerTodos">Ver todos os equipamentos</button>' : ""}</div>${html}`;
        el("relImprimirIndividual").onclick = () => imprimir(titulo, html);
        if (el("relVerTodos")) el("relVerTodos").onclick = () => { el("relEquipamento").value = ""; mostrar(); };
        raiz.querySelectorAll("[data-grupo-rel]").forEach((tr) => tr.classList.toggle("rel-selecionado", tr.dataset.grupoRel === selecao));
        raiz.querySelectorAll("[data-individual-rel]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.individualRel === selecao)));
      }
      raiz.querySelectorAll("[data-individual-rel]").forEach((b) => b.onclick = () => { el("relEquipamento").value = b.dataset.individualRel; mostrar(); el("relIndividual").scrollIntoView({ block: "start", behavior: "auto" }); });
      individual();
    }

    el("relForm").onsubmit = (e) => { e.preventDefault(); carregar(); };
    ["relInicio", "relFim"].forEach((id) => el(id).onchange = invalidar);
    ["relObra", "relEquipamento"].forEach((id) => el(id).onchange = () => { selecao = ""; mostrar(); });
    [["relDiario", "diario"], ["relViagens", "viagens"]].forEach(([id, modo]) => el(id).onclick = () => {
      if (modo === tipo) return;
      tipo = modo;
      selecao = "";
      linhas = [];
      ["relDiario", "relViagens"].forEach((botao) => { el(botao).className = botao === id ? "btn-primario" : "btn-secundario"; el(botao).setAttribute("aria-pressed", String(botao === id)); });
      opcoes();
      carregar();
    });
    await carregar();
  };
})();
