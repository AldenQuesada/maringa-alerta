# Correções de segurança — preparação isolada

## Escopo e conclusão

Preparado na branch `codex/seguranca-banco`, derivada de `2c895659025ea7492328270ae63957c65b8b3655`, em `/tmp/maringa-seguranca-banco`. Nenhuma migração aplicada ao Supabase, nenhuma publicação, nenhum merge e nenhuma alteração na cópia usada pelo outro chat. A pedido do usuário, o outro chat continua trabalhando.

**O pacote passou nos testes locais, mas não constitui liberação de produção nem certificação enterprise.** As mudanças concorrentes precisam ser conciliadas e verificadas juntas antes da instalação.

## Correções preparadas

- Escrita de prefeituras e cadastros pela RPC transacional, com versão esperada. Retiradas as permissões de INSERT, UPDATE e DELETE diretos do papel autenticado. A função interna executa como papel sem login, sem superusuário e sem bypass de RLS; a interface pública permanece SECURITY INVOKER.
- Matriz de permissões no banco por papel e coleção. Administrador municipal restrito ao município autorizado; operador escreve apenas nas coleções territoriais/estruturas permitidas; leitor só lê essas coleções. Demais coleções ficam fechadas a esses dois papéis por padrão. Administrador da plataforma continua distinto do administrador municipal.
- Configuração de formulários, catálogos e grupos carregada do banco antes dos controladores. Falha ao obter configuração impede o início da interface conectada.
- Validação no servidor de campos obrigatórios, valores enumerados, coordenadas e marcadores explícitos de demonstração. Não se trata de uma comprovação automática da veracidade de qualquer texto inserido.
- Histórico privado com autor, transação, operação e valores anteriores/posteriores; aplicação sem acesso direto de alteração ou exclusão. Isso não impede intervenção de um superusuário do banco e não equivale a armazenamento inviolável externo.
- Relações por IDs com chave estrangeira no mesmo município. Referências inexistentes, exclusão de destino utilizado, autorreferência e ciclos de eventos são rejeitados. Cobertura das relações especificadas na configuração `relacoes`.
- Mapas conectados leem polígonos do repositório municipal, sem buscar arquivos territoriais locais como alternativa.
- Removido o acesso ao modo demonstrativo pelo login/URL. Artefato de publicação exclui dados JSON/GeoJSON locais, fontes, SQL e simulador de atendimento. O atendimento recebe uma página de indisponibilidade até possuir integração real.
- Rascunhos locais da ficha do ponto desabilitados; interface informa que a mensagem não é salva. Histórico local do evento não é persistido no modo conectado.

## Verificação executada

| Verificação | Resultado |
|---|---|
| Testes JavaScript | 199 aprovados, zero falhas |
| Construção canônica (`npm run check`) | Aprovada |
| Instalação de todas as migrações em PostgreSQL 16 vazio | Aprovada |
| Suíte SQL existente de permissões | Aprovada, rollback dos dados de teste |
| Nova suíte de segurança do servidor | Aprovada, rollback dos dados de teste |
| Tabelas próprias na instalação isolada | 9, todas com RLS habilitada |
| Papel interno | Sem LOGIN, SUPERUSER ou BYPASSRLS |
| Sintaxe do boot e ficha do mapa | Aprovada |
| Artefato de publicação | Gerado localmente, não publicado |

Os testes SQL cobrem bloqueio de escrita direta, isolamento municipal, versões concorrentes, validação obrigatória, demonstração marcada, enum inválido, referência inexistente, ciclo, destino com dependentes, rollback integral de lote inválido, proteção do histórico e leitura de coleção restrita. As fixtures sintéticas existem exclusivamente nos testes locais descartáveis; não foram enviadas ao Supabase.

Tabelas próprias locais: `ma_prefeituras`, `ma_vinculos`, `ma_cadastros`, `ma_configuracao`, `ma_admins`, `ma_convites_iniciais`, `ma_permissoes`, `ma_historico`, `ma_referencias`. Esse número não representa o estado atual da produção nem inclui tabelas internas do Supabase.

## Limitações e integração necessária

1. Conciliar alterações de boot, repositório e administração com o outro chat. Não copiar este pacote por cima da cópia ativa. As novas migrações do outro chat não fazem parte da instalação local testada aqui.
2. Conciliar o histórico privado de valores completos com `ma_auditoria` do outro chat. Definir retenção, acesso administrativo e tratamento de dados pessoais antes de ativar os módulos que os armazenam.
3. Verificar as permissões do papel `ma_escritor` diante dos novos gatilhos do outro chat e a possibilidade de criação/atribuição desse papel no ambiente Supabase hospedado.
4. A migração de relações interrompe a instalação se encontrar relações por ID anteriores. Fazer diagnóstico e backfill explícito desses registros; não apagar relações para contornar a proteção.
5. Verificar compatibilidade dos cadastros reais com os contratos e confirmar contagens antes/depois. A carga dos 113 bairros, zonas e estruturas não foi executada nem conferida novamente no banco real nesta etapa isolada.
6. A interface ainda precisa consumir capacidades por ação para ocultar todos os botões indisponíveis. A decisão de segurança já fica no banco, mas alguns controles visíveis podem receber recusa do servidor.
7. Permanecem módulos grandes concatenados, definições legadas no código e regras operacionais locais. Não foi concluída uma remoção geral de hardcode/monólitos. Catálogos e contratos foram levados ao banco; regras de estoque, despacho, transições e validação completa de todos os tipos exigem trabalho específico antes de habilitar essas funções.
8. O bloqueio de demonstração cobre marcadores conhecidos e o fluxo de publicação, não uma análise semântica de todo cadastro. Não declarar que qualquer registro aceito é automaticamente real/verificado.
9. Desabilitar rascunhos e atendimento evita persistência local enganosa, mas não implementa esses recursos no banco. Eles não estão liberados como funcionalidades completas.
10. Ainda faltam ensaios simultâneos entre sessões para integridade de grafos, teste de carga, restauração de backup, recuperação de desastre e verificação de UI ponta a ponta no artefato integrado. A suíte CI usa PostgreSQL 17; a execução local foi com PostgreSQL 16.

A sequência segura é conciliar os dois pacotes, repetir instalação e testes em ambiente descartável com as duas séries de migrações, revisar o estado real e referências existentes, aplicar ao Supabase no fluxo de integração autorizado e só então publicar a interface dependente da configuração. Repetir a auditoria remota de tabelas, RLS, grants, funções, dados, mapas e filtros após essa integração.
