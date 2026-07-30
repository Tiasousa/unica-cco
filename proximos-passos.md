# Modelo de Dados — Firestore
## Única Construtora · Centro de Controle Operacional

Este documento descreve a estrutura de banco de dados planejada. Nada disto está
provisionado ainda — é o projeto do banco, pronto para ser criado assim que o
projeto Firebase existir (veja `docs/proximos-passos.md`).

Convenção: todo registro "operacional" (obra, máquina, caminhão, funcionário etc.)
tem os campos `ativo` (boolean) e `historico` (subcoleção) — isso implementa a regra
de "nunca excluir, sempre desativar" definida na proposta.

---

## Coleções principais

### `usuarios`
```
usuarios/{uid}
  nome: string
  email: string
  cargo: string            // "Administrador" | "Engenheiro de Obra" | ... (papéis futuros)
  papel: string             // "admin" por enquanto — campo já existe para expansão futura
  ativo: boolean
  criadoEm: timestamp
```

### `obras`
```
obras/{obraId}
  nome: string
  cliente: string
  cidade: string
  endereco: string
  responsavelId: string     // referência a usuarios/{uid}
  dataInicio: date
  previsaoTermino: date
  status: string            // "ativa" | "atencao" | "parada" | "concluida"
  fotos: array<string>      // URLs no Firebase Storage
  observacoes: string
  ativo: boolean
  criadoEm: timestamp
  atualizadoEm: timestamp

  historico/{registroId}
    campo: string
    valorAnterior: string
    valorNovo: string
    usuarioId: string
    quando: timestamp
```

### `maquinas` e `caminhoes`
(coleções separadas, como pedido)
```
maquinas/{maquinaId}
  nome: string              // ex: "Escavadeira CAT 320"
  identificador: string      // codinome interno, ex: "EQ-04"
  tipoEquipamentoId: string  // referência a cadastros_tipos_equipamento
  foto: string
  status: string             // "disponivel" | "em_uso" | "manutencao"
  horimetroAtual: number
  ativo: boolean
  criadoEm: timestamp

caminhoes/{caminhaoId}
  nome: string
  placaId: string            // referência a cadastros_placas
  tipoEquipamentoId: string  // ex: basculante, pipa, prancha
  foto: string
  status: string
  kmAtual: number
  ativo: boolean
  criadoEm: timestamp
```

### `apontamentos` (mestre-detalhe — núcleo do sistema)
```
apontamentos/{apontamentoId}
  data: date
  obraId: string
  criadoPorId: string
  status: string             // "aberto" | "fechado"
  criadoEm: timestamp
  atualizadoEm: timestamp

  itens/{itemId}             // subcoleção — uma linha por equipamento usado no dia
    tipoItem: string          // "maquina" | "caminhao"
    equipamentoId: string     // referência a maquinas/{id} ou caminhoes/{id}
    operadorId: string        // referência a cadastros_funcionarios
    horaInicial: string
    horaFinal: string
    horimetroOuKm: number
    servicoId: string         // referência a cadastros_servicos
    quantidadeProduzida: number
    unidadeId: string         // referência a cadastros_unidades
    abastecimento: {
      combustivelId: string
      litros: number
    }
    ocorrencia: string
    motivoParalisacaoId: string   // opcional, referência a cadastros_motivos
    fotos: array<string>
```

> Por que subcoleção `itens` e não um array dentro do documento: um apontamento
> pode ter muitos equipamentos por dia, cada um com fotos e dados próprios.
> Array grande dentro de um único documento Firestore tem limite de tamanho
> (1 MiB por documento) e complica consulta/edição individual. Subcoleção
> resolve os dois problemas.

---

## Cadastros Gerais (15 coleções, mesmo padrão)

Todas seguem exatamente esta forma — é o que permite construir **um único
motor de CRUD reutilizável** em vez de 15 telas diferentes:

```
cadastros_{entidade}/{id}
  nome: string               // ou campos específicos, ver abaixo
  ativo: boolean
  criadoEm: timestamp
  atualizadoEm: timestamp
  historico/{registroId}
    campo, valorAnterior, valorNovo, usuarioId, quando
```

Lista das 15 coleções e campos específicos além do padrão acima:

| Coleção                          | Campos específicos                         |
|----------------------------------|---------------------------------------------|
| `cadastros_servicos`             | nome, unidadePadraoId                       |
| `cadastros_tipos_equipamento`    | nome, categoria ("maquina"/"caminhao"), icone |
| `cadastros_materiais`            | nome, unidadePadraoId                       |
| `cadastros_combustiveis`         | nome (diesel S10, arla 32...)               |
| `cadastros_unidades`             | nome, sigla (m³, m², t, L, h, viagem, un)    |
| `cadastros_funcionarios`         | nome, funcaoId, telefone                     |
| `cadastros_funcoes`              | nome (operador, motorista, encarregado...)   |
| `cadastros_pecas`                | nome, fornecedorId, estoqueMinimo            |
| `cadastros_fornecedores`         | nome, telefone, cidade                       |
| `cadastros_tipos_manutencao`     | nome (preventiva, corretiva)                 |
| `cadastros_placas`               | placa, veiculoId                             |
| `cadastros_motivos`              | nome (chuva, quebra, falta de material...)   |

Serviços e unidades iniciais (os exemplos que você deu — Terraplenagem, Corte,
Aterro, Compactação... / Metro linear, m², m³, tonelada...) entram como
registros já cadastrados no primeiro carregamento do banco, não como listas
fixas no código.

---

## Regra de papéis (preparada, não ativa na Fase 1)

Hoje: Tiago, Wesley, Fernanda e Wellington têm `papel: "admin"` e acesso total.
O campo `papel` já existe em `usuarios` para permitir, no futuro, criar um
papel `"encarregado"` com acesso restrito às obras dele — **sem precisar
alterar a estrutura do banco**, só a lógica de leitura.

---

## O que isto NÃO inclui (por decisão, conforme escopo combinado)

Financeiro completo, controle de estoque avançado, GPS/rastreamento, e
qualquer automação de IA. Podem ser adicionados depois como novas coleções,
sem impacto nas existentes.
