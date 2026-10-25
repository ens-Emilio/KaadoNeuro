# KaadoNeuro — Design

## Identidade

Atelier Japonês: papel washi, linho cru e tinta Sumi, com um sinete de terracota. A interface é uma mesa de estudo editorial, silenciosa como uma folha aberta e precisa como uma ficha catalográfica.

- **Personalidade:** quieto, preciso, encorajador sem ser condescendente.
- **Público:** estudantes autodidatas que valorizam foco e rotina.

## Dials

`Dial: ENERGY 1 / RHYTHM 2 / MOTION 1`

- **ENERGY 1** — a interface cumprimenta baixo: sem hero animado, sem contadores que sobem, sem elementos pulsando.
- **RHYTHM 2** — seções previsíveis com pequenas quebras: ficha principal assimétrica, índices tipográficos e fichas pequenas.
- **MOTION 1** — apenas hover, transições curtas de entrada/saída (entrada ~200ms, saída ~140ms) e o flip do cartão de revisão. Nenhum loop infinito.

## Paleta

| Papel | Claro | Escuro | Razão |
|---|---|---|---|
| Fundo | `#F2EFE9` | `#121316` | Linho cru de dia, pedra ardósia à noite |
| Superfície / cartão | `#FBF9F5` | `#1A1C20` | Papel washi sobre a mesa; carvão suave no escuro |
| Superfície suave | `#E6E1D8` | `#24272D` | Pedra clara / grafite, para etiquetas e fichas secundárias |
| Texto principal | `#18181B` | `#EAE9E4` | Tinta Sumi; papel claro no escuro |
| Texto secundário | `#64635E` | `#9899A0` | ≥ 5:1 em ambos os temas |
| Borda decorativa | `#DBD5C9` | `#2E3138` | Contorno de folha, sem caráter interativo |
| Borda semântica | `#9E988E` | `#525661` | Divisores que carregam informação |
| Borda de campo / forte | `#7D786F` | `#737885` | Limite de controle, com 3:1 mínimo |
| Terracota (identidade) | `#9E4733` | fundo `#9E4733`; texto `#E29583` | Sinete Hanko sobre papel. No escuro, a terracota profunda preenche botões e a argila clara carrega texto e ícones |
| Hover terracota | `#823827` | `#B5543E` | Mudança de estado com 4.88:1 ou mais contra branco |
| Avaliações | `#A62639` `#99621E` `#2D6150` `#3B5978` | `#E87A8A` `#E5AF67` `#82C4AD` `#8FB1D6` | Rubi, ocre, jade e índigo: leitura clara sem depender apenas da matiz |

Máximo de cores ativas por tela: linho, Sumi e terracota. As quatro cores de avaliação aparecem apenas na revisão e nas estatísticas.

## Tipografia

- **Instrument Serif** — títulos e números de destaque. Razão: tom editorial de caderno de estudos.
- **Inter** — corpo e UI. Razão: legibilidade em tamanhos pequenos.
- **JetBrains Mono** — apenas metadados: datas, contadores pequenos, atalhos de teclado. Nunca em títulos grandes.

## Motivo de identidade

A **borda superior de 6px** no cartão de revisão funciona como a aba de uma ficha física. É o único ornamento estrutural, repetido somente onde um flashcard aparece.

## Regras de decisão (R-31)

- **Por que terracota?** É o sinete editorial sobre o papel, a única cor de identidade.
- **Por que raios de 6–8px?** Fichas e cadernos têm cantos discretos; pílulas pertencem a apps de tecnologia.
- **Por que sombras quase imperceptíveis?** Papel não flutua; a sombra só marca a ficha sobre a mesa e o dialog acima do conteúdo.
- **Por que blur no header?** É o único elemento com vidro, separando navegação do conteúdo em rolagem.
- **Por que dark mode?** Estudo noturno é uso real; ambos os temas precisam ter contraste e hierarquia equivalentes.