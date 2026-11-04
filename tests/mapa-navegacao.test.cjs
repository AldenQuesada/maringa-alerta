"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { instalar, AREA_MARINGA, ZOOM_INICIAL } = require("../mapa-navegacao.js");

function simularMapa() {
  const events = {}, container = {children:[]};
  const map = {
    options: {}, zoom: 13, minZoom: 0, inside: 12, seen: [],
    zoomControl: {getContainer:()=>container},
    getBoundsZoom(bounds,inside){ assert.equal(inside,true);return this.inside; },
    setMaxBounds(bounds){this.bounds=bounds;return this;},
    setMinZoom(zoom){this.minZoom=zoom;return this;},
    getMinZoom(){return this.minZoom;},
    getZoom(){return this.zoom;},
    setZoom(zoom){this.zoom=zoom;this.seen.push(["zoom",zoom]);return this;},
    setView(center,zoom){this.center=center;this.zoom=zoom;this.seen.push(["view",zoom]);return this;},
    on(name,fn){events[name]=fn;return this;},
    emit(name){events[name]();}
  };
  const L = {
    latLngBounds: b=>({area:b}),
    latLng: p=>({lat:p[0],lng:p[1]}),
    DomUtil:{create(tag,cls,parent){const e={
      tag,cls,attributes:{},events:{},
      setAttribute(k,v){this.attributes[k]=v;}
    };parent.children.push(e);return e;}},
    DomEvent:{
      disableClickPropagation:e=>{e.preventBubbling=true;},
      on(e,name,cb){e.events[name]=cb;return this;},
      stop:e=>{e.stopped=true;}
    }
  };
  return {map,L,container};
}

test("restringe panorâmica aos limites da região e preserva zoom inicial",()=>{
  const {map,L,container}=simularMapa();
  const nav=instalar({map,L,centro:[-23.4205,-51.9333]});
  assert.deepEqual(nav.limites.area,AREA_MARINGA);
  assert.equal(map.bounds,nav.limites);
  assert.equal(map.options.maxBoundsViscosity,1);
  assert.equal(map.minZoom,ZOOM_INICIAL);
  assert.equal(map.zoom,ZOOM_INICIAL);
  assert.equal(container.children.length,1);
  assert.equal(nav.botao.attributes["aria-label"],"Voltar à vista inicial de Maringá");
});

test("botão abaixo do zoom retorna ao centro e desativa filtro de zona",()=>{
  const {map,L,container}=simularMapa();
  let limpezas=0;
  const nav=instalar({map,L,centro:[-23.4205,-51.9333],aoRestaurar(){limpezas++;}});
  map.zoom=17;
  const click={stopped:false};
  nav.botao.events.click(click);
  assert.equal(click.stopped,true);
  assert.equal(limpezas,1);
  assert.equal(map.zoom,13);
  assert.equal(map.center.lat,-23.4205);
  assert.equal(map.center.lng,-51.9333);
  assert.equal(container.children.length,1);
});

test("responsivo: amplia zoom mínimo quando viewport já não cabe nos limites",()=>{
  const {map,L}=simularMapa();
  map.inside=14;
  const nav=instalar({map,L,centro:[-23.4205,-51.9333]});
  assert.equal(map.minZoom,14);
  assert.equal(map.zoom,14);
  map.inside=15;
  map.emit("resize");
  assert.equal(map.minZoom,15);
  assert.equal(map.zoom,15);
  map.zoom=18;
  nav.restaurar();
  assert.equal(map.zoom,15);
});

test("restaura também pelo teclado com Espaço",()=>{
  const {map,L}=simularMapa();
  const nav=instalar({map,L,centro:[-23.4205,-51.9333]});
  map.zoom=16;
  const evt={key:" ",stopped:false};
  nav.botao.events.keydown(evt);
  assert.equal(evt.stopped,true);
  assert.equal(map.zoom,13);
});
