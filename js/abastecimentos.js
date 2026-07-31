/* =========================================================
   ABASTECIMENTOS
   Única Construtora — Centro Operacional
   ========================================================= */


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

function renderAbastecimentos() {
  const area = document.getElementById("areaPagina");

  if (!area) {
    console.error(
      'Não foi possível encontrar o elemento "#areaPagina".'
    );

    return;
  }

  area.innerHTML = `
    <section class="painel-cadastro modulo-abastecimentos">

      <div class="cadastro-topo">

        <div>
          <h2>Abastecimentos</h2>

          <p>
            O módulo de abastecimentos foi carregado corretamente.
          </p>
        </div>

      </div>

      <div class="cadastro-vazio">

        <strong>
          Módulo conectado com sucesso
        </strong>

        <br><br>

        Agora podemos iniciar a tela de seleção da obra,
        máquinas e caminhões.

      </div>

    </section>
  `;
}


/* =========================================================
   DISPONIBILIZAÇÃO GLOBAL PARA O NAV.JS
   ========================================================= */

window.renderAbastecimentos = renderAbastecimentos;


/* =========================================================
   CONFIRMAÇÃO DE CARREGAMENTO
   ========================================================= */

console.log(
  "Módulo abastecimentos.js carregado com sucesso."
);
