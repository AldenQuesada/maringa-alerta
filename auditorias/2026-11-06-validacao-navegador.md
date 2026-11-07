# Verificação da versão integrada no navegador

Base: commit `89d499d`, cópia `/tmp/maringa-integracao-isolada`. Execução em Google Chrome headless, com viewport de desktop (1440 × 900) e celular (390 × 900). Produção e pasta do outro chat não foram alteradas.

## Isolamento

Servidor HTTP vinculado a `127.0.0.1:8783`. Contextos de navegador novos, sem sessão real. APIs substituídas por fixtures em memória, com bloqueio explícito de requisições para Supabase remoto e de service workers. Os testes executam os arquivos reais da interface, Leaflet, controladores e adaptador de repositório integrado. Nenhuma fixture foi enviada ao Supabase. As configurações da aplicação não foram trocadas por configurações de teste.

Essa verificação cobre o comportamento da interface diante dos contratos do servidor. Não é um teste de autenticação real ou de RLS em produção. A validação SQL da integração anterior permanece documentada no relatório da terceira etapa; nenhuma migração SQL foi alterada nesta rodada.

## Correções feitas

1. A barra de conexão sobrepunha o botão Salvar no formulário móvel e impedia o clique. A ordem de sobreposição foi corrigida; a gravação móvel passou no reteste.
2. O painel de ocorrência fechado ampliava horizontalmente o Mapa de Evento no celular. Seu contêiner agora recorta o painel fora da área visível.
3. O e-mail conectado extrapolava o cabeçalho estreito. Agora tem largura limitada, reticências e título com o endereço completo.
4. Textos de demonstração foram corrigidos no mapa conectado, na nota de presença e no check-in. A nota de precisão GPS usa o parâmetro operacional recebido.
5. Botões Editar/Excluir não quebram mais no meio da palavra; a coluna de nomes conserva largura legível com rolagem interna da tabela.
6. O botão legado de registro de ocorrências recebeu uma explicação acessível para seu estado bloqueado no modo conectado.

## Resultados

Onze cenários de navegador aprovados:
- Criar, editar, recarregar e excluir cadastro; falha de gravação mantém o formulário e não adiciona registro.
- Criar cadastro no celular, com o botão Salvar acessível.
- Perfil leitor sem botões de mutação; tentativa programática de gravar recusada sem enviar mutação.
- Acesso direto a rota sem permissão mostra “Acesso restrito”.
- Visitante sem sessão permanece no login e sem entrada de demonstração.
- Mapas de Evento, Colaboradores e Ajuda em desktop e celular: marcadores e território visíveis.
- Nos mapas de Colaboradores e Ajuda: ocultar/restaurar unidades altera os marcadores; busca, camada, zona e Localizar funcionam.
- Nenhuma exceção JavaScript nem tentativa de conexão ao Supabase remoto nos cenários aprovados.

Os 254 testes JavaScript existentes passaram novamente, assim como build e verificação de correspondência das fontes. Depois do ajuste final da largura da coluna, o cenário móvel foi repetido e aprovado separadamente. Capturas e resultados estão em `auditorias/browser-2026-11-06/`. O roteiro reproduzível está em `tests/browser/README.md`.

## Limitação funcional confirmada

O cadastro de ocorrências diretamente no Mapa de Evento ainda depende do fluxo local legado, com armazenamento no navegador. Ele permanece bloqueado no modo conectado, mesmo para um editor. Não foi habilitado nem disfarçado como operação integrada. Integrar esse fluxo ao banco, seus vínculos e suas permissões é trabalho adicional; portanto, a interface não pode ser considerada integralmente pronta para todas as funções operacionais.

A verificação em viewport móvel não substitui teste em aparelho físico, GPS real ou navegador autenticado contra uma homologação Supabase. Nenhuma publicação foi realizada.
