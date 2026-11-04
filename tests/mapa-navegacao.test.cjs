"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { instalar, AREA_MARINGA } = require("../mapa-navegacao.js");

const rad = Math.PI/180;
function point(x,y) {
  return {x,y,subtract(p){return point(this.x-p.x,this.y-p.y);},
    add(p){return point(this.x+p.x,this.y+p.y);},
    divideBy(n){return point(this.x/n,this.y/n);}};
}
function boundsFrom(area) {
  let south=area[0][0],west=area[0][1],north=area[1][0],east=area[1][1];
  return {
    area, getSouth:()=>south,getWest:()=>west,getNorth:()=>north,getEast:()=>east,
    getCenter:()=>({lat:(south+north)/2,lng:(west+east)/2}),
    pad(scale){
      const dh=(north-south)*scale,dw=(east-west)*scale;
      return boundsFrom([[south-dh,west-dw],[north+dh,east+dw]]);
    },
    extend(latLng){
      return boundsFrom([[Math.min(south,latLng.lat),Math.min(west,latLng.lng)],
        [Math.max(north,latLng.lat),Math.max(east,latLng.lng)]]);
    }
  };
}
function project({lat,lng},zoom) {
  const size=256*2**zoom;
  const clamped=Math.max(-85.0511,Math.min(85.0511,lat));
  return point(size*(lng+180)/360,size*(1-Math.asinh(Math.tan(clamped*rad))/Math.PI)/2);
}
function unproject(p,zoom) {
  const size=256*2**zoom;
  return {lat:(2*Math.atan(Math.exp((1-2*p.y/size)*Math.PI))-Math.PI/2)/rad,
    lng:360*p.x/size-180};
}
function simularMapa(width=1024,height=768) {
  const events={},container={children:[]};
  const map={
    options:{},zoom:13,minZoom:0,width,height,center:{lat:-23.4205,lng:-51.9333},
    zoomControl:{getContainer:()=>container},
    getSize(){return point(this.width,this.height);},
    project,unproject,
    getBoundsZoom(b,inside,padding=point(0,0)){
      assert.equal(inside,false,"É obrigatório encaixar o município na tela, não a tela no município");
      const sw=project({lat:b.getSouth(),lng:b.getWest()},0);
      const ne=project({lat:b.getNorth(),lng:b.getEast()},0);
      const widthAtZero=ne.x-sw.x,heightAtZero=sw.y-ne.y;
      return Math.floor(Math.log2(Math.min((this.width-padding.x)/widthAtZero,(this.height-padding.y)/heightAtZero)));
    },
    getZoom(){return this.zoom;},
    getMinZoom(){return this.minZoom;},
    setMaxBounds(b){this.maxBounds=b;return this;},
    setMinZoom(z){this.minZoom=z;if(this.zoom<z)this.zoom=z;return this;},
    setZoom(z){this.zoom=z;return this;},
    setView(center,z){this.center=center;this.zoom=z;return this;},
    fitBounds(b,options){
      this.zoom=Math.max(this.minZoom,this.getBoundsZoom(b,false,point(...options.padding.map(x=>2*x))));
      const sw=project({lat:b.getSouth(),lng:b.getWest()},this.zoom);
      const ne=project({lat:b.getNorth(),lng:b.getEast()},this.zoom);
      this.center=unproject(point((sw.x+ne.x)/2,(sw.y+ne.y)/2),this.zoom);
      return this;
    },
    getBounds(){
      const p=project(this.center,this.zoom),half=point(this.width/2,this.height/2);
      const nw=unproject(p.subtract(half),this.zoom),se=unproject(p.add(half),this.zoom);
      return boundsFrom([[se.lat,nw.lng],[nw.lat,se.lng]]);
    },
    on(name,fn){events[name]=fn;return this;},
    resize(width,height){this.width=width;this.height=height;events.resize();}
  };
  const L={
    point,
    latLngBounds:boundsFrom,
    DomUtil:{create(tag,cls,parent){
      const e={tag,cls,attributes:{},events:{},setAttribute(k,v){this.attributes[k]=v;}};
      parent.children.push(e);return e;
    }},
    DomEvent:{disableClickPropagation:e=>{e.disableBubbling=true;},
      on(e,name,fn){e.events[name]=fn;return e;},stop:e=>{e.stopped=true;}}
  };
  return {map,L,container};
}
function assertVisaoCompleta(map) {
  const v=map.getBounds();
  const [sw,ne]=AREA_MARINGA;
  const margem=0.0000001;
  assert.ok(v.getNorth()+margem>=ne[0], "Norte do município foi cortado");
  assert.ok(v.getSouth()-margem<=sw[0], "Sul do município foi cortado");
  assert.ok(v.getWest()-margem<=sw[1], "Oeste do município foi cortado");
  assert.ok(v.getEast()+margem>=ne[1], "Leste do município foi cortado");
  const r=map.maxBounds;
  assert.ok(r.getNorth()+margem>=v.getNorth() && r.getSouth()-margem<=v.getSouth(),
    "A trava do mapa não pode cortar a vista geral vertical");
  assert.ok(r.getEast()+margem>=v.getEast() && r.getWest()-margem<=v.getWest(),
    "A trava do mapa não pode cortar a vista geral horizontal");
}

test("vista inicial mostra Maringá inteira em desktop sem cortar o norte",()=>{
  const {map,L,container}=simularMapa(1440,900);
  const nav=instalar({map,L});
  assert.deepEqual(nav.limites.area,AREA_MARINGA);
  assert.ok(map.getZoom()<13,"O zoom anterior 13 era excessivo para o município");
  assert.equal(map.getZoom(),map.getMinZoom());
  assert.equal(map.options.maxBoundsViscosity,1);
  assertVisaoCompleta(map);
  assert.equal(container.children.length,1);
  assert.equal(nav.botao.attributes["aria-label"],"Voltar à vista inicial de Maringá");
});
test("vista inicial mostra todo o município em celular e em painel lateral estreito",()=>{
  for(const [w,h] of [[390,844],[320,568],[850,650],[1024,768],[1920,1080]]){
    const {map,L}=simularMapa(w,h);
    instalar({map,L});
    assertVisaoCompleta(map);
  }
});
test("botão de centralizar restaura o enquadramento e limpa o filtro",()=>{
  const {map,L}=simularMapa();
  let limpezas=0;
  const nav=instalar({map,L,aoRestaurar(){
    limpezas++;
    map.setView({lat:-23.4205,lng:-51.9333},13);
  }});
  map.zoom=16;
  const evt={stopped:false};
  nav.botao.events.click(evt);
  assert.equal(evt.stopped,true);
  assert.equal(limpezas,1);
  assertVisaoCompleta(map);
  assert.equal(map.zoom,map.minZoom);
});
test("mudança do tamanho da tela preserva visão geral completa",()=>{
  const {map,L}=simularMapa(1440,900);
  instalar({map,L});
  const oldZoom=map.zoom;
  map.resize(390,844);
  assert.ok(map.zoom<=oldZoom);
  assertVisaoCompleta(map);
});
test("resize não muda zoom de quem estiver analisando uma ocorrência de perto",()=>{
  const {map,L}=simularMapa(1440,900);
  instalar({map,L});
  map.zoom=16;
  map.resize(390,844);
  assert.equal(map.zoom,16);
});
test("tecla espaço aciona o mesmo retorno do botão",()=>{
  const {map,L}=simularMapa();
  const nav=instalar({map,L});
  map.zoom=16;
  const evt={key:" ",stopped:false};
  nav.botao.events.keydown(evt);
  assert.equal(evt.stopped,true);
  assertVisaoCompleta(map);
});
