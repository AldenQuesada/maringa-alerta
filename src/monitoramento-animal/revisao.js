/* revisao: relatório da IA na ficha do relato. O relatório é gravado pelo servidor (wa.ma_wa_revisao_resultado),
   já conferido e limitado; aqui só é mostrado. A decisão da triagem continua com a gestão. */
(function(root){'use strict';
function criar({esc,t}){
 function html(x){
  const r=x&&x.revisao_ia;
  if(!r||typeof r!=="object"||!r.resumo)return "";
  const linha=(rotulo,v)=>"<p><strong>"+esc(t(rotulo))+":</strong> "+esc(v)+"</p>";
  const obs=Array.isArray(r.observacoes)&&r.observacoes.length?
   "<p><strong>"+esc(t("revisao.observacoes"))+":</strong></p><ul>"+r.observacoes.map(o=>"<li>"+esc(o)+"</li>").join("")+"</ul>":"";
  return '<section class="ma-animal-triagem ma-animal-revisao"><h3>'+esc(t("revisao.titulo"))+"</h3><p>"+esc(r.resumo)+"</p>"+
   (r.urgencia?linha("revisao.urgencia",r.urgencia):"")+
   (r.situacao_confere===false?"<p data-nao-confere>"+esc(t("revisao.naoConfere"))+"</p>":r.situacao_confere===true?"<p>"+esc(t("revisao.confere"))+"</p>":"")+
   obs+(r.sugestao_alerta?linha("revisao.sugestao",r.sugestao_alerta):"")+
   "<p><small>"+esc(t("revisao.aviso"))+"</small></p></section>";
 }
 return {html};
}
root.AlertaAnimalRevisao={criar};
})(globalThis);
