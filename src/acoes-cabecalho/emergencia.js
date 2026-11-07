/* emergencia: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,esc,getPref,message}){
function renderEmergency(id){
 const samu=id==="samu",service=samu?"SAMU":"Corpo de Bombeiros",number=samu?"192":"193";
 $("ma-dialog-body").innerHTML=
 '<p class="ma-note">Atalho de emergência, conforme o padrão do ClinicAI V2. Não realiza ligações automaticamente.</p>'+
 '<div class="ma-emergency-box"><span>'+service+'</span><strong>'+number+'</strong><p>'+esc(samu?"Urgências clínicas e atendimento pré-hospitalar.":"Incêndio, resgate, salvamento e acidentes com risco imediato.")+'</p></div>'+
 '<div class="ma-location"><strong>Município: '+esc(getPref()?.nome||"Não configurado")+' / '+esc(getPref()?.uf||"")+'</strong>'+
 '<p>Informe o endereço exato e um ponto de referência da ocorrência diretamente ao atendente. O cadastro municipal não substitui a localização do incidente.</p></div>'+
 '<div class="ma-emergency-actions"><a class="ma-call" href="tel:'+number+'">Abrir discagem '+number+'</a><button id="ma-copy" type="button" class="ma-light">Copiar orientação</button></div>'+
 '<p class="ma-note">Informe o que aconteceu, a localização, quantas pessoas precisam de ajuda e os riscos presentes. A central confirmará o atendimento; abrir a discagem não significa despacho realizado.</p><p id="ma-message" class="ma-notice" role="status" hidden></p>';
 $("ma-copy").onclick=async()=>{
  const msg="Emergência · "+service+" "+number+"\nMunicípio: "+(getPref()?.nome||"Não informado")+"\nLocal da ocorrência: [informar endereço exato]\nDescrição: [informar o ocorrido e pessoas afetadas]";
  try{await navigator.clipboard.writeText(msg);message("Orientação copiada.");}
  catch(_){message("Não foi possível copiar automaticamente.");}
 };
}
return {renderEmergency};
}
root.AlertaCabecalhoEmergencia={criar};
})(globalThis);
