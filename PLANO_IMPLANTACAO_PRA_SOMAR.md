# PRA SOMAR — implantação por fases

Plano de execução iniciado em 08/11/2026, a partir do documento fornecido pelo usuário. A primeira rodada abrange os nove módulos pedidos. O cadastro básico de cozinhas, geladeiras, dormitórios, lonas e demais estruturas pertence a esta rodada.

## Ponto de partida

**Fase 0 concluída.** O backup real foi restaurado e validado, incluindo 72 tabelas, 8.233 registros, nove sequências, três segredos do Vault e o arquivo existente no Storage. O histórico remoto foi reconciliado com as 35 migrações locais; a CLI confirmou ausência de alterações pendentes. Os dados das 29 tabelas próprias foram preservados. Consulte o [evidência atualizada da recuperação](auditorias/FASE_1_BANCO_CATALOGO_2026-11-08.md). **Fase 1 implementada, em validação final para aplicação remota.** Consulte o [contrato territorial](backend/TERRITORIO.md).

O desenvolvimento seguirá em entregas pequenas. Cada fase terá implementação, testes adequados, evidência do comportamento e registro das pendências. Uma funcionalidade só será marcada como operacional depois de validada no ambiente correspondente. Testes locais não comprovam publicação, envio de mensagem nem entrega de notificação.

## Sequência de entregas

| Fase | Entrega | Critério de aceite | Dependência |
|---|---|---|---|
| **0. Reconciliar a base** | Conferir GitHub, pasta local, banco, migrações, contratos, backups e diferenças entre demonstração e produção. | Base reproduzível em banco descartável; divergências explicadas; histórico remoto conciliado por conteúdo; recuperação testada antes de alterar produção. | Concluída em 08/11/2026; backup real validado e 35 migrações alinhadas. |
| **1. Banco e catálogo territorial** | Separar local, serviço, recurso, pessoa e operação. Definir vínculos municipais, permissões dos novos domínios, catálogo configurável, coordenadas, consultas espaciais e auditoria. | Uma unidade aceita vários serviços; geladeira/recurso tem identidade própria e vínculo ao local; tipos novos não exigem edição de JavaScript; migração preserva IDs e estabelece um único caminho de escrita. | Fase 0. |
| **2. Usuários, equipes e permissões** | Completar login, convite, acesso municipal, funções operacionais, integrantes, escalas, responsável, substituto e suspensão. | Usuários de papéis diferentes veem e executam apenas ações permitidas; suspensão funciona no servidor; isolamento entre municípios testado. | Fase 1. Módulo original 01. |
| **3. Rede de ajuda e três mapas** | Formulários de unidades, serviços, recursos, capacidade, situação, horário, verificação, fotos e histórico. Conectar Evento, Colaboradores e Ajuda aos cadastros e filtros comuns. | Cadastrar, editar e desativar uma unidade atualiza a consulta do mapa correspondente sem outro cadastro. Cozinha, geladeira, dormitório e ponto de lonas representados corretamente. | Fases 1–2. Módulos originais 02–03. |
| **4. Triagem e WhatsApp com localização** | Necessidades estruturadas, prioridade, localização confirmada, recursos próximos, distâncias no servidor, atribuição e comunicação; ampliar o fluxo WhatsApp existente. | Mensagem de localização válida integra pedido canônico e triagem; pedido aparece na Central e nos mapas; recurso compatível é encontrado; mensagem preparada, enfileirada, aceita, entregue e falha são estados distinguíveis. | Fase 3. Módulos originais 04–05. |
| **5. Convocações e alertas geolocalizados** | Pré-alertas, grupos regionais, disponibilidade, presença, missões; aprovação, segmentação, push/PWA e WhatsApp autorizado. | Coordenador convoca grupo definido e acompanha respostas; alerta de teste chega a dispositivo autorizado dentro da área, com evidência de envio e tratamento de falhas. | Fases 2–4. Módulos originais 06–07. |
| **6. Ocorrências de animais** | Perdido, encontrado, ferido, resgate, maus-tratos, tutor, veterinário, abrigo, fotos e resolução, ligados à ocorrência canônica. | Registro aparece no mapa apropriado, recebe encaminhamento e guarda o desfecho sem uma segunda fonte de ocorrências. | Fases 3–4. Módulo original 08. |
| **7. Entregas e comprovação** | Ordens, itens, estoque, origem/destino, responsável, rota, retirada, deslocamento, fotos, recebimento e baixa. | Entrega completa atualiza estoque uma única vez; reenvio e concorrência não duplicam baixa; evidências e transições são auditadas. | Fases 2–4. Módulo original 09. |
| **8. Homologação da primeira rodada** | Validar o atendimento completo, recuperação, isolamento, acessibilidade, celular e ambiente publicado. | Família pede alimentos e lonas; triagem encontra recursos; equipe retira e entrega; comprovação, estoque, comunicação e mapas refletem a mesma operação. Todos os critérios de liberação abaixo atendidos. | Fases 0–7. |
| **9. Expansão** | Drones, áreas descobertas, falta de energia/comunicação, logística avançada, cadeia fria, estoque avançado, estatísticas, inteligência territorial, integrações institucionais, cooperação municipal e transparência. | Critérios específicos definidos por entrega após a homologação da primeira rodada. | Fase 8. Corresponde à expansão chamada “Fase 2” no documento original. |

## Trabalho da fase 0

- [x] Ler o plano e identificar o repositório e o projeto de destino.
- [x] Consultar o banco efetivamente utilizado, sem alteração de dados operacionais.
- [x] Comparar nomes e hashes das migrações locais com o GitHub.
- [x] Ler o histórico remoto e levantar tabelas, RLS, extensões e contagens agregadas.
- [x] Executar os testes Node e verificar a montagem da cópia local.
- [x] Preparar uma cópia isolada da `main` atual e reconciliar as migrações locais com revisão, preservando o trabalho existente. Demais alterações anteriores da aplicação permanecem fora desta reconciliação.
- [x] Reproduzir todas as migrações e testes SQL nessa base descartável.
- [x] Comparar definições, funções, policies, grants, índices e conteúdo dos catálogos com produção. Relacionar a migração remota agregada às migrações de origem.
- [x] Documentar e testar backup e restauração em ambiente separado, incluindo a estratégia para arquivos privados e recuperação do Vault. Escopo e limites registrados no relatório final.
- [x] Reconciliar o histórico de migrações somente depois de demonstrar a equivalência; conferir o plano de aplicação antes de qualquer alteração remota. Reversão e proteção contra divergência também ensaiadas.
- [x] Consolidar a documentação na base reconciliada, com contrato explícito de produção e testes de regressão.

## Contratos que atravessam todas as fases

- Preservar `ma_cadastros`, `ma_vinculos`, identidade e histórico do WhatsApp. Antes de criar uma tabela de pessoas, definir a ligação entre identidade Auth, contato verificado, voluntário, beneficiário e cadastros manuais. Telefone declarado não prova identidade.
- Um local físico tem uma única identidade e pode oferecer múltiplos serviços. Capacidade e situação pertencem também ao serviço. Recursos móveis têm localização e vínculo operacional próprios.
- Migrar por domínio, com correspondência de IDs, tratamento de duplicidades e corte de escrita definido. Não manter dois caminhos de gravação para a mesma entidade.
- Aplicar autorização por município, domínio e ação no servidor. Cargo, especialidade e função na equipe não concedem automaticamente acesso ao sistema.
- Tratar coordenadas, confirmação, origem e precisão como dados explícitos. Distância por raio e rota viária são cálculos diferentes; o fornecedor de rotas será definido antes da fase 7.
- O acompanhamento contínuo de deslocamentos será tratado no app/PWA durante missão ativa, com consentimento. Localização recebida por WhatsApp será tratada como posição pontual, com o contrato do provedor verificado na fase 4.
- Mensagens e notificações exigem destinatário autorizado, rastreabilidade, controle de duplicação, regras do provedor, tentativas e estados reais de entrega. Testes não disparam mensagens para cidadãos.
- Os três mapas usam exclusivamente as câmeras aprovadas de `config/cameras-mapas.js`, inclusive abertura, zoom mínimo e retorno. Manter o arraste inicial, a imutabilidade e `tests/cameras-mapas-canonicas.test.cjs`.
- Aplicar as preferências de `AGENTS.md`: sem setas decorativas; botão de cadastro com `+` amarelo e rótulo acessível; barras de rolagem escuras; formulários amplos ou por etapas, acessíveis no celular.

## Catálogo mínimo da fase 1

| Categoria | Cobertura obrigatória |
|---|---|
| Saúde | UBS, UPA, hospitais, SAMU, farmácias, atendimento médico e primeiros socorros. |
| Emergência | Bombeiros, Defesa Civil, Polícia, Guarda Municipal e bases de operações. |
| Alimentação | Cozinhas comunitárias, preparo de marmitas, distribuição de refeições e refeitórios. |
| Refrigeração | Geladeiras, freezers, câmaras frias e conservação de alimentos e medicamentos. |
| Acolhimento | Abrigos, dormitórios, alojamentos, capacidade para famílias, pessoas com necessidades especiais e animais; colchões como recursos vinculados. |
| Água e higiene | Água potável, banheiros, chuveiros, lavanderias e pontos de higiene. |
| Donativos | Coleta, depósitos, armazenamento, separação, distribuição e retirada. |
| Construção | Lonas, telhas, madeira, ferramentas e materiais de construção. |
| Logística | Garagens, veículos, caminhões e pontos de retirada, entrega e transbordo. |
| Energia e comunicação | Geradores, carregamento, Starlink, internet comunitária e bases de comunicação. |
| Animais | Resgate, clínicas veterinárias, abrigo temporário, alimentação e acolhimento de encontrados. |
| Comunidade | Escolas, igrejas, associações, empresas, sedes de voluntários, encontro e triagem. |

São categorias e tipos configuráveis, não tabelas físicas independentes para cada tipo. O desenho da fase 1 deve distinguir o local que abriga um equipamento do equipamento propriamente dito.

## Liberação da primeira rodada

- [ ] Dados operacionais persistidos no banco correto, com controle de acesso, migrações rastreáveis e recuperação testada.
- [ ] Mapas e formulários usam os mesmos registros canônicos.
- [ ] Novos tipos de unidades, serviços e recursos podem ser cadastrados pelo catálogo.
- [ ] Atendimento completo do WhatsApp até a entrega comprovado em cenário autorizado.
- [ ] Envios e recebimentos reais de notificações verificados em destinatários de teste autorizados.
- [ ] Fotos privadas, distâncias, mensagens, deslocamentos e alterações têm histórico auditável.
- [ ] Isolamento municipal, suspensão de acesso, idempotência e concorrência testados no banco.
- [ ] Operação real independe de fixtures e armazenamento operacional em localStorage.

Não há estimativa de prazo fechado nesta etapa: as diferenças da fase 0 precisam ser resolvidas para dimensionar a implementação com confiança.
