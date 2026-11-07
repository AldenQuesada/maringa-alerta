/* apresentacao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({arr,esc}){
function grupoOfertas(titulo, lista) {
    const itens = arr(lista);
    return '<section class="cv-offers"><h4>' + esc(titulo) + '</h4>' +
      (itens.length ? '<div class="cv-offers-list">' +
        itens.map(v => '<span class="cv-offer">' + esc(v) + '</span>').join("") + '</div>' :
        '<p>Não informado</p>') + '</section>';
  }
return {grupoOfertas};
}
root.AlertaConversasApresentacao={criar};
})(globalThis);
