/* Lista única de geoterritorialidade: utiliza os cadastros já existentes.
 * Zonas: referência de subdistritos numerados IBGE; bairros: camada territorial versionada.
 * Referências públicas são exibidas sem duplicar a coleção municipal.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const D=globalThis.AlertaGestaoDados;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim().replace(/^zona\s*0*(\d+)$/,(_,n)=>"zona "+Number(n));
const db=()=>D.criar(undefined,{municipioId:sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa"});
let zonasPromise=null,bairrosPromise=null,token=0;
let referencias=new Map();
function zonasOficiais(){
 if(zonasPromise)return zonasPromise;
 const p=db().municipioAtivo();
 if(!p||p.id!=="maringa")return Promise.resolve([]);
 if(db().tipo==="supabase")return Promise.resolve(db().lista("zonas"));
 const url="https://servicodados.ibge.gov.br/api/v1/localidades/municipios/"+encodeURIComponent(p.codigo_ibge)+"/subdistritos";
 zonasPromise=fetch(url,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Consulta IBGE indisponível");return r.json();}).catch(()=>fetch("https://servicodados.ibge.gov.br/api/v1/localidades/distritos/411520005/subdistritos",{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Consulta IBGE indisponível");return r.json();})).then(rows=>{
  if(!Array.isArray(rows))throw Error("Resposta territorial inválida");
  return rows.filter(x=>/^zona\s*0*\d+$/i.test(String(x.nome||"").trim())).map(x=>{
   const n=Number(String(x.nome).match(/\d+/)[0]);
   return {nome:"Zona "+n,codigo:String(x.id),externalId:"ibge-subdistrito:"+x.id,fonte:"IBGE · Subdistritos",verificacao:"Pendente"};
  }).sort((a,b)=>Number(a.nome.match(/\d+/)[0])-Number(b.nome.match(/\d+/)[0]));
 }).catch(()=>{zonasPromise=null;return null;});
 return zonasPromise;
}
function bairrosOficiais(){
 if(bairrosPromise)return bairrosPromise;
 if(db().municipioAtivo()?.id!=="maringa"||!globalThis.MaringaBairros)return Promise.resolve([]);
 bairrosPromise=MaringaBairros.carregar().then(data=>data.bairros.features.map(f=>({
  nome:String(f.properties?.nome||"").trim(),
  codigo:String(f.properties?.codigo_bairro||f.properties?.codigo||""),
  externalId:String(f.id||f.properties?.id||""),
  fonte:data.bairros.source,
  geojson:JSON.stringify(f.geometry),
  verificacao:"Pendente"
 })).filter(x=>x.nome)).catch(()=>{bairrosPromise=null;return null;});
 return bairrosPromise;
}
function ordem(a,b){
 const za=String(a.nome).match(/^Zona\s*(\d+)$/i),zb=String(b.nome).match(/^Zona\s*(\d+)$/i);
 return za&&zb?Number(za[1])-Number(zb[1]):String(a.nome).localeCompare(String(b.nome),"pt-BR",{numeric:true});
}
async function render(){
 const body=$("geo-rows"),type=$("geo-type")?.value;
 if(!body||!["zonas","bairros"].includes(type))return;
 const stamp=++token;
 let oficiais=type==="zonas"?await zonasOficiais():await bairrosOficiais();
 if(stamp!==token||!body.isConnected)return;
 if(type==="zonas"&&Array.isArray(oficiais)&&db().municipioAtivo()?.id==="maringa"){
  const existentes=new Set(db().lista("zonas").map(x=>norm(x.nome)));
  const faltantes=oficiais.filter(x=>!existentes.has(norm(x.nome))).map(x=>({...x,tipo:"Zona numerada",verificacao:"Em conferência"}));
  if(faltantes.length&&db().tipo!=="supabase"){
   try{db().importarLote("zonas",faltantes);}catch(err){/* A consulta continua acessível mesmo quando o navegador não permite salvar. */}
  }
 }
 const registros=db().lista(type);
 const indisponivel=oficiais===null;
 oficiais=oficiais||[];
 const merged=new Map(registros.map(x=>[norm(x.nome),{...x,cadastrado:true}]));
 for(const x of oficiais){
  const k=norm(x.nome);
  if(k&&!merged.has(k))merged.set(k,{...x,cadastrado:false});
 }
 const rows=[...merged.values()].sort(ordem);
 const search=norm($("geo-search")?.value);
 const filtrados=rows.filter(x=>norm([x.nome,x.codigo||x.codigo_bairro,x.zona,x.responsavel].join(" ")).includes(search));
 const count=$("geo-count");
 if(count)count.textContent=filtrados.length+" registro(s)"+(indisponivel?" · fonte oficial temporariamente indisponível":"");
 referencias=new Map();
 body.innerHTML=filtrados.map(x=>{
  const key=x.externalId||x.codigo||x.nome;
  if(!x.cadastrado)referencias.set(key,{...x});
  const vinculo=type==="zonas"?x.responsavel||"—":x.zona||"—";
  const codigo=x.codigo||x.codigo_bairro||x.externalId?.split(":").pop()||"—";
  const action=x.cadastrado?
   '<button type="button" class="row-action" data-geo-edit="'+esc(x.id)+'" data-geo-module="'+type+'">Editar</button>':
   '<button type="button" class="row-action" data-geo-ref="'+esc(key)+'">Cadastrar</button>';
  return '<tr><td><strong>'+esc(x.nome)+'</strong></td><td>'+esc(codigo)+'</td><td>'+esc(vinculo)+'</td>'+
   '<td>'+esc(x.fonte||"Cadastro municipal")+'</td><td>'+action+'</td></tr>';
 }).join("")||'<tr><td colspan="5">Nenhum território encontrado para esta pesquisa.</td></tr>';
 body.onclick=e=>{
  const ref=e.target.closest("[data-geo-ref]");if(!ref)return;
  const source=referencias.get(ref.dataset.geoRef);if(!source)return;
  globalThis.dispatchEvent(new CustomEvent("gestao:referencia-territorial",{detail:{modulo:type,source}}));
 };
}
globalThis.addEventListener("hashchange",()=>setTimeout(render,0));
globalThis.addEventListener("gestao:geo-render",()=>void render());
globalThis.addEventListener("gestao:bairros-atualizados",()=>void render());
void render();
})();
