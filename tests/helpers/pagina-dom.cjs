const fs=require('fs'),vm=require('vm'),{parseHTML}=require('linkedom');
async function iniciarPagina(pagina='index.html',search=''){
const {document,HTMLElement,HTMLInputElement}=parseHTML(fs.readFileSync(pagina,'utf8'));
HTMLElement.prototype.focus=function(){};HTMLElement.prototype.scrollTo=function(){};HTMLElement.prototype.scrollIntoView=function(){};
HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:1000,height:700,right:1000,bottom:700};};
Object.defineProperty(HTMLElement.prototype,'selectedOptions',{get(){return this.querySelectorAll('option[selected]');},configurable:true});
Object.defineProperty(document.defaultView.HTMLSelectElement.prototype,'value',{get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||''},set(value){for(const o of this.querySelectorAll('option')){if(o.value===String(value))o.setAttribute('selected','');else o.removeAttribute('selected');}},configurable:true});
Object.defineProperty(HTMLElement.prototype,'elements',{get(){return Object.fromEntries(Array.from(this.querySelectorAll('[name]')).map(el=>[el.name,el]));},configurable:true});
const memory=new Map(),listeners={},errors=[];
const layer=()=>({addTo(){return this},on(){return this},setLatLngs(){return this},setLatLng(){return this},bindTooltip(){return this},bindPopup(){return this},setIcon(){return this},setTooltipContent(){return this},clearLayers(){return this},getLayers(){return []},addLayer(){return this},remove(){},getBounds(){return bounds([])}});
function bounds(points){return {isValid:()=>points.length>0,pad(){return this},getCenter:()=>({lat:-3.1,lng:-60}),getSouth:()=>-4,getNorth:()=>-2,getWest:()=>-61,getEast:()=>-59};}
const map={...layer(),options:{},center:{lat:-3.1,lng:-60},zoom:12,setView(pos,z){this.center={lat:pos[0],lng:pos[1]};this.zoom=z;return this},getCenter(){return this.center},getZoom(){return this.zoom},setMinZoom(z){this.minZoom=z;return this},getMinZoom(){return this.minZoom||0},setMaxBounds(){return this},getSize(){return {x:1000,y:700}},invalidateSize(){},fitBounds(){return this},flyTo(){return this},distance:()=>0,removeLayer(){},dragging:{enable(){},disable(){}},zoomControl:{getContainer:()=>document.createElement('div')}};
const L={map:()=>map,tileLayer:layer,layerGroup:layer,heatLayer:layer,polygon:layer,circleMarker:layer,marker:layer,geoJSON:layer,divIcon:x=>x,latLngBounds:bounds,DomUtil:{create:(tag,cls,parent)=>{const el=document.createElement(tag);el.className=cls;parent.appendChild(el);return el;}},DomEvent:{disableClickPropagation(){},on(){},stop(){}}};
const ctx={Option:function(label,value){const el=document.createElement('option');el.textContent=label;el.value=value;return el;},ResizeObserver:class{observe(){} disconnect(){}},document,L,console:{warn(){},log(){},error:(...a)=>errors.push(a)},location:{search,hash:'',href:'http://localhost/'+pagina+search,reload(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},sessionStorage:{getItem:()=> 'manaus'},URL,URLSearchParams,TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,navigator:{onLine:true},innerWidth:1200,innerHeight:900,addEventListener:(k,fn)=>{(listeners[k]??=[]).push(fn)},dispatchEvent(){},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},matchMedia:()=>({matches:false}),confirm:()=>true,alert(){},getComputedStyle:()=>({getPropertyValue:()=>''}),Event:document.defaultView.Event,CustomEvent:document.defaultView.CustomEvent,fetch:async()=>({ok:true,json:async()=>({features:[],type:'FeatureCollection'})})};ctx.window=ctx;vm.createContext(ctx);
const scripts=Array.from(document.querySelectorAll('script[src]')).map(s=>s.getAttribute('src').split('?')[0]).filter(x=>!x.startsWith('http')).map(x=>require('path').join(require('path').dirname(pagina),x)).filter(x=>!x.startsWith('backend/')&&x!=='evento/app.js');

 memory.set(require(process.cwd()+'/gestao/dados.js').CHAVE,JSON.stringify({version:1,municipioAtivo:'manaus',prefeituras:[{id:'manaus',nome:'Manaus',codigo_ibge:'1302603',uf:'AM',status:'ativa',lat:-3.1,lng:-60}]}));
 for(const file of scripts){vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}

 let instance=null;
 if(pagina==='index.html'){
  const manifest=JSON.parse(fs.readFileSync('src/modulos.json'));for(const file of manifest.bundles.find(b=>b.target==='evento/app.js').sources.filter(f=>f!=='src/evento/app.js'))vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  instance=ctx.AlertaEventoControladores.criar();await instance.iniciar();
 }
 await new Promise(r=>setImmediate(r));
 return {document,ctx,map,errors,listeners,instance};
}
module.exports={iniciarPagina};
