# Próximos passos

## O que já está pronto nesta entrega

- Identidade visual aplicada (preto, amarelo, branco, cinza — cores extraídas
  do brandbook oficial da Única, logo real embutido).
- Estrutura de projeto (pastas `css/`, `js/`, `assets/`, `docs/`).
- Tela de login funcional (autenticação temporária local — ver aviso abaixo).
- Menu lateral completo com os 8 módulos e todos os submenus, recolhível,
  responsivo para celular (menu vira gaveta lateral).
- Central Operacional com os indicadores, gráfico de produção, últimos
  apontamentos, obras em andamento e resumo de manutenção — **com dados de
  exemplo**, claramente isolados em `js/central.js` para serem trocados por
  dados reais depois.
- Modelo de dados completo do Firestore documentado (`docs/modelo-dados.md`),
  cobrindo Obras, Frota, Apontamento Diário (mestre-detalhe) e as 15 entidades
  de Cadastros Gerais.
- Módulos ainda não construídos (Obras, Frota, Apontamento, Cadastros,
  Relatórios, Configurações) aparecem como tela "em desenvolvimento",
  indicando em qual etapa do plano cada um entra — para você já poder navegar
  a estrutura inteira mesmo antes de tudo estar pronto.

## Login agora é real (Firebase Authentication)

`js/auth.js` já está conectado ao projeto Firebase `unica-cco`. Login,
logout e sessão funcionam de verdade — nada de senha guardada no código.
Na primeira vez que cada admin loga, o sistema cria automaticamente o
perfil dele (nome, cargo) na coleção `usuarios` do Firestore.

## Único passo manual que falta: criar as 4 contas de acesso

Eu não crio contas de usuário por você — isso precisa ser feito uma vez,
direto no Firebase Console (é uma ação administrativa, não uma tela do
nosso sistema):

1. No Firebase Console, vá em **Authentication → Users → Add user**.
2. Cadastre os 4 e-mails, cada um com uma senha (defina a senha real que
   cada pessoa vai usar):
   - tiago@unicaconstrutora.com
   - wesley@unicaconstrutora.com
   - fernanda@unicaconstrutora.com
   - wellington@unicaconstrutora.com

   (Se os e-mails reais de vocês forem diferentes desses, me avisa — é só
   trocar uma lista no `js/auth.js`, é rápido.)
3. Pronto — assim que a conta existir no Authentication, a pessoa já
   consegue logar no sistema com aquele e-mail e senha.

## Como visualizar esta entrega agora

**Atenção:** como o sistema agora usa Firebase (módulos JavaScript reais),
não dá mais para simplesmente abrir `index.html` clicando duas vezes no
arquivo — o navegador bloqueia isso por segurança (é uma regra do próprio
navegador, não uma falha do sistema). Duas formas de ver funcionando:

- **Mais simples:** publicar a pasta no GitHub Pages, como você já faz nos
  outros projetos. Depois é só acessar o link normalmente.
- **Testar no seu computador antes de publicar:** abra um terminal dentro
  da pasta do projeto e rode `python3 -m http.server 8000`, depois acesse
  `http://localhost:8000` no navegador.

## Storage (fotos) ainda pendente

Você optou por não ativar o Storage agora por causa da exigência do plano
pago (Blaze) do Google. Isso não trava nada do que já está pronto — só
significa que, por enquanto, os campos de foto (em Obras e Apontamento
Diário) vão ficar sem essa função até você decidir sobre o cartão.
