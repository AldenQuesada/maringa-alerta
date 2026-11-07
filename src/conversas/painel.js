/* painel: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({construirZonas,consulta,filtrarPessoas,get,manterSelecao,raiz,renderChat,renderLista,renderPerfil,selecionadas,view}){
function renderDados() {
      const {pessoas,bairros,zonas} = consulta();
      construirZonas(pessoas,bairros,zonas);
      const filtradas = filtrarPessoas(pessoas,bairros,selecionadas,view.busca);
      view.ativa = manterSelecao(view.ativa, filtradas);
      raiz.classList.toggle("is-conversation-open", view.ativa !== null);
      const exemplos=pessoas.filter(p=>p.status_simulacao==="simulado").length;
      get("cv-total").textContent = pessoas.length + (pessoas.length===1?" cadastro":" cadastros") + (exemplos?" · "+exemplos+" demonstrações":"");
      renderLista(filtradas,bairros);
      const pessoa = filtradas.find(p => p.id===view.ativa) || null;
      renderChat(pessoa);
      renderPerfil(pessoa,bairros);
    }
return {renderDados};
}
root.AlertaConversasVistaPainel={criar};
})(globalThis);
