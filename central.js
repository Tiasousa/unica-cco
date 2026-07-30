/* =========================================================
   CENTRAL OPERACIONAL
   ---------------------------------------------------------
   Os dados abaixo (OBRAS_EXEMPLO, PRODUCAO_SEMANA etc.) são
   apenas ILUSTRATIVOS, para visualizar o layout antes de o
   Firestore estar conectado. Quando o banco estiver pronto,
   a função renderCentral() passa a ler de lá em vez destas
   constantes — o HTML gerado é o mesmo.
   ========================================================= */

const INDICADORES_EXEMPLO = {
  obrasAtivas: 4,
  maquinasTrabalhando: 9,
  caminhoesTrabalhando: 6,
  emManutencao: 2,
  producaoHoje: "1.240 m³",
  alertas: 3,
};

const PRODUCAO_SEMANA = [
  { dia: "Seg", valor: 820 },
  { dia: "Ter", valor: 960 },
  { dia: "Qua", valor: 740 },
  { dia: "Qui", valor: 1100 },
  { dia: "Sex", valor: 1240 },
  { dia: "Sáb", valor: 430 },
  { dia: "Dom", valor: 0 },
];

const ULTIMOS_APONTAMENTOS = [
  { obra: "Loteamento Vale Verde", resp: "Wesley Teixeira", quando: "Hoje, 17:40" },
  { obra: "Terraplenagem Setor Industrial", resp: "Wesley Teixeira", quando: "Hoje, 16:55" },
  { obra: "Duplicação Av. Perimetral", resp: "Wellington", quando: "Ontem, 18:10" },
  { obra: "Loteamento Vale Verde", resp: "Wesley Teixeira", quando: "Ontem, 17:22" },
];

const OBRAS_ANDAMENTO = [
  { nome: "Loteamento Vale Verde", cidade: "Caldas Novas - GO", status: "ativa" },
  { nome: "Terraplenagem Setor Industrial", cidade: "Goiânia - GO", status: "ativa" },
  { nome: "Duplicação Av. Perimetral", cidade: "Caldas Novas - GO", status: "atencao" },
  { nome: "Loteamento Bosque Real", cidade: "Rio Quente - GO", status: "parada" },
];

const RESUMO_MANUTENCAO = [
  { equipamento: "Escavadeira CAT 320 (EQ-04)", status: "Em manutenção", secundario: "Previsão: 2 dias" },
  { equipamento: "Caminhão Basculante (CB-11)", status: "Manutenção preventiva", secundario: "Agendada p/ sexta" },
];

function iconeSvg(caminho, viewBox = "0 0 24 24") {
  return `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${caminho}</svg>`;
}

function renderCentral() {
  const el = document.getElementById("areaPagina");
  const i = INDICADORES_EXEMPLO;
  const maxProd = Math.max(...PRODUCAO_SEMANA.map(d => d.valor), 1);

  el.innerHTML = `
    <div class="grid-indicadores">

      <div class="card-indicador">
        <div class="topo">
          <div class="icone-indicador">${iconeSvg('<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>')}</div>
        </div>
        <div class="valor">${i.obrasAtivas}</div>
        <div class="rotulo">Obras ativas</div>
      </div>

      <div class="card-indicador">
        <div class="topo">
          <div class="icone-indicador sucesso">${iconeSvg('<rect x="3" y="8" width="13" height="10" rx="1.5"/><path d="M16 11h3l2 2v5h-5z"/><circle cx="7.5" cy="19.5" r="1.5"/><circle cx="18" cy="19.5" r="1.5"/>')}</div>
        </div>
        <div class="valor">${i.maquinasTrabalhando}</div>
        <div class="rotulo">Máquinas trabalhando</div>
      </div>

      <div class="card-indicador">
        <div class="topo">
          <div class="icone-indicador sucesso">${iconeSvg('<rect x="1" y="7" width="14" height="10" rx="1.5"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>')}</div>
        </div>
        <div class="valor">${i.caminhoesTrabalhando}</div>
        <div class="rotulo">Caminhões trabalhando</div>
      </div>

      <div class="card-indicador">
        <div class="topo">
          <div class="icone-indicador alerta">${iconeSvg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>')}</div>
        </div>
        <div class="valor">${i.emManutencao}</div>
        <div class="rotulo">Em manutenção</div>
      </div>

      <div class="card-indicador">
        <div class="topo">
          <div class="icone-indicador">${iconeSvg('<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.1-3-3L4 15.6"/>')}</div>
        </div>
        <div class="valor">${i.producaoHoje}</div>
        <div class="rotulo">Produção do dia</div>
      </div>

      <div class="card-indicador">
        <div class="topo">
          <div class="icone-indicador alerta">${iconeSvg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>')}</div>
        </div>
        <div class="valor">${i.alertas}</div>
        <div class="rotulo">Alertas importantes</div>
      </div>

    </div>

    <div class="grid-paineis">

      <div class="painel">
        <div class="painel-titulo">
          <h2>Produção da semana</h2>
          <a href="#" data-pagina="relatorios">Ver relatórios</a>
        </div>
        <div class="grafico-barras">
          ${PRODUCAO_SEMANA.map(d => `
            <div class="barra-col">
              <div class="barra" style="height:${(d.valor / maxProd * 100) || 2}%"></div>
              <span>${d.dia}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="painel">
        <div class="painel-titulo">
          <h2>Últimos apontamentos</h2>
          <a href="#" data-pagina="apontamento">Ver todos</a>
        </div>
        <div class="lista-simples">
          ${ULTIMOS_APONTAMENTOS.map(a => `
            <div class="item-lista">
              <span class="ponto"></span>
              <span class="principal">${a.obra}</span>
              <span class="secundario">${a.quando}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="painel">
        <div class="painel-titulo">
          <h2>Obras em andamento</h2>
          <a href="#" data-pagina="obras">Ver todas</a>
        </div>
        <div class="lista-simples">
          ${OBRAS_ANDAMENTO.map(o => `
            <div class="item-lista">
              <span class="principal">${o.nome}<br><span class="secundario">${o.cidade}</span></span>
              <span class="badge ${o.status}">${o.status === 'ativa' ? 'Ativa' : o.status === 'atencao' ? 'Atenção' : 'Parada'}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="painel">
        <div class="painel-titulo">
          <h2>Resumo de manutenção</h2>
          <a href="#" data-pagina="manutencao">Ver todas</a>
        </div>
        <div class="lista-simples">
          ${RESUMO_MANUTENCAO.map(m => `
            <div class="item-lista">
              <span class="ponto" style="background:var(--alerta)"></span>
              <span class="principal">${m.equipamento}<br><span class="secundario">${m.status} · ${m.secundario}</span></span>
            </div>
          `).join("")}
        </div>
      </div>

    </div>
  `;
}
