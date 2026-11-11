/* Página pública do aviso: alerta aprovado ou ação nos bairros. Os dados e os textos vêm do banco pela função
   ma-aviso-publico, que só libera campos públicos. Esta página não tem login nem acesso direto ao banco. */
(function(){'use strict';
const cfg=window.MARINGA_SUPABASE||{},q=new URLSearchParams(location.search);
const alvo=document.getElementById("aviso"),estado=document.getElementById("aviso-estado");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const falhar=()=>{estado.textContent=estado.dataset.erro;};
const parametros=["m","c","id"].map(k=>k+"="+encodeURIComponent(q.get(k)||"")).join("&");
if(!cfg.url||!q.get("m")||!q.get("c")||!q.get("id")){falhar();return;}
const endereco=cfg.url.replace(/\/$/,"")+"/functions/v1/ma-aviso-publico?"+parametros;
const data=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v||"");return m?m[3]+"/"+m[2]+"/"+m[1]:"";};
const dataHora=v=>{const d=new Date(v);return isNaN(d)?"":d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});};
const linha=(r,v)=>v?"<dt>"+esc(r)+"</dt><dd>"+esc(v)+"</dd>":"";
function alerta(a){
 const x=a.textos||{};
 return "<small>"+esc(x.rotulo)+" · "+esc(a.cidade)+"</small><h1>"+esc([a.icone,a.titulo].filter(Boolean).join(" "))+"</h1>"+
  (a.encerrado?'<p class="aviso-encerrado">'+esc(x.encerrado)+"</p>":"")+
  (a.foto&&!a.encerrado?'<img class="aviso-foto" src="'+esc(endereco+"&foto=1")+'" alt="'+esc(a.titulo)+'">':"")+
  '<p class="aviso-mensagem">'+esc(a.mensagem)+"</p>"+
  "<dl>"+linha(x.desfecho,a.desfecho)+linha(x.especie,a.especie)+linha(x.area,(a.area||[]).join(", "))+linha(x.publicado,dataHora(a.publicado_em))+"</dl>"+
  (a.encerrado?"":'<p class="aviso-ajuda">'+esc(x.ajuda)+"</p>");
}
function acao(a){
 const x=a.textos||{},aviso=a.situacao==="Cancelada"?x.cancelada:a.situacao==="Realizada"?x.realizada:"";
 return "<small>"+esc(x.rotulo)+" · "+esc(a.cidade)+"</small><h1>"+esc(a.titulo)+"</h1>"+
  (aviso?'<p class="aviso-encerrado">'+esc(aviso)+"</p>":"")+
  "<dl>"+linha(x.tipo,a.tipo)+linha(x.quando,[data(a.data),a.horario].filter(Boolean).join(", "))+linha(x.onde,[a.endereco,a.bairro].filter(Boolean).join(", "))+"</dl>"+
  (a.descricao?'<p class="aviso-mensagem">'+esc(a.descricao)+"</p>":"");
}
fetch(endereco,{credentials:"omit"}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(a=>{
 const corpo=a.colecao==="alertas"?alerta(a):a.colecao==="acoes"?acao(a):null;
 if(!corpo){falhar();return;}
 alvo.innerHTML=corpo+(a.rodape?"<footer>"+esc(a.rodape)+"</footer>":"");
 document.title=(a.titulo||"")+" · "+(a.cidade||"");
 const foto=alvo.querySelector(".aviso-foto");if(foto)foto.onerror=()=>foto.remove();
}).catch(falhar);
})();
