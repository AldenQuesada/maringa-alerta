/* envio: alerta do bairro na ficha. Quem pode, a área, os inscritos e a situação da entrega vêm de public.ma_envio_painel;
   aprovar é public.ma_alerta_aprovar e enviar é public.ma_enviar_inscritos. A tela não monta mensagem, área nem público. */
(function(root){'use strict';
function criar({$,esc,t,client,municipioId,pagina}){
 if(!client)throw Error("Envio de alertas sem cliente do banco.");
 const colecaoDe=x=>x.origemCamada==="acoes"?"acoes":x.origemCamada==="triagem"?null:"incidentes";
 const linkPagina=(colecao,id)=>pagina+"?m="+encodeURIComponent(municipioId)+"&c="+colecao+"&id="+encodeURIComponent(id);
 const dataHora=v=>{const d=new Date(v);return isNaN(d)?String(v||""):d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});};
 function entregas(e){
  const n=Object.values(e||{}).reduce((a,b)=>a+Number(b||0),0);
  if(!n)return "";
  const v=k=>Number(e[k]||0);
  return "<p data-entregas>"+esc(t("envio.entregas",{pending:v("pending")+v("sending"),sent:v("sent")+v("uncertain"),delivered:v("delivered"),read:v("read"),failed:v("failed")+v("expired")}))+"</p>";
 }
 async function rpc(nome,args){const r=await client.rpc(nome,args);if(r.error)throw Error(r.error.message);return r.data;}
 async function montar(alvo,x,aviso){
  alvo.innerHTML="";
  const colecao=colecaoDe(x);if(!colecao)return;
  let p;
  try{p=await rpc("ma_envio_painel",{municipio:municipioId,colecao_alvo:colecao,registro:x.id});}
  catch(err){alvo.innerHTML='<section class="ma-animal-triagem ma-animal-envio"><p role="alert">'+esc(t("envio.erro",{erro:err.message}))+"</p></section>";return;}
  const titulo=t(colecao==="acoes"?"envio.tituloAcao":"envio.titulo");
  if(!p||!p.capaz){alvo.innerHTML='<section class="ma-animal-triagem ma-animal-envio"><h3>'+esc(titulo)+"</h3><p>"+esc(t("envio.semCapacidade"))+"</p></section>";return;}
  const bairros=p.bairros||[];
  const publico="<p data-publico>"+esc(bairros.length?t("envio.publico",{n:p.inscritos,bairros:bairros.join(", ")}):t("envio.semBairro"))+"</p>";
  const desligado=p.ativo?"":"<p data-desligado>"+esc(t("envio.desligado"))+"</p>";
  const total=Object.values(p.entregas||{}).reduce((a,b)=>a+Number(b||0),0);
  let corpo="";
  if(colecao==="incidentes"&&!p.alerta){
   corpo=!p.enviavel?"<p>"+esc(t("envio.foraSituacao"))+"</p>":
    '<form data-aprovar><label>'+esc(t("envio.mensagem"))+'<textarea name="mensagem" required maxlength="700" placeholder="'+esc(t("envio.mensagemDica"))+'">'+esc(p.sugestao||"")+'</textarea></label>'+
    (p.sugestao?"<p data-sugestao>"+esc(t("envio.sugestaoIA"))+"</p>":"")+
    (p.tem_foto?'<label class="ma-animal-envio-opcao"><input type="checkbox" name="mostrar_foto"> '+esc(t("envio.mostrarFoto"))+"</label>":"")+
    '<div class="ma-animal-triagem-acoes"><button type="submit" data-primaria>'+esc(t(p.ativo?"envio.aprovarEnviar":"envio.aprovar"))+"</button></div></form>"+desligado;
  }else{
   const registro=colecao==="acoes"?x.id:p.alerta.id,origem=colecao==="acoes"?"acoes":"alertas";
   corpo=(p.alerta?"<p>"+esc(t("envio.aprovado",{data:dataHora(p.alerta.aprovado_em)}))+"</p><blockquote>"+esc(p.alerta.mensagem)+"</blockquote>":"")+
    entregas(p.entregas)+
    (!p.enviavel?"<p>"+esc(t("envio.foraSituacao"))+"</p>":p.ativo?'<div class="ma-animal-triagem-acoes"><button type="button" data-primaria data-enviar="'+esc(origem)+'" data-registro="'+esc(registro)+'">'+esc(t(total?"envio.enviarNovos":"envio.enviar"))+"</button></div>":desligado)+
    '<p><a href="'+esc(linkPagina(origem,registro))+'" target="_blank" rel="noopener noreferrer">'+esc(t("envio.verPagina"))+"</a></p>";
  }
  alvo.innerHTML='<section class="ma-animal-triagem ma-animal-envio"><h3>'+esc(titulo)+"</h3>"+publico+corpo+'<p role="status">'+esc(aviso||"")+"</p></section>";
  const estado=alvo.querySelector("[role=status]");
  const travar=v=>alvo.querySelectorAll("button,textarea,input").forEach(el=>el.disabled=v);
  const form=alvo.querySelector("form[data-aprovar]");
  if(form)form.onsubmit=async e=>{
   e.preventDefault();
   const mensagem=form.mensagem.value.trim();if(!mensagem)return;
   travar(true);estado.textContent=t("envio.gravando");
   try{
    const novo=await rpc("ma_alerta_aprovar",{municipio:municipioId,incidente:x.id,mensagem,mostrar_foto:!!form.mostrar_foto?.checked});
    let msg=t("envio.aprovadoFeito");
    if(p.ativo){const r=await rpc("ma_enviar_inscritos",{municipio:municipioId,colecao_alvo:"alertas",registro:novo.id});msg=t("envio.feito",{n:r.na_fila});}
    await montar(alvo,x,msg);
   }catch(err){estado.textContent=t("envio.erro",{erro:err.message});travar(false);}
  };
  const botao=alvo.querySelector("[data-enviar]");
  if(botao)botao.onclick=async()=>{
   travar(true);estado.textContent=t("envio.gravando");
   try{const r=await rpc("ma_enviar_inscritos",{municipio:municipioId,colecao_alvo:botao.dataset.enviar,registro:botao.dataset.registro});await montar(alvo,x,t("envio.feito",{n:r.na_fila}));}
   catch(err){estado.textContent=t("envio.erro",{erro:err.message});travar(false);}
  };
 }
 return {montar};
}
root.AlertaAnimalEnvio={criar};
})(globalThis);
