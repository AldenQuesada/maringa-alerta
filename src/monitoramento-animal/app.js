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
