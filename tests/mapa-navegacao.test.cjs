"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {instalar,AREA_MARINGA}=require("../mapa-navegacao.js");

const POLIGONOS=[
 [[-23.392,-51.950],[-23.392,-51.930],[-23.408,-51.930],[-23.408,-51.950]], // Zona 7
 [[-23.380,-51.922],[-23.380,-51.902],[-23.396,-51.902],[-23.396,-51.922]], // Jardim Alvorada
 [[-23.428,-51.966],[-23.428,-51.946],[-23.446,-51.946],[-23.446,-51.966]], // Conjunto Requião
 [[-23.435,-51.933],[-23.435,-51.913],[-23.452,-51.913],[-23.452,-51.933]], // Jardim Universo
 [[-23.374,-51.962],[-23.374,-51.941],[-23.392,-51.941],[-23.392,-51.962]], // Vila Esperança
 [[-23.415,-51.946],[-23.415,-51.927],[-23.430,-51.927],[-23.430,-51.946]]  // Centro Cívico
];
const rad=Math.PI/180;
function point(x,y) {return {x,y,
  subtract(p){return point(this.x-p.x,this.y-p.y)},
  add(p){return point(this.x+p.x,this.y+p.y)},
  divideBy(n){return point(this.x/n,this.y/n)}
};}
function boundsFrom(coords) {
 const pts=coords.map(p=>Array.isArray(p)?{lat:p[0],lng:p[1]}:p);
 let south=Infinity,north=-Infinity,west=Infinity,east=-Infinity;
 for(const p of pts){south=Math.min(south,p.lat);north=Math.max(north,p.lat);west=Math.min(west,p.lng);east=Math.max(east,p.lng);}
 return {
  isValid:()=>pts.length>0,
  getSouth:()=>south,getNorth:()=>north,getWest:()=>west,getEast:()=>east,
  getCenter:()=>({lat:(south+north)/2,lng:(west+east)/2}),
  getNorthWest:()=>({lat:north,lng:west}),getSouthEast:()=>({lat:south,lng:east}),
  pad(r){const dy=(north-south)*r,dx=(east-west)*r;return boundsFrom([[south-dy,west-dx],[north+dy,east+dx]]);},
  extend(p){return boundsFrom([[south,west],[north,east],p]);}
 };
}
function project({lat,lng},z) {
 const size=256*2**z,clamped=Math.max(-85.0511,Math.min(85.0511,lat));
 return point(size*(lng+180)/360,size*(1-Math.asinh(Math.tan(clamped*rad))/Math.PI)/2);
}
function unproject(p,z){
 const size=256*2**z;
 return {lat:(2*Math.atan(Math.exp((1-2*p.y/size)*Math.PI))-Math.PI/2)/rad,lng:360*p.x/size-180};
}
function simularMapa(w=1440,h=900){
 const events={},container={children:[]};
 const map={
  width:w,height:h,zoom:13,minZoom:0,center:{lat:-23.4205,lng:-51.9333},options:{zoomSnap:0},
  zoomControl:{getContainer:()=>container},
  dragging:{enabled:true,disable(){this.enabled=false;},enable(){this.enabled=true;}},
  getSize(){return point(this.width,this.height)},project,unproject,
  getBoundsZoom(b,inside,padding=point(0,0)){
   assert.equal(inside,false,"o municipio precisa caber na tela, nunca o contrario");
   const sw=project({lat:b.getSouth(),lng:b.getWest()},0),ne=project({lat:b.getNorth(),lng:b.getEast()},0);
   const zoom=Math.log2(Math.min((this.width-padding.x)/(ne.x-sw.x),(this.height-padding.y)/(sw.y-ne.y)));
   return this.options.zoomSnap===0?zoom:Math.floor(zoom);
  },
  getCenter(){return this.center},
  getZoom(){return this.zoom},getMinZoom(){return this.minZoom},
  setMinZoom(z){this.minZoom=z;if(this.zoom<z)this.zoom=z;return this},
  setMaxBounds(b){this.maxBounds=b&&b.isValid()?b:null;return this},
  fitBounds(b,opts){
   const p=point(2*opts.padding[0],2*opts.padding[1]);
   this.zoom=Math.max(this.minZoom,this.getBoundsZoom(b,false,p));
   const a=project({lat:b.getSouth(),lng:b.getWest()},this.zoom),c=project({lat:b.getNorth(),lng:b.getEast()},this.zoom);
   this.center=unproject(point((a.x+c.x)/2,(a.y+c.y)/2),this.zoom);
   return this;
  },
  setView(c,z){this.center=Array.isArray(c)?{lat:c[0],lng:c[1]}:c;this.zoom=z;return this},
  getBounds(){
   const p=project(this.center,this.zoom),mid=point(this.width/2,this.height/2);
   const ne=unproject(p.subtract(mid),this.zoom),sw=unproject(p.add(mid),this.zoom);
   return boundsFrom([[sw.lat,ne.lng],[ne.lat,sw.lng]]);
  },
  on(name,fn){events[name]=fn;return this},
  emit(name){events[name]?.();},
  resize(w2,h2){this.width=w2;this.height=h2;events.resize()}
 };
 const L={
  latLngBounds:boundsFrom,point,
  DomUtil:{create(tag,cls,parent){const el={tag,cls,attributes:{},events:{},
   setAttribute(k,v){this.attributes[k]=v;}};parent.children.push(el);return el;}},
  DomEvent:{disableClickPropagation:e=>{e.stopsClick=true},
   on(e,event,cb){e.events[event]=cb;return e},stop:e=>{e.stopped=true}}
 };
 return {map,L,container};
}
function visaoIncluiTodasAsZonas(map){
 const visivel=map.getBounds(),m=1e-7;
 for(const [i,poly] of POLIGONOS.entries()){
  for(const [lat,lng] of poly){
   assert.ok(lat<=visivel.getNorth()+m && lat>=visivel.getSouth()-m,
    "Zona "+i+" cortada verticalmente: "+lat);
   assert.ok(lng<=visivel.getEast()+m && lng>=visivel.getWest()-m,
    "Zona "+i+" cortada horizontalmente: "+lng);
  }
 }
 assert.ok(visivel.getNorth()>-23.374,"parte norte de Vila Esperança deve ter margem visível");
 assert.ok(map.maxBounds.getNorth()>=visivel.getNorth()-m,"limite superior não pode cortar a vista");
 assert.ok(map.maxBounds.getSouth()<=visivel.getSouth()+m,"limite inferior não pode cortar a vista");
 assert.ok(map.maxBounds.getWest()<=visivel.getWest()+m,"limite oeste não pode cortar a vista");
 assert.ok(map.maxBounds.getEast()>=visivel.getEast()-m,"limite leste não pode cortar a vista");
}
test("a vista inicial inclui Vila Esperança e todas as seis zonas com margem",()=>{
 const {map,L,container}=simularMapa();
 const nav=instalar({map,L,zonas:POLIGONOS});
 visaoIncluiTodasAsZonas(map);
 assert.equal(nav.botao.attributes["aria-label"],"Voltar à posição original");
 assert.equal(container.children.length,1);
 assert.equal(map.options.maxBoundsViscosity,1);
 assert.ok(nav.limites.getNorth()>=-23.374);
 assert.equal(map.zoom,nav.zoomMinimo(),"o zoom deve ser calculado para a largura e altura da tela");
});
test("telas desktop, compacta e celular não cortam Vila Esperança",()=>{
 for(const [w,h] of [[1920,1080],[1440,900],[1024,768],[850,600],[390,844],[320,568]]){
  const {map,L}=simularMapa(w,h);
  instalar({map,L,zonas:POLIGONOS});
  visaoIncluiTodasAsZonas(map);
  assert.equal(map.getMinZoom(),map.getZoom());
 }
});
test("botão de voltar restaura a visão geral e limpa o filtro",()=>{
 const {map,L}=simularMapa(850,600);
 let limpezas=0;
 const nav=instalar({map,L,zonas:POLIGONOS,aoRestaurar:()=>{limpezas++;}});
 map.setView({lat:-23.38,lng:-51.95},16);
 const evt={stopped:false};nav.botao.events.click(evt);
 assert.equal(evt.stopped,true);
 assert.equal(limpezas,1);
 visaoIncluiTodasAsZonas(map);
 assert.equal(map.getZoom(),map.getMinZoom());
});
test("ao reduzir a tela no zoom geral a vista se adapta sem cortar a zona norte",()=>{
 const {map,L}=simularMapa();
 instalar({map,L,zonas:POLIGONOS});
 map.resize(390,844);
 visaoIncluiTodasAsZonas(map);
});
test("redimensionar durante zoom de ocorrência mantém o zoom detalhado",()=>{
 const {map,L}=simularMapa();
 instalar({map,L,zonas:POLIGONOS});
 map.zoom=16;map.resize(390,844);
 assert.equal(map.zoom,16);
});
test("acionamento por espaço retorna para a vista completa",()=>{
 const {map,L}=simularMapa();
 const nav=instalar({map,L,zonas:POLIGONOS});
 map.zoom=16;const evt={key:" ",stopped:false};
 nav.botao.events.keydown(evt);
 assert.equal(evt.stopped,true);
 visaoIncluiTodasAsZonas(map);
});
test("limites permitem navegar por busca e filtros sem arraste manual",()=>{
 const {map,L}=simularMapa(1024,768);
 instalar({map,L,zonas:POLIGONOS});
 assert.ok(map.maxBounds.getSouth()<=AREA_MARINGA[0][0]);
 assert.ok(map.maxBounds.getNorth()>=AREA_MARINGA[1][0]);
 assert.ok(map.maxBounds.getWest()<=AREA_MARINGA[0][1]);
 assert.ok(map.maxBounds.getEast()>=AREA_MARINGA[1][1]);
 assert.equal(map.dragging.enabled,false);
 assert.equal(map.getMinZoom(),map.getZoom());
});

test("zoom preciso reduz o espaço vazio superior sem cortar Vila Esperança no desktop",()=>{
 for(const [w,h] of [[1440,900],[1024,768],[1920,1080]]) {
  const {map,L}=simularMapa(w,h);
  instalar({map,L,zonas:POLIGONOS});
  const norte=Math.max(...POLIGONOS.flat().map(p=>p[0]));
  const nortePixel=project({lat:norte,lng:-51.94},map.zoom).y - project(map.center,map.zoom).y + h/2;
  assert.ok(nortePixel>=-0.001,"a parte norte foi cortada");
  assert.ok(nortePixel<=35,
    "margem superior excessiva: "+Math.round(nortePixel)+"px na tela "+w+"x"+h);
  assert.ok(map.zoom%1!==0,"zoom deve ser fracionário para aproveitar área útil");
  visaoIncluiTodasAsZonas(map);
 }
});

test("o botão de centralizar retorna à mesma escala precisa em vez do zoom 13 fixo",()=>{
 const {map,L}=simularMapa(1440,900);
 const nav=instalar({map,L,zonas:POLIGONOS});
 const inicial=map.zoom;
 map.zoom=inicial+2.5;
 nav.restaurar();
 assert.ok(Math.abs(map.zoom-inicial)<0.000001);
 visaoIncluiTodasAsZonas(map);
});


test("Evento recupera zoom e retorno sem arraste ou preferências incorretas",()=>{
 const {map,L,container}=simularMapa();
 const storage={getItem:()=>{throw Error("Câmera não deve ler storage legado");},
  setItem:()=>{throw Error("Câmera não deve gravar storage automaticamente");}};
 const nav=instalar({map,L,zonas:POLIGONOS,armazenamento:storage,chaveVista:"maringa_mapa_evento_vista_original_v1"});
 assert.equal(container.children.length,1,"Apenas botão retornar: nenhuma etapa de fixar posição");
 assert.equal(map.dragging.enabled,false);
 const home={...map.center,zoom:map.zoom};
 map.setView([-23.403,-51.937],home.zoom+2);
 nav.botao.events.click({stopped:false});
 assert.equal(map.zoom,home.zoom);
 assert.ok(Math.abs(map.center.lat-home.lat)<1e-7);
 assert.ok(Math.abs(map.center.lng-home.lng)<1e-7);
 assert.equal(map.getMinZoom(),home.zoom);
});
test("Pra Somar e Colaboradores recebem a mesma navegação sem reutilizar posição errada",()=>{
 const {instalarVistaSalva}=require("../mapa-navegacao.js");
 for(const identificador of ["pra-somar","colaboradores"]){
  const {map,L,container}=simularMapa();
  const storage={getItem:()=>JSON.stringify({version:1,lat:-23.45,lng:-51.96,zoom:17}),
   setItem:()=>{throw Error("não gravar");}};
  map.setView([-23.415,-51.93],12.5);
  const nav=instalarVistaSalva({map,L,armazenamento:storage,chaveVista:"antiga",identificador});
  assert.equal(map.dragging.enabled,false);
  assert.equal(map.getMinZoom(),12.5);
  assert.equal(container.children.length,1);
  map.setView([-23.411,-51.932],16);
  nav.restaurar();
  assert.equal(map.zoom,12.5);
  assert.deepEqual(map.center,{lat:-23.415,lng:-51.93});
  assert.ok(map.maxBounds.getNorth()>=AREA_MARINGA[1][0]);
 }
});
test("CSS mantém o botão menos; módulo não impõe maxBounds da própria câmera",()=>{
 const fs=require("node:fs");
 const css=fs.readFileSync("mapa-navegacao.css","utf8");
 const src=fs.readFileSync("mapa-navegacao.js","utf8");
 assert.doesNotMatch(css,/display:\s*none\s*!important/);
 assert.doesNotMatch(src,/map\.setMaxBounds\(map\.getBounds\(\)\)/);
 assert.match(src,/map\.dragging\?\.disable/);
 assert.match(src,/map\.dragging\?\.enable/);
 assert.match(src,/new URLSearchParams\(global\.location\.search\)\.get\("calibrar"\)==="1"/);
});

test("modo calibração permite arrastar para escolher a referência nos três mapas",()=>{
 const {instalarVistaSalva}=require("../mapa-navegacao.js");
 const anterior=globalThis.location;
 globalThis.location={search:"?calibrar=1"};
 try{
  const evento=simularMapa();
  instalar({map:evento.map,L:evento.L,zonas:POLIGONOS});
  assert.equal(evento.map.dragging.enabled,true);
  for(const identificador of ["colaboradores","pra-somar"]){
   const {map,L}=simularMapa();
   instalarVistaSalva({map,L,identificador});
   assert.equal(map.dragging.enabled,true,identificador);
  }
 }finally{
  if(anterior===undefined)delete globalThis.location;
  else globalThis.location=anterior;
 }
});

test("Pra Somar abre na câmera exata aprovada, sem afetar Colaboradores",()=>{
 const {instalarVistaSalva}=require("../mapa-navegacao.js");
 const anterior=globalThis.location;
 globalThis.location={search:""};
 try{
  const {map,L}=simularMapa();
  map.setView([-23.4205,-51.9333],12);
  const n=instalarVistaSalva({map,L,identificador:"pra-somar",
   vistaInicial:{lat:-23.4398505,lng:-51.9680312,zoom:12.7027}});
  assert.equal(map.center.lat,-23.4398505);
  assert.equal(map.center.lng,-51.9680312);
  assert.equal(map.zoom,12.7027);
  assert.equal(map.getMinZoom(),12.7027);
  assert.equal(map.dragging.enabled,false);
  map.setView([-23.41,-51.94],15);
  n.restaurar();
  assert.deepEqual(map.center,{lat:-23.4398505,lng:-51.9680312});
  assert.equal(map.zoom,12.7027);
  const colab=simularMapa();
  colab.map.setView([-23.42,-51.934],12);
  instalarVistaSalva({map:colab.map,L:colab.L,identificador:"colaboradores",vistaInicial:null});
  assert.deepEqual(colab.map.center,{lat:-23.42,lng:-51.934});
  assert.equal(colab.map.zoom,12);
  map.resize(1024,768);
  assert.deepEqual(map.center,{lat:-23.4398505,lng:-51.9680312});
  assert.equal(map.zoom,12.7027);
 }finally{
  if(anterior===undefined)delete globalThis.location;
  else globalThis.location=anterior;
 }
});
test("câmera institucional do Pra Somar vem da fonte, não do navegador ou de outra prefeitura",()=>{
 const fs=require("node:fs");
 const source=fs.readFileSync("src/mapas/02-counters.js","utf8");
 assert.match(source,/vistaInicial:TIPO==="ajuda"\?\{lat:-23\.4398505,lng:-51\.9680312,zoom:12\.7027\}:null/);
 assert.doesNotMatch(source,/maringa_pra_somar_vista_original_v1/);
});
test("modo calibração do Pra Somar não é substituído pelo preset",()=>{
 const {instalarVistaSalva}=require("../mapa-navegacao.js");
 const anterior=globalThis.location;
 globalThis.location={search:"?tipo=ajuda&calibrar=1"};
 try{
  const {map,L}=simularMapa();
  map.setView([-23.419,-51.947],13.2);
  instalarVistaSalva({map,L,vistaInicial:{lat:-23.4398505,lng:-51.9680312,zoom:12.7027}});
  assert.deepEqual(map.center,{lat:-23.419,lng:-51.947});
  assert.equal(map.zoom,13.2);
  assert.equal(map.dragging.enabled,true);
 }finally{
  if(anterior===undefined)delete globalThis.location;
  else globalThis.location=anterior;
 }
});

test("nos três mapas: arraste apenas com zoom acima do inicial, volta a travar ao reduzir ou centralizar",()=>{
 const {instalarVistaSalva}=require("../mapa-navegacao.js");
 const anterior=globalThis.location;
 globalThis.location={search:""};
 try{
  const casos=[
   {nome:"evento",setup:({map,L})=>instalar({map,L,zonas:POLIGONOS})},
   {nome:"colaboradores",setup:({map,L})=>instalarVistaSalva({map,L,identificador:"colaboradores"})},
   {nome:"pra-somar",setup:({map,L})=>instalarVistaSalva({map,L,identificador:"pra-somar",vistaInicial:{lat:-23.4398505,lng:-51.9680312,zoom:12.7027}})}
  ];
  for(const caso of casos){
   const contexto=simularMapa();
   const {map}=contexto,nav=caso.setup(contexto),min=map.getMinZoom();
   assert.equal(map.dragging.enabled,false,caso.nome+" deve abrir sem arraste");
   map.setView([-23.43,-51.96],min+1);
   map.emit("zoomend");
   assert.equal(map.dragging.enabled,true,caso.nome+" deve liberar arraste após zoom +");
   map.setView([-23.43,-51.96],min);
   map.emit("zoomend");
   assert.equal(map.dragging.enabled,false,caso.nome+" deve bloquear arraste no zoom inicial");
   map.setView([-23.43,-51.96],min+2);
   map.emit("zoomend");
   assert.equal(map.dragging.enabled,true,caso.nome+" deve liberar novamente");
   nav.restaurar();
   map.emit("zoomend");
   assert.equal(map.getZoom(),min);
   assert.equal(map.dragging.enabled,false,caso.nome+" deve bloquear arraste ao voltar à origem");
  }
 }finally{
  if(anterior===undefined)delete globalThis.location;
  else globalThis.location=anterior;
 }
});
test("Pra Somar usa MARINGÁ Pra Somar no cabeçalho e remove o card flutuante, sem mudar Colaboradores",()=>{
 const fs=require("node:fs");
 const html=fs.readFileSync("mapas/index.html","utf8");
 const source=fs.readFileSync("src/mapas/00-alertar.js","utf8");
 assert.match(html,/id="map-brand-title"/);
 assert.match(source,/TIPO==="ajuda"\?"MARINGÁ Pra Somar":"MARINGÁ ALERTA"/);
 assert.match(source,/if\(TIPO==="ajuda"\)document\.querySelector\("\.map-info"\)\?\.remove\(\)/);
 assert.match(source,/if\(\$\("map-label"\)\)\$\("map-label"\)\.textContent=/);
 assert.match(html,/class="map-info"/,"card da tela Colaboradores permanece funcional");
});

test("Pra Somar oculta card e mostra MARINGÁ Pra Somar antes do app.js, inclusive com JS antigo no cache",()=>{
 const html=require("node:fs").readFileSync("mapas/index.html","utf8");
 const prefix=html.slice(0,html.indexOf("</head>"));
 assert.match(prefix,/document\.documentElement\.classList\.add\("pagina-pra-somar"\)/);
 assert.match(prefix,/html\.pagina-pra-somar \.map-info\{display:none!important\}/);
 assert.match(prefix,/html\.pagina-pra-somar #map-brand-title\{display:none!important\}/);
 assert.match(prefix,/html:not\(\.pagina-pra-somar\) #pra-somar-brand-title\{display:none!important\}/);
 assert.match(html,/<strong id="pra-somar-brand-title">MARINGÁ Pra Somar<\/strong>/);
 assert.match(html,/<strong id="map-brand-title">MARINGÁ ALERTA<\/strong>/);
 assert.match(html,/class="map-info"/,"o card de Colaboradores continua disponível");
 assert.ok(html.indexOf('classList.add("pagina-pra-somar")')<html.indexOf('class="map-info"'),
   "a rota precisa ser detectada antes de renderizar o card");
});
