/* Inventário de bairros de Maringá: consulta imediata à malha IBGE versionada,
   sem criar dados de cidadãos nem confundir bairros com zonas operacionais. */
(function(){
"use strict";
const $=id=>document.getElementById(id),D=globalThis.AlertaGestaoDados;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SITE="../mapas/?tipo=";
const DB=()=>D.criar(undefined,{municipioId:sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa"});
let token=0;
function linkMapa(nome,tipo){
 return SITE+tipo+"&bairro="+encodeURIComponent(nome);
}
function linkEvento(nome){return "../index.html?bairro="+encodeURIComponent(nome);}
function bairrosUI(){
 const panel=document.querySelector("#geo-content")||document.querySelector("#page .pref-tab-body")||$("page");
 if(panel)panel.innerHTML="";
 if(!panel)return;
 const isMaringa=DB().municipioAtivo()?.id==="maringa";
 const id=++token;
 const div=document.createElement("section");div.id="catalogo-oficial-bairros";div.className="mi-official-catalog";
 div.innerHTML='<div class="mi-official-head"><div><h2>Bairros e zonas</h2><p>Cadastros do município e, quando disponível, bairros da base territorial pública.</p></div><span class="mi-official-badge">Consultando base...</span></div><div class="mi-official-body" role="status">Carregando geometrias...</div>';
 panel.appendChild(div);
 const localOnly={bairros:{features:[],count:0,kind:"local",source:"Cadastro local"}};
 const carregamento=isMaringa&&globalThis.MaringaBairros?MaringaBairros.carregar().catch(()=>localOnly):Promise.resolve(localOnly);
 carregamento.then(data=>{
  if(id!==token||!div.isConnected)return;
  const layer=data.bairros,normal=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const registros=DB().lista("bairros"),cadastrados=new Map(registros.map(x=>[normal(x.nome),x]));
  const inventario=new Map();
  layer.features.forEach(f=>{const p=f.properties||{},key=normal(p.nome);if(key)inventario.set(key,{...p,...(cadastrados.get(key)||{})});});
  registros.forEach(x=>{const key=normal(x.nome);if(key&&!inventario.has(key))inventario.set(key,{...x});});
  const sorted=[...inventario.values()].map(x=>({...x,territorioTipo:"bairros"}));
  DB().lista("zonas").forEach(x=>sorted.push({...x,territorioTipo:"zonas"}));
  sorted.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),"pt-BR"));
  const status=div.querySelector(".mi-official-badge");
  status.textContent=layer.kind==="local"?"Cadastro local":layer.count+" polígonos · "+(layer.kind==="municipal"?"GeoMaringá":layer.kind==="ibge2022"?"IBGE 2022":"Paraná Interativo");
  div.querySelector(".mi-official-body").innerHTML=
   '<div class="mi-official-actions"><input id="mi-official-search" type="search" placeholder="Buscar bairro ou zona por nome ou código" aria-label="Buscar bairros ou zonas">'+
   '<button id="mi-official-save" type="button">Importar base territorial oficial</button></div>'+
   '<div class="mi-official-scroll"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Código</th><th>Zona operacional</th><th>Verificação</th><th>Mapa de Evento</th><th>Colaboradores</th><th>Ajuda</th><th>Ações</th></tr></thead>'+
   '<tbody id="mi-official-rows"></tbody></table></div>'+
   '<p class="mi-official-foot">Fonte: '+esc(layer.source)+'. '+sorted.filter(x=>x.territorioTipo==="bairros").length+' bairros no inventário. Os dados podem não cobrir alterações territoriais posteriores à fonte. Nenhuma área foi homologada aqui como zona de acionamento.</p>';
  const render=()=>{
   const needle=$("mi-official-search")?.value?.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR")||"";
   const tipo=$("geo-type")?.value||"todos";
   const rows=sorted.filter(p=>(tipo==="todos"||tipo===p.territorioTipo)&&(String(p.nome)+" "+String(p.codigo_bairro||p.codigo||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").includes(needle));
   $("mi-official-rows").innerHTML=rows.map(p=>'<tr><td><strong>'+esc(p.nome)+'</strong></td><td>'+ (p.territorioTipo==='zonas'?'Zona':'Bairro') +'</td><td>'+esc(p.codigo_bairro||p.codigo||"—")+'</td>'+
    '<td>'+esc(p.zona||"Não vinculada")+'</td><td>'+esc(p.verificacao||"Fonte pública · não validado")+'</td>'+
    '<td><a href="'+esc(linkEvento(p.nome))+'" target="_blank" rel="noopener">Localizar</a></td>'+
    '<td><a href="'+esc(linkMapa(p.nome,"colaboradores"))+'" target="_blank" rel="noopener">Localizar</a></td>'+
    '<td><a href="'+esc(linkMapa(p.nome,"ajuda"))+'" target="_blank" rel="noopener">Localizar</a></td>'+
    '<td>'+(p.id?'<button type="button" data-geo-edit="'+esc(p.id)+'" data-geo-module="'+esc(p.territorioTipo)+'">Editar</button>':'<span>Não importado</span>')+'</td></tr>').join("")||
    '<tr><td colspan="9">Nenhum território corresponde à busca.</td></tr>';
  };
  render();$("mi-official-search").oninput=render;
  $("mi-official-save").hidden=layer.kind==="local";
  $("mi-official-save").onclick=()=>{
   const db=DB();
   if(db.municipioAtivo()?.id!=="maringa"){alert("Selecione Maringá.");return;}
   if(!confirm("Registrar as "+layer.count+" áreas da fonte "+layer.source+" no armazenamento local? Os registros validados serão preservados."))return;
   const rows=layer.features.map(f=>({
    nome:String(f.properties.nome),externalId:(layer.kind==="municipal"?"geomaringa:":layer.kind==="ibge2022"?"ibge2022:":"parana:")+String(f.id||f.properties.id),
    zona:"",fonte:layer.source,geojson:JSON.stringify(f.geometry),
    verificacao:"Pendente",codigo_bairro:String(f.properties.codigo_bairro||f.properties.codigo||"")
   }));
   try{
    const stats=db.importarLote("bairros",rows);
    alert("Cadastro salvo neste navegador: "+stats.novos+" novos, "+stats.atualizados+" atualizados e "+stats.preservados+" validados preservados.");
    location.reload();
   }catch(e){alert("Não foi possível gravar todos os bairros: "+e.message);}
  };
 }).catch(e=>{
  if(id!==token||!div.isConnected)return;
  div.querySelector(".mi-official-badge").textContent="Fonte indisponível";
  div.querySelector(".mi-official-body").textContent="Não foi possível carregar o inventário geográfico: "+e.message;
 });
}
function zonasUI(){
 const panel=document.querySelector("#page .pref-tab-body")||$("page");if(!panel)return;
 if(DB().municipioAtivo()?.id!=="maringa"){
  panel.insertAdjacentHTML("beforeend",'<section class="mi-official-catalog"><div class="mi-official-head"><div><h2>Zonas operacionais</h2><p>Este município ainda não possui zonas operacionais homologadas na demonstração. Cadastre apenas limites confirmados pela Prefeitura e Defesa Civil.</p></div></div></section>');
  return;
 }
 const div=document.createElement("section");div.className="mi-official-catalog";
 const n=["Zona 7","Jardim Alvorada","Conjunto Requião","Jardim Universo","Vila Esperança","Centro Cívico"];
 div.innerHTML='<div class="mi-official-head"><div><h2>Contexto das zonas operacionais</h2><p>O Mapa de Evento ainda usa seis zonas de simulação. Não são limites de cobertura homologados nem os mesmos bairros do IBGE.</p></div><span class="mi-official-badge">6 demonstrativas</span></div>'+
 '<div class="mi-zone-list">'+n.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div>'+
 '<p class="mi-official-foot">Para usar zonas operacionais em mobilizações reais, a Prefeitura/Defesa Civil deve cadastrar limites e responsáveis validados. A camada municipal GeoMaringá não respondeu na extração automática.</p>';
 panel.appendChild(div);
}
function run(){
 const hash=decodeURIComponent(location.hash.slice(1)||"");
 if(hash==="bairros"||hash==="zonas"||hash==="geoterritorialidade")bairrosUI();

 else token++;
}
globalThis.addEventListener("hashchange",()=>setTimeout(run,0));
globalThis.addEventListener("gestao:bairros-atualizados",()=>setTimeout(run,0));
globalThis.addEventListener("gestao:geo-render",run);
run();
})();
