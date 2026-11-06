"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const D=require("../gestao/dados.js"),M=require("../mapas/inventario.js"),I=require("../dados-territoriais/importacao-publica.js");
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))}};
test("dois mapas auxiliares mostram, ocultam e filtram georreferenciados usando a única fonte municipal",()=>{
 const db=D.criar(storage(),{municipioId:"maringa"});
 for(const file of ["dados-territoriais/maringa-bases-riscos-publicos.json","dados-territoriais/maringa-abrigos-publicos.json"])
  I.importar(db,JSON.parse(read(file)));
 const code=read("mapas/app.js"),start=code.indexOf("const unidadesMunicipais=L.layerGroup().addTo(map);"),end=code.indexOf("function renderEquipePorBairro(xs){",start);
 assert.ok(start>0&&end>start,"Adaptador de camadas separado");
 const pins=[],L={
  layerGroup:()=>({addTo(){return this},clearLayers(){pins.length=0}}),
  divIcon:o=>o,
  marker:(pos,opts)=>({bindTooltip(html){this.html=html;return this},on(){return this},addTo(){pins.push({pos,opts,html:this.html});return this}})
 };
 const elements={};
 const ctx=vm.createContext({L,map:{},INVENTARIO:M,FichaPonto:{criar:()=>({abrir(){}})},FiltrosUnidades:{criar:()=>({aceita:()=>true,selecionarTodos(){}})},MaringaCrise:{waLink(){}},app:{db,prefeitura:()=>({id:"maringa"}),pontoDaZona:()=>null},
  camadaAtual:"principal",filtroZona:"",texto:"",esc:String,$:id=>(elements[id]??={textContent:""}),console});
 vm.runInContext(code.slice(start,end),ctx);
 assert.equal(vm.runInContext("renderUnidadesMunicipais()",ctx),6);
 assert.equal(pins.length,6,"5 centros de doação mais um abrigo emergencial");
 assert.ok(pins.some(p=>p.opts.title.includes("Vila Olímpica")));
 assert.ok(pins.some(p=>p.html.includes("Maringá")));
 assert.equal(vm.runInContext("mostrarUnidades=false;renderUnidadesMunicipais()",ctx),0);
 assert.equal(pins.length,0,"Ocultar remove marcadores; não exclui registros");
 assert.equal(M.registros(db).filter(x=>x.georreferenciado).length,6,"Registros seguem intactos");
 assert.equal(vm.runInContext('mostrarUnidades=true;filtroZona="Zona 7";renderUnidadesMunicipais()',ctx),1);
 assert.equal(pins.length,1);
 assert.match(pins[0].opts.title,/Vila Olímpica/);
 assert.equal(vm.runInContext('filtroZona="";texto="Templo";renderUnidadesMunicipais()',ctx),1);
 assert.match(pins[0].opts.title,/Templo/);
});
