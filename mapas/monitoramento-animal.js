/* perfil: título, camadas, filtros e legenda do mapa vêm de ma_configuracao 'mapas'. Nada é inventado aqui. */
(function(root){'use strict';
const ID="monitoramento-animal";
function validar(perfil,regras){
 if(!perfil||typeof perfil!=="object")throw Error("Perfil do mapa Monitoramento animal não está configurado no banco.");
 for(const campo of ["titulo","camera","camadas","filtros","situacao","estadosEncerrados"])
  if(perfil[campo]==null)throw Error("Perfil do mapa incompleto: falta "+campo+".");
 if(!Array.isArray(perfil.camadas)||!perfil.camadas.length)throw Error("Perfil do mapa sem camadas.");
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
   const layer=L.geoJSON(f,{style:{color:"#e7b94c",weight:1.6,fillColor:"#e7b94c",fillOpacity:.035,dashArray:"5 5"},
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
  return lotes.flatMap(r=>r.error?[]:r.data||[]).map(item=>({...item.cadastro?.dados,tipoTerritorial:item.territorio?.tipo_id})).filter(x=>x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng)));
 }
 return {carregar,posicao,zonaDe,zonas:()=>zonas.map(z=>z.nome),unidades};
}
root.AlertaAnimalTerritorio={criar};
})(globalThis);
/* camadas: marcadores do mapa. Cor e ícone vêm do tipo de ocorrência no banco. */
(function(root){'use strict';
function criar({L,esc,grupos,territorio,aoAbrir}){
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
   const titulo=(x.tipo?.nome||x.situacao||"Relato")+(x.protocolo?" · "+x.protocolo:"");
   L.marker([p.lat+desloc,p.lng+desloc],{icon:icone(x),title:titulo})
    .bindTooltip("<strong>"+esc(titulo)+"</strong><br>"+esc(x.status||"")+(p.aproximada?" · localização aproximada do bairro "+esc(p.bairro):""),{direction:"top"})
    .on("click",()=>aoAbrir(x)).addTo(grupos[x.origemCamada]);
  }
  return semPosicao;
 }
 function desenharUnidades(xs,visivel){
  grupos.unidades.clearLayers();if(!visivel)return;
  for(const u of xs){
   L.marker([Number(u.lat),Number(u.lng)],{icon:L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">🏥</span>',iconSize:[32,32],iconAnchor:[16,32]}),title:u.nome})
    .bindTooltip("<strong>"+esc(u.nome)+"</strong><br>"+esc(u.endereco||"Endereço não informado"),{direction:"top"}).addTo(grupos.unidades);
  }
 }
 return {desenhar,desenharUnidades};
}
root.AlertaAnimalCamadas={criar};
})(globalThis);
/* filtros: opções montadas a partir do perfil e dos tipos do banco. */
(function(root){'use strict';
function criar({$,esc,perfil,consultas}){
 const opt=(v,n,sel)=>'<option value="'+esc(v)+'"'+(String(v)===String(sel)?" selected":"")+">"+esc(n)+"</option>";
 const tem=f=>perfil.filtros.includes(f);
 function montar(state,zonas){
  $("camada").innerHTML=opt("","Todas as camadas",state.camada)+perfil.camadas.filter(c=>c.colecao).map(c=>opt(c.id,c.rotulo,state.camada)).join("");
  $("zona").innerHTML=opt("","Todas as zonas",state.zona)+zonas.map(z=>opt(z,z,state.zona)).join("");
  $("filtro").innerHTML=opt("","Todas as situações",state.situacao)+consultas.tipos().map(t=>opt(t.id,t.nome,state.situacao)).join("");
  for(const [id,f] of [["filtro-camada","camada"],["filtro-zona","zona"],["filtro-situacao","situacao"],["filtro-busca","busca"],["filtro-encerradas","mostrar_resolvidas"]])$(id).hidden=!tem(f);
  const unidades=perfil.camadas.find(c=>c.catalogo);
  $("filtro-unidades").hidden=!unidades;if(unidades)$("mostrar-unidades-texto").textContent="Mostrar "+unidades.rotulo.toLocaleLowerCase("pt-BR");
  legenda();
 }
 function legenda(){
  $("ma-animal-legenda").innerHTML=consultas.tipos().map(t=>'<span><i style="--ma-animal-cor:'+esc(/^#[0-9a-f]{3,8}$/i.test(t.cor||"")?t.cor:"#93a6b8")+'">'+esc(t.icone||"")+"</i>"+esc(t.nome)+(t.visibilidade==="restrita"?" · sigiloso":"")+"</span>").join("")+
   '<span>Contorno tracejado: relato em triagem, posição aproximada pelo bairro</span>';
 }
 return {montar,legenda};
}
root.AlertaAnimalFiltros={criar};
})(globalThis);
/* ficha: detalhe do registro no painel lateral. Somente leitura nesta etapa; ações de triagem vêm na etapa D. */
(function(root){'use strict';
function criar({$,esc,territorio,aoFechar}){
 const linha=(r,v)=>v==null||v===""?"":"<dt>"+esc(r)+"</dt><dd>"+esc(Array.isArray(v)?v.join(", "):v)+"</dd>";
 function abrir(x){
  const p=territorio.posicao(x);
  $("ma-animal-ficha-tipo").textContent=(x.origemCamada==="triagem"?"RELATO · ":"OCORRÊNCIA · ")+(x.status||"");
  $("ma-animal-ficha-titulo").textContent=x.tipo?.nome||x.situacao||"Registro";
  $("ma-animal-ficha-dados").innerHTML=
   linha("Protocolo",x.protocolo)+linha("Espécie",x.especie)+linha("Endereço",x.endereco)+linha("Bairro",x.bairro||p?.bairro)+
   linha("Localização",p?(p.aproximada?"Aproximada pelo bairro":"Coordenadas registradas"):"Sem posição no mapa")+
   linha("Descrição",x.descricao)+linha("Origem",x.origem)+linha("Registrado em",x.criado_em||x.quando)+
   linha("Sigilo",x.visibilidade==="restrita"?"Denúncia restrita":"")+linha("Denunciante",x.anonimo===true?"Anônimo":x.nome)+linha("Desfecho",x.desfecho);
  $("ma-animal-ficha").hidden=false;$("ma-animal-ficha").scrollIntoView({block:"nearest"});
 }
 $("ma-animal-ficha-fechar").addEventListener("click",()=>{$("ma-animal-ficha").hidden=true;aoFechar?.();});
 return {abrir};
}
root.AlertaAnimalFicha={criar};
})(globalThis);
/* resultados: lista lateral e indicadores. */
(function(root){'use strict';
function criar({$,esc,perfil,aoAbrir,aoLocalizar}){
 function indicadores(todos){
  $("metric-one").textContent=todos.filter(x=>x.origemCamada==="triagem").length;
  $("metric-two").textContent=todos.filter(x=>x.origemCamada==="ocorrencias"&&!perfil.estadosEncerrados.includes(x.status)).length;
  $("metric-three").textContent=todos.filter(x=>x.visibilidade==="restrita").length;
 }
 function lista(xs,semPosicao){
  $("list-count").textContent=xs.length+" registro"+(xs.length===1?"":"s")+(semPosicao?" · "+semPosicao+" sem posição":"");
  const el=$("results");
  if(!xs.length){el.innerHTML='<div class="empty">Nenhum registro neste filtro.<p>Os relatos chegam pelo WhatsApp e entram em triagem.</p></div>';return;}
  el.innerHTML=xs.map((x,i)=>'<button type="button" class="result ma-animal-result" data-i="'+i+'"><div class="result-top"><span>'+esc(x.origemCamada==="triagem"?"Relato":"Ocorrência")+(x.protocolo?" · "+esc(x.protocolo):"")+'</span>'+
   '<span class="result-tag'+(x.visibilidade==="restrita"?" urgente":"")+'">'+esc(x.status||"")+'</span></div>'+
   '<strong>'+esc(x.tipo?.nome||x.situacao||"Registro")+(x.especie?" · "+esc(x.especie):"")+'</strong><small>'+esc(x.bairro||x.endereco||"Local não informado")+'</small></button>').join("");
  el.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const x=xs[Number(b.dataset.i)];aoLocalizar(x);aoAbrir(x);});
 }
 return {indicadores,lista};
}
root.AlertaAnimalResultados={criar};
})(globalThis);
/* Monitoramento animal: mapa próprio, duplicado do mapa de Ajuda. Não altera os mapas existentes. */
(async function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const INVENTARIO=globalThis.AlertaInventarioMapas;
const normal=x=>INVENTARIO?INVENTARIO.normal(x):String(x??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLocaleLowerCase("pt-BR").trim();
function alertar(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(alertar.t);alertar.t=setTimeout(()=>{t.hidden=true;},4500);}

let configuracao;
try{configuracao=await AlertaAnimalPerfil.carregar();}
catch(err){$("ma-animal-erro").textContent=err.message;$("ma-animal-erro").hidden=false;return;}
const {perfil,regras}=configuracao;

const municipioId=AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage);
const db=AlertaGestaoDados.criar(undefined,{municipioId});
const prefeitura=db.municipioAtivo();
const nomeCidade=prefeitura?.nome||"Município";

$("eyebrow").textContent=perfil.eyebrow||"";
$("title").textContent=perfil.titulo;
$("subtitle").textContent=perfil.subtitulo||"";
$("map-brand-title").textContent=nomeCidade.toLocaleUpperCase("pt-BR")+" "+perfil.titulo.toLocaleUpperCase("pt-BR");
document.title=perfil.titulo+" | "+nomeCidade+" · Sistema Integrado de Crise";
$("municipio").innerHTML='<option>'+esc(nomeCidade+" / "+(prefeitura?.uf||""))+'</option>';$("municipio").disabled=true;

const centro=AlertaGestaoDados.config.centro(prefeitura);
const map=L.map("map",{zoomControl:true,zoomSnap:0,zoomDelta:.5}).setView(centro||[0,0],centro?12:2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,subdomains:"abc",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const poligonos=L.layerGroup().addTo(map);
const unidadesMunicipais=L.layerGroup().addTo(map);
const grupos={triagem:L.layerGroup().addTo(map),ocorrencias:L.layerGroup().addTo(map),unidades:L.layerGroup().addTo(map)};

const catalogoNome=AlertaGestaoDados.config.referencias(prefeitura).catalogoBairros;
const catalogoBairros=catalogoNome?globalThis[catalogoNome]:null;
const state={camada:"",zona:"",situacao:"",busca:"",mostrarEncerradas:false,mostrarUnidades:true,unidades:[]};

const consultas=AlertaAnimalConsultas.criar({db,perfil,regras,normal});
const territorio=AlertaAnimalTerritorio.criar({map,L,poligonos,normal,catalogoBairros,client:globalThis.AlertaSupabaseClient,municipioId,perfil,aoMudar:()=>{filtros.montar(state,territorio.zonas());render();}});
const ficha=AlertaAnimalFicha.criar({$,esc,territorio,aoFechar:()=>{}});
const abrirFicha=x=>{if($("painel-ajuda").hidden)$("painel-ajuda-toggle").click();ficha.abrir(x);};
const camadas=AlertaAnimalCamadas.criar({L,esc,grupos,territorio,aoAbrir:abrirFicha});
const filtros=AlertaAnimalFiltros.criar({$,esc,perfil,consultas});
const resultados=AlertaAnimalResultados.criar({$,esc,perfil,aoAbrir:abrirFicha,aoLocalizar:x=>{const p=territorio.posicao(x);if(p)map.flyTo([p.lat,p.lng],Math.max(map.getZoom(),15));}});

// Mesmo painel de unidades municipais do mapa de Ajuda (módulos compartilhados, sem alteração).
const fichaPonto=FichaPonto.criar({painel:$("painel-ajuda"),abrirPainel:()=>{if($("painel-ajuda").hidden)$("painel-ajuda-toggle").click();},obterRegistro:(modulo,id)=>db.registro(modulo,id),waLink:globalThis.MaringaCrise?.waLink});
const filtrosCadastros=FiltrosCadastros.montar({alvo:$("filtros-cadastros-municipais"),inventario:INVENTARIO,db,baseGestao:"../gestao/",recorte:()=>true,aoMudar:()=>render(),localizar:x=>map.flyTo([x.lat,x.lng],Math.max(map.getZoom(),15))});
function renderUnidadesMunicipais(){
 unidadesMunicipais.clearLayers();
 if(!filtrosCadastros.mostrar())return;
 for(const x of filtrosCadastros.rows().filter(x=>x.georreferenciado&&!x.privado)){
  L.marker([x.lat,x.lng],{icon:L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">'+INVENTARIO.simbolo(x)+"</span>",iconSize:[32,32],iconAnchor:[16,32]}),title:x.nome})
   .bindTooltip("<strong>"+esc(x.nome)+"</strong><br>"+esc(x.endereco||"Endereço não informado"),{direction:"top"}).on("click",()=>fichaPonto.abrir(x)).addTo(unidadesMunicipais);
 }
}

function render(){
 const todos=[...consultas.relatos(),...consultas.incidentes()];
 const porCamada=state.camada?todos.filter(x=>x.origemCamada===state.camada):todos;
 const xs=consultas.filtrar(porCamada,{...state,zonaDe:territorio.zonaDe});
 const semPosicao=camadas.desenhar(xs);
 camadas.desenharUnidades(state.unidades,state.mostrarUnidades);
 renderUnidadesMunicipais();
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
 toggle.setAttribute("aria-label",fechado?"Abrir painel":"Recolher painel");toggle.title=fechado?"Abrir painel":"Recolher painel";
 requestAnimationFrame(()=>map.invalidateSize());
});
toggle.click();

PainelEventos.iniciar({painel:$("eventos-painel"),barra:$("eventos-painel-head"),abrir:$("eventos-open"),fechar:$("eventos-close"),area:document.querySelector(".map-area"),aoAbrir:()=>filtrosCadastros.abrir()});
filtros.montar(state,territorio.zonas());render();

// Câmera de referência indicada no perfil (Ajuda), lida de config/cameras-mapas.js sem alterá-la.
window.AlertaMapaNavegacao.instalarVistaSalva({limites:AlertaGestaoDados.config.limites(prefeitura),map,L,
 identificador:AlertaAnimalPerfil.ID,vistaInicial:AlertaGestaoDados.config.vistaMapa(prefeitura,perfil.camera),arrasteNoMinimo:true});
if(catalogoBairros)catalogoBairros.iniciar({map,L,recolherInicial:true});
territorio.carregar().catch(err=>console.warn("Bairros e zonas indisponíveis",err));
territorio.unidades().then(xs=>{state.unidades=xs;render();}).catch(err=>alertar("Unidades de atendimento indisponíveis: "+err.message));
window.addEventListener("focus",render);
})();
