/* =========================================================
   NAVEGAÇÃO — menu lateral, submenus, roteamento de módulos
   ========================================================= */

const TITULOS_PAGINA = {
  central: "Central Operacional",
  obras: "Obras",
  apontamento: "Apontamento Diário",
  maquinas: "Frota · Máquinas",
  caminhoes: "Frota · Caminhões",
  combustivel: "Frota · Combustível",
  manutencao: "Frota · Manutenção",
  materiais: "Materiais",
  relatorios: "Relatórios",
  "cad-servicos": "Cadastros · Serviços",
  "cad-tipos-equip": "Cadastros · Tipos de equipamento",
  "cad-materiais": "Cadastros · Materiais",
  "cad-combustiveis": "Cadastros · Combustíveis",
  "cad-unidades": "Cadastros · Unidades de medida",
  "cad-funcionarios": "Cadastros · Funcionários",
  "cad-funcoes": "Cadastros · Funções",
  "cad-pecas": "Cadastros · Peças",
  "cad-fornecedores": "Cadastros · Fornecedores",
  "cad-tipos-manutencao": "Cadastros · Tipos de manutenção",
  "cad-placas": "Cadastros · Placas",
  "cad-motivos": "Cadastros · Motivos de paralisação",
  configuracoes: "Configurações",
};

// Etapa do plano de desenvolvimento em que cada módulo entra
const ETAPA_MODULO = {
  obras: "Etapa 4 — Obras",
  apontamento: "Etapa 6 — Apontamento Diário",
  maquinas: "Etapa 5 — Frota",
  caminhoes: "Etapa 5 — Frota",
  combustivel: "Etapa 5 — Frota",
  manutencao: "Etapa 5 — Frota",
  materiais: "Etapa 3 — Cadastros Gerais",
  relatorios: "Última etapa — depende dos demais módulos",
  configuracoes: "Etapa 2 — Login e acessos",
};

function iconeConstrucao() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`;
}

function renderPlaceholder(pagina) {
  const el = document.getElementById("areaPagina");
  const etapa = ETAPA_MODULO[pagina] || "Próxima etapa";
  el.innerHTML = `
    <div class="em-construcao">
      ${iconeConstrucao()}
      <h3>Módulo em desenvolvimento</h3>
      <p>Esta tela ainda não foi construída. Ela faz parte do plano de etapas combinado e será desenvolvida na sequência, com cadastro completo, listagem, histórico e integração com o Firestore.</p>
      <div class="etapa">${etapa}</div>
    </div>
  `;
}

function irParaPagina(pagina) {
  document.getElementById("tituloPagina").textContent = TITULOS_PAGINA[pagina] || "Página";

  if (pagina === "central") {
    renderCentral();
  } else if (pagina.startsWith("cad-")) {
    renderCadastro(pagina);
  } else {
    renderPlaceholder(pagina);
  }

  document.querySelectorAll(".nav-item, .nav-sublink").forEach(n => n.classList.remove("ativo"));
  const alvo = document.querySelector(`[data-pagina="${pagina}"]`);
  if (alvo) {
    alvo.classList.add("ativo");
    const grupo = alvo.closest(".nav-grupo");
    if (grupo) {
      grupo.classList.add("aberto");
      const itemPai = grupo.querySelector(".nav-item");
      if (itemPai && alvo.classList.contains("nav-sublink")) {
        itemPai.classList.add("ativo");
      }
    }
  }

  document.getElementById("sidebar").classList.remove("aberta-mobile");
  document.getElementById("overlayMobile").classList.remove("ativo");

  window.scrollTo({ top: 0 });
}

window.addEventListener("usuarioPronto", (e) => {
  const usuario = e.detail;
  const nome = usuario.nome || "Usuário";
  document.getElementById("usuarioNome").textContent = nome;
  document.getElementById("usuarioCargo").textContent = usuario.cargo || "";
  const iniciais = nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  document.getElementById("avatarIniciais").textContent = iniciais || "--";
  renderCentral();
});

document.addEventListener("DOMContentLoaded", () => {
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
  document.getElementById("dataHoje").textContent = dataHoje;

  document.querySelectorAll(".nav-item[data-pagina], .nav-sublink[data-pagina]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      irParaPagina(item.dataset.pagina);
    });
  });

  document.querySelectorAll("a[data-pagina]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      irParaPagina(link.dataset.pagina);
    });
  });

  document.querySelectorAll("[data-toggle]").forEach(toggle => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const grupo = toggle.closest(".nav-grupo");
      const estavaAberto = grupo.classList.contains("aberto");
      document.querySelectorAll(".nav-grupo").forEach(g => g.classList.remove("aberto"));
      if (!estavaAberto) grupo.classList.add("aberto");
    });
  });

  document.getElementById("btnRecolher").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("recolhida");
  });

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlayMobile");
  document.getElementById("btnMenuMobile").addEventListener("click", () => {
    sidebar.classList.add("aberta-mobile");
    overlay.classList.add("ativo");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("aberta-mobile");
    overlay.classList.remove("ativo");
  });
});
