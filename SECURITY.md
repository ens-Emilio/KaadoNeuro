# Segurança

## Modelo

O KaadoNeuro é uma aplicação estática/local-first. Não há servidor da aplicação, banco remoto, contas ou backend de IA.

- baralhos, cartões, progresso e configuração de IA ficam no armazenamento do navegador;
- a chave de IA é usada diretamente pelo navegador para chamar o provider escolhido;
- não envie uma chave de IA em um site hospedado por terceiros sem confiar no operador e no host.

## Reportar vulnerabilidades

Não abra uma issue pública com detalhes exploráveis. Envie ao mantenedor um relatório privado com versão/commit, passos de reprodução, impacto e mitigação sugerida.

## Recomendações

- hospede por HTTPS;
- mantenha o navegador atualizado;
- faça backup dos dados;
- revogue qualquer chave de IA que possa ter sido exposta;
- limpar os dados do site remove todos os dados locais.
