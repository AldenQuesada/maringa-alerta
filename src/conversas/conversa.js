/* conversa: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({db,esc,fluxoCadastro,get,nomePessoa,zonaDaPessoa}){
function renderChat(p) {
      if (!p) {
        get("cv-chat-head").innerHTML = '<div class="cv-chat-person"><strong>Nenhuma conversa selecionada</strong><span>Escolha uma região ou abra um colaborador</span></div>';
        get("cv-transcript").innerHTML = '<div class="cv-no-chat"><div aria-hidden="true">◉</div><strong>Nenhuma conversa selecionada</strong><p>Selecione um cadastro à esquerda para visualizar o percurso de atendimento.</p></div>';
        return;
      }
      const z = zonaDaPessoa(p,db.lista("bairros"));
      get("cv-chat-head").innerHTML =
        '<div class="cv-avatar cv-avatar-chat" aria-hidden="true">' +
        esc(nomePessoa(p).slice(0,1).toLocaleUpperCase("pt-BR")) + '</div><div class="cv-chat-person"><strong>' +
        esc(nomePessoa(p)) + '</strong><span>' + esc(z) + ' · Cadastro de colaborador</span></div>' +
        '<span class="cv-simulated">' + (p.status_simulacao==="simulado"?"Demonstração":"Fluxo reconstruído") + '</span>';
      const passos = fluxoCadastro(p,db.municipioAtivo());
      get("cv-transcript").innerHTML =
        '<div class="cv-flow-note">' + (p.status_simulacao==="simulado"?"SIMULAÇÃO: percurso montado a partir do ajudante demonstrativo do mapa; não houve conversa real.":"Histórico ilustrativo baseado nas respostas do cadastro. Campos não informados são identificados.") + '</div>' +
        '<div class="cv-message-stream">' + passos.map(m =>
          '<div class="cv-message cv-' + m.tipo + '"><div class="cv-message-label">' +
          (m.tipo==="bot"?"Prefeitura · Pra Somar":m.tipo==="pessoa"?"Dados do colaborador":m.tipo==="selecao"?"Opção do cadastro":"Campo sem registro") +
          '</div><div class="cv-message-body">' + esc(m.texto).replace(/\n/g,"<br>") + '</div></div>'
        ).join("") + '</div>';
      const el = get("cv-transcript");
      el.scrollTop = 0;
    }
return {renderChat};
}
root.AlertaConversasVistaConversa={criar};
})(globalThis);
