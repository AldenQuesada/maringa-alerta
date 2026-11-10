/* triagem: ações na ficha. Quais ações existem, de que situação partem e o que exigem vem de
   operacao.protecaoAnimal.triagem; quem pode agir vem de ma_capacidades_operacionais. A gravação é sempre
   public.ma_triar_animal: a tela não monta o registro, não envia coordenadas e não decide a situação final. */
(function(root){'use strict';
function criar({$,esc,t,regras,client,municipioId,bairros,territorio,normal,aoConcluir}){
 const cfg=regras.triagem;
 if(!cfg||!cfg.acoes)throw Error("Triagem não configurada em operacao.protecaoAnimal.triagem.");
 let capaz=null;
 async function capacidades(){
  if(capaz!==null)return capaz;
  const r=await client.rpc("ma_capacidades_operacionais",{municipio:municipioId});
  if(r.error)throw Error(r.error.message);
  capaz=Array.isArray(r.data)&&r.data.includes(regras.capacidades?.triagem);
  return capaz;
 }
 const opt=(v,n,sel)=>'<option value="'+esc(v)+'"'+(v===sel?" selected":"")+">"+esc(n)+"</option>";
 function campo(exige,x){
  if(exige==="bairro_id"){
   const sugerido=territorio.posicao(x)?.bairro,escolhido=bairros().find(b=>sugerido&&normal(b.nome)===normal(sugerido))?.id||"";
   return '<label>'+esc(t("triagem.bairro"))+'<select name="bairro_id" required>'+opt("",t("triagem.escolherBairro"),escolhido)+
    bairros().map(b=>opt(b.id,b.nome,escolhido)).join("")+"</select></label>";
  }
  if(exige==="motivo")return '<label>'+esc(t("triagem.motivo"))+'<select name="motivo" required>'+opt("",t("triagem.escolherMotivo"),"")+
   (cfg.motivosArquivamento||[]).map(m=>opt(m,m,"")).join("")+"</select></label>";
  if(exige==="desfecho")return '<label>'+esc(t("triagem.desfecho"))+'<select name="desfecho" required>'+opt("",t("triagem.escolherDesfecho"),"")+
   (regras.desfechos||[]).map(m=>opt(m,m,"")).join("")+"</select></label>";
  throw Error("Exigência de triagem desconhecida: "+exige+".");
 }
 async function montar(alvo,x){
  alvo.innerHTML="";
  const colecao=x.origemCamada==="triagem"?"relatos":"incidentes";
  const acoes=(cfg.acoes[colecao]||[]).filter(a=>(a.de||[]).includes(x.status));
  let pode;
  try{pode=await capacidades();}catch(err){alvo.innerHTML='<p role="alert">'+esc(t("triagem.erro",{erro:err.message}))+"</p>";return;}
  const corpo=!pode?"<p>"+esc(t("triagem.semCapacidade"))+"</p>":!acoes.length?"<p>"+esc(t("triagem.semAcoes"))+"</p>":
   '<div class="ma-animal-triagem-acoes">'+acoes.map(a=>'<button type="button" data-acao="'+esc(a.id)+'">'+esc(a.rotulo)+"</button>").join("")+'</div><div data-formulario></div>';
  alvo.innerHTML='<section class="ma-animal-triagem"><h3>'+esc(t("triagem.titulo"))+"</h3>"+corpo+"</section>";
  alvo.querySelectorAll("[data-acao]").forEach(b=>b.onclick=()=>formulario(alvo,x,colecao,acoes.find(a=>a.id===b.dataset.acao)));
 }
 function formulario(alvo,x,colecao,acao){
  const area=alvo.querySelector("[data-formulario]");
  area.innerHTML='<form>'+(acao.exige||[]).map(e=>campo(e,x)).join("")+
   '<div class="ma-animal-triagem-acoes"><button type="submit" data-primaria>'+esc(t("triagem.confirmar"))+'</button><button type="button" data-cancelar>'+esc(t("triagem.cancelar"))+'</button></div><p role="status"></p></form>';
  const form=area.querySelector("form"),estado=form.querySelector("[role=status]");
  form.querySelector("[data-cancelar]").onclick=()=>{area.innerHTML="";};
  form.onsubmit=async e=>{
   e.preventDefault();
   const detalhe=Object.fromEntries([...new FormData(form)].filter(([,v])=>v!==""));
   form.querySelectorAll("button,select").forEach(el=>el.disabled=true);estado.textContent=t("triagem.gravando");
   const r=await client.rpc("ma_triar_animal",{municipio:municipioId,colecao_alvo:colecao,registro:x.id,acao:acao.id,status_esperado:x.status,detalhe});
   if(r.error){estado.textContent=t("triagem.erro",{erro:r.error.message});form.querySelectorAll("button,select").forEach(el=>el.disabled=false);return;}
   aoConcluir(t("triagem.feito",{acao:acao.rotulo}),r.data);
  };
 }
 return {montar};
}
root.AlertaAnimalTriagem={criar};
})(globalThis);
