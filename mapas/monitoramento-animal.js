/* perfil: título, camadas, filtros e legenda do mapa vêm de ma_configuracao 'mapas'. Nada é inventado aqui. */
(function(root){'use strict';
const ID="monitoramento-animal";
function validar(perfil,regras){
 if(!perfil||typeof perfil!=="object")throw Error("Perfil do mapa Monitoramento animal não está configurado no banco.");
 for(const campo of ["titulo","camera","camadas","filtros","situacao","estadosEncerrados","textos","cores"])
  if(perfil[campo]==null)throw Error("Perfil do mapa incompleto: falta "+campo+".");
 if(!Array.isArray(perfil.camadas)||!perfil.camadas.length)throw Error("Perfil do mapa sem camadas.");
 for(const cor of ["contornoZona","destaqueRestrito"])if(!/^#[0-9a-f]{3,8}$/i.test(perfil.cores[cor]||""))throw Error("Perfil do mapa incompleto: cor "+cor+" ausente ou inválida.");
 // Enquadramento opcional: [[sul,oeste],[norte,leste]] da área que precisa caber inteira na abertura.
 const q=perfil.enquadramento;
 if(q!=null&&!(Array.isArray(q)&&q.length===2&&q.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&q[0][0]<q[1][0]&&q[0][1]<q[1][1]))
  throw Error("Perfil do mapa incompleto: enquadramento inválido.");
 if(!regras||!regras.categoriaTipos)throw Error("Regras da proteção animal ausentes em operacao.protecaoAnimal.");
 return {perfil,regras};
}
async function carregar({client=root.AlertaSupabaseClient,regrasOperacionais=root.AlertaRegrasOperacionais}={}){
 if(!client)throw Error("Mapa disponível somente com acesso à gestão municipal.");
 const {data,error}=await client.from("ma_configuracao").select("documento").eq("id","mapas").single();
 if(error||!data)throw Error("Perfil do mapa indisponível para este acesso.");
 return validar(data.documento?.[ID],regrasOperacionais?.protecaoAnimal);
}
root.AlertaAnimalPerfil={ID,carregar,validar};
})(globalThis);
/* textos: toda a copy do mapa vem de perfil.textos no banco. Texto ausente é erro visível, nunca um valor de reserva. */
(function(root){'use strict';
function criar(textos){
 if(!textos||typeof textos!=="object")throw Error("Perfil do mapa incompleto: falta textos.");
 function t(caminho,vars){
  const v=String(caminho).split(".").reduce((o,k)=>o&&typeof o==="object"?o[k]:undefined,textos);
  if(typeof v!=="string")throw Error("Texto ausente no perfil do mapa: "+caminho+".");
  return vars?v.replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??"")):v;
 }
 // HTML declara só a chave: data-texto (conteúdo) e data-texto-<atributo> (aria-label, title, placeholder).
 function aplicar(doc){
  doc.querySelectorAll("[data-texto]").forEach(el=>{el.textContent=t(el.dataset.texto);});
  for(const attr of ["aria-label","title","placeholder"])
   doc.querySelectorAll("[data-texto-"+attr+"]").forEach(el=>el.setAttribute(attr,t(el.getAttribute("data-texto-"+attr))));
 }
 return {t,aplicar};
}
root.AlertaAnimalTextos={criar};
})(globalThis);
/* geometria: ponto em polígono e centro de feições GeoJSON, sem dependências. */
(function(root){'use strict';
function anel(p,ring){
 let dentro=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i],[xj,yj]=ring[j];
  if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/((yj-yi)||1e-12)+xi))dentro=!dentro;
 }
 return dentro;
}
function poligono(p,coords){return anel(p,coords[0])&&!coords.slice(1).some(buraco=>anel(p,buraco));}
function contem(geometry,lat,lng){
 const p=[Number(lng),Number(lat)];
 if(!geometry||!p.every(Number.isFinite))return false;
 if(geometry.type==="Polygon")return poligono(p,geometry.coordinates);
 if(geometry.type==="MultiPolygon")return geometry.coordinates.some(c=>poligono(p,c));
 return false;
}
root.AlertaAnimalGeometria={contem};
})(globalThis);
/* consultas: leitura dos registros autorizados. O servidor já esconde o que o usuário não pode ver. */
(function(root){'use strict';
function criar({db,perfil,regras,normal}){
 const camada=id=>perfil.camadas.find(c=>c.id===id)||null;
 const tipos=()=>db.lista("ocorrencias").filter(t=>t.categoria===regras.categoriaTipos);
 const tipoPorId=id=>tipos().find(t=>t.id===id)||null;
 const tipoPorSituacao=s=>tipos().find(t=>t.situacao_whatsapp===s)||null;
 const confere=(x,filtro)=>Object.entries(filtro||{}).every(([k,v])=>String(x[k]??"")===String(v));
 function relatos(){
  const c=camada("triagem");if(!c)return [];
  return db.lista(c.colecao).filter(x=>confere(x,c.filtro)).map(x=>({...x,origemCamada:"triagem",tipo:tipoPorSituacao(x.situacao)}));
 }
 function incidentes(){
  const c=camada("ocorrencias");if(!c)return [];
  const ids=new Set(tipos().map(t=>t.id));
  return db.lista(c.colecao).filter(x=>ids.has(x.tipo_id)).map(x=>({...x,origemCamada:"ocorrencias",tipo:tipoPorId(x.tipo_id)}));
 }
 function situacaoDe(x){return x.tipo?.id||"";}
 function filtrar(xs,{zona,situacao,busca,mostrarEncerradas,zonaDe}){
  const termo=normal(busca);
  return xs.filter(x=>{
   if(!mostrarEncerradas&&perfil.estadosEncerrados.includes(x.status))return false;
   if(situacao&&situacaoDe(x)!==situacao)return false;
   if(zona&&zonaDe(x)!==zona)return false;
   if(termo&&!normal([x.protocolo,x.tipo?.nome,x.situacao,x.especie,x.endereco,x.bairro,x.descricao,x.status].filter(Boolean).join(" ")).includes(termo))return false;
   return true;
  });
 }
 return {camada,tipos,tipoPorId,relatos,incidentes,filtrar};
}
root.AlertaAnimalConsultas={criar};
})(globalThis);
/* territorio: bairros e zonas oficiais do catálogo municipal, e unidades de atendimento do catálogo territorial. */
(function(root){'use strict';
function criar({map,L,poligonos,normal,catalogoBairros,client,municipioId,perfil,aoMudar}){
 const bairros=new Map(),zonas=[];
 async function carregar(){
  if(!catalogoBairros)return;
  const dados=await catalogoBairros.carregar();
  for(const f of dados.bairros?.features||[]){
   const nome=String(f.properties?.nome||"").trim();if(!nome)continue;
   const b=L.geoJSON(f).getBounds();if(!b?.isValid())continue;
   bairros.set(normal(nome),{nome,centro:b.getCenter(),geometry:f.geometry});
  }
  for(const f of dados.zonasNumeradas?.features||[]){
   const nome=String(f.properties?.nome||"").trim();if(!/^Zona\s*\d+$/i.test(nome))continue;
   const layer=L.geoJSON(f,{style:{color:perfil.cores.contornoZona,weight:1.6,fillColor:perfil.cores.contornoZona,fillOpacity:.035,dashArray:"5 5"},
    onEachFeature:(_f,shape)=>shape.bindTooltip(nome,{sticky:true})});
   zonas.push({nome,geometry:f.geometry});poligonos.addLayer(layer);
  }
  zonas.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR",{numeric:true}));
  aoMudar();
 }
 // Relato do WhatsApp não tem GPS: posição aproximada pelo bairro citado no endereço.
 function bairroNoTexto(texto){
  const t=" "+normal(texto)+" ";let achado=null;
  for(const [chave,b] of bairros)if(t.includes(" "+chave+" ")&&(!achado||chave.length>normal(achado.nome).length))achado=b;
  return achado;
 }
 function posicao(x){
  const lat=Number(x.lat),lng=Number(x.lng);
  if(x.lat!=null&&x.lat!==""&&Number.isFinite(lat)&&Number.isFinite(lng))return {lat,lng,aproximada:false};
  const b=(x.bairro&&bairros.get(normal(x.bairro)))||bairroNoTexto(x.endereco);
  return b?{lat:b.centro.lat,lng:b.centro.lng,aproximada:true,bairro:b.nome}:null;
 }
 function zonaDe(x){
  const p=posicao(x);if(!p)return "";
  return zonas.find(z=>root.AlertaAnimalGeometria.contem(z.geometry,p.lat,p.lng))?.nome||"";
 }
 async function unidades(){
  const c=perfil.camadas.find(x=>x.catalogo);if(!c||!client)return [];
  const cat=await client.rpc("ma_catalogo_territorial");if(cat.error)throw Error(cat.error.message);
  const tipos=(cat.data?.tipos||[]).filter(t=>(t.categoria_id||t.categoria)===c.catalogo.categoria).map(t=>t.id);
  const lotes=await Promise.all(tipos.map(tipo=>client.rpc("ma_territorio_listar",{municipio:municipioId,tipo_alvo:tipo,limite:500})));
  // Falha parcial não pode virar mapa incompleto em silêncio.
  const falha=lotes.find(r=>r.error);if(falha)throw Error(falha.error.message);
  return lotes.flatMap(r=>r.data||[]).map(item=>({...item.cadastro?.dados,tipoTerritorial:item.territorio?.tipo_id})).filter(x=>x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng)));
 }
 return {carregar,posicao,zonaDe,zonas:()=>zonas.map(z=>z.nome),unidades};
}
root.AlertaAnimalTerritorio={criar};
})(globalThis);
/* camadas: marcadores do mapa. Cor e ícone vêm do tipo de ocorrência no banco. */
(function(root){'use strict';
function criar({L,esc,t,grupos,territorio,aoAbrir}){
 function icone(x){
  const cor=/^#[0-9a-f]{3,8}$/i.test(x.tipo?.cor||"")?x.tipo.cor:"";
  const classe="ma-animal-pin"+(x.origemCamada==="triagem"?" triagem":"")+(x.visibilidade==="restrita"?" restrito":"");
  return L.divIcon({className:"pin "+classe,html:'<span class="ma-animal-pin-corpo"'+(cor?' style="--ma-animal-cor:'+cor+'"':"")+'>'+esc(x.tipo?.icone||"•")+'</span>',iconSize:[32,32],iconAnchor:[16,32]});
 }
 function desenhar(xs){
  grupos.triagem.clearLayers();grupos.ocorrencias.clearLayers();
  const ocupacao=new Map();let semPosicao=0;
  for(const x of xs){
   const p=territorio.posicao(x);if(!p){semPosicao++;continue;}
   const chave=p.lat.toFixed(5)+":"+p.lng.toFixed(5),n=ocupacao.get(chave)||0;ocupacao.set(chave,n+1);
   const desloc=p.aproximada?n*0.0009:0;
   const titulo=(x.tipo?.nome||x.situacao||t("lista.relato"))+(x.protocolo?" · "+x.protocolo:"");
   L.marker([p.lat+desloc,p.lng+desloc],{icon:icone(x),title:titulo})
    .bindTooltip("<strong>"+esc(titulo)+"</strong><br>"+esc(x.status||"")+(p.aproximada?" · "+esc(t("mapa.aproximada",{bairro:p.bairro})):""),{direction:"top"})
    .on("click",()=>aoAbrir(x)).addTo(grupos[x.origemCamada]);
  }
  return semPosicao;
 }
 function desenharUnidades(xs,visivel){
  grupos.unidades.clearLayers();if(!visivel)return;
  for(const u of xs){
   L.marker([Number(u.lat),Number(u.lng)],{icon:L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">🏥</span>',iconSize:[32,32],iconAnchor:[16,32]}),title:u.nome})
    .bindTooltip("<strong>"+esc(u.nome)+"</strong><br>"+esc(u.endereco||t("mapa.enderecoNaoInformado")),{direction:"top"}).addTo(grupos.unidades);
  }
 }
 return {desenhar,desenharUnidades};
}
root.AlertaAnimalCamadas={criar};
})(globalThis);
/* filtros: opções montadas a partir do perfil e dos tipos do banco. */
(function(root){'use strict';
function criar({$,esc,t,perfil,consultas}){
 const opt=(v,n,sel)=>'<option value="'+esc(v)+'"'+(String(v)===String(sel)?" selected":"")+">"+esc(n)+"</option>";
 const tem=f=>perfil.filtros.includes(f);
 function montar(state,zonas){
  $("camada").innerHTML=opt("",t("filtros.todasCamadas"),state.camada)+perfil.camadas.filter(c=>c.colecao).map(c=>opt(c.id,c.rotulo,state.camada)).join("");
  $("zona").innerHTML=opt("",t("filtros.todasZonas"),state.zona)+zonas.map(z=>opt(z,z,state.zona)).join("");
  $("filtro").innerHTML=opt("",t("filtros.todasSituacoes"),state.situacao)+consultas.tipos().map(t=>opt(t.id,t.nome,state.situacao)).join("");
  for(const [id,f] of [["filtro-camada","camada"],["filtro-zona","zona"],["filtro-situacao","situacao"],["filtro-busca","busca"],["filtro-encerradas","mostrar_resolvidas"]])$(id).hidden=!tem(f);
  const unidades=perfil.camadas.find(c=>c.catalogo);
  $("filtro-unidades").hidden=!unidades;if(unidades)$("mostrar-unidades-texto").textContent=t("filtros.mostrarUnidades",{rotulo:unidades.rotulo.toLocaleLowerCase("pt-BR")});
  legenda();
 }
 function legenda(){
  $("ma-animal-legenda").innerHTML=consultas.tipos().map(tp=>'<span><i'+(/^#[0-9a-f]{3,8}$/i.test(tp.cor||"")?' style="--ma-animal-cor:'+esc(tp.cor)+'"':"")+'>'+esc(tp.icone||"")+"</i>"+esc(tp.nome)+(tp.visibilidade==="restrita"?" · "+esc(t("legenda.sigiloso")):"")+"</span>").join("")+
   '<span>'+esc(t("legenda.triagem"))+"</span>";
 }
 return {montar,legenda};
}
root.AlertaAnimalFiltros={criar};
})(globalThis);
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
/* ficha: detalhe do registro no painel lateral. Rótulos vêm de perfil.textos.ficha; as ações vêm do módulo de triagem. */
(function(root){'use strict';
function criar({$,esc,t,territorio,triagem,aoFechar}){
 const linha=(r,v)=>v==null||v===""?"":"<dt>"+esc(t("ficha."+r))+"</dt><dd>"+esc(Array.isArray(v)?v.join(", "):v)+"</dd>";
 function abrir(x){
  const p=territorio.posicao(x);
  $("ma-animal-ficha-tipo").textContent=t(x.origemCamada==="triagem"?"ficha.relato":"ficha.ocorrencia")+" · "+(x.status||"");
  $("ma-animal-ficha-titulo").textContent=x.tipo?.nome||x.situacao||t("lista.registroGenerico");
  $("ma-animal-ficha-dados").innerHTML=
   linha("protocolo",x.protocolo)+linha("especie",x.especie)+linha("endereco",x.endereco)+linha("bairro",x.bairro||p?.bairro)+
   linha("localizacao",t(p?(p.aproximada?"ficha.aproximada":"ficha.coordenadas"):"ficha.semPosicao"))+
   linha("descricao",x.descricao)+linha("origem",x.origem)+linha("registradoEm",x.criado_em||x.quando)+
   linha("sigilo",x.visibilidade==="restrita"?t("ficha.sigiloRestrito"):"")+linha("denunciante",x.anonimo===true?t("ficha.anonimo"):x.nome)+
   linha("desfecho",x.desfecho)+linha("motivo",x.motivo_arquivamento)+linha("triadoEm",x.triado_em)+linha("ocorrenciaGerada",x.incidente_id);
  $("ma-animal-ficha").hidden=false;$("ma-animal-ficha").scrollIntoView({block:"nearest"});
  triagem.montar($("ma-animal-ficha-triagem"),x);
 }
 $("ma-animal-ficha-fechar").addEventListener("click",()=>{$("ma-animal-ficha").hidden=true;aoFechar?.();});
 return {abrir};
}
root.AlertaAnimalFicha={criar};
})(globalThis);
/* resultados: lista lateral e indicadores. */
(function(root){'use strict';
function criar({$,esc,t,perfil,aoAbrir,aoLocalizar}){
 function indicadores(todos){
  $("metric-one").textContent=todos.filter(x=>x.origemCamada==="triagem").length;
  $("metric-two").textContent=todos.filter(x=>x.origemCamada==="ocorrencias"&&!perfil.estadosEncerrados.includes(x.status)).length;
  $("metric-three").textContent=todos.filter(x=>x.visibilidade==="restrita").length;
 }
 function lista(xs,semPosicao){
  $("list-count").textContent=xs.length+" "+t(xs.length===1?"lista.registro":"lista.registros")+(semPosicao?" · "+t("lista.semPosicao",{n:semPosicao}):"");
  const el=$("results");
  if(!xs.length){el.innerHTML='<div class="empty">'+esc(t("lista.vazioTitulo"))+"<p>"+esc(t("lista.vazioDetalhe"))+"</p></div>";return;}
  el.innerHTML=xs.map((x,i)=>'<button type="button" class="result ma-animal-result" data-i="'+i+'"><div class="result-top"><span>'+esc(t(x.origemCamada==="triagem"?"lista.relato":"lista.ocorrencia"))+(x.protocolo?" · "+esc(x.protocolo):"")+'</span>'+
   '<span class="result-tag'+(x.visibilidade==="restrita"?" urgente":"")+'">'+esc(x.status||"")+'</span></div>'+
   '<strong>'+esc(x.tipo?.nome||x.situacao||t("lista.registroGenerico"))+(x.especie?" · "+esc(x.especie):"")+'</strong><small>'+esc(x.bairro||x.endereco||t("lista.localNaoInformado"))+'</small></button>').join("");
  el.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const x=xs[Number(b.dataset.i)];aoLocalizar(x);aoAbrir(x);});
 }
 return {indicadores,lista};
}
root.AlertaAnimalResultados={criar};
})(globalThis);
/* Monitoramento animal: mapa próprio, duplicado do mapa de Ajuda. Não altera os mapas existentes. */
(async function(){
"use strict";
const CHAVE_AVISO="ma-animal-aviso";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const INVENTARIO=globalThis.AlertaInventarioMapas;
const normal=x=>INVENTARIO?INVENTARIO.normal(x):String(x??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLocaleLowerCase("pt-BR").trim();
function alertar(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(alertar.t);alertar.t=setTimeout(()=>{t.hidden=true;},4500);}

const falhar=err=>{$("ma-animal-erro").textContent=err.message;$("ma-animal-erro").hidden=false;};
let configuracao,textos;
try{
 configuracao=await AlertaAnimalPerfil.carregar();
 textos=AlertaAnimalTextos.criar(configuracao.perfil.textos);
 textos.aplicar(document);
}catch(err){falhar(err);return;}
const {perfil,regras}=configuracao;
const t=textos.t;
// Cores do perfil viram variáveis CSS; o CSS não guarda cor de dado.
document.documentElement.style.setProperty("--ma-animal-destaque-restrito",perfil.cores.destaqueRestrito);

const municipioId=AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage);
const db=AlertaGestaoDados.criar(undefined,{municipioId});
const prefeitura=db.municipioAtivo();
if(!prefeitura?.nome){falhar(Error("Prefeitura indisponível para este acesso."));return;}
const nomeCidade=prefeitura.nome;

$("eyebrow").textContent=perfil.eyebrow||"";
$("title").textContent=perfil.titulo;
$("subtitle").textContent=perfil.subtitulo||"";
$("map-brand-title").textContent=nomeCidade.toLocaleUpperCase("pt-BR")+" "+perfil.titulo.toLocaleUpperCase("pt-BR");
document.title=t("pagina.tituloDocumento",{titulo:perfil.titulo,cidade:nomeCidade});
$("municipio").innerHTML='<option>'+esc(nomeCidade+" / "+(prefeitura?.uf||""))+'</option>';$("municipio").disabled=true;

const centro=AlertaGestaoDados.config.centro(prefeitura);
const map=L.map("map",{zoomControl:true,zoomSnap:0,zoomDelta:.5}).setView(centro||[0,0],centro?12:2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,subdomains:"abc",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const poligonos=L.layerGroup().addTo(map);
const grupos={triagem:L.layerGroup().addTo(map),ocorrencias:L.layerGroup().addTo(map),unidades:L.layerGroup().addTo(map)};

const catalogoNome=AlertaGestaoDados.config.referencias(prefeitura).catalogoBairros;
const catalogoBairros=catalogoNome?globalThis[catalogoNome]:null;
const state={camada:"",zona:"",situacao:"",busca:"",mostrarEncerradas:false,mostrarUnidades:true,unidades:[]};

const consultas=AlertaAnimalConsultas.criar({db,perfil,regras,normal});
const territorio=AlertaAnimalTerritorio.criar({map,L,poligonos,normal,catalogoBairros,client:globalThis.AlertaSupabaseClient,municipioId,perfil,aoMudar:()=>{filtros.montar(state,territorio.zonas());render();}});
const triagem=AlertaAnimalTriagem.criar({$,esc,t,regras,client:globalThis.AlertaSupabaseClient,municipioId,territorio,normal,
 bairros:()=>db.lista("bairros").filter(b=>b.nome).map(b=>({id:b.id,nome:b.nome})).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")),
 // A camada de dados da gestão não expõe recarga parcial: recarrega a página e mostra a confirmação depois.
 aoConcluir:msg=>{try{sessionStorage.setItem(CHAVE_AVISO,msg);}catch{}location.reload();}});
const ficha=AlertaAnimalFicha.criar({$,esc,t,territorio,triagem,aoFechar:()=>{}});
const abrirFicha=x=>{if($("painel-ajuda").hidden)$("painel-ajuda-toggle").click();ficha.abrir(x);};
const camadas=AlertaAnimalCamadas.criar({L,esc,t,grupos,territorio,aoAbrir:abrirFicha});
const filtros=AlertaAnimalFiltros.criar({$,esc,t,perfil,consultas});
const resultados=AlertaAnimalResultados.criar({$,esc,t,perfil,aoAbrir:abrirFicha,aoLocalizar:x=>{const p=territorio.posicao(x);if(p)map.flyTo([p.lat,p.lng],Math.max(map.getZoom(),15));}});

function render(){
 const todos=[...consultas.relatos(),...consultas.incidentes()];
 const porCamada=state.camada?todos.filter(x=>x.origemCamada===state.camada):todos;
 const xs=consultas.filtrar(porCamada,{...state,zonaDe:territorio.zonaDe});
 const semPosicao=camadas.desenhar(xs);
 camadas.desenharUnidades(state.unidades,state.mostrarUnidades);
 resultados.indicadores(todos);resultados.lista(xs,semPosicao);
}

$("camada").onchange=()=>{state.camada=$("camada").value;render();};
$("zona").onchange=()=>{state.zona=$("zona").value;render();};
$("filtro").onchange=()=>{state.situacao=$("filtro").value;render();};
$("busca").oninput=()=>{state.busca=$("busca").value;render();};
$("mostrar-encerradas").onchange=e=>{state.mostrarEncerradas=e.target.checked;render();};
$("mostrar-unidades").onchange=e=>{state.mostrarUnidades=e.target.checked;render();};

// Painel lateral recolhível, igual ao mapa de Ajuda: abre recolhido e o + dá acesso aos filtros.
const toggle=$("painel-ajuda-toggle"),painel=$("painel-ajuda");
$("painel-ajuda-recolher").hidden=false;
$("painel-ajuda-recolher").addEventListener("click",()=>toggle.click());
toggle.addEventListener("click",()=>{
 const fechado=!painel.hidden;painel.hidden=fechado;toggle.hidden=!fechado;
 document.querySelector(".workspace").classList.toggle("painel-recolhido",fechado);
 toggle.textContent=fechado?"+":"−";toggle.setAttribute("aria-expanded",String(!fechado));
 const rotulo=t(fechado?"pagina.abrirPainel":"pagina.recolherPainel");toggle.setAttribute("aria-label",rotulo);toggle.title=rotulo;
 requestAnimationFrame(()=>map.invalidateSize());
});
toggle.click();

filtros.montar(state,territorio.zonas());render();

// Abertura: com perfil.enquadramento, a cidade inteira cabe na tela, em qualquer tamanho; sem ele, a câmera de referência do perfil.
const limitesNavegacao=AlertaGestaoDados.config.limites(prefeitura);
if(perfil.enquadramento){const [[s,w],[n,e]]=perfil.enquadramento;
 window.AlertaMapaNavegacao.instalar({map,L,zonas:[[[s,w],[s,e],[n,e],[n,w]]],limites:limitesNavegacao,identificador:AlertaAnimalPerfil.ID,arrasteNoMinimo:true});
}else window.AlertaMapaNavegacao.instalarVistaSalva({limites:limitesNavegacao,map,L,
 identificador:AlertaAnimalPerfil.ID,vistaInicial:AlertaGestaoDados.config.vistaMapa(prefeitura,perfil.camera),arrasteNoMinimo:true});
if(catalogoBairros)catalogoBairros.iniciar({map,L,recolherInicial:true});
territorio.carregar().catch(err=>console.warn("Bairros e zonas indisponíveis",err));
territorio.unidades().then(xs=>{state.unidades=xs;render();}).catch(err=>alertar(t("mapa.unidadesIndisponiveis",{erro:err.message})));
window.addEventListener("focus",render);
try{const aviso=sessionStorage.getItem(CHAVE_AVISO);if(aviso){sessionStorage.removeItem(CHAVE_AVISO);alertar(aviso);}}catch{}
})();
