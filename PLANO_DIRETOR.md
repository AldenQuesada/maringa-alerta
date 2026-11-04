# MARINGÁ ALERTA

## Auditoria e plano diretor para uma plataforma municipal de coordenação de crises

**Data de referência:** 3 de novembro de 2026, horário de São Paulo.  
**Destinatário:** Dr. Alden J. Quesada.  
**Objetivo:** transformar a proposta em uma plataforma SaaS para múltiplas prefeituras, com participação cidadã organizada antes, durante e depois de desastres de diferentes naturezas.  
**Base auditada:** repositório `AldenQuesada/maringa-alerta`, branch `main`, commit `14e0bb8283dc7cd500235f75101ae644febc71db`.  
**Diretriz revisada com o autor:** acionamento automático após ocorrência confirmada; guards previamente cadastrados; voluntário confirma somente chegada e término pelo WhatsApp. Esta revisão altera o plano, sem alterar o código auditado.

### Escopo e grau de certeza

Esta revisão examina o guia de implementação, o código de `index.html` e o service worker `sw.js`. Os achados de código são resultado de leitura estática e de testes locais pontuais de lógica extraída. Não constituem homologação em campo, teste de carga, pentest ou avaliação de uma operação municipal real. As comparações externas usam documentação oficial dos projetos e fornecedores; funcionalidades documentadas não equivalem a desempenho comparativo medido. A arquitetura, as prioridades e os critérios de aceite a seguir são recomendações de projeto.

Fontes do repositório: [guia auditado](https://github.com/AldenQuesada/maringa-alerta/blob/14e0bb8283dc7cd500235f75101ae644febc71db/GUIA_IMPLEMENTACAO.md), [código auditado](https://github.com/AldenQuesada/maringa-alerta/blob/14e0bb8283dc7cd500235f75101ae644febc71db/index.html) e [service worker auditado](https://github.com/AldenQuesada/maringa-alerta/blob/14e0bb8283dc7cd500235f75101ae644febc71db/sw.js).

## 1. Parecer executivo

O projeto tem um protótipo funcional de demonstração e uma intenção operacional relevante: identificar capacidades da comunidade, confirmar prontidão, organizar ajuda por território e prestar contas do atendimento. Ainda não existe uma plataforma operacional para crises, nem uma implementação multi-tenant. Quase toda a aplicação está em um HTML com JavaScript, dados em memória e persistência parcial no navegador. WhatsApp, alertas, localização de equipes e parte das ações são simulados.

A próxima etapa deve ser a construção do núcleo operacional e da fundação SaaS. Adicionar novas telas e agentes de IA sobre a estrutura atual deixaria intactos os problemas de isolamento, coordenação, perda de dados e concorrência de recursos. O protótipo deve permanecer como demonstração e referência de experiência enquanto os fluxos são migrados para serviços e dados persistentes.

**Definição do produto:** plataforma para prefeituras que, diante de uma ocorrência confirmada, aciona automaticamente pessoas próximas e compatíveis, avisa o responsável da região e acompanha a ajuda pelas confirmações de chegada e término no WhatsApp. O sistema organiza recursos sem conflitos e mantém o acompanhamento das necessidades e da recuperação.

Maringá será um município atendido e poderá ser o piloto. Identidade visual, zonas, contatos, órgãos, riscos, horários, regras e integrações devem ser configuração de cada prefeitura. O nome comercial nacional pode ser decidido depois; o nome atual do repositório não precisa ser alterado para iniciar essa arquitetura.

### Decisões estruturantes

1. Multi-tenant desde o primeiro modelo de dados e a primeira API.
2. Ocorrência confirmada dispara o acionamento automático conforme regras da prefeitura.
3. Responsável regional e substituto cadastrados recebem avisos; não aprovam cada mobilização.
4. Voluntário confirma chegada e término pelo WhatsApp, sem aceite obrigatório, avaliação ou comprovação adicional.
5. Guards de compatibilidade, disponibilidade, capacidade e conflito executados pelo backend; continuidade com conectividade limitada.
6. Integrações oficiais e rastreáveis; dados simulados identificados em ambiente separado.
7. IA assistiva, mensurável e substituível, com operação manual disponível.
8. Recuperação e prestação de contas como módulos de primeira classe.

## 2. Inventário do que existe

Os termos abaixo descrevem implementação no repositório, sem atribuir maturidade de produção ao protótipo.

| Capacidade | Situação observada | Evolução necessária |
|---|---|---|
| Mapa e seleção territorial | Interface implementada; seis zonas de demonstração | Importar geometrias e setores aprovados por prefeitura; versionar limites |
| Ocorrências e gravidade | Objetos gerados aleatoriamente | Entrada real, validação, proveniência, reclassificação e múltiplos eventos |
| Confirmação de presença e tempos | Fluxo local implementado | Identidade do agente, missão, chegada individual/equipe e histórico persistente |
| Encerramento com fotos | Formulário local implementado | Término por WhatsApp; fotos opcionais, sem impedir a conclusão da participação |
| Cadastro de voluntários | Chat simulado com CPF, contribuição, zona e preferências | Entrada real, coleta mínima, identidade proporcional ao risco, competências e termos |
| Prontidão pré-evento | Demonstração implementada | Confirmação real com validade, turno, recurso, área e consentimentos aplicáveis |
| Equipes e equipamentos | Cadastro local com quantidades | Reserva transacional, posição confiável, condição de uso, manutenção e cadeia de custódia |
| Distâncias | Cálculo geodésico real sobre posições simuladas | Diferenciar distância em linha geodésica de tempo de deslocamento e acessibilidade |
| Fila de prioridade | Fórmula local implementada | Regras de risco validadas, revisão e escalonamento por situação |
| WhatsApp/chat | Simulado; nenhuma entrega externa real | API oficial, templates, webhooks, recibos, idempotência e contingência |
| Alertas meteorológicos | Simulados com fontes sorteadas | Ingestão de fontes homologadas e preservação de emissor, área, validade e versão |
| Acesso por papel | Escolha de papel no navegador | Autenticação, MFA quando apropriado e autorização no servidor |
| Auditoria | Cadeia de hashes local | Registro no servidor, sequência consistente e controle independente |
| Consulta pública | Página por hash usando dados da mesma aplicação | API pública separada, minimização e controle de acesso ao acompanhamento individual |
| Offline | Cache parcial do aplicativo e fila de chat | Dados, fotos, mapas permitidos, sincronização e resolução explícita de conflitos |
| Relatório de evento e reconhecimento | Agregação local e impressão | Agregação automática dos registros, agradecimento, custos, pendências e recuperação |
| Múltiplas prefeituras | Ausente | Tenants, memberships, políticas, configurações e testes de isolamento |
| Abrigos, famílias, doações, recuperação | Sem módulos operacionais completos | Incorporar como domínios ligados ao incidente e à assistência |

## 3. Correções prioritárias do protótipo e do guia

Prioridade P0 significa bloqueio para uso com pessoas e operações reais; não significa que uma demonstração com dados fictícios precise cumprir todos os requisitos de produção.

### 3.1 Achados operacionais

| Prioridade | Achado | Consequência | Correção proposta |
|---|---|---|---|
| P0 | Seleção de voluntários não exige habilidade compatível nem disponibilidade | Pessoa inadequada ou já ocupada pode ser mobilizada | Guards de compatibilidade e disponibilidade previamente cadastrados; reserva automática e atômica, sem aceite obrigatório |
| P0 | Um voluntário pode estar em múltiplas ocorrências; concluir uma o libera | O painel informa capacidade inexistente | Estado derivado de alocações; restrições de sobreposição; liberação por missão |
| P0 | A fórmula permite média antiga superar grave nova | Ordenação pode contrariar a prioridade de proteção à vida | Classes de risco dominantes e filas separadas; idade ordena dentro da classe |
| P0 | `applyZoneVisibility` considera apenas `ativa` | Ocorrências em atendimento desaparecem do mapa após atualização | Política única de estados visíveis e atualização consistente de contadores |
| P0 | Após recarga, a rotina offline apaga mensagens cuja conversa ainda não existe em memória | Perda de mensagens dentro da própria simulação | Corrigir a fila; em produção, usar outbox persistente, recibo, idempotência e reenvio seguro |
| P0 | Dados internos já estão carregados sem autenticação; a página pública só esconde elementos e o usuário escolhe o papel | Não existe autorização efetiva de dados nem ações | Projeção pública mínima e autorização no backend para cada recurso e ação |
| P1 | Duas gravações concorrentes podem quebrar a cadeia de auditoria | Evento legítimo pode parecer adulteração | Sequência no servidor, controle transacional e verificação independente |
| P1 | Preferência de alertas é coletada e não aplicada | Comunicação desrespeita o que foi selecionado | Regras por fase, categoria, canal, opt-out e mensagens obrigatórias definidas juridicamente |
| P1 | Relatório pode encerrar com pendências em texto sem novas tarefas | Risco residual fica sem responsável e prazo | Encaminhar automaticamente a pendência ao responsável cadastrado, sem impedir a saída do voluntário |
| P1 | Duas fotos são requisito rígido de encerramento | Evidência pode ser impossível, imprópria ou atrasar registro | Retirar a exigência de fotos; a mensagem de término encerra a participação, sem justificativa ou validação adicional |
| P1 | Estoque e mínimos por zona contam cadastros e valores arbitrários | Número de pessoas é confundido com capacidade operacional | Capacidade por unidade, disponibilidade, condição e cenário de demanda |
| P1 | Contador de mobilizações pode tratar convite enviado como ajuda realizada | Relatório confunde convite com presença | Contar separadamente convites, chegadas e términos; agradecer automaticamente, sem nota de qualidade nem prova de contribuição |
| P1 | Em tela pequena a sidebar é escondida e não há ação implementada para reabri-la | Acesso aos módulos fica prejudicado no aparelho de campo | Menu acessível por toque e teclado, testado com todos os módulos permitidos |

O detalhe dos testes e referências de linha está no anexo de evidências deste relatório. A correção deve alcançar as regras do servidor e sua apresentação; mudar apenas rótulos ou cores não resolve os conflitos de estado.

### 3.2 Correções conceituais e documentais

**Backend integra o produto.** A recomendação do guia de tratá-lo como projeto separado deixou de servir ao objetivo multi-prefeitura. Segurança, sincronização, filas e modelo de dados definem os próprios fluxos.

**CPF é dado pessoal, mas não é automaticamente dado pessoal sensível na definição legal.** A categoria sensível inclui, entre outros, saúde e biometria. Isso não reduz a necessidade de proteger CPF. A base legal deve ser definida por finalidade: socorro, política pública, voluntariado, publicação de imagem e reconhecimento não são um único consentimento genérico. A ANPD e o MIDR distinguem essas hipóteses [F01–F02]. A pessoa deve conseguir relatar perigo sem enfrentar um cadastro completo de voluntário.

**A ausência de uma integração homologada não prova inexistência de fonte oficial.** Há catálogo CAP/WIS2 oficial do INMET e referência de feed no registro de autoridades da WMO [F03–F04]. O RSS legado não foi acessível pela ferramenta de pesquisa nesta revisão, portanto não foi homologado. Reescrever a afirmação categórica do guia e abrir uma investigação técnica de disponibilidade, atualização, cobertura, limites e suporte. A Weather API do Google também documenta CENAD e INMET entre seus provedores, com atribuição obrigatória à fonte [F05].

**OpenStreetMap não equivale a serviço gratuito garantido de mapas operacionais.** A política do servidor padrão de tiles informa ausência de SLA e proíbe pré-download para uso offline. Planejar serviço contratado ou hospedagem de dados/tiles com licença e permissão adequadas [F06].

**Gravidade, competência e responsabilidade financeira são dimensões diferentes.** Um evento em propriedade privada pode ameaçar vidas ou uma via pública. O enquadramento pública/privada/mista deve ajudar na atribuição e prestação de contas; não deve reduzir mecanicamente prioridade de socorro.

**Distância não é rota segura.** Um ponto próximo pode estar isolado por água, ponte danificada ou rede elétrica. Exibir horário e precisão da posição; o acionamento considera os bloqueios e restrições já informados; proximidade não elimina esses guards.

## 4. Hierarquia institucional e operacional

### 4.1 Estrutura do produto e dos dados

| Nível | Responsabilidade | Regra de acesso |
|---|---|---|
| Operador da plataforma | Provisionamento, disponibilidade, contratos e suporte | Sem leitura universal de dados de moradores por padrão |
| Prefeitura / tenant | Políticas, território, órgãos, usuários e operação municipal | Isolamento próprio, com governança contratual definida |
| Órgãos e organizações parceiras | Defesa Civil, saúde, assistência, obras, trânsito, concessionárias e entidades | Acesso por vínculo, função, finalidade e incidente |
| Evento ou operação | Coordenação de um temporal, incêndio, inundação ou outro cenário | Equipe de comando, período operacional e áreas de atuação próprios |
| Setores e zonas operacionais | Divisão territorial ou funcional adaptável | Líderes e substitutos válidos para aquele turno/evento |
| Missões e equipes | Entregas concretas e recursos mobilizados | Menor acesso necessário à execução e à prestação de contas |
| Cidadãos e voluntários | Relatar, oferecer ajuda, confirmar chegada e término | Conversa própria e informações necessárias para ajudar; mapa público sanitizado |

Consórcios e estados entram por acordos de cooperação e concessões de acesso específicas. Estar acima de um município no organograma institucional não deve conceder acesso irrestrito no sistema. Uma ocorrência regional deve permitir troca controlada de informações e pedidos de apoio sem fundir cadastros de famílias de vários municípios.

### 4.2 Estrutura de comando durante um evento

Adotar princípios do Sistema de Comando em Incidentes, ajustados ao plano de contingência e às competências locais. O SISDC do Paraná já usa essa referência em seu Plano de Contingência Online [F07]. Separar a coordenação estratégica e de recursos do COE da direção tática de cada incidente, mantendo ligação entre ambas; a FEMA também explicita essa distinção [F18].

| Função | Decisões e entregas |
|---|---|
| Autoridade municipal / comitê de crise | Prioridades públicas, atos administrativos, recursos extraordinários e pactuação institucional |
| Comando do incidente ou comando unificado | Objetivos do período, delegações, plano de ação e coordenação tática entre órgãos |
| Segurança operacional | Zonas de exclusão, atividades proibidas, equipamentos, avaliação de risco e interrupção de tarefa insegura |
| Ligação institucional | Apoio entre órgãos, concessionárias, municípios, entidades e equipes especializadas |
| Informação pública | Mensagens operacionais automáticas com modelos cadastrados; comunicados institucionais e correção de informações |
| Operações | Acompanhar acionamentos automáticos, necessidades e atuação em campo; resolver exceções concretas |
| Planejamento | Quadro de situação, previsões e incertezas, cenários, recursos necessários e passagem de turno |
| Logística | Equipamentos, combustível, alimentação, transporte, comunicação, estoque e bases de apoio |
| Administração e finanças | Autorizações, despesas, contratos, reembolsos, documentos e prestação de contas |
| Coordenação de voluntariado | Cadastro prévio, compatibilidade, contatos e apoio à participação; acompanhamento automático de chegada e término |

Em municípios pequenos, pessoas podem acumular funções permitidas pelo plano local, mantendo a distinção das responsabilidades. O sistema deve suportar substituição e transferência de comando com registro de quem assume, quando e quais pendências recebe. Responsável, substituto e coordenador de zona do protótipo continuam úteis, agora ligados a essa estrutura. A hierarquia define quem recebe informação e quem atua em campo. Ela não cria uma sequência de aprovações: a ocorrência confirmada aciona a ajuda e avisa o responsável automaticamente. Funções institucionais não precisam corresponder a telas, formulários ou pessoas diferentes em cada atendimento.

### 4.3 Ciclo de operação

**Preparação:** mapear riscos, cadastrar recursos, formar lideranças comunitárias, credenciar parceiros, validar abrigos, testar contato e executar simulados.

**Prontidão:** receber alerta confiável, aplicar os guards cadastrados, consultar disponibilidade quando necessário e pré-posicionar recursos conforme regras previamente definidas.

**Resposta:** ocorrência confirmada → acionamento automático de pessoas compatíveis e próximas + aviso ao responsável regional → chegada pelo WhatsApp → término pelo WhatsApp → liberação e eventual convite para outra ocorrência.

**Recuperação:** acompanhar famílias, restabelecer serviços, remover resíduos com destinação adequada, registrar danos e custos, gerir reparos, apoio e reassentamento quando pertinente.

**Aprendizagem:** revisar resultados, causas de atraso, falhas de comunicação, necessidades não atendidas e atualizar planos, treinamento e cadastro.

## 5. Fluxo operacional simples e automático

### 5.1 O que acontece na prática

**A configuração acontece antes; durante a ocorrência, o sistema executa.** O ponto de partida deste fluxo é uma ocorrência já confirmada pelo canal e pelas regras cadastradas da prefeitura. Não se acrescenta uma segunda aprovação para iniciar o acionamento.

| Momento | O sistema faz automaticamente | O voluntário faz |
|---|---|---|
| Ocorrência confirmada | Identifica município, região, tipo de ajuda, quantidade necessária e responsável regional | Nada |
| Acionamento | Seleciona pessoas próximas, compatíveis e disponíveis; aplica os guards; envia convite e avisa o responsável | Recebe local, orientação curta e contato regional |
| Chegada | Vincula a confirmação à pessoa e à ocorrência, registra horário e atualiza o painel | Toca em **Cheguei** ou envia a mensagem equivalente |
| Término | Registra a conclusão da participação, libera a pessoa e atualiza os contadores | Toca em **Terminei** ou envia a mensagem equivalente |
| Outra necessidade | Procura outra ocorrência compatível e próxima; envia novo convite se fizer sentido | Decide se pode continuar ajudando |

Não há aceite obrigatório antes de sair, avaliação de qualidade, prova de contribuição, exigência de fotografia ou autorização de supervisor para concluir a ajuda. A pessoa pode dizer que não pode ir, que precisa sair ou que precisa de apoio; essas são facilidades opcionais na conversa, não etapas adicionais obrigatórias.

**Exemplo de convite:** “Há uma ocorrência confirmada na Rua X. Precisamos de ajuda para distribuir água no ponto Y. Responsável da região: Ana, contato Z. Se puder ajudar, confirme quando chegar.”

**Exemplo ao terminar:** “Obrigado pela ajuda. Sua participação foi encerrada.” Se houver outra necessidade: “Há outra ocorrência próxima precisando desse apoio. Você pode continuar ajudando?”

A seleção considera a localização disponível no cadastro ou compartilhada pela pessoa; morar perto não prova que ela esteja naquele local agora. Não exigir rastreamento contínuo ou nova localização a cada etapa. Sem confirmação de chegada, o painel mostra convite enviado, não pessoa presente.

### 5.2 Guards no banco, executados pelo backend

| Regra previamente cadastrada | Efeito automático |
|---|---|
| Prefeitura, região e responsável/substituto | Aciona a operação correta e envia o aviso ao contato vigente |
| Tipo de ajuda, capacidade e restrições | Chama pessoas compatíveis; atividades especializadas seguem para o recurso competente |
| Disponibilidade e participação atual | Evita chamar a mesma pessoa para duas atividades simultâneas |
| Necessidade, quantidade e prazo do convite | Evita excesso de convocação e continua a busca quando não houver chegada ou houver recusa |
| Estado da ocorrência, bloqueios e restrições informadas | Interrompe convites para ocorrência resolvida e aplica limites já conhecidos |
| Identidade do canal, contexto da mensagem e identificador único | Atualiza a participação correta, sem duplicar ações por reenvio de WhatsApp |

Configurar prazos e destinatários por prefeitura antes da operação. O aviso ao responsável corre em paralelo ao acionamento; o sistema não espera que ele abra o painel. Se ninguém compatível estiver disponível, aciona automaticamente a alternativa cadastrada, como equipe municipal, substituto, outro setor ou apoio pactuado. Uma mensagem enviada não equivale a confirmação de atendimento de um órgão externo.

A reserva e a gravação do acionamento devem ocorrer de forma atômica. Convites pendentes têm prazo e estado próprios: não viram capacidade presente. Ao expirar um convite, o sistema continua a busca e atualiza a informação enviada, evitando deslocamentos desnecessários. Mensagens atrasadas são conciliadas com o contexto e o estado atual, sem duplicar a pessoa em duas ocorrências ou ignorar uma chegada realmente informada.

Essas regras organizam o trabalho dentro do sistema. O voluntário não vê uma sequência de permissões. O responsável regional acompanha o campo, recebe pedidos de apoio e pode corrigir uma situação concreta; sua intervenção não é condição para o fluxo normal avançar.

### 5.3 Modelo interno sem transformar dados em formulários

| Objeto | Para que o sistema precisa dele |
|---|---|
| Alerta e evento | Relacionar riscos e ocorrências à operação municipal ou regional |
| Relato e ocorrência | Preservar o que foi informado e reunir mensagens sobre o mesmo fato |
| Necessidade ou tarefa | Saber que ajuda ainda falta e que tipo de recurso chamar |
| Pessoa, equipe ou recurso | Consultar compatibilidade, disponibilidade e contato |
| Participação ou alocação | Associar a pessoa à ocorrência, impedir conflito e registrar chegada/término |
| Caso de assistência/recuperação | Continuar o acompanhamento quando a resposta imediata terminar |

Os nomes são internos. Um evento pode conter várias ocorrências e cada ocorrência pode precisar de várias pessoas. O cidadão não precisa entender ou preencher essa estrutura. Fotos e demais anexos são aceitos quando enviados; documentos técnicos ou financeiros próprios das equipes e instituições não são condição para o voluntário terminar sua participação.

**Participação:** convite enviado → no local → concluída. Recusa, cancelamento e convite expirado são alternativas tratadas automaticamente, sem formulário de justificativa.

**Ocorrência:** em verificação → confirmada → em atendimento → resolvida, com reabertura quando o problema persistir. O sistema atualiza esses estados a partir dos eventos e regras cadastrados; não pede ao voluntário que preencha cada transição.

**Término da participação e resolução da ocorrência são registros diferentes.** “Terminei” encerra a ajuda daquela pessoa e a libera. Se ainda houver necessidade ou equipe em atividade, a ocorrência continua aberta e a ajuda restante é encaminhada automaticamente. Quando os critérios cadastrados de resolução estiverem satisfeitos, o sistema encerra a ocorrência, sem criar uma etapa de aprovação de supervisor. A mensagem deve estar vinculada à ocorrência correta; dúvida real de contexto pode ser esclarecida na própria conversa.

Horários, canal, pessoa, ocorrência e mudanças de estado são registrados automaticamente. Relatórios e agradecimentos usam esses registros, sem pedir comprovante de contribuição ou nota de qualidade.

### 5.4 Cadastro canônico de colaboradores pelo WhatsApp — pessoas físicas e jurídicas (atualização 04/11/2026)

**Origem:** formulário e categorias fornecidos pelo autor para cadastrar pessoas e empresas que possam ajudar moradores atingidos e empreendedores. **Decisão de preservação:** nenhuma opção original é excluída; os textos abaixo são o catálogo inicial da prefeitura, passível de extensão municipal. Esta seção complementa o cadastro de voluntários da seção 5.1 e substitui listas genéricas de contribuições por uma taxonomia detalhada. **Ainda é especificação de produto; não representa formulário WhatsApp real já publicado.**

#### A. Identificação obrigatória — somente quatro informações

| Campo apresentado no WhatsApp | Obrigatório | Regra |
|---|---|---|
| **NOME** | Sim (*) | Nome e sobrenome para pessoa física; nome da empresa/organização para pessoa jurídica. Não exigir dois cadastros diferentes. |
| **PESSOA JURÍDICA OU FÍSICA** | Sim (*) | Escolha exclusiva: **JURÍDICA** ou **FÍSICA**. |
| **ENDEREÇO** | Sim (*) | Texto livre/endereço compartilhado; o sistema geocodifica quando possível e confirma a zona de referência. Não expor publicamente o endereço. |
| **TELEFONE** | Sim (*) | Preferencialmente número do próprio WhatsApp, apresentado para confirmação/edição, sem exigir que a pessoa o redigite se já for conhecido. |

O cadastro não exige CPF, CNPJ, fotografia, documentos, avaliação, autorização de superior ou aceite prévio de missão nesta entrada. Identificação e qualificações adicionais podem ser pertinentes a atividades especializadas, mas não devem impedir que a pessoa ofereça outros tipos de ajuda.

#### B. Que tipo de ajuda pode oferecer para pessoas atingidas?

**Seleção múltipla, sem perder nenhuma opção do formulário original:**

1. FORNECER ALIMENTAÇÃO
2. ATENDER PESSOAS COM NECESSIDADES ESPECIAIS
3. CUIDADOR
4. LIMPEZA
5. PEDREIRO
6. METALÚRGICO
7. CARPINTEIRO
8. OPERADOR DE MOTOSSERRA
9. ELETRICISTA
10. LAUDO
11. EMITIR LAUDOS DE PREJUÍZOS
12. OUTRO: campo de texto para especificação

**Normalização para o motor:** manter **LAUDO** e **EMITIR LAUDOS DE PREJUÍZOS** como duas opções reconhecíveis, mesmo que sejam reunidas visualmente sob uma categoria de assistência técnica. Não presumir que marcar “laudo” autorize produzir avaliação de engenharia ou documento técnico sem competência profissional. Atendimento de saúde, risco elétrico, corte de árvores e atividades técnicas seguem compatibilidade e habilitação previamente reconhecidas.

#### C. MAQUINÁRIO, equipamentos e materiais disponíveis

**Seleção múltipla; preservar os nomes originais:**

1. PÁ CARREGADEIRA
2. RETROESCAVADEIRA
3. MUNCK
4. CAMIONETE
5. BOBCAT
6. CAMINHÃO GARRA
7. CAMINHÃO BASCULANTE
8. GERADOR
9. MATERIAL DE CONSTRUÇÃO
10. STAR LINK (normalização interna: conectividade Starlink/satélite)
11. OUTRO: campo de texto para especificação
12. MOTOSSERRA COM OPERADOR
13. MOTOSSERRA

Manter a diferença **MOTOSSERRA COM OPERADOR** vs. **MOTOSSERRA**: uma é oferta de equipamento acompanhado de alguém habilitado, a outra pode ser somente o equipamento. O mesmo princípio vale para máquinas pesadas, combustível, ferramentas e veículos: disponibilidade do bem não significa operador ou motorista disponível. Quando a pessoa selecionar o item, o WhatsApp poderá perguntar **quantidade, localização/base, se inclui operador e disponibilidade** apenas quando esse detalhe for necessário para mobilizar o recurso; nunca obrigar a preencher todos esses campos para concluir o cadastro.

#### D. Que tipo de apoio pode oferecer para empreendedores?

**Seleção múltipla:**

1. ESPAÇO EM FREEZER PARA PERECÍVEIS
2. AMBIENTE DE TRABALHO
3. OUTRO: campo de texto para especificação

Para freezer, o cadastro permite detalhar capacidade e condições de conservação quando relevante; para espaço de trabalho, localização, capacidade, conectividade e período de oferta quando relevante. A oferta deve aparecer no módulo de **apoio a empreendedores e recuperação econômica**, sem ser tratada como missão de resgate.

#### E. MATERIAL DE CONSTRUÇÃO / COMBUSTÍVEL

**Categoria de apoio preservada integralmente.** Registrar ofertas de **MATERIAL DE CONSTRUÇÃO** e/ou **COMBUSTÍVEL** como itens separados, mesmo quando já estiverem na seção de maquinário, permitindo quantidade/unidade, retirada/entrega e disponibilidade. Não duplicar a reserva do mesmo estoque caso a oferta apareça em dois grupos. Combustível doado ou sujeito a reembolso é informação da oferta/logística, não obrigação financeira do voluntário.

#### F. Campo **ESPECIFICAR “OUTROS”**

Uma resposta livre por categoria selecionada como OUTRO (ajuda às pessoas, maquinário, apoio a empreendedores) com pergunta curta e contextual. Não enviar um campo “Outros” solto que impeça saber se o item é um serviço, equipamento ou espaço. Guardar o texto original e a categoria de origem; classificação posterior não apaga a resposta da pessoa.

#### G. Fluxo conversacional curto, sem burocracia

| Passo no WhatsApp | Comportamento esperado |
|---|---|
| 1. Identificação | Perguntar nome, física/jurídica, confirmar telefone do canal e endereço/zona. |
| 2. Oferta de ajuda | Exibir uma lista curta de grandes grupos: **Ajuda a pessoas**, **Máquinas e equipamentos**, **Apoio a empreendedores**, **Materiais e combustível**. A pessoa pode escolher um ou vários grupos. |
| 3. Opções concretas | Mostrar opções correspondentes ao grupo, com **seleção múltipla** ou respostas numeradas. Se necessário, dividir listas longas em mensagens curtas. |
| 4. Complementos | Pedir texto de “Outro” e detalhes logísticos somente dos itens selecionados. |
| 5. Confirmação | Resumir nome, telefone, zona e ofertas, permitindo corrigir, e **concluir o cadastro**. Não solicitar nova aprovação. |
| 6. Uso operacional | Ocorrência confirmada: o sistema busca pessoas e empresas próximas com capacidade compatível, aplica guards de disponibilidade/conflito, aciona automaticamente e avisa o responsável regional. Ao ajudar, a pessoa informa somente **Cheguei** e **Terminei**. |

**Regra de canal:** listas de WhatsApp devem respeitar os limites de interface do provedor; quando houver opções demais, usar páginas, lista adaptada, WhatsApp Flow ou escolhas numeradas. Não transformar o fluxo em um formulário único impossível de usar no celular. A pessoa pode interromper e retomar o cadastro sem perder os dados parciais, sem criar uma segunda pessoa para o mesmo número.

#### H. Dados internos para integração com a gestão e o Mapa Operacional

Os nomes abaixo são **campos do backend**, não perguntas extras obrigatórias no WhatsApp:

- `tenant_id`, `colaborador_id`, `nome`, `tipo_pessoa` (`fisica` ou `juridica`), `telefone_whatsapp`, `endereco_declarado`, `localizacao`, `zona_id` e `cadastro_origem` (`whatsapp`).
- `ofertas[]`: `grupo` (`ajuda_pessoas`, `maquinario`, `empreendedores`, `materiais_combustivel`), `codigo_catalogo`, `rotulo_original`, `outro_descricao`, `quantidade`, `unidade`, `inclui_operador`, `localizacao_recurso`, `disponibilidade`, `restricoes` e `observacoes` quando declarados.
- Uma pessoa física ou jurídica pode ter **várias ofertas** e participar de mais de uma categoria. O sistema usa uma entidade de colaborador canônica ligada a várias capacidades; não cria cadastros duplicados por categoria.
- Na gestão, as ofertas alimentam **Colaboradores/Voluntários**, **Equipes**, **Equipamentos**, **Frota**, **Estoque**, **Doações** e **Apoio a empreendedores**, com vínculos aos mesmos IDs de origem e controle de reserva, em vez de copiar o recurso como livre em vários lugares.
- Exibir no Mapa Operacional somente os recursos e localização autorizados e necessários ao trabalho. Não expor telefone, residência ou dados pessoais em visualização pública.
- Diferenciar `cadastrado`, `disponivel`, `convidado`, `no_local` e `concluido` no domínio apropriado: **convite não é chegada**; **Terminei encerra a participação individual**, sem encerrar automaticamente a ocorrência.

**Princípio:** o cidadão ou empreendedor informa o que pode oferecer **uma vez**, do jeito mais simples possível. A prefeitura configura o catálogo e o sistema se encarrega de classificação, busca, alocação e acompanhamento. O fluxo de cadastro não adiciona auditorias humanas, notas, comprovantes ou etapas burocráticas à ajuda.

---

### 5.5 Sistema Integrado de Gestão de Crise — três mapas e Maringá Unida (04/11/2026)

**Separação funcional aprovada:**

1. **Mapa de Colaboradores** (`/mapas/?tipo=colaboradores`): cadastro de pessoas físicas e jurídicas, equipes, maquinários, materiais e ofertas por zona; seleção por categoria; preparação de acionamento de brigadas zonais.
2. **Mapa de Evento** (`/index.html`): aplicação operacional anteriormente aprovada, mantida sem reconstrução ou retirada de funcionalidades. O botão do cabeçalho da Gestão deve abrir o mapa standalone.
3. **Mapa da Ajuda** (`/mapas/?tipo=ajuda`): organização de pedidos de ajuda e recuperação pós-evento por zona, necessidade, prioridade e situação; correspondência com a oferta de colaboradores e gestão de apoio entre municípios.

Os mapas possuem **responsabilidades diferentes**, com potencial de cruzamento pelo mesmo município, zona, colaborador, recurso, evento e pedido. A futura implementação oficial deve fornecer **banco e API únicos**; a versão de navegador atual é uma simulação com coleções locais. Não duplicar o Mapa de Evento no painel administrativo.

**Entrada principal pelo WhatsApp — Maringá Unida:**

> Olá, bem-vindo ao Maringá Unida! Como você gostaria de se cadastrar?  
> **Colaborador** | **Receber ajuda**

- **Colaborador:** o catálogo completo e os únicos quatro campos-base obrigatórios estão definidos na seção 5.4. Seleção múltipla por capacidade; PF/PJ diferenciadas; oferta de equipamentos não implica operador habilitado; “Outro” pode ser especificado. A oferta aparece no Mapa de Colaboradores por zona, com disponibilidade.
- **Receber ajuda:** nome/razão social, pessoa física/jurídica, telefone, endereço privado, zona, necessidade, descrição opcional e urgência. Catálogo inicial: alimentação, telhas/cobertura, apoio financeiro, abrigo/moradia, roupas, medicamentos, limpeza, material de construção, energia/gerador, água, transporte, cuidados especiais, laudos, empreendedores e outro. A solicitação aparece no Mapa da Ajuda por zona, não no endereço exato da residência.
- **A mesma identidade pode fazer os dois fluxos:** alguém que se ofereceu como colaborador pode pedir ajuda depois, sem cancelar a oferta; alguém inicialmente atingido também pode passar a colaborar. Reutilizar cadastro por vínculo verificado. O telefone é apenas aproximação na simulação, não autenticação em produção.
- **Depois de qualquer cadastro:** disponibilizar “Também preciso de ajuda”, “Também quero colaborar” e novo atendimento, sem impor papel exclusivo.
- **Chegada e conclusão:** mantida a regra de **somente CHEGUEI e TERMINEI**, sem aceite intermediário, fotos, relatórios ou nota obrigatórios.

**Mobilização zonal com uma ação:** selecionar zona → obter equipes/colaboradores compatíveis e disponíveis → conferir credenciais/conflitos internamente → criar campanha idempotente → emitir mensagens pelo canal oficial → acompanhar CHEGUEI/TERMINEI. O responsável regional é notificado em paralelo, **não aprova** um acionamento normal. No protótipo há preparação de lista e links individuais `wa.me`; **não há envio em massa real**.

**Cooperação entre prefeituras com uma ação:** escolher município destinatário → recurso solicitado → registro institucional → envio autenticado → recebimento e aceite ou indisponibilidade → mobilização rastreável. O protótipo cria o registro local e prepara mensagem para o telefone institucional quando conhecido; **não há rede intermunicipal em operação**.

**Salvaguardas:** pedidos de dinheiro passam por triagem e mecanismo institucional, sem transferência automática. Pedidos de resgate, atendimento médico ou risco elétrico/estrutural são encaminhados às autoridades e equipes habilitadas. Não publicar endereços ou telefones de cidadãos no mapa de consulta.

**Estado auditado:** consultar [AUDITORIA_SISTEMA_INTEGRADO_CRISE.md](AUDITORIA_SISTEMA_INTEGRADO_CRISE.md) para a matriz entre funcionalidades demonstrativas e integrações necessárias. O compromisso de produto é um Sistema Integrado de Gestão de Crise; o código estático de GitHub Pages não é infraestrutura operacional real.

### 5.6 Implantação única georreferenciada de Maringá — Prefeituras e Pessoas (04/11/2026)

**Escopo aprovado:** implantar somente Maringá nesta fase, mantendo o ciclo multi-tenant para futuro administrador de País e Estado. A hierarquia de dados é **Brasil → Paraná → Maringá (IBGE 4115200) → bairros e zonas → unidades / instalações / pontos críticos**. Essa hierarquia não cria três ou mais páginas de navegação: país, UF e prefeitura permanecem no contexto da mesma tela. No máximo dois cliques do sidebar até a visualização ou edição de um registro.

**Somente os primeiros dois grupos do menu esquerdo mudam:**
- **Prefeituras e território:** Prefeituras; Implantar Maringá (tela única de importação); Bairros; Zonas operacionais; Bases de apoio; Áreas de risco. O inventário completo também permite consultar, no mesmo fluxo, UBS, UPA, pronto-socorros, hospitais, Bombeiros, polícias, Copel, Sanepar, abrigos e pontos críticos. As tabelas preexistentes dos módulos de serviços e recursos permanecem preservadas e reusam os registros.
- **Usuários e hierarquia:** Pessoas e hierarquia, uma tabela de RH com funções principais e adicionais (administrador, responsável, substituto, coordenador, operador), vínculo com órgão, zona e substituto. O nome público de integrante do gabinete de crise não basta para ativar permissões nem enviar comandos.
- **Equipes e comunidade, Ajuda e mobilização, Rede de emergência, Infraestrutura e recursos, Regras e comunicação:** nenhuma alteração de menu ou fluxo nesta implantação.

**Importação segura:** IBGE Localidades e Malhas fornecem identidade/limite oficial do município; a API CNES fornece estabelecimentos de saúde sob código municipal com paginação. Bairros, pontos e geometrias não disponíveis por API aberta são carregados de arquivo municipal GeoJSON/CSV exportado da Prefeitura/IPPLAM e submetidos a conferência. **Não presumir georreferenciamento completo** a partir do nome de uma instituição. Cada registro possui fonte, identificador, bairro/zona, endereço público, coordenadas ou polígono quando conhecidos, verificação e data de atualização. Importação deve ser repetível, preservar dados validados e impedir duplicatas por código oficial.

**Uma tela, dois cliques:** importar → conferir tabela/mapa → salvar. Toda linha tem acesso imediato a Mapa e Editar; os dados físicos são persistidos sob o mesmo município; RH é uma tabela única separada de recursos físicos. Administradores País/Estado exigem autorização e backend verdadeiros antes de entrarem no produto.

**Estado atual:** demonstração estática em GitHub Pages, no navegador. As fontes remotas podem falhar por indisponibilidade, CORS ou limite; o fallback por arquivo público é mantido. Não constitui cadastro municipal homologado, GIS oficial, banco compartilhado ou sistema de emergência em produção.

## 6. Hierarquia de módulos e interfaces

### 6.1 Cinco experiências distintas

| Interface | O que precisa resolver |
|---|---|
| Cidadão | Relatar, pedir apoio, oferecer ajuda, acompanhar protocolo, receber orientação validada |
| Campo | Voluntário confirma chegada e término pelo WhatsApp; equipes municipais usam detalhes e registros técnicos quando necessários à sua atividade |
| Centro de operações | Situação compartilhada, triagem, comando, recursos, comunicação e pendências |
| Parceiros | Disponibilizar capacidade, receber acionamentos e informar início/término no escopo da parceria |
| Administração SaaS e municipal | Tenants, identidade, política, configuração, integrações, auditoria e suporte |

### 6.2 Navegação proposta para o centro de operações

| Módulo | Funcionalidades indispensáveis | Momento |
|---|---|---|
| 1. Situação e mapa | Camadas de riscos, incidentes, bloqueios, abrigos e serviços; fila equivalente em lista; origem e frescor dos dados | Núcleo |
| 2. Eventos e comando | Ativação, objetivos, período operacional, autoridades, zonas, turnos, substitutos e passagem de comando | Núcleo |
| 3. Alertas e prontidão | CAP, validade, atualização/cancelamento, confirmação de capacidade, fases e preferências | Núcleo |
| 4. Relatos e triagem | WhatsApp, web, telefone mediado por atendente; anexos; localização incerta; duplicidade e verificação | Núcleo |
| 5. Acionamento e equipes | Seleção automática por proximidade e compatibilidade, aviso regional, reserva, chegada, término e próximo convite | Núcleo |
| 6. Voluntariado e comunidade | Competências, credenciais, turno, restrições, liderança comunitária, treinamento e reconhecimento | Núcleo |
| 7. Recursos e logística | Frota, equipamentos, quantidade, condição, combustível, estoque, origem, destino e comprovantes | Núcleo |
| 8. Abrigos e acolhimento | Capacidade real, acessibilidade, água, higiene, alimentação, equipes, admissão/saída e espaço para animais | Essencial ao piloto com abrigamento |
| 9. Famílias e necessidades | Atendimento por família/pessoa, responsável técnico, acessibilidade, dependências e proteção de dados | Essencial ao piloto com assistência |
| 10. Doações e distribuição | Necessidade antes da campanha, promessa versus recebimento, triagem, validade, transporte e entrega | Expansão inicial |
| 11. Comunicação pública | Mensagens automáticas, boletins, segmentação, confirmação pelo WhatsApp, rumores e consultas sanitizadas | Núcleo |
| 12. Danos e recuperação | Vistorias, classificação técnica, obras, serviços essenciais, encaminhamentos e acompanhamento | Expansão inicial |
| 13. Custos e prestação de contas | Autorização, gasto, combustível, reembolso, doação e dossiês de evidências | Desde o primeiro gasto |
| 14. Relatórios, simulados e aprendizado | SitRep, plano de ação, cobertura, tempos, pendências, replay persistente e plano de melhoria | Núcleo + evolução |
| 15. Configuração e auditoria | Usuários, funções, catálogo de riscos, integrações, retenção, permissões e logs | Fundação |

### 6.3 Preservação das funcionalidades existentes e aprovadas

As funcionalidades aprovadas permanecem no escopo. A migração altera a implementação e as regras necessárias à confiabilidade; os itens simulados passam a operar sobre dados reais por fases.

| Função existente ou aprovada | Destino e evolução |
|---|---|
| Heatmap por gravidade | Situação e mapa, distinguindo concentração de relatos de risco efetivamente validado |
| Heatmap por janela de horário | Análise temporal e replay sobre histórico persistente |
| Timeline dentro da ocorrência | Histórico operacional detalhado, além da consulta pública simplificada |
| Alerta de nova ocorrência próxima ao responsável | Aviso automático ao responsável da região e ao substituto conforme configuração, em paralelo ao acionamento da ajuda |
| Chat interno entre funcionários e colaboradores | Comunicação operacional vinculada a incidente/missão, com canal real e permissões |
| Sugestão do que falta na zona ao concluir cadastro | Voluntariado e comunidade, calculada sobre capacidade disponível e necessidades da ocorrência confirmada |
| Responsável, substituto e coordenador informados ao voluntário | Contatos institucionais atualizados e adequados ao escopo da pessoa |
| Veículo próprio e combustível doado/reembolsável | Voluntariado, logística, autorização e prestação de contas |
| Relatório, reconhecimento e ranking existente | Relatório automático a partir das mensagens; agradecimento sem avaliação; eventual ranking usa contagens simples declaradas e publicação opcional, sem premiar velocidade ou risco |

### 6.4 Cobertura de riscos e demandas

O núcleo deve suportar diferentes classes de evento e ativar formulários e regras específicos por município: chuvas, enchentes, enxurradas, deslizamentos, vendavais, granizo, calor, seca, incêndios, acidentes tecnológicos, colapso de infraestrutura e eventos sanitários conforme competência. A entrada de demandas cotidianas pode continuar existindo, com encaminhamento adequado.

| Escolha do cidadão | Encaminhamento e cuidado |
|---|---|
| Acidente ou necessidade de socorro | Orientação imediata aos canais oficiais competentes e registro de acompanhamento |
| Trânsito e circulação | Órgão responsável, bloqueios e operação viária; risco imediato recebe escalonamento |
| Furto, roubo ou violência | Canal policial competente; informações protegidas; sem convocação de voluntários para intervenção |
| Alagamento, árvore, destelhamento, risco estrutural | Defesa Civil e equipes técnicas conforme natureza e risco |
| Falta de água, energia ou comunicação | Concessionária/órgão responsável e impacto em serviços essenciais |
| Animais em risco | Equipes habilitadas, abrigo, identificação e reunificação com responsáveis |
| Preciso de abrigo, alimento ou transporte | Triagem de necessidade e assistência, sem expor cadastro em mapa público |
| Quero ajudar ou doar | Oferta estruturada e direcionada à demanda validada |

Os números 190, 192 e 193 devem ser apresentados de acordo com a natureza da emergência; contatos locais e eventual 199 dependem da configuração e cobertura confirmadas. Um clique em `tel:` e uma declaração de que alguém ligou não equivalem a despacho confirmado pela autoridade.

### 6.5 Experiência premium

Premium significa operar sob pressão com informação compreensível. Para o voluntário, o fluxo cabe no WhatsApp: receber o local e o contato regional, confirmar chegada e confirmar término. Fotos, relatórios e avaliações não são exigidos para concluir a participação. A interface das equipes deve ter poucos passos por tarefa; botões grandes; leitura por teclado e leitor de tela; etiquetas além de cores; linguagem simples; modo de baixo consumo de dados; mensagem explícita de sincronização; carregamento de mídia sob demanda; acessibilidade como meta WCAG 2.2 AA [F08]. A população pode usar atendimento por telefone, balcão ou agente comunitário, sem depender de smartphone, CPF ou instalação de aplicativo para relatar uma emergência.

O mapa público deve omitir posições individuais de equipes, famílias vulneráveis, vítimas, contatos pessoais e fotos não autorizadas. O painel interno mostra níveis de acesso e atualização diferentes. A disponibilidade de um abrigo deve indicar quando foi confirmada, não apenas um número de vagas desatualizado.

## 7. Arquitetura multi-tenant proposta

### 7.1 Escolha de arquitetura

Começar com um backend modular, banco transacional central, armazenamento de arquivos e trabalhadores assíncronos. A aplicação de campo e o centro de operações consomem contratos de API versionados. Microserviços independentes podem ser extraídos quando houver necessidade demonstrada de escala, isolamento ou equipes autônomas; não são um requisito inicial para ser premium.

| Camada | Proposta |
|---|---|
| Interfaces | WhatsApp como fluxo principal do voluntário; web acessível e PWA para equipes, com persistência local; experiência pública separada |
| Identidade | Provedor OIDC, MFA administrativo, memberships por município, órgão e função |
| Domínio | API modular para relatos, incidentes, missões, recursos, assistência, comunicação e auditoria |
| Dados | PostgreSQL + PostGIS; busca textual e pgvector quando a IA exigir |
| Arquivos | Armazenamento de objetos com URLs assinadas, verificação de tipo, inspeção e políticas de retenção |
| Processamento | Outbox transacional, workers e filas; motor durável para fluxos longos quando justificado |
| Campo offline | IndexedDB/SQLite conforme cliente, operações identificadas, anexos e sincronização limitada ao escopo autorizado |
| Integrações | Adaptadores versionados para WhatsApp, alertas, GIS, concessionárias e sistemas oficiais |
| IA | Serviço isolado de inferência, ferramentas de domínio com autorização e avaliações por tarefa |
| Operação | Logs, métricas, rastreamento, backups, restauração, capacidade, alertas de falha e procedimentos manuais |

### 7.2 Estratégia de isolamento

| Estratégia | Vantagem | Custo e limite | Decisão proposta |
|---|---|---|---|
| Banco/esquema compartilhado com `tenant_id` e RLS | Operação eficiente e migrações uniformes | Erro de política pode ter impacto amplo; restauração por tenant requer desenho | Padrão possível para municípios pequenos, após testes rigorosos |
| Esquema por tenant | Separação de nomes e alguma flexibilidade | Migrações e conexões mais complexas; não isola privilégios administrativos | Não adotar como padrão sem necessidade específica |
| Banco ou ambiente dedicado | Maior controle de desempenho e isolamento | Maior custo e responsabilidade operacional | Opção para contratos/escala que justifiquem |

O contrato e a avaliação de riscos definem a opção de hospedagem. Multi-tenant é propriedade do produto e de seus controles; não obriga todas as cidades a compartilhar o mesmo banco físico.

### 7.3 Invariantes técnicos

- Para usuários autenticados, o município ativo é resolvido no servidor a partir da identidade e de um vínculo autorizado. Um `tenant_id` enviado pelo navegador não é suficiente.
- Na entrada pública sem login, o município é resolvido pelo domínio/rota ou canal municipal configurado e pela confirmação da localidade; o cidadão não precisa de membership. Em webhooks, validar assinatura e identificador do número/canal contra configuração do servidor. Localização incerta ou em outro município exige encaminhamento rastreável, sem perder o relato.
- Todas as tabelas de domínio têm escopo municipal explícito. Chaves e referências compostas impedem ligar uma missão de um município a um incidente de outro por acidente.
- RLS cobre leitura e escrita. Papéis de aplicação não devem ter poderes de superusuário ou bypass; funções privilegiadas exigem revisão. PostgreSQL documenta as exceções de proprietários, superusuários e `BYPASSRLS` [F09].
- O isolamento alcança arquivos, URLs assinadas, WebSockets, filas, cache, exportações, telemetria, pesquisa textual, vetores, backups e cópias locais.
- Um usuário pode pertencer a mais de uma prefeitura, com funções diferentes. A troca de contexto deve ser explícita e testada.
- Configuração municipal inclui identidade visual, código IBGE, fuso, contatos, zonas, ameaças, parceiros, políticas, canais e credenciais próprias.
- Workers recebem contexto validado e mantêm idempotência por tenant, origem e identificador da operação.
- Acesso de suporte é excepcional, temporário, justificado e auditado, com dados minimizados.
- Cada objeto operacional tem um tenant proprietário. Um evento regional agrega operações municipais por identificador de coordenação e concessões específicas. Os objetos compartilhados preservam proprietário, participantes, campos permitidos, finalidade, validade e revogação; não abrem todo o tenant nem permitem referências cruzadas arbitrárias.
- Um recurso cedido mantém identidade canônica e reserva autoritativa no município proprietário. O solicitante recebe oferta e confirmação de reserva, sem criar uma cópia independente do ativo disponível. Cancelamento, retorno, custos e término da cessão são registrados e reconciliados pelos dois lados.
- Uma cidade não pode esgotar a fila de emergência das demais: definir quotas, prioridades e proteção contra sobrecarga.
- O desligamento contratual prevê exportação, retenção, transição e eliminação compatível com as obrigações aplicáveis.

Os guards operacionais ficam versionados na configuração de cada prefeitura e são avaliados pelo backend a cada acionamento e mudança relevante. Conferir reserva, registrar o evento e preparar o envio devem formar uma operação consistente. Se as condições estão satisfeitas, o fluxo executa; se não estão, aplica a alternativa cadastrada. O resultado não é uma fila genérica de aprovações humanas.

### 7.4 Entidades mínimas para o modelo de dados

**Fundação:** `tenants`, `municipalities`, `users`, `memberships`, `organizations`, `roles`, `access_grants`, `zones`, `tenant_settings`.

**Operação:** `events`, `operational_periods`, `command_assignments`, `alerts`, `reports`, `incidents`, `incident_report_links`, `needs`, `missions`, `mission_dependencies`, `assignments`, `status_events`.

**Capacidade:** `volunteers`, `credentials`, `availability_windows`, `teams`, `resources`, `reservations`, `inventory_movements`, `donations`, `deliveries`.

**Assistência e recuperação:** `households`, `case_records`, `shelters`, `shelter_stays`, `damage_assessments`, `recovery_actions`, `expenses`, `reimbursements`.

**Evidência e integração:** `attachments`, `consent_records` quando aplicável, `message_events`, `webhook_inbox`, `outbox`, `audit_events`, `sync_operations`, `knowledge_documents`, `ai_runs`. Revisões técnicas excepcionais podem ser registradas no histórico, sem uma tabela ou etapa obrigatória de aprovação do atendimento.

Os nomes são uma proposta lógica, não uma exigência de criar todas as tabelas de uma vez. Separar identidade pessoal das projeções públicas. Retenção e permissões variam conforme o dado, a finalidade e as obrigações de arquivo; um prazo único de 90 dias para tudo não é adequado por definição.

### 7.5 Offline e continuidade

Salvar texto, formulários e mídia em armazenamento local adequado, com indicação de tamanho e estado. Um registro só sai da fila depois de recibo durável do servidor. Cada operação tem identificador estável para reenvio, versão base e política de conflito. Repetições e conflitos conhecidos são resolvidos automaticamente pelas regras de estado e reserva. Apenas conflitos materiais que as regras não conseguem conciliar geram aviso ao responsável; não se bloqueia a fila normal de ajuda. A regra de que a última gravação sempre vence pode apagar decisões relevantes.

O dispositivo guarda apenas as missões e dados autorizados para seu trabalho. Sessões offline têm prazo e mecanismos de proteção; revogar acesso remotamente não apaga instantaneamente um dispositivo desconectado. Mapas offline exigem licença e provedor compatíveis. A reserva definitiva de um recurso global requer reconciliação no servidor; uma equipe offline não pode prometer exclusividade invisível às demais.

A operação precisa de planos para indisponibilidade de internet, energia, WhatsApp, mapas, fornecedor de IA e banco. Incluir contatos e formulários de contingência, canais institucionais existentes e reconciliação posterior. Definir objetivos de recuperação e perda aceitável de dados com as prefeituras, comprovar restauração e dimensionar plantão; não anunciar SLA com base apenas no provedor de nuvem.

## 8. Comparação com referências internacionais e brasileiras

As capacidades abaixo são documentadas pelos respectivos projetos. Não foi realizado teste comparativo de desempenho, custo, suporte ou implantação. Uma funcionalidade não mencionada em uma página de produto não foi classificada como inexistente.

| Sistema ou referência | Capacidade comprovada documentalmente | O que aprender ou aproveitar | Posição do projeto atual |
|---|---|---|---|
| Ushahidi / Mzima [F10] | Coleta participativa, triagem por filtros/workflows e visualização | Entrada comunitária, formulários configuráveis, proveniência e verificação | O protótipo tem mapa e interação simulada; faltam canais e gestão real dos relatos |
| Sahana Eden atual [F11] | Gestão de casos, multi-tenancy e processos com múltiplos papéis | Assistência continuada e organização institucional | Estamos atrás em modelagem e maturidade de assistência; multi-tenancy não é diferencial exclusivo |
| Crisis Cleanup [F12] | Coordenação de ordens de trabalho para recuperação de propriedades | Necessidade antes da mobilização, trabalho assumido por organização e evitar duplicidade | Falta um ciclo confiável de missão e recurso; seu foco específico não cobre todo o produto proposto |
| WebEOC Nexus [F13] | Coordenação, workflows, SitRep/IAP, colaboração entre jurisdições, formulários offline e IA | Comando, passagem de turno, integração e operação de campo | Estamos atrás nesses controles; ter IA, mapas ou múltiplas organizações não comprova liderança |
| ArcGIS Emergency Management [F14] | Impacto territorial, infraestrutura, vias, abrigos, avisos e situação compartilhada | Camadas com origem e horário, GIS e diferenciação entre relato e avaliação técnica | Mapa atual é demonstrativo; faltam camadas operacionais e dados homologados |
| IFRC GO [F15] | Captura, análise e compartilhamento de dados de crise | Visibilidade de necessidades, ações das organizações e lacunas de cobertura | Falta coordenação humanitária e acompanhamento territorial de entregas |
| SISDC/PCO Paraná [F07] | Áreas de atenção, abrigos, recursos, ações, moradores e plano de contingência | Reutilizar planos e preparação municipal existentes | O projeto pode complementar a execução diária; essas capacidades já existem no ecossistema público |
| S2iD [F16] | Registro de desastres, reconhecimento federal, pedidos de recursos e acompanhamento | Dossiês e evidências reutilizáveis na prestação de contas | Faltam recuperação e documentação estruturada; não substitui o procedimento oficial |
| Defesa Civil Alerta e CAP [F17, F20] | Canal oficial de alerta e formato interoperável de mensagens | Autoridade, área, vigência, atualização e cancelamento | Há apenas alertas simulados; implementar CAP não concede permissão para emitir Cell Broadcast |

O Crisis Cleanup explicita limites de escopo, incluindo exclusão de gestão geral de casos, doações e voluntários espontâneos. Isso cria espaço para um produto de escopo mais amplo, mas não prova que o MARINGÁ ALERTA já o supere. Sahana informa que Eden ASP passou a ser a linha principal em maio de 2025; a versão Legacy não deve ser usada como retrato da versão atual.

### Onde há força e onde ainda estamos atrás

**Forças atuais do desenho:** vínculo territorial simples; convite à ajuda pelo canal já familiar ao cidadão; prontidão antes do evento; responsáveis e substitutos visíveis; confirmação de chegada e término pelo WhatsApp; reconhecimento simples da participação. Esses elementos estão representados no protótipo e merecem preservação.

**Diferencial potencial a provar:** custo e implantação compatíveis com municípios brasileiros, participação cidadã acessível, organização de ofertas em capacidade real, continuidade entre resposta e recuperação e cooperação entre cidades com dados protegidos. A prova deve vir de pilotos e indicadores de resolução, não de quantidade de telas ou de plugins.

**Defasagem atual:** segurança e isolamento; banco de dados e operação simultânea; comunicação real; capacidade confiável; offline; abrigos e famílias; comando e turnos; interoperabilidade; recuperação; observabilidade e suporte. O plano a seguir prioriza fechar essa distância.

## 9. IA que agrega valor operacional

### 9.1 Ordem de implementação

| Prioridade | Aplicação | Saída útil | Limite obrigatório |
|---|---|---|---|
| IA-01 | Transcrição e extração de texto, áudio, foto e documento | Dados estruturados para o sistema e entendimento de chegada/término | Guardar original; perguntar apenas quando uma informação necessária estiver ambígua, sem formulário adicional |
| IA-02 | Relacionar relatos semelhantes | Sugestões de vínculo, com razões e evidências | Não apagar protocolos nem fundir necessidades de famílias automaticamente |
| IA-03 | Assistente sobre planos e procedimentos | Resposta com fonte, versão, órgão e validade | Recuperar apenas material autorizado e admitir ausência de resposta |
| IA-04 | Boletim e passagem de turno | Resumo com pendências, recursos, abrigos e decisões | Números rastreáveis; avisos operacionais por modelos cadastrados são automáticos; manifestação institucional segue regra própria da prefeitura |
| IA-05 | Otimização da seleção de recursos | Melhor ordenação entre opções já compatíveis e disponíveis | Guards e reserva permanecem no backend; o acionamento normal é automático e não depende da IA |
| IA-06 | Rumores e contradições | Fila de checagem de alegações e imagens possivelmente repetidas | Não rotular pessoas como fraudulentas por decisão do modelo |
| IA-07 | Inteligência geoespacial | Áreas observadas/modeladas e comparação temporal | Exibir incerteza, cobertura e idade; validar com especialistas e campo |

O recebimento de relatos, protocolo, acesso aos dados, guards e acionamento automático de ocorrências confirmadas continuam operando se a IA falhar. Regras determinísticas, cálculos geográficos e motores de otimização podem ser mais adequados que um modelo de linguagem para partes do problema.

### 9.2 Escolha de modelo e agentes

Não existe evidência nesta revisão para eleger um modelo universalmente melhor para o projeto. Selecionar fornecedores e modelos com o mesmo conjunto de avaliação municipal, contendo português coloquial, áudio ruidoso, nomes de ruas, fotos ruins, múltiplas ocorrências, pedidos ambíguos e informações falsas.

Medir urgências não identificadas, erro de endereço ou número, fusão indevida de relatos, fidelidade de fontes, vazamento entre municípios, latência, custo e taxa de correção pelo operador. Separar testes de treino e medir por tipo de risco. Um percentual de confiança produzido pelo próprio modelo não deve ser exibido como probabilidade calibrada sem validação.

Agentes podem apoiar tarefas diferentes, mas devem compartilhar dados canônicos autorizados: agente de entrada, de documentação, de situação e de proposta logística. LangGraph ou um SDK de agentes pode organizar estado e revisão; o estado oficial da ocorrência pertence ao sistema transacional. Evitar começar por uma rede de agentes autônomos dependentes uns dos outros.

Todo conteúdo externo é dado não confiável: texto de cidadão, OCR, documento, página e transcrição podem conter instruções maliciosas. A aplicação define as ferramentas e permissões; nenhum anexo pode mudá-las. Registrar modelo, versão do prompt, fontes consultadas, saída, correções e efeitos produzidos; isso é registro automático do sistema, não uma tarefa de aprovação para o voluntário. Minimizar dados pessoais em inferência e observabilidade, com contratos e configuração de retenção adequados.

### 9.3 Tecnologias avançadas de desastres

**Google Flood Forecasting:** a documentação oferece previsões fluviais por API, sob CC BY 4.0 e sem cobrança dos dados, mas exige aprovação de acesso, ativação e chave. É candidato a fonte externa; cobertura útil e atualização em cada município precisam ser confirmadas. Previsão fluvial não representa, por si só, previsão de todo alagamento urbano [F24].

**NASA/IBM Prithvi e TerraTorch:** há modelo publicado ajustado para segmentação de água/inundação em imagens Sentinel-2. O toolkit atual está em `torchgeo/terratorch`. Recomendo pesquisa aplicada depois da estabilização do núcleo, com sensoriamento remoto, dados brasileiros, comparação com referência e análise de erros. O modelo não é um serviço de alerta municipal pronto [F25].

**Copernicus EMS:** produtos de mapeamento podem apoiar avaliação territorial e recuperação. A ativação é restrita a usuários autorizados e os produtos têm disponibilidade e latência próprias. Importar camadas existentes não equivale a possuir monitoramento instantâneo. A camada deve identificar aquisição, processamento, resolução, origem e validade [F26].

Sensores, imagens de satélite e drones autorizados podem ser fontes futuras; sua aquisição e governança são projetos específicos. O produto não deve prometer evacuação autônoma, certificação estrutural por foto ou trajetos garantidamente seguros por IA.

## 10. Repositórios e componentes selecionados

Catálogo verificado em 03/11/2026 em fontes dos projetos e API oficial do GitHub. Os repositórios desta tabela não estavam arquivados. O último push é sinal de atividade, não certificação de qualidade ou garantia operacional. As licenças indicadas são as observadas para o código principal; dependências, modelos, dados e funções enterprise podem ter termos próprios. Fixar versão e revisar compatibilidade antes de incorporar.

| Componente e fonte | Licença observada | Último push observado | Aplicação proposta / decisão |
|---|---|---|---|
| [PostGIS](https://github.com/postgis/postgis) | GPL-2.0 | 30/10/2026 | Incorporar como extensão para polígonos, interseção de alertas, localização e consultas espaciais |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | BSD-3-Clause no núcleo; componentes com avisos próprios | 03/11/2026 | Avaliar para camadas vetoriais; Leaflet pode continuar onde atender, sem migração estética obrigatória |
| [PMTiles](https://github.com/protomaps/PMTiles) | Implementações BSD-3-Clause; especificação CC0/domínio público | 16/09/2026 | Pacotes cartográficos próprios; conferir licenças do conteúdo e armazenamento disponível no dispositivo |
| [PowerSync Service](https://github.com/powersync-ja/powersync-service) | Apache-2.0 no core atual | 03/11/2026 | Prova de conceito de sincronização; definir autorização dos streams e validar escritas no backend |
| [Keycloak](https://github.com/keycloak/keycloak) | Apache-2.0 | 03/11/2026 | Alternativa para SSO/MFA e identidade; considerar custo de operação versus serviço gerenciado |
| [OpenFGA](https://github.com/openfga/openfga) | Apache-2.0 | 03/11/2026 | Opcional para relações complexas de acesso entre municípios, órgãos e incidentes |
| [Temporal](https://github.com/temporalio/temporal) | MIT | 03/11/2026 | Processos longos e escalonamentos; efeitos externos ainda precisam de idempotência |
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL License | 03/11/2026 | Busca semântica no mesmo banco autorizado; só adicionar quando houver caso de IA |
| [LangGraph](https://github.com/langchain-ai/langgraph) | MIT | 03/11/2026 | Assistentes com etapas e revisão; alternativa ao SDK de agentes escolhido, não dependência obrigatória |
| [Docling](https://github.com/docling-project/docling) | MIT no código | 03/11/2026 | Extrair planos, PDFs e tabelas com proveniência; revisar licenças dos modelos |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT no código | 02/11/2026 | Opção de transcrição local; medir qualidade e custo em áudio real autorizado |
| [Langfuse](https://github.com/langfuse/langfuse) | MIT fora dos diretórios enterprise | 03/11/2026 | Avaliação, rastreamento e custos da IA; filtrar informações pessoais nos traces |
| [Promptfoo](https://github.com/promptfoo/promptfoo) | MIT | 03/11/2026 | Avaliação automatizada e testes adversariais com casos sintéticos/autorizados |
| [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js) | Apache-2.0 | 03/11/2026 | Telemetria desde a fundação: API, filas, integrações, sincronização e IA |

Alternativa para assistência: [OpenAI Agents SDK](https://github.com/openai/openai-agents-python), MIT. Escolher uma abordagem de agentes conforme requisitos e equipe. Supabase pode ser uma opção gerenciada para PostgreSQL e serviços associados; isso não altera a obrigação de políticas por tenant nem resolve automaticamente o domínio de crises.

Não recomendo copiar integralmente um grande sistema de gestão de desastres e tentar adaptar todos os seus módulos ao mesmo tempo. Usar Sahana, Ushahidi e Crisis Cleanup como referências de domínio; adotar componentes quando houver encaixe comprovado. Também não recomendo usar scraping de portais ou automação de WhatsApp Web como infraestrutura central de uma prefeitura.

## 11. Plugins e MCPs

### 11.1 Três mecanismos distintos

**Integração operacional:** API ou webhook com contrato estável, recibos, repetição segura e monitoramento. Exemplo: entrada de mensagem de WhatsApp ou atualização de alerta.

**Plugin do produto:** módulo ou conector ativado por prefeitura, com configuração, credenciais, permissões, versão, proprietário, teste de saúde e opção de desativação. Exemplo: conector de concessionária ou formulário local de vistoria.

**MCP:** ferramentas expostas a um assistente para consultar dados e executar ações de domínio dentro dos guards. O MCP usa as mesmas regras das APIs; não cria uma aprovação humana adicional para ações já permitidas pela configuração.

### 11.2 Catálogo útil

| MCP | Uso recomendado | Restrição |
|---|---|---|
| [GitHub oficial](https://github.com/github/github-mcp-server) | Auditoria de código, issues, CI e preparação de mudanças | Escopo mínimo; leitura para revisão; mudanças pelo processo de desenvolvimento |
| [Playwright](https://github.com/microsoft/playwright-mcp) | Verificação de telas e fluxos em ambiente de teste | Não usar como integração operacional com órgãos de socorro |
| [Grafana](https://github.com/grafana/mcp-grafana) | Diagnóstico assistido de filas, falhas e desempenho | Leitura e dados estritamente necessários; separar acesso administrativo |
| [Docling MCP](https://github.com/docling-project/docling-mcp) | Ingestão controlada de documentação | Arquivos e destinos autorizados, limites de tamanho e proteção contra URLs internas |
| [Supabase MCP](https://github.com/supabase/mcp), se adotado | Trabalho interno de desenvolvimento e diagnóstico | A documentação adverte que opera com permissões de desenvolvedor; não entregar a usuários finais [F27] |
| Alerta MCP de domínio, a construir | Consultar incidentes, abrigos e recursos; preparar boletins e propostas | Autorização por usuário, prefeitura, função, incidente e finalidade |

### 11.3 Ferramentas propostas para o Alerta MCP

`consultar_incidentes`, `consultar_capacidade_abrigo`, `consultar_disponibilidade_recursos`, `buscar_procedimento_aprovado`, `preparar_boletim`, `acionar_ajuda`, `registrar_chegada`, `registrar_termino` e `explicar_pendencias` são exemplos de ferramentas pequenas, com entradas e saídas estruturadas. Não disponibilizar SQL arbitrário, acesso geral ao armazenamento, credencial administrativa ou execução de shell a operadores.

O tenant é derivado da sessão ou canal validado, e nunca do desejo do modelo. Cada ação identifica ocorrência, participante, argumentos, origem e versão. O backend reavalia os guards e executa automaticamente quando as condições estão satisfeitas, com chave de idempotência. Mensagens de WhatsApp fornecem as confirmações; não há aprovação humana de cada escrita operacional. Alterar regras administrativas é uma operação distinta do acionamento normal.

Aplicar autenticação e autorização de transporte adequadas, validação do destinatário dos tokens, escopos mínimos e proteção contra repasse indevido de tokens e requisições a redes internas, conforme a documentação MCP consultada [F28–F29]. `project_ref` de Supabase limita um projeto Supabase; não implementa separação entre duas prefeituras que estejam dentro dele.

## 12. Integrações e interoperabilidade

| Integração | Plano concreto | Condição antes de produção |
|---|---|---|
| WhatsApp Business Platform | Conta/número municipal, credenciais segregadas, entrada de texto/áudio/foto/localização, templates e recibos | Homologar canal oficial, permissões, categorias, limites, custos e contingência |
| Atendimento web/telefone/balcão | Formulário acessível e entrada assistida vinculados ao mesmo domínio | Um cidadão pode continuar atendimento por outro canal sem perder histórico |
| INMET/CEMADEN/SIMEPAR/Defesa Civil | Adaptadores por fonte e produto, com metadados e estado de atualização | Confirmar endpoint, cobertura, licença, credencial, acordo e suporte de cada fonte |
| CAP | Preservar identificador, emissor, status, tipo, referências, área, urgência, severidade, certeza e validade | Testar atualização, cancelamento, expiração e separação entre teste e mensagem real |
| S2iD/SISDC e outros sistemas estaduais | Preparar pacote exportável e mapeamento de campos/documentos | Só automatizar submissão após confirmação de interface e autorização institucional |
| GIS municipal / IBGE / camadas de risco | Importar limites e dados com versão, sistema de coordenadas e responsável | Não tratar rótulos de demonstração como divisão territorial oficial |
| Concessionárias e serviços essenciais | Pedidos, protocolo externo, área afetada, previsão informada e confirmação de restabelecimento | Integração contratada ou operação manual rastreável |
| Organizações parceiras e municípios | Pedido/aceite de apoio, escopo, recursos, prazo, custos e encerramento | Acordo de compartilhamento e teste de revogação |

A Cloud API é o canal oficial documentado pela Meta [F21]. A regra geral documentada para mensagens livres usa janela de atendimento de 24 horas após mensagem do usuário; fora dela, mensagens iniciadas pelo negócio normalmente requerem template aprovado, observadas as regras vigentes do provedor [F22]. Não dimensionar prontidão ou alertas em massa como se toda conversa pudesse ser iniciada livremente. O sistema acompanha mensagem preparada, recebida pelo provedor, entregue quando houver recibo e respondida com chegada ou término. Recibo de entrega não conta como presença, e não se exige um aceite operacional adicional do voluntário.

Uma mensagem meteorológica pode disparar prontidão e comunicação conforme a configuração municipal; uma ocorrência confirmada dispara o acionamento operacional permitido pelos guards. Avisos ao responsável regional e convites aos voluntários são enviados automaticamente. CAP é um formato interoperável e não concede, por si só, acesso aos canais oficiais de Cell Broadcast.

## 13. Organização da equipe de construção

| Frente | Responsável necessário | Entrega pela qual responde |
|---|---|---|
| Produto e implantação | Product owner com interlocutor municipal | Escopo, prioridade, adoção, fluxos e aceite municipal |
| Operação de crises | Especialista de Defesa Civil/SCI e representantes de campo | Regras de risco, autoridade, missão, voluntariado e simulados |
| Arquitetura e backend | Liderança técnica e engenharia backend | Modelo de domínio, tenancy, APIs, transações e integrações |
| Frontend e experiência | Engenharia web/mobile e UX acessível | Interfaces de cidadão, campo e COE, com baixa conectividade |
| Dados/GIS | Especialista geoespacial e engenharia de dados | Geometrias, fontes, qualidade, atualização e interoperabilidade |
| Segurança e privacidade | Segurança, encarregado e assessoria jurídica municipal | Acesso, dados, retenção, acordos e resposta a incidentes |
| Confiabilidade e QA | SRE/DevOps e QA | CI, capacidade, backups, restauração, testes de isolamento e operação assistida |
| IA aplicada | Engenharia de IA e avaliadores operacionais | Corpus, avaliação, limites, rastreabilidade e qualidade por tarefa |

Essas são responsabilidades, não uma exigência de oito contratações imediatas. Pessoas podem acumular frentes conforme capacidade, mantendo revisão independente onde necessária. Codex pode executar tarefas de engenharia e preparar evidências, mas não define sozinho competência institucional, segurança de missão ou critérios jurídicos.

### Responsabilidade e execução automática

| Tema | Preparado antes da ocorrência | Durante a ocorrência |
|---|---|---|
| Confirmação e encaminhamento | Regras de entrada, tipos de risco e serviços responsáveis | O evento confirmado inicia o fluxo; não há uma segunda aprovação |
| Acionamento de ajuda | Compatibilidade, proximidade, disponibilidade, quantidade e prazo | Sistema seleciona, reserva, convida e atualiza o painel |
| Responsabilidade regional | Responsável, substituto, contato e regra de contingência | Ambos recebem avisos conforme configuração; ninguém precisa autorizar cada convite |
| Chegada e término | Associação segura entre canal, pessoa e ocorrência | Confirmações no WhatsApp atualizam participação e disponibilidade |
| Necessidade de outra ajuda | Critérios de continuidade e compatibilidade | Sistema encaminha a pendência e oferece outra ocorrência à pessoa disponível |
| Mensagens operacionais | Modelos, preferências e destinatários | Envio automático conforme evento e regras |
| Atividade técnica, despesa ou ato institucional | Competências profissionais e regras administrativas próprias | Seguem seu procedimento específico, sem bloquear a confirmação ou saída do voluntário |
| Cooperação entre municípios | Acordo, escopo e recursos compartilháveis | Guards aplicam o acordo; dados e reservas mantêm o município proprietário |

A autorização de acesso é uma regra técnica avaliada pelo servidor, não um pedido de aprovação humana. Homologar a configuração e a entrada em produção faz parte da implantação; não se repete essa aprovação a cada ocorrência. Mudanças de regra ficam registradas e não podem ser produzidas livremente por mensagens ou por um modelo de IA.

## 14. Roadmap por dependência e entregas verificáveis

O planejamento abaixo é uma sequência recomendada. Duração e orçamento devem ser estimados após definir equipe, municípios-piloto, contratos de comunicação e escopo inicial de risco. Um piloto funcional pode ser entregue antes do conjunto completo, desde que os fluxos críticos incluídos estejam homologados e os limites de escopo sejam explícitos.

| Etapa | Entrega | Dependência | Evidência de aceite |
|---|---|---|---|
| 0. Contrato de produto e operação | Escopo de riscos, autoridade, catálogo, fluxos, modelo e matriz de acesso | Interlocutores municipais | Dois cenários completos aprovados: um climático e outro de infraestrutura/tecnológico |
| 1. Fundação multi-tenant | Identidade, tenants, dados, arquivos, auditoria, CI e telemetria | Etapa 0 | Dois municípios isolados em todas as superfícies e configuração sem alterar código |
| 2. Núcleo operacional | Relatos, ocorrências, guards no banco, responsáveis regionais, reserva, chegada e término | Etapa 1 | Ocorrência confirmada gera acionamento e aviso regional automaticamente, sem aprovação de rotina |
| 3. Comunicação oficial | WhatsApp real, convite, chegada, término e próximo convite; entrada web/assistida | Etapas 1–2 | Duas confirmações bastam para ajudar; webhooks repetidos não duplicam efeitos; falhas seguem contingência automática |
| 4. Campo e continuidade | Formulários, mídia e mapas permitidos offline; retomada | Etapas 1–2 | Trabalho offline e reconexão sem perda; conflitos apresentados |
| 5. Prontidão e assistência | Alertas homologados, capacidade, abrigos, famílias, doações e apoio entre municípios | Etapas 2–4 | Simulado integrado com lotação, vulnerabilidade e ajuda mútua |
| 6. Recuperação e contas | Danos, ações de recuperação, custos, reembolsos e dossiês | Etapas 2 e 5 | Caso acompanhado além da resposta imediata e documento reutilizável em prestação de contas |
| 7. IA assistiva e MCP de domínio | Extração, agrupamento, RAG, boletim, avaliações e ferramentas restritas | Dados e operação das etapas anteriores | Ganho mensurado e ausência de falhas críticas no conjunto de avaliação |
| 8. Piloto ampliado e escala | Treinamento, suporte, capacidade, restauração, governança e novos tenants | Fluxos essenciais aprovados | Simulado com falhas de dependências e validação municipal documentada |

As etapas 3 e 4 podem ocorrer em paralelo depois do núcleo. Infraestrutura de observabilidade, backups, segurança e testes começa na etapa 1 e amadurece em todas as entregas. Pesquisa de IA pode ocorrer em paralelo sobre dados sintéticos sem bloquear a operação.

### Backlog organizado para transformar em issues

| ID | Prioridade | Trabalho | Dependência / critério principal |
|---|---|---|---|
| GOV-01 | P0 | Consolidar catálogo de riscos e serviços | Aprovação operacional; não restringir o domínio a ciclone |
| GOV-02 | P0 | Guards e responsável/substituto por região | Regras e destinatários cadastrados antes da crise; nenhuma aprovação por mobilização |
| GOV-03 | P0 | Finalidade, base legal e retenção por classe de dado | Separar socorro, voluntariado, imagem e contas |
| TEN-01 | P0 | Provisionamento de prefeitura e configuração | Duas cidades criadas sem alterar código |
| TEN-02 | P0 | Identidade, memberships e autorização | Troca de contexto sem ampliar privilégios |
| TEN-03 | P0 | RLS, chaves compostas e testes negativos | Negar acesso e referências entre tenants |
| TEN-04 | P0 | Isolamento de arquivos, filas, cache e realtime | Nenhuma projeção acessível por outro município |
| TEN-05 | P0 | Isolamento de exports, vetores e observabilidade | Teste com registros sintéticos distintos por cidade |
| DOM-01 | P0 | Modelo evento/relato/incidente/necessidade/missão | Duplicidade preserva relatos e necessidades |
| DOM-02 | P0 | Estado e histórico persistente de ocorrência e participação | Chegada/término por WhatsApp atualizam o estado; reconexão preserva o trabalho |
| DOM-03 | P0 | Regra de prioridade aprovada | Média antiga não supera automaticamente risco vital |
| DOM-04 | P0 | Visibilidade consistente no mapa/listas/KPIs | Em atendimento continua visível |
| RES-01 | P0 | Compatibilidade e acionamento automático por proximidade | Guards impedem tarefa incompatível; ocorrência confirmada dispara ajuda e aviso regional |
| RES-02 | P0 | Turnos, prontidão e validade | Capacidade baseada em disponibilidade efetiva |
| RES-03 | P0 | Reserva automática e convites com prazo | Sem conflito de recursos nem aceite obrigatório; convite não é contado como presença |
| RES-04 | P0 | Término, liberação e próximo convite | Mensagem de término libera a participação correspondente; outra ajuda só por novo convite |
| COM-01 | P0 | Webhook oficial com autenticação e inbox durável | Persistir antes de confirmar recebimento externo |
| COM-02 | P0 | Outbox, recibos, retries e reconciliação | Repetição não duplica efeito |
| COM-03 | P1 | Templates, preferências e contingência | Respeitar fase/canal e registrar indisponibilidade |
| COM-04 | P0 | Acompanhamento público segregado | Protocolo sequencial não funciona como segredo |
| OFF-01 | P0 | Armazenamento offline de tarefas e anexos | Fechar aplicativo não elimina rascunho salvo |
| OFF-02 | P0 | Sincronização e conflitos | Operações confirmadas uma vez; conflitos críticos não sobrescritos silenciosamente |
| OFF-03 | P1 | Pacotes de mapas permitidos e dados antigos | Indicar área, versão, cobertura e atualização |
| ALT-01 | P1 | Homologar fonte oficial de alerta | Dados reais distinguíveis de teste/exercício |
| ALT-02 | P1 | Atualização, cancelamento e expiração CAP | Não manter alerta cancelado como ativo |
| ALT-03 | P1 | Prontidão real e escalonamento | Confirmado não equivale a escalado ou em campo |
| HUM-01 | P1 | Abrigos e lotação concorrente | Evitar encaminhamento além da capacidade confirmada |
| HUM-02 | P1 | Casos de famílias e necessidades específicas | Acesso restrito e plano de acompanhamento |
| HUM-03 | P1 | Animais e reunificação assistida | Responsáveis e destino registrados |
| LOG-01 | P1 | Estoque, lotes, validade e movimentações | Disponível = saldo físico apto menos reserva válida |
| LOG-02 | P1 | Doações orientadas a necessidades | Distinguir promessa, recebimento, reserva e entrega |
| LOG-03 | P1 | Combustível e reembolso | Pré-autorização, comprovante, conferência e registro de pagamento |
| REC-01 | P1 | Término simples e continuidade de pendências | Sem fotos obrigatórias, prova ou supervisor; necessidade restante recebe encaminhamento automático |
| REC-02 | P1 | Vistorias e recuperação de serviços | Responsável técnico e marcos de liberação |
| REC-03 | P1 | Dossiê para sistemas oficiais | Campos e evidências exportáveis, sem prometer submissão automática |
| GOV-04 | P1 | Cooperação entre prefeituras | Pedido, aceite, prazo, escopo, custo e revogação |
| IA-01 | P1 | Transcrição/extração assistida | Campos incertos identificados; original preservado |
| IA-02 | P1 | Agrupamento reversível | Não eliminar pedidos individuais |
| IA-03 | P1 | RAG e boletim com fontes | Documento válido e autorizado; números rastreáveis |
| IA-04 | P1 | Avaliações e observabilidade protegida | Caso urgente, injeção e vazamento em suíte contínua |
| IA-05 | P2 | Otimização opcional de recursos | O acionamento automático já funciona sem IA; guards sempre prevalecem |
| IA-06 | P2 | Geoespacial avançado | Validação local por especialistas antes de uso operacional |
| MCP-01 | P2 | Ferramentas de domínio | Mesmo controle de acesso e auditoria das APIs |
| OPS-01 | P0 | Backups, restauração e contingência | Ensaio documentado de recuperação |
| OPS-02 | P0 | Monitoramento e capacidade | Identificar falha de canal, fila, sincronização e fonte |
| OPS-03 | P0 | Simulado com dois tenants e falhas | Aprovação do núcleo antes de atendimento real |
| UX-01 | P1 | Acessibilidade e mobile | Fluxos executáveis por teclado, leitor e aparelho de campo |
| UX-02 | P1 | Agradecimento automático e aprendizado do sistema | Sem nota, prova de contribuição ou formulário; publicação opcional |

Itens P1 de abrigo ou assistência tornam-se P0 para um piloto que inclua esses serviços. A prioridade depende do risco efetivamente assumido, não de uma categoria fixa de funcionalidade.

## 15. Critérios para considerar o produto pronto para um piloto real

1. Dois municípios operam simultaneamente; usuários não leem, escrevem, buscam, exportam ou assinam arquivos uns dos outros sem autorização específica.
2. Duas ocorrências concorrentes não mobilizam o mesmo recurso exclusivo; convite enviado não é contado como chegada.
3. Relatos repetidos do mesmo fato geram vinculação e preservam protocolos; famílias diferentes continuam com necessidades próprias.
4. Uma ocorrência em atendimento permanece no mapa e nas listas, com estado coerente em todos os dispositivos.
5. O voluntário conclui sua participação apenas confirmando chegada e término pelo WhatsApp, sem aceite prévio, fotos, relatório ou validação de supervisor. A PWA das equipes preserva seus registros offline.
6. Webhooks repetidos, fora de ordem ou após timeout não geram incidentes, mensagens ou pagamentos duplicados.
7. Uma ocorrência confirmada aciona automaticamente pessoas próximas e compatíveis e avisa o responsável regional, sem aprovação intermediária. Guards impedem tarefas incompatíveis e conflitos de alocação.
8. Um alerta atualizado, expirado ou cancelado muda o quadro operacional sem apagar o histórico.
9. Um abrigo com capacidade esgotada deixa de aceitar encaminhamento automático e sinaliza atualização antiga.
10. Término libera a participação automaticamente; necessidades ainda abertas continuam com encaminhamento e responsável. O cidadão pode informar que o problema permanece, sem avaliação de sua contribuição.
11. Troca de turno e de comando preserva tarefas, decisões, recursos, fontes e responsáveis.
12. Falhas de WhatsApp, mapa ou IA não impedem registro e acompanhamento pelo núcleo e canais alternativos.
13. Restauração de banco, arquivos e configuração é executada; objetivos acordados de recuperação são medidos.
14. Dados públicos não expõem vítimas, contatos, saúde, posições de equipes nem arquivos internos por URL previsível.
15. A avaliação da IA inclui português local, falsos relatos, documento vencido, prompt injection e dois tenants com informações distintas.
16. Um caso continua acompanhado por semanas depois da fase aguda, com necessidades, encaminhamentos e gastos rastreáveis.
17. O atendimento funciona em uma modalidade assistida para quem não usa smartphone; acessibilidade é validada com usuários.
18. Um pedido de apoio entre municípios compartilha apenas os dados acordados e perde acesso ao expirar ou ser revogado.

Esses são critérios propostos. Não foram cumpridos pelo protótipo atual nem testados integralmente nesta auditoria.

## 16. Indicadores, custos e sustentação

### Indicadores de resultado

Mensurar automaticamente tempo entre recebimento, confirmação da ocorrência, acionamento, chegada e término informado. Distinguir resolução da ocorrência de término da participação individual; não exigir validação adicional de voluntários para produzir indicadores. Separar distribuição e casos extremos por risco e território, em vez de usar apenas média geral. Acompanhar necessidades ainda não atendidas, pedidos reabertos, deslocamentos duplicados, disponibilidade real, ocupação de abrigos, falhas de entrega de mensagens, dados desatualizados e recuperação de serviços essenciais.

A participação cidadã deve incluir retorno e possibilidade de contestar decisões ou corrigir informação. Medir resposta a reclamações e cobertura de pessoas com barreiras de acesso, coerentemente com a abordagem de participação e responsabilização perante comunidades da IFRC [F19]. O agradecimento decorre das confirmações já enviadas, sem prova adicional nem avaliação de qualidade. A publicação do nome é opcional. Os indicadores avaliam a operação; não atribuem nota à pessoa que ajuda nem incentivam competição por rapidez.

### Custos e operação comercial

Planejar custo base por tenant, pico de crise, mensagens oficiais, mapas/geocodificação, armazenamento e transferência de mídia, inferência, observabilidade, suporte e simulados. Uma biblioteca gratuita não torna o serviço gratuito. Custos variáveis e limites devem ser visíveis ao administrador sem interromper silenciosamente um fluxo crítico durante uma emergência.

O pacote essencial de cada prefeitura inclui proteção de dados, trilha, continuidade e funções mínimas do escopo contratado. Serviços dedicados, integrações especiais, análises geoespaciais avançadas e implantação regional podem compor ofertas adicionais. Definir saída contratual e portabilidade para evitar dependência incompatível com a continuidade pública.

## 17. Instruções de continuidade para o Codex

1. Tratar este documento como proposta auditada, preservando o histórico do guia atual e distinguindo recomendação de decisão formalmente adotada.
2. Criar plano de trabalho e decisões de arquitetura antes da migração, com critérios de aceite associados às issues.
3. Manter o protótipo identificável como demonstração e criar ambiente de desenvolvimento para o núcleo operacional.
4. Começar por TEN-01 a TEN-05, DOM-01/02 e OPS-01/02, com dois municípios sintéticos desde o primeiro teste.
5. Implementar o fluxo prioritário completo: ocorrência confirmada → guards e reserva no backend → acionamento automático + aviso regional → chegada pelo WhatsApp → término pelo WhatsApp → liberação e eventual novo convite. Não introduzir aceite obrigatório, prova de contribuição, avaliação de qualidade ou aprovação humana de rotina.
6. Migrar as funções atuais para contratos reais e preservar zonas, responsáveis, prontidão, ajuda, combustível, anexos opcionais e reconhecimento simples. Relatórios são gerados com os dados já registrados; o voluntário não preenche prestação de contas para encerrar sua ajuda.
7. Só ativar envio real, importação de dados pessoais e uso municipal depois dos testes e da autorização operacional correspondente.
8. Entregar mudanças em unidades revisáveis, com evidência de comportamento, riscos restantes e documentação atualizada.

**Resultado esperado da próxima fase:** uma operação pequena e completa, com isolamento entre prefeituras e rastreabilidade de ponta a ponta, sobre a qual os módulos de assistência, recuperação e inteligência possam crescer de forma consistente.

## Anexo A. Evidências da auditoria de código

Referências de linha correspondem exclusivamente ao commit auditado. Para consultar, usar o [index.html fixado nessa versão](https://github.com/AldenQuesada/maringa-alerta/blob/14e0bb8283dc7cd500235f75101ae644febc71db/index.html) e o [sw.js fixado nessa versão](https://github.com/AldenQuesada/maringa-alerta/blob/14e0bb8283dc7cd500235f75101ae644febc71db/sw.js). Não foram utilizados dados pessoais reais nos testes.

| Evidência | Trecho | Natureza e consequência |
|---|---|---|
| Cidade, zonas e contexto de evento fixos | `index.html`, 569–598, 1326–1336 e 2189 | Ausência de modelo SaaS e evento configurável |
| Persistência administrativa limitada | 606–624 | Salva funcionários/equipes; não persiste a operação inteira |
| Ocorrências e cadastros gerados em memória | 732, 776–864 | Recarregar recria/perde parte dos dados |
| Filtro do mapa | 919–924 | Mantém apenas `ativa` e remove marcadores de `em_atendimento` |
| Seleção de voluntários | 813–821 | Considera zona/distância; faltam guards de compatibilidade e disponibilidade e distinção entre convite e presença; aceite prévio não é requisito |
| Liberação do voluntário | 1278 | Marca livre sem verificar outras alocações |
| Priorização | 1714–1720 | Média antiga pode superar alta recente; presença reduz 150 pontos |
| Preferência e prontidão | 1815–1838, 1915–1923 | Preferência não filtra aviso; alertas expirados podem participar do painel |
| Capacidade e recursos | 647, 677–685, 1576–1579 | Declaração de contribuição e números simulados não são reserva operacional |
| Encerramento e pendências | 1251–1287 | Conclusão não cria trabalho sucessor nem revisão/reabertura |
| Serviço oficial e SLA | 1178–1185, 1222–1230, 1754–1771 | Discador/anotação não são integração; timer depende da página aberta |
| Fila offline | 2225–2233 | Após recarga pode limpar mensagem sem entregar à conversa simulada |
| Dependências offline | `sw.js`, 4–28; `index.html`, 7, 537–538 | Cache de HTML não garante dependências externas e operação offline |
| Auditoria concorrente | 2047–2068 | Duas operações podem usar o mesmo hash anterior; log continua local |
| CPF e recusa no cadastro | 1318–1323, 1372, 1413–1416 | CPF é exibido na bolha; recusa não limpa a conversa já presente no DOM |
| Sidebar em mobile | 323–325, 903 | Escondida por CSS sem mecanismo implementado de reabertura |
| Distância, posições e previsão de chegada | 727–729, 808–819, 1430, 2135 | Distância geodésica calculada sobre posição sorteada; ETA também simulado |
| Status público e papéis | 427–455, 2148–2154, 2240–2270 | Dados não separados por autorização; papel escolhido no navegador |
| Indicadores de reconhecimento/prontidão | 2178–2186 | Agregados misturam mobilização e participação; separar convite, chegada e término informado, sem exigir prova adicional |
| Interpolação de nome de responsável | 886 | Campo editável inserido sem escape nesse ponto; corrigir renderização de entrada não confiável |

O guia já reconhece expressamente vários limites de demonstração. O problema não é uma promessa deliberada de segurança; é a necessidade de impedir que escolhas de simulação sejam transportadas para o produto real. Há também divergências pontuais: o CPF aparece no chat apesar da afirmação de nunca exibi-lo integralmente; no fluxo examinado, o cadastro novo fica em memória/DOM, e não é incluído pelo `saveAdminState` no localStorage administrativo.

### Seis verificações locais reproduzidas

Método: funções e instruções extraídas do arquivo auditado, executadas em Node com substitutos mínimos do navegador, mapa e armazenamento. Os resultados confirmam a lógica observada; não representam teste de interface completa ou servidor.

| Caso | Entrada | Resultado observado |
|---|---|---|
| Prioridade | Média/pública com 60 min; alta/privada recém-chegada | 330 contra 300; média aparece acima. Alta/pública em atendimento recebe 160 |
| Alocação e liberação | Um voluntário de comida; duas ocorrências de rede elétrica exposta | Mesmo ID nas duas; concluir uma marca-o livre enquanto a outra permanece ativa |
| Visibilidade | Ocorrência `em_atendimento`; atualização das camadas | Marcador removido do mapa |
| Reconexão | Fila de chat existente; histórico de conversa reiniciado | Fila fica vazia e nenhuma conversa recebe a mensagem |
| Auditoria concorrente | Duas chamadas simultâneas de `auditPush` | Verificação falha na segunda entrada sem adulteração |
| Preferência de alerta | Voluntário com opção `depois`; pré-ativação | Recebe mensagem simulada mesmo assim |

Não foi necessário executar cargas maliciosas para identificar o ponto de HTML sem escape. Não foram realizadas alterações no repositório, publicação, instalação de conectores ou envio de mensagens a pessoas.

## Anexo B. Fontes primárias

Consulta realizada em 03/11/2026. Os links de repositórios e licenças na seção 10 e os links de MCPs na seção 11 também são fontes desta revisão. Recursos de terceiros devem ser reavaliados no momento da contratação e do uso, especialmente disponibilidade, versão, licença e acesso.

| Ref. | Fonte | Uso na revisão |
|---|---|---|
| F01 | [ANPD — perguntas frequentes](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes) | Definição de dado pessoal, sensível e hipóteses de tratamento |
| F02 | [MIDR — consentimento no poder público](https://www.gov.br/mdr/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-e-respostas-frequentes-sobre-lgpd/o-tratamento-de-dados-pessoais) | Não generalizar consentimento como única base |
| F03 | [INMET — catálogo oficial CAP/WIS2](https://wis2bra.inmet.gov.br/oapi/collections/discovery-metadata/items/urn:wmo:md:br-inmet:alerts?f=html) | Evidência de publicação de metadados de alertas CAP |
| F04 | [WMO — autoridade emissora INMET](https://alertingauthority.wmo.int/authorities.php?recId=22) | Registro de autoridade e referência de feed |
| F05 | [Google Weather API — alertas](https://developers.google.com/maps/documentation/weather/weather-alerts) | Fontes CENAD/INMET e atribuição |
| F06 | [OSMF — política de tiles](https://operations.osmfoundation.org/policies/tiles/) | Ausência de SLA e restrições de pré-download/offline |
| F07 | [Defesa Civil PR — Plano de Contingência e Simulado](https://www.defesacivil.pr.gov.br/Pagina/Plano-de-Contingencia-e-Simulado) | SISDC/PCO e SCI |
| F08 | [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Meta de acessibilidade |
| F09 | [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | RLS, políticas e exceções de privilégios |
| F10 | [Ushahidi — Mzima](https://docs.ushahidi.com/platform-user-manual/overview-of-ushahidi-platform-v3.0) | Coleta, triagem e visualização participativa |
| F11 | [Sahana Foundation — Eden atual](https://new.sahanafoundation.org/eden/) | Mudança para ASP, multi-tenancy e gestão de casos |
| F12 | [Crisis Cleanup — adequação e limites](https://crisiscleanup.zendesk.com/hc/en-us/articles/200596493-Is-Crisis-Cleanup-a-Good-Fit) | Ordens de recuperação, necessidades e limites do escopo; artigo de 2018 ainda publicado |
| F13 | [Juvare — WebEOC Nexus](https://www.juvare.com/products/webeoc-nexus/) | Capacidades declaradas de coordenação, offline, integração e IA |
| F14 | [Esri — Emergency Management Operations](https://doc.arcgis.com/en/arcgis-solutions/latest/reference/use-emergency-management-operations.htm) | Impactos, vias, infraestrutura, abrigos e situação |
| F15 | [IFRC GO](https://www.ifrc.org/happening-now/emergencies/ifrc-go) | Dados e coordenação de operações humanitárias |
| F16 | [MIDR — S2iD](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/sistema-integrado-de-informacoes-sobre-desastres) | Registro, reconhecimento, recursos e recuperação |
| F17 | [MIDR — Defesa Civil Alerta](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/defesa-civil-alerta/mas-o-que-e-defesa-civil-alerta) | Canal oficial, público e autoridade de emissão |
| F18 | [FEMA — EOC](https://training.fema.gov/programs/nims-ics-position-specific/eoctraining.aspx) | Separação entre coordenação de apoio e comando no local |
| F19 | [IFRC — participação e responsabilização perante comunidades](https://www.ifrc.org/our-work/inclusion-protection-and-engagement/community-engagement-and-accountability) | Feedback e inclusão de cidadãos nas decisões |
| F20 | [OASIS — CAP 1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html) | Estrutura e ciclo de vida de alertas |
| F21 | [Meta — coleção oficial WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/overview) | Canal oficial e integração com sistemas |
| F22 | [Twilio — conceitos da plataforma WhatsApp](https://www.twilio.com/docs/whatsapp/key-concepts) | Janelas de atendimento, templates e contas |
| F23 | [PostgreSQL — constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | Integridade e referências compostas |
| F24 | [Google — Flood Forecasting API](https://developers.google.com/flood-forecasting) | Previsão fluvial, condições de acesso e licença |
| F25 | [IBM/NASA — modelo Prithvi para inundação](https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL-Sen1Floods11) e [TerraTorch](https://github.com/torchgeo/terratorch) | Modelo geoespacial e toolkit de pesquisa aplicada |
| F26 | [Copernicus — Emergency Management Service](https://documentation.dataspace.copernicus.eu/Data/CopernicusServices/CEMS.html) | Produtos de mapeamento e ativação autorizada |
| F27 | [Supabase — MCP](https://supabase.com/docs/guides/ai-tools/mcp) | Escopo de desenvolvedor e restrições para usuários finais |
| F28 | [MCP — autorização](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) | Autorização para transporte HTTP |
| F29 | [MCP — boas práticas de segurança](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices) | Riscos de token, permissões e requisições |
| F30 | [LangGraph — visão geral](https://docs.langchain.com/oss/python/langgraph/overview) | Estado e fluxo de controle de assistentes |
| F31 | [Temporal — workflow execution](https://docs.temporal.io/workflow-execution) | Execução durável de processos |
| F32 | [PowerSync — arquitetura do serviço](https://docs.powersync.com/architecture/powersync-service) | Replicação e sincronização para clientes |

### Licenças consultadas diretamente quando o metadado genérico do GitHub era insuficiente

- [MapLibre — LICENSE.txt](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).
- [PMTiles — README e seção License](https://github.com/protomaps/PMTiles).
- [pgvector — LICENSE](https://github.com/pgvector/pgvector/blob/master/LICENSE).
- [Langfuse — LICENSE e ressalva dos diretórios enterprise](https://github.com/langfuse/langfuse/blob/main/LICENSE).


