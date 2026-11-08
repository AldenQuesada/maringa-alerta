/* Cadastro territorial, referências e recorte com contexto municipal explícito. */
(function(root){
'use strict';
async function criar({db,municipio,config,bairros=[],conectado=false,adaptadores=root}){
const normalizarTerritorio = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const areasCadastradas = ['zonas','bairros'].flatMap(tipo =>
  db.lista(tipo,municipio.id).filter(area=>area.verificacao!=='Rejeitado')
    .map(area=>({...area,chave:tipo+':'+area.id,tipoArea:tipo==='zonas'?'Zona':'Bairro'}))
);
const adaptador=adaptadores[config.referencias(municipio).catalogoBairros];
const fontesPublicas=!conectado&&adaptador?await adaptador.carregar().catch(()=>null):null;
const chaveZona = nome => {const match=normalizarTerritorio(nome).match(/^zona\s*0*(\d+)$/);return match ? String(Number(match[1])) : '';};
for(const [grupo,tipoArea] of (conectado?[]:[[fontesPublicas?.zonasNumeradas,'Zona'],[fontesPublicas?.bairros,'Bairro'],[fontesPublicas?.zonas,'Zona cartográfica']])){
  grupo?.features.forEach(feature=>{
    const {id,nome}=feature.properties;
    const existente=areasCadastradas.find(area=>area.tipoArea===tipoArea && (normalizarTerritorio(area.nome)===normalizarTerritorio(nome) || (tipoArea==='Zona' && chaveZona(nome) && chaveZona(area.nome)===chaveZona(nome))));
    if(existente){if(!existente.geojson){existente.geojson=feature.geometry;existente.fonte=grupo.source;}return;}
    areasCadastradas.push({id,nome,tipoArea,chave:'publico:'+tipoArea+':'+(id||nome),geojson:feature.geometry,fonte:grupo.source});
  });
}
const areas = [...areasCadastradas,...(bairros.length?bairros.map(b=>({
  nome:b.nome,chave:'demo:'+b.nome,tipoArea:'Zona demonstrativa',demo:b
})):[])];
const selecao = new Set();
const areasPorChave=new Map(areas.map(area=>[area.chave,area]));
const areasSelecionadas=()=>[...selecao].map(chave=>areasPorChave.get(chave)).filter(Boolean);
function pertence(area, territorio){
  const nome = normalizarTerritorio(territorio);
  if(nome && [area.id,area.nome].some(valor=>normalizarTerritorio(valor)===nome)) return true;
  if(area.tipoArea!=='Zona') return false;
  return areasCadastradas.some(bairro=>bairro.tipoArea==='Bairro'
    && bairro.zona && [area.id,area.nome].some(valor=>normalizarTerritorio(valor)===normalizarTerritorio(bairro.zona))
    && nome && [bairro.id,bairro.nome].some(valor=>normalizarTerritorio(valor)===nome));
}
const noRecorte = territorio => !selecao.size || areasSelecionadas().some(area=>pertence(area,territorio));
const recorteLabel = () => areasSelecionadas().map(area=>area.nome).join(', ') || 'Todo o município';

return {normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel};
}
root.AlertaEventoTerritorio={criar};
})(globalThis);
/* Fixtures territoriais exclusivas da demonstração explícita; nunca são dados operacionais. */
(function(root){'use strict';
root.AlertaEventoDemonstracaoConfiguracao={
  "4115200": {
    "ddd": "44",
    "equipe": [
      {
        "nome": "Marcos Teixeira",
        "cargo": "Vereador"
      },
      {
        "nome": "Fernanda Lopes",
        "cargo": "Secretária de Assistência Social"
      },
      {
        "nome": "Ricardo Bittencourt",
        "cargo": "Chefe de Defesa Civil"
      },
      {
        "nome": "Juliana Prado",
        "cargo": "Subsecretária de Obras"
      },
      {
        "nome": "Eduardo Namiki",
        "cargo": "Vereador"
      },
      {
        "nome": "Carla Mendonça",
        "cargo": "Coordenadora Regional"
      },
      {
        "nome": "Paulo Henrique Camargo",
        "cargo": "Chefe de Departamento"
      },
      {
        "nome": "Renata Sakamoto",
        "cargo": "Subsecretária de Assistência Social"
      },
      {
        "nome": "Vitor Almeida Rocha",
        "cargo": "Coordenador de Campo"
      },
      {
        "nome": "Simone Aparecida Dias",
        "cargo": "Vereadora"
      },
      {
        "nome": "André Luiz Ferraz",
        "cargo": "Chefe de Defesa Civil"
      },
      {
        "nome": "Patrícia Gonçalves",
        "cargo": "Subsecretária de Obras"
      },
      {
        "nome": "Thiago Moraes Vilela",
        "cargo": "Coordenador Regional"
      },
      {
        "nome": "Luciana Barreto",
        "cargo": "Secretária de Infraestrutura"
      },
      {
        "nome": "Fábio Cardoso Neto",
        "cargo": "Chefe de Departamento"
      },
      {
        "nome": "Mariana Esteves",
        "cargo": "Subsecretária de Saúde"
      },
      {
        "nome": "Rogério Villela",
        "cargo": "Coordenador de Campo"
      },
      {
        "nome": "Daniela Freitas",
        "cargo": "Vereadora"
      }
    ],
    "equipamentos": [
      "2 motosserras",
      "1 caminhão basculante",
      "1 retroescavadeira",
      "Kit de resgate",
      "Gerador móvel",
      "1 caminhão-pipa",
      "Equipe de eletricistas",
      "Ambulância de apoio"
    ],
    "bairros": [
      {
        "nome": "Zona 7",
        "center": [
          -23.3995,
          -51.9395
        ],
        "poly": [
          [
            -23.392,
            -51.95
          ],
          [
            -23.392,
            -51.93
          ],
          [
            -23.408,
            -51.93
          ],
          [
            -23.408,
            -51.95
          ]
        ]
      },
      {
        "nome": "Jardim Alvorada",
        "center": [
          -23.387,
          -51.912
        ],
        "poly": [
          [
            -23.38,
            -51.922
          ],
          [
            -23.38,
            -51.902
          ],
          [
            -23.396,
            -51.902
          ],
          [
            -23.396,
            -51.922
          ]
        ]
      },
      {
        "nome": "Conjunto Requião",
        "center": [
          -23.436,
          -51.956
        ],
        "poly": [
          [
            -23.428,
            -51.966
          ],
          [
            -23.428,
            -51.946
          ],
          [
            -23.446,
            -51.946
          ],
          [
            -23.446,
            -51.966
          ]
        ]
      },
      {
        "nome": "Jardim Universo",
        "center": [
          -23.443,
          -51.923
        ],
        "poly": [
          [
            -23.435,
            -51.933
          ],
          [
            -23.435,
            -51.913
          ],
          [
            -23.452,
            -51.913
          ],
          [
            -23.452,
            -51.933
          ]
        ]
      },
      {
        "nome": "Vila Esperança",
        "center": [
          -23.382,
          -51.951
        ],
        "poly": [
          [
            -23.374,
            -51.962
          ],
          [
            -23.374,
            -51.941
          ],
          [
            -23.392,
            -51.941
          ],
          [
            -23.392,
            -51.962
          ]
        ]
      },
      {
        "nome": "Centro Cívico",
        "center": [
          -23.4225,
          -51.9365
        ],
        "poly": [
          [
            -23.415,
            -51.946
          ],
          [
            -23.415,
            -51.927
          ],
          [
            -23.43,
            -51.927
          ],
          [
            -23.43,
            -51.946
          ]
        ]
      }
    ]
  }
};
})(globalThis);
/* Gera as equipes locais apenas a partir de uma referência municipal explícita. */
(function(root){
'use strict';
function criar({referencia,habilitado,sortear=Math.random,ponto}){
 if(!habilitado||!referencia)return [];
 const dados=JSON.parse(JSON.stringify(referencia));
 const {equipe,equipamentos,bairros}=dados;
 let cursor=0,id=1;
 const escolher=lista=>lista[Math.floor(sortear()*lista.length)];
 for(const b of bairros){
  b.equipamentos=[escolher(equipamentos),escolher(equipamentos)];
  b.equipe={};
  for(const papel of ['responsavel','substituto','coordenador']){
   const p={...equipe[cursor++%equipe.length]};
   Object.assign(p,{id:'f'+id++,papel,zona:b.nome,pos:ponto(b.poly),tel:'('+dados.ddd+') 9'+Math.floor(1000+sortear()*8999)+'-'+Math.floor(1000+sortear()*8999)});
   b.equipe[papel]=p;
  }
 }
 return bairros;
}
root.AlertaEventoRegioesDemonstrativas={criar};
})(globalThis);
/* Compatibilidade de cadastros locais; no modo conectado não acessa o armazenamento. */
(function(root){
'use strict';
function criar({armazenamento,chave,chaveLegada,habilitado}){
 function carregar(){
  if(!habilitado)return null;
  try{
   const raw=armazenamento.getItem(chave)||(chaveLegada?armazenamento.getItem(chaveLegada):null);
   const data=JSON.parse(raw||'null');
   if(!data||typeof data!=='object'||Array.isArray(data))return null;
   return {funcionarios:Array.isArray(data.funcionarios)?data.funcionarios.filter(x=>x&&typeof x==='object'):[],equipes:Array.isArray(data.equipes)?data.equipes.filter(x=>x&&typeof x==='object'):[]};
  }catch(_){return null;}
 }
 function salvar({funcionarios,equipes}){
  if(!habilitado)return false;
  try{armazenamento.setItem(chave,JSON.stringify({
   funcionarios:funcionarios.map(({id,nome,cargo,tel})=>({id,nome,cargo,tel})),
   equipes:equipes.map(({id,nome,zona,recursos,membros,status})=>({id,nome,zona,recursos,membros,status}))
  }));return true;}catch(_){return false;}
 }
 return {carregar,salvar};
}
root.AlertaEventoAdministracaoLocal={criar};
})(globalThis);
/* Cadeia de integridade demonstrativa. A auditoria real pertence ao banco. */
(function(root){
'use strict';
function criar({armazenamento,chave,habilitado,crypto=root.crypto,agora=()=>Date.now(),onChange=()=>{}}){
 let entries=[],sequence=Promise.resolve();
 if(habilitado)try{const saved=JSON.parse(armazenamento.getItem(chave)||'[]');if(Array.isArray(saved))entries=saved;}catch{}
 const payload=({ts,ator,acao,detalhe,prev,territorios})=>JSON.stringify({ts,ator,acao,detalhe,prev,territorios});
 async function hash(value){const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function salvar(){try{armazenamento.setItem(chave,JSON.stringify(entries));}catch{}}
 function adicionar(ator,acao,detalhe,territorios){
  if(!habilitado)return Promise.resolve();
  const ts=agora();
  const next=sequence.then(async()=>{
   const entry={ts,ator,acao,detalhe,prev:entries.at(-1)?.hash||'0',territorios};
   entries.push({...entry,hash:await hash(payload(entry))});salvar();onChange();
  });
  sequence=next.catch(()=>{});return next;
 }
 async function verificar(){
  await sequence;
  for(let index=0;index<entries.length;index++){
   const entry=entries[index],prev=index?entries[index-1].hash:'0';
   if(!entry||entry.prev!==prev||await hash(payload({...entry,prev}))!==entry.hash)return {ok:false,indice:index};
  }
  return {ok:true};
 }
 function simularAdulteracao(){
  if(!habilitado||!entries.length)return false;
  entries[0].detalhe+=' (editado depois, sem recalcular o hash)';salvar();return true;
 }
 return {adicionar,verificar,simularAdulteracao,listar:()=>JSON.parse(JSON.stringify(entries))};
}
root.AlertaEventoAuditoriaLocal={criar};
})(globalThis);
/* Fila exclusiva de demonstração. Nenhum envio de rede ou escrita em dados reais. */
(function(root){
'use strict';
function criar({armazenamento,chave,habilitado,uuid=()=>crypto.randomUUID(),agora=()=>Date.now()}){
 let items=[];
 if(habilitado)try{const saved=JSON.parse(armazenamento.getItem(chave)||'[]');if(Array.isArray(saved))items=saved.filter(x=>x&&typeof x.id==='string'&&x.tipo&&x.dados);}catch{}
 function salvar(){if(habilitado)try{armazenamento.setItem(chave,JSON.stringify(items));}catch{}}
 function enfileirar(tipo,dados){
  if(!habilitado)throw Error('Fila demonstrativa indisponível no modo conectado.');
  const id=uuid();items.push({id,tipo,dados:JSON.parse(JSON.stringify(dados)),ts:agora()});salvar();return id;
 }
 function processar(consume){
  if(!habilitado)return 0;let total=0;
  for(const item of [...items])if(consume(JSON.parse(JSON.stringify(item)))===true){items=items.filter(x=>x.id!==item.id);salvar();total++;}
  return total;
 }
 return {enfileirar,processar};
}
root.AlertaEventoFilaLocal={criar};
})(globalThis);
/* Funções sem estado operacional: apresentação, identificação e sorteio demonstrativo. */
(function(root){
'use strict';
function validaCPF(cpf){
  cpf = (cpf||'').replace(/\D/g,'');
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma=0; for(let i=0;i<9;i++) soma += parseInt(cpf[i])*(10-i);
  let resto = (soma*10)%11; if(resto===10) resto=0;
  if(resto!==parseInt(cpf[9])) return false;
  soma=0; for(let i=0;i<10;i++) soma += parseInt(cpf[i])*(11-i);
  resto = (soma*10)%11; if(resto===10) resto=0;
  return resto===parseInt(cpf[10]);
}
function fmtCPF(cpf){ cpf=(cpf||'').replace(/\D/g,''); return cpf.length===11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : cpf; }
function maskCPF(cpf){ if(!cpf) return '—'; const d=cpf.replace(/\D/g,''); return d.length===11 ? `***.***.${d.slice(6,9)}-${d.slice(9)}` : '—'; }
function sortGravidade(base){
  const r = Math.random();
  const g = base + (r<0.15?-1:r>0.85?1:0);
  return Math.max(1, Math.min(3, g));
}
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function initials(nome){ return nome.split(' ').map(p=>p[0]).slice(0,2).join(''); }
function escHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function minutosDesde(ts){ return Math.max(0, Math.round((Date.now()-ts)/60000)); }
function fmtDist(m){ return m<1000 ? Math.round(m)+"m" : (m/1000).toFixed(1)+"km"; }
function randPointInBox(poly){
  const lats = poly.map(p=>p[0]), lngs = poly.map(p=>p[1]);
  return [ rnd(Math.min(...lats),Math.max(...lats)), rnd(Math.min(...lngs),Math.max(...lngs)) ];
}
root.AlertaEventoFormatacao={validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox};
})(globalThis);
/* Composição de controladores com estado privado e referências vivas explícitas. */
(function(root){'use strict';
const definicoes=new Map();
function definir(nome,contrato){if(definicoes.has(nome))throw Error('Controlador repetido: '+nome);definicoes.set(nome,contrato);}
function criar(){
 const instancias=new Map();
 for(const [nome,contrato]of definicoes){
  const dependencias={};
  for(const [campo,origem]of Object.entries(contrato.dependencias)){
   if(!definicoes.has(origem))throw Error('Controlador ausente: '+origem);
   Object.defineProperty(dependencias,campo,{enumerable:true,get:()=>instancias.get(origem)[campo],set:valor=>{instancias.get(origem)[campo]=valor;}});
  }
  instancias.set(nome,contrato.criar(dependencias));
 }
 for(const contrato of definicoes.values())for(const [campo,origem]of Object.entries(contrato.dependencias))if(!Object.hasOwn(instancias.get(origem),campo))throw Error('Dependência ausente: '+origem+'.'+campo);
 let inicio;
 return {iniciar(){return inicio??=(async()=>{for(const instancia of instancias.values())if(await instancia.iniciar()===false)return false;return true;})();},obter:nome=>instancias.get(nome)};
}
root.AlertaEventoControladores={definir,criar};
})(globalThis);
/* Controlador contexto: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('contexto',{
 dependencias:{},
 criar(dependencias){
 let validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox,conectado,tenantId,prefeituraContexto,referenciaDemonstracao,demoMode,tenantConfig,storageKey,estadoAnterior,exibirEquipesLegadas;

 async function iniciar(){
 ({validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox}=globalThis.AlertaEventoFormatacao);
(conectado=!!globalThis.AlertaNuvem?.ativo);
(tenantId=AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage));
(prefeituraContexto=AlertaGestaoDados.criar(undefined,{municipioId:tenantId}).municipioAtivo());
(referenciaDemonstracao=globalThis.AlertaEventoDemonstracaoConfiguracao[prefeituraContexto.codigo_ibge]);
(demoMode=!conectado&&!!referenciaDemonstracao&&(new URLSearchParams(location.search).get('demo')==='1'||new URLSearchParams(location.search).get('modo')==='demo'));
(tenantConfig={nome:prefeituraContexto.nome,marca:AlertaGestaoDados.config.marca(prefeituraContexto),prefixo:prefeituraContexto.sigla||'AL'});
document.title=tenantConfig.marca;
for(const node of document.querySelectorAll('#municipal-brand,.status-brand'))node.textContent=tenantConfig.marca;
(storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`);
(estadoAnterior=conectado?{estado:'vazio'}:OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId));
(exibirEquipesLegadas=!!referenciaDemonstracao&&(demoMode||
   (estadoAnterior.estado==='restauravel'&&estadoAnterior.dados.voluntarios.length>0)));
 return true;
 }
 return {iniciar,get validaCPF(){return validaCPF;},get fmtCPF(){return fmtCPF;},get maskCPF(){return maskCPF;},get sortGravidade(){return sortGravidade;},get rnd(){return rnd;},get pick(){return pick;},get initials(){return initials;},get escHtml(){return escHtml;},get minutosDesde(){return minutosDesde;},get fmtDist(){return fmtDist;},get randPointInBox(){return randPointInBox;},get conectado(){return conectado;},get tenantId(){return tenantId;},get prefeituraContexto(){return prefeituraContexto;},get referenciaDemonstracao(){return referenciaDemonstracao;},get demoMode(){return demoMode;},get tenantConfig(){return tenantConfig;},get storageKey(){return storageKey;},get estadoAnterior(){return estadoAnterior;},get exibirEquipesLegadas(){return exibirEquipesLegadas;}};
 }
});
})(globalThis);
/* Controlador regioes: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('regioes',{
 dependencias:{
  "randPointInBox": "contexto",
  "prefeituraContexto": "contexto",
  "referenciaDemonstracao": "contexto",
  "exibirEquipesLegadas": "contexto"
},
 criar(dependencias){
 let bairros,PAPEL_LABEL,MUNICIPIO_CENTER;
 function todosFuncionarios(){return bairros.flatMap(b=>Object.values(b.equipe));}
 async function iniciar(){
 (bairros=AlertaEventoRegioesDemonstrativas.criar({referencia:dependencias.referenciaDemonstracao,habilitado:dependencias.exibirEquipesLegadas,ponto:dependencias.randPointInBox}));
(PAPEL_LABEL={responsavel:'Responsável',substituto:'Substituto',coordenador:'Coordenador'});
(MUNICIPIO_CENTER=AlertaGestaoDados.config.centro(dependencias.prefeituraContexto));
 return true;
 }
 return {iniciar,get bairros(){return bairros;},get PAPEL_LABEL(){return PAPEL_LABEL;},get MUNICIPIO_CENTER(){return MUNICIPIO_CENTER;},todosFuncionarios};
 }
});
})(globalThis);
/* Controlador cadastros: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('cadastros',{
 dependencias:{
  "conectado": "contexto",
  "prefeituraContexto": "contexto",
  "storageKey": "contexto",
  "todosFuncionarios": "regioes",
  "equipesPrefeitura": "equipes"
},
 criar(dependencias){
 let administracaoLocal,adminSaved;
 function saveAdminState(){return administracaoLocal.salvar({funcionarios:dependencias.todosFuncionarios(),equipes:dependencias.equipesPrefeitura});}
 async function iniciar(){
 (administracaoLocal=AlertaEventoAdministracaoLocal.criar({armazenamento:localStorage,chave:dependencias.storageKey('admin'),chaveLegada:AlertaGestaoDados.config.referencias(dependencias.prefeituraContexto).legadoAdmin,habilitado:!dependencias.conectado}));
(adminSaved=administracaoLocal.carregar());
if(adminSaved && adminSaved.funcionarios){
  adminSaved.funcionarios.forEach(saved=>{
    const p = dependencias.todosFuncionarios().find(x=>x.id===saved.id);
    if(p){ p.nome=saved.nome; p.cargo=saved.cargo; p.tel=saved.tel; }
  });
}
 return true;
 }
 return {iniciar,get administracaoLocal(){return administracaoLocal;},saveAdminState,get adminSaved(){return adminSaved;}};
 }
});
})(globalThis);
/* Controlador equipes: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('equipes',{
 dependencias:{
  "rnd": "contexto",
  "pick": "contexto",
  "bairros": "regioes",
  "adminSaved": "cadastros",
  "voluntarios": "cadastro-territorial"
},
 criar(dependencias){
 let recursoTipos,equipePrefIdCursor,equipesPrefeitura,tiposContribuicao,tiposAjuda,itensEssenciaisZona,PREF_ALERTA,nomesVol,tiposOcorrencia,GRAV_LABEL,GRAV_COLOR,RESP_LABEL,RESP_COLOR,STATUS_COLOR;
 function nomesVolEquipe(){ return ["Juliano Mesquita","Camila Dutra","Osvaldo Reis","Tainá Borges","Wesley Cunha","Aline Pacheco","Diego Farah","Yasmin Rezende"]; }
function itensQueFaltamNaZona(zona){
  return itensEssenciaisZona.map(it=>{
    const tem = dependencias.voluntarios.filter(v=>v.bairro===zona && (v.contribuicoes||[]).includes(it.tipo)).length;
    return { tipo:it.tipo, tem, minimo:it.minimo, falta: Math.max(0, it.minimo-tem) };
  }).filter(r=>r.falta>0);
}
 async function iniciar(){
 (recursoTipos=["Motosserra","Caminhão basculante","Retroescavadeira","Kit de resgate","Gerador móvel","Caminhão-pipa","Eletricistas","Ambulância"]);
(equipePrefIdCursor=1);
(equipesPrefeitura=[]);
if(dependencias.adminSaved && dependencias.adminSaved.equipes && dependencias.adminSaved.equipes.length){
  dependencias.adminSaved.equipes.forEach(e=> equipesPrefeitura.push(e));
  equipePrefIdCursor = Math.max(...dependencias.adminSaved.equipes.map(e=>parseInt(e.id.replace('eq',''))||0)) + 1;
} else {
  dependencias.bairros.forEach(b=>{
    const n = Math.floor(dependencias.rnd(1,3));
    for(let i=0;i<n;i++){
      const recursos = [];
      const nRec = Math.floor(dependencias.rnd(2,4));
      const usados = new Set();
      for(let j=0;j<nRec;j++){
        let tipo = dependencias.pick(recursoTipos);
        if(usados.has(tipo)) continue;
        usados.add(tipo);
        const qtd = Math.floor(dependencias.rnd(1,4));
        recursos.push({ tipo, qtd, emUso: Math.floor(dependencias.rnd(0, qtd+1)) });
      }
      equipesPrefeitura.push({
        id:"eq"+(equipePrefIdCursor++),
        nome:`Equipe ${b.nome} ${i+1}`,
        zona: b.nome,
        recursos,
        membros: [dependencias.pick(nomesVolEquipe()), dependencias.pick(nomesVolEquipe())],
        status: Math.random()<0.6 ? "disponível" : "em campo",
      });
    }
  });
}
(tiposContribuicao=[
  {num:1, label:"Motosserra", tipo:"Motosserra"},
  {num:2, label:"Caminhão / transporte de carga", tipo:"Caminhão"},
  {num:3, label:"Transporte de pessoas (carro/van)", tipo:"Transporte de pessoas"},
  {num:4, label:"Mão de obra (braço)", tipo:"Mão de obra"},
  {num:5, label:"Doação de comida", tipo:"Comida"},
  {num:6, label:"Doação de roupas/cobertores", tipo:"Roupas/cobertores"},
  {num:7, label:"Gerador", tipo:"Gerador"},
  {num:8, label:"Resgate de animais", tipo:"Resgate de animais"},
  {num:9, label:"Primeiros socorros / saúde", tipo:"Primeiros socorros"},
  {num:10, label:"Abrigo temporário", tipo:"Abrigo temporário"},
]);
(tiposAjuda=tiposContribuicao.map(t=>t.tipo));
(itensEssenciaisZona=[
  {tipo:"Motosserra", minimo:2}, {tipo:"Caminhão", minimo:1}, {tipo:"Transporte de pessoas", minimo:1},
  {tipo:"Mão de obra", minimo:5}, {tipo:"Comida", minimo:2}, {tipo:"Roupas/cobertores", minimo:2}, {tipo:"Gerador", minimo:1},
]);
(PREF_ALERTA={ antes:"Antes do evento (alertas preventivos)", durante:"Durante o evento (convocação ativa)", depois:"Só depois (para ajudar na reconstrução)", todos:"Em todas as fases" });
(nomesVol=["Antônio Silva","Beatriz Nunes","Carlos Eduardo","Débora Franco","Elias Martins","Fabiana Rocha","Gustavo Peres","Helena Duarte","Igor Salles","Joana Ribas","Kleber Souza","Larissa Toledo","Maurício Teles","Natália Viegas","Otávio Brandão","Priscila Farias"]);
(tiposOcorrencia=[
  {tipo:"Distribuição de água e alimentos", icone:"🤝", gravBase:1, resp:["publica"]},
  {tipo:"Árvore caída sobre via", icone:"🌳", gravBase:2, resp:["publica","publica","mista"]},
  {tipo:"Telhado destruído", icone:"🏠", gravBase:2, resp:["privada","privada","mista"]},
  {tipo:"Alagamento residencial", icone:"🌊", gravBase:2, resp:["mista","privada","publica"]},
  {tipo:"Poste de energia caído", icone:"⚡", gravBase:2, resp:["publica"]},
  {tipo:"Deslizamento de barranco", icone:"⛰️", gravBase:3, resp:["publica","mista"]},
  {tipo:"Família ilhada", icone:"🚨", gravBase:3, resp:["publica"]},
  {tipo:"Rede elétrica exposta", icone:"⚠️", gravBase:3, resp:["publica"]},
]);
(GRAV_LABEL={1:"Baixa", 2:"Média", 3:"Alta"});
(GRAV_COLOR={1:"#8b9aad", 2:"#f2c230", 3:"#ff3b3b"});
(RESP_LABEL={publica:"Pública", privada:"Privada", mista:"Mista"});
(RESP_COLOR={publica:"#3ba7ff", privada:"#b06bff", mista:"#2ecf78"});
(STATUS_COLOR={ativa:"#ff3b3b", em_atendimento:"#ffb020", resolvida:"#2ecf78"});
 return true;
 }
 return {iniciar,get recursoTipos(){return recursoTipos;},get equipePrefIdCursor(){return equipePrefIdCursor;},set equipePrefIdCursor(valor){equipePrefIdCursor=valor;},get equipesPrefeitura(){return equipesPrefeitura;},nomesVolEquipe,get tiposContribuicao(){return tiposContribuicao;},get tiposAjuda(){return tiposAjuda;},get itensEssenciaisZona(){return itensEssenciaisZona;},itensQueFaltamNaZona,get PREF_ALERTA(){return PREF_ALERTA;},get nomesVol(){return nomesVol;},get tiposOcorrencia(){return tiposOcorrencia;},get GRAV_LABEL(){return GRAV_LABEL;},get GRAV_COLOR(){return GRAV_COLOR;},get RESP_LABEL(){return RESP_LABEL;},get RESP_COLOR(){return RESP_COLOR;},get STATUS_COLOR(){return STATUS_COLOR;}};
 }
});
})(globalThis);
/* Controlador cadastro-territorial: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('cadastro-territorial',{
 dependencias:{
  "conectado": "contexto",
  "tenantId": "contexto",
  "prefeituraContexto": "contexto",
  "exibirEquipesLegadas": "contexto",
  "bairros": "regioes"
},
 criar(dependencias){
 let ocorrencias,voluntarios,idCounter,gestao,normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel,camadasVisiveis,eventoAtivo,eventosCache,eventosMunicipio,abriuEventoDaUrl,noEvento,filtroOcorrencias,noFiltro,ocorrenciaVisivel,currentRole;

 async function iniciar(){
 (ocorrencias=[]);
(voluntarios=[]);
(idCounter=1);
(gestao=AlertaGestaoDados.criar(undefined,{municipioId:dependencias.tenantId}));
({normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel}=await AlertaEventoTerritorio.criar({db:gestao,municipio:dependencias.prefeituraContexto,config:AlertaGestaoDados.config,bairros:dependencias.bairros,conectado:dependencias.conectado}));
(camadasVisiveis={Zona:true,Bairro:true,'Zona cartográfica':false,'Zona demonstrativa':dependencias.exibirEquipesLegadas});
(eventoAtivo=new URLSearchParams(location.search).get('evento')||'');
(eventosCache=[]);
(eventosMunicipio=()=>eventosCache);
(abriuEventoDaUrl=false);
(noEvento=o=>EventosMapa.corresponde(o,eventoAtivo,eventosMunicipio()));
(filtroOcorrencias=null);
(noFiltro=o=>!filtroOcorrencias||filtroOcorrencias.corresponde(o));
(ocorrenciaVisivel=o=>noRecorte(o.bairro)&&noEvento(o)&&noFiltro(o));
(currentRole={tipo:"visualizacao"});
 return true;
 }
 return {iniciar,get ocorrencias(){return ocorrencias;},set ocorrencias(valor){ocorrencias=valor;},get voluntarios(){return voluntarios;},set voluntarios(valor){voluntarios=valor;},get idCounter(){return idCounter;},set idCounter(valor){idCounter=valor;},get gestao(){return gestao;},get normalizarTerritorio(){return normalizarTerritorio;},get areasCadastradas(){return areasCadastradas;},get areas(){return areas;},get selecao(){return selecao;},get areasSelecionadas(){return areasSelecionadas;},get pertence(){return pertence;},get noRecorte(){return noRecorte;},get recorteLabel(){return recorteLabel;},get camadasVisiveis(){return camadasVisiveis;},get eventoAtivo(){return eventoAtivo;},set eventoAtivo(valor){eventoAtivo=valor;},get eventosCache(){return eventosCache;},set eventosCache(valor){eventosCache=valor;},get eventosMunicipio(){return eventosMunicipio;},get abriuEventoDaUrl(){return abriuEventoDaUrl;},set abriuEventoDaUrl(valor){abriuEventoDaUrl=valor;},get noEvento(){return noEvento;},get filtroOcorrencias(){return filtroOcorrencias;},set filtroOcorrencias(valor){filtroOcorrencias=valor;},get noFiltro(){return noFiltro;},get ocorrenciaVisivel(){return ocorrenciaVisivel;},get currentRole(){return currentRole;},set currentRole(valor){currentRole=valor;}};
 }
});
})(globalThis);
/* Controlador mapa: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('mapa',{
 dependencias:{
  "sortGravidade": "contexto",
  "rnd": "contexto",
  "pick": "contexto",
  "escHtml": "contexto",
  "randPointInBox": "contexto",
  "tenantId": "contexto",
  "prefeituraContexto": "contexto",
  "tenantConfig": "contexto",
  "storageKey": "contexto",
  "bairros": "regioes",
  "MUNICIPIO_CENTER": "regioes",
  "tiposAjuda": "equipes",
  "nomesVol": "equipes",
  "tiposOcorrencia": "equipes",
  "GRAV_LABEL": "equipes",
  "GRAV_COLOR": "equipes",
  "RESP_LABEL": "equipes",
  "RESP_COLOR": "equipes",
  "STATUS_COLOR": "equipes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "idCounter": "cadastro-territorial",
  "areasCadastradas": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "camadasVisiveis": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "selectZone": "recorte",
  "atualizarRecorte": "recorte",
  "applyZoneVisibility": "recorte",
  "configurarMarcadorPessoa": "pessoas",
  "openOcorrencia": "ocorrencias",
  "acionarAjuda": "conversas"
},
 criar(dependencias){
 let map,estiloArea,navegacaoMapa,ocLayer,volLayer,officialLayer,heatLayer,heatOn;
 function rebuildHeat(){
  const pontos = dependencias.ocorrencias
    .filter(o=> (o.status==='ativa'||o.status==='em_atendimento') && dependencias.ocorrenciaVisivel(o))
    .map(o=> [o.pos[0], o.pos[1], o.gravidade/3]);
  heatLayer.setLatLngs(pontos);
}
function volIcon(aoVivo=false,status='indefinido',deslocamento=0){
  const anchor=deslocamento?[12-((deslocamento-1)%5-2)*16,12-Math.floor((deslocamento-1)/5)*16]:[12,12];
  return L.divIcon({className:'vol-marker',html:`<div class="vol-dot ${status==='local'?'mapa-ativo':'mapa-inativo'}${aoVivo?' vol-live':''}"></div>`,iconSize:[24,24],iconAnchor:anchor});
}
function ocIcon(status){
  const color = dependencias.STATUS_COLOR[status] || dependencias.STATUS_COLOR.ativa;
  return L.divIcon({
    className:'', iconSize:[20,20], iconAnchor:[10,10],
    html:`<div class="oc-pulse" style="--oc:${color}"><div class="ring"></div><div class="core"></div></div>`
  });
}
function gerarVoluntarios(){
  // voluntarios de "antes desta funcionalidade existir": sem CPF/endereco reais, so os campos minimos
  // para o resto do sistema (fila de contribuicoes, mobilizacao) funcionar igual para todo mundo.
  dependencias.bairros.forEach(b=>{
    const n = Math.floor(dependencias.rnd(5,9));
    for(let i=0;i<n;i++){
      const pos = dependencias.randPointInBox(b.poly);
      const ajuda = i===0?'Comida':i===1?'Mão de obra':dependencias.pick(dependencias.tiposAjuda);
      const v = {
        demo:true, id:"v"+(dependencias.idCounter++), tenantId:dependencias.tenantId, nome:dependencias.pick(dependencias.nomesVol), ajuda, contribuicoes:[ajuda], bairro:b.nome, pos, ativo:false,
        cpf:null, endereco:null, alertaPreferencia:'todos',
        disponibilidadeZona: Math.random()<0.5 ? 'qualquer_zona' : 'somente_minha',
        temVeiculo:false, tipoVeiculo:null, aceitaReembolso:null, consentimentoLGPD:true,
        cadastradoEm: Date.now() - Math.floor(dependencias.rnd(60,600))*60000,
      };
      v.marker = L.marker(pos, { icon: volIcon(), title:v.nome }).addTo(volLayer);
      dependencias.configurarMarcadorPessoa(v.marker,v);
      dependencias.voluntarios.push(v);
    }
  });
}
function gerarOcorrencia(config={}){
  const b = dependencias.bairros.find(z=>z.nome===config.zona)||dependencias.pick(dependencias.bairros);
  const pos = dependencias.randPointInBox(b.poly);
  const t = config.tipo||dependencias.pick(dependencias.tiposOcorrencia);
  const numId = dependencias.idCounter++;
  const o = {
    id:"oc"+numId, tenantId:dependencias.tenantId, demo:true, confirmado:true, protocolo:dependencias.tenantConfig.prefixo+"-"+String(10000+numId).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos,
    gravidade: dependencias.sortGravidade(t.gravBase), responsabilidade: dependencias.pick(t.resp),
    reportadoEm: Date.now() - Math.floor(dependencias.rnd(0,5))*60000,
    confirmadoEm:null, resolvidoEm:null,
    tempoEstimado: Math.floor(dependencias.rnd(25,110)),
    status:"ativa", responsavel: b.equipe.responsavel,
    fotoTag: dependencias.pick(["Foto enviada via WhatsApp","Reportado por morador","Capturado por equipe"]),
    voluntariosProx: [],
  };
  o.timeline=[{tipo:'confirmada',texto:'Ocorrência confirmada na demonstração',ts:o.reportadoEm}];

  const marker = L.marker(pos, { icon: ocIcon(o.status) }).addTo(ocLayer);
  marker.on('click', ()=>dependencias.openOcorrencia(o));
  o.marker = marker;
  refreshOcTooltip(o);
  dependencias.ocorrencias.push(o);
  dependencias.acionarAjuda(o);
  dependencias.applyZoneVisibility();
  rebuildHeat();
  return o;
}
function refreshOcTooltip(o){
  if(!o.marker)return;
  const statusLabel = o.remota ? o.registro.status.toLocaleUpperCase('pt-BR') : o.confirmado===false ? 'EM TRIAGEM' : o.status==='ativa' ? 'AGUARDANDO EQUIPE' : o.status==='em_atendimento' ? 'EM ATENDIMENTO' : 'RESOLVIDA';
  o.marker.unbindTooltip();
  o.marker.bindTooltip(
    `<div class="tt-title">${o.icone} ${dependencias.escHtml(o.tipo)}</div>
     <div class="tt-row">${dependencias.escHtml(o.bairro)} · ${statusLabel}</div>
     <div class="tt-row">Gravidade: <b style="color:${dependencias.GRAV_COLOR[o.gravidade]}">${dependencias.GRAV_LABEL[o.gravidade]}</b> · Resp.: <b style="color:${dependencias.RESP_COLOR[o.responsabilidade]}">${dependencias.RESP_LABEL[o.responsabilidade]}</b></div>
     <div class="tt-row">Responsável: ${dependencias.escHtml(o.responsavel.nome)}</div>`,
    { className:'oc-tooltip', direction:'top', offset:[0,-10] }
  );
}
 async function iniciar(){
 (map=L.map('map', { zoomControl:true, attributionControl:true, zoomSnap:0, zoomDelta:0.5 }).setView(dependencias.MUNICIPIO_CENTER||[0,0], dependencias.MUNICIPIO_CENTER?13:2));
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OpenStreetMap contributors',
  subdomains:'abc', maxZoom:19
}).addTo(map);
(estiloArea={color:'#f2c230',weight:2.2,opacity:.85,dashArray:'7,5',fillOpacity:.06,fillColor:'#f2c230'});
dependencias.areas.forEach(area=>{
  try{
    if(area.demo) area.layer=L.polygon(area.demo.poly,estiloArea);
    else if(area.geojson){
      const geo=typeof area.geojson==='string'?JSON.parse(area.geojson):area.geojson;
      const geometria=geo.type==='Feature'?geo.geometry:geo;
      if(['Polygon','MultiPolygon'].includes(geometria?.type)) area.layer=L.geoJSON(geometria,{style:area.tipoArea==='Bairro'
        ? {...estiloArea,color:'#3daae4',fillColor:'#3daae4',weight:1.4,dashArray:null}:estiloArea});
    }
    if(!area.layer?.getBounds().isValid()){ area.layer=null; return; }
    area.layer.bindTooltip(dependencias.escHtml([area.nome,area.tipoArea,area.fonte].filter(Boolean).join(' · ')),{sticky:true});
    area.layer.on('click',()=>dependencias.selectZone(area.chave));
    if(dependencias.camadasVisiveis[area.tipoArea]!==false) area.layer.addTo(map);
  }catch(_){ area.layer=null; }
});
(navegacaoMapa=window.AlertaMapaNavegacao.instalar({
  map, L, limites:AlertaGestaoDados.config.limites(dependencias.prefeituraContexto),
  vistaInicial:AlertaGestaoDados.config.vistaMapa(dependencias.prefeituraContexto,'evento'),
  arrasteNoMinimo:true, zonas:[
    ...dependencias.bairros.map(b=>b.poly),
    ...dependencias.areasCadastradas.filter(a=>a.layer).map(a=>{
      const limites=a.layer.getBounds();
      return [limites.getSouthWest(),limites.getNorthEast(),limites.getNorthWest()];
    })
  ],
  aoRestaurar: () => {
    if(dependencias.selecao.size){ dependencias.selecao.clear(); dependencias.atualizarRecorte(); }
  }
}));
(ocLayer=L.layerGroup().addTo(map));
(volLayer=L.layerGroup().addTo(map));
(officialLayer=L.layerGroup().addTo(map));
(heatLayer=L.heatLayer([], { radius:34, blur:28, maxZoom:17, gradient:{0.2:'#2ecf78',0.5:'#f2c230',0.8:'#ff8a3b',1.0:'#ff3b3b'} }));
(heatOn=false);
 return true;
 }
 return {iniciar,get map(){return map;},get estiloArea(){return estiloArea;},get navegacaoMapa(){return navegacaoMapa;},get ocLayer(){return ocLayer;},get volLayer(){return volLayer;},get officialLayer(){return officialLayer;},get heatLayer(){return heatLayer;},set heatLayer(valor){heatLayer=valor;},get heatOn(){return heatOn;},set heatOn(valor){heatOn=valor;},rebuildHeat,volIcon,ocIcon,gerarVoluntarios,gerarOcorrencia,refreshOcTooltip};
 }
});
})(globalThis);
/* Controlador recorte: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('recorte',{
 dependencias:{
  "escHtml": "contexto",
  "bairros": "regioes",
  "itensQueFaltamNaZona": "equipes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areasCadastradas": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "areasSelecionadas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "camadasVisiveis": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "noFiltro": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "map": "mapa",
  "navegacaoMapa": "mapa",
  "ocLayer": "mapa",
  "volLayer": "mapa",
  "rebuildHeat": "mapa",
  "ocIcon": "mapa",
  "refreshOcTooltip": "mapa",
  "renderOfficialMarkers": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "updateKpis": "resumo",
  "adminOverlay": "administracao",
  "renderAdminBody": "administracao",
  "filaOverlay": "triagem",
  "renderFila": "triagem",
  "zonasComAlertaAtivo": "escalonamento",
  "alertasOverlay": "prontidao",
  "renderAlertasBody": "prontidao",
  "chatOverlay": "mensagens",
  "chatContatoAtivo": "mensagens",
  "chatContatos": "mensagens",
  "renderChatContacts": "mensagens",
  "auditOverlay": "trilha",
  "renderAudit": "trilha",
  "relatorioOverlay": "relatorio",
  "renderRelatorioEvento": "relatorio",
  "montarMarcadoresPublicos": "inicializacao",
  "atualizarFiltroCadastros": "busca"
},
 criar(dependencias){
 let zoneListEl,controleCamadas;
 function renderZoneList(){
  const focado = zoneListEl.contains(document.activeElement) ? document.activeElement.dataset.area : null;
  const busca=dependencias.normalizarTerritorio(document.getElementById('territory-search').value);
  const alertas=dependencias.zonasComAlertaAtivo();
  const abertas=dependencias.ocorrencias.filter(o=>dependencias.noEvento(o)&&dependencias.noFiltro(o)&&(o.status==='ativa'||o.status==='em_atendimento'));
  const visiveis=dependencias.areas.filter(area=>dependencias.selecao.has(area.chave)||dependencias.normalizarTerritorio(area.nome).includes(busca));
  zoneListEl.innerHTML = `<button type="button" class="zone-item todos ${dependencias.selecao.size?'':'active'}" data-area="" aria-pressed="${!dependencias.selecao.size}">Todo o município</button>
    ${!dependencias.areasCadastradas.length?'<p class="territory-hint">Sem território municipal cadastrado. Importe o cadastro em Gestão.</p>':''}
    ${visiveis.map(area=>{
      const selecionada=dependencias.selecao.has(area.chave);
      const total=abertas.filter(o=>dependencias.pertence(area,o.bairro)).length;
      return `<button type="button" class="zone-item ${selecionada?'active':''}" data-area="${dependencias.escHtml(area.chave)}" aria-pressed="${selecionada}">
        <span class="zi-dot"></span><span class="zi-text" title="${dependencias.escHtml([area.nome,area.tipoArea,area.layer?area.fonte:'Sem limite no mapa'].filter(Boolean).join(' · '))}"><span class="zi-name">${[...alertas].some(z=>dependencias.pertence(area,z))?'🌦 ':''}${dependencias.escHtml(area.nome)}</span>
        <span class="zi-count">${area.tipoArea}${area.layer?'':' · sem limite no mapa'}</span></span><span class="zi-badge">${total}</span></button>`;
    }).join('')}`;
  zoneListEl.querySelectorAll('button').forEach(botao=>{
    botao.onclick=()=>selectZone(botao.dataset.area);
    if(focado!==null && botao.dataset.area===focado) botao.focus({preventScroll:true});
  });
}
function selectZone(chave){
  if(!chave) dependencias.selecao.clear();
  else if(dependencias.selecao.has(chave)) dependencias.selecao.delete(chave);
  else dependencias.selecao.add(chave);
  atualizarRecorte();
  if(!dependencias.selecao.size){ dependencias.navegacaoMapa.restaurar(); return; }
  const limites=L.latLngBounds([]);
  dependencias.areasSelecionadas().forEach(area=>{ if(area.layer) limites.extend(area.layer.getBounds()); });
  if(limites.isValid()) dependencias.map.fitBounds(limites,{padding:[40,40]});
}
function atualizarRecorte(){
  renderZoneList();
  applyZoneVisibility();
  updateZoneStrip();
  dependencias.updateKpis();
  dependencias.renderOfficialMarkers();
  dependencias.rebuildHeat();
  if(dependencias.currentPanelOcId && !dependencias.ocorrencias.some(o=>o.id===dependencias.currentPanelOcId && dependencias.ocorrenciaVisivel(o))) document.getElementById('panel-close').click();
  if(!dependencias.filaOverlay.hidden) dependencias.renderFila();
  if(!dependencias.relatorioOverlay.hidden) dependencias.renderRelatorioEvento();
  if(!dependencias.alertasOverlay.hidden) dependencias.renderAlertasBody();
  if(!dependencias.adminOverlay.hidden) dependencias.renderAdminBody();
  if(!dependencias.auditOverlay.hidden) dependencias.renderAudit();
  if(!dependencias.chatOverlay.hidden){
    dependencias.renderChatContacts();
    if(!dependencias.chatContatos().some(c=>c.id===dependencias.chatContatoAtivo)){
      dependencias.chatContatoAtivo=null;
      document.getElementById('chat-thread').textContent='Selecione um contato.';
    }
  }
  // O mesmo recorte territorial controla ocorrências, cadastros e marcadores.
  if(document.getElementById("mun-toggle")?.dataset.ready==="1"){
   dependencias.montarMarcadoresPublicos();
   dependencias.atualizarFiltroCadastros();
  }
}
function applyZoneVisibility(){
  dependencias.areas.forEach(area=>{
    if(!area.layer) return;
    if(dependencias.selecao.has(area.chave)||(!dependencias.selecao.size&&dependencias.camadasVisiveis[area.tipoArea]!==false)) area.layer.addTo(dependencias.map);
    else area.layer.remove();
  });
  dependencias.ocorrencias.forEach(o=>{
    const historico=dependencias.filtroOcorrencias?.obter().situacoes.includes('resolvida');
    if(!o.marker&&o.status==='resolvida'&&historico&&o.pos){o.marker=L.marker(o.pos,{icon:dependencias.ocIcon(o.status)});o.marker.on('click',()=>dependencias.openOcorrencia(o));dependencias.refreshOcTooltip(o);}
    if(!o.marker)return;
    const show=dependencias.ocorrenciaVisivel(o)&&(o.status!=='resolvida'||historico);
    const has=dependencias.ocLayer.hasLayer(o.marker);
    if(show&&!has)o.marker.addTo(dependencias.ocLayer);
    if(!show&&has)dependencias.ocLayer.removeLayer(o.marker);
  });
  dependencias.voluntarios.forEach(v=>{
    const show = dependencias.noRecorte(v.bairro);
    const has = dependencias.volLayer.hasLayer(v.marker);
    if(show && !has) v.marker.addTo(dependencias.volLayer);
    if(!show && has) dependencias.volLayer.removeLayer(v.marker);
  });
  dependencias.renderCollaborators();
}
function updateZoneStrip(){
  const strip = document.getElementById('zone-strip');
  strip.style.display = dependencias.selecao.size ? 'flex' : 'none';
  strip.textContent = dependencias.selecao.size ? dependencias.recorteLabel() : '';
  strip.title = dependencias.bairros.filter(b=>dependencias.noRecorte(b.nome)).map(b=>{
    const faltando=dependencias.itensQueFaltamNaZona(b.nome).map(item=>item.tipo);
    return [b.nome,b.equipamentos.join(', '),faltando.length?'Necessidades: '+faltando.join(', '):''].filter(Boolean).join(' · ');
  }).join('\n');
}
 async function iniciar(){
 (zoneListEl=document.getElementById('zone-list'));
document.getElementById('territory-search').addEventListener('input',renderZoneList);
(controleCamadas=document.getElementById('territory-layers'));
Object.entries(dependencias.camadasVisiveis).filter(([tipo])=>dependencias.areas.some(area=>area.tipoArea===tipo)).forEach(([tipo,visivel])=>{
  const label=document.createElement('label');
  const check=document.createElement('input');
  check.type='checkbox';
  check.checked=visivel;
  label.append(check, ' '+tipo);
  controleCamadas.append(label);
  check.onchange=()=>{dependencias.camadasVisiveis[tipo]=check.checked;applyZoneVisibility();};
});
 return true;
 }
 return {iniciar,get zoneListEl(){return zoneListEl;},get controleCamadas(){return controleCamadas;},renderZoneList,selectZone,atualizarRecorte,applyZoneVisibility,updateZoneStrip};
 }
});
})(globalThis);
/* Controlador pessoas: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('pessoas',{
 dependencias:{
  "escHtml": "contexto",
  "tenantId": "contexto",
  "exibirEquipesLegadas": "contexto",
  "PAPEL_LABEL": "regioes",
  "todosFuncionarios": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "gestao": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "map": "mapa",
  "officialLayer": "mapa",
  "volIcon": "mapa",
  "atualizarRecorte": "recorte",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "estadoPessoa": "conversas",
  "atualizarFiltroEventos": "persistencia",
  "montarMarcadoresPublicos": "inicializacao",
  "atualizarFiltroCadastros": "busca"
},
 criar(dependencias){
 let fichaAberta,marcadoresPessoas,assinaturaTerritorial,ultimaAssinaturaTerritorial,localizacoes,VALIDADE_GPS_MS,RAIO_CHECK_IN_M;
 function pessoasMunicipio(){
  const cadastro=AlertaGestaoDados.criar();
  return [
    ...cadastro.lista('pessoas',dependencias.tenantId).filter(p=>p.status!=='Inativo'&&p.verificacao!=='Rejeitado')
      .map(p=>({...p,id:'rh:'+p.id,oficial:true,sub:[p.funcao,...(Array.isArray(p.papeis)?p.papeis:[])].map(papel=>dependencias.PAPEL_LABEL[papel]||papel).join(' · ')})),
    ...cadastro.lista('voluntarios',dependencias.tenantId).map(p=>({...p,id:'cad:'+p.id,
      sub:[...['ajudas','maquinas','empreendedores','materiais'].flatMap(chave=>Array.isArray(p[chave])?p[chave]:[]),p.contribuicao].filter(Boolean).join(', ')})),
    ...(dependencias.exibirEquipesLegadas?dependencias.todosFuncionarios().map(p=>({...p,oficial:true,sub:dependencias.PAPEL_LABEL[p.papel],demo:true})):[]),
    ...dependencias.voluntarios.map(v=>({...v,zona:v.bairro,sub:(v.contribuicoes||[v.ajuda]).join(', '),demo:true,disponibilidade:dependencias.estadoPessoa(v.id)}))
  ].map(p=>({...p,bairroOrigem:p.bairro||p.zona}));
}
function referenciaPessoa(p){
  if(p.pos) return {pos:p.pos,aproximado:false};
  const lat=Number(p.checkin_lat),lng=Number(p.checkin_lng);
  if(p.checkin_status==='presente'&&p.checkin_lat!==''&&p.checkin_lng!==''&&p.checkin_lat!=null&&p.checkin_lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180) return {pos:[lat,lng],aproximado:false};
  // Sem localização individual, usa apenas o centro da área já cadastrada.
  for(const nome of [p.bairroOrigem,p.bairro,p.zona].filter(Boolean)){
    const area=dependencias.areas.find(a=>!a.demo&&a.layer&&[a.id,a.nome].some(x=>dependencias.normalizarTerritorio(x)===dependencias.normalizarTerritorio(nome)));
    const bounds=area?.layer?.getBounds();
    if(bounds?.isValid()){const centro=bounds.getCenter();return {pos:[centro.lat,centro.lng],aproximado:true,area:area.nome};}
  }
  return null;
}
function pontoPessoa(p){return referenciaPessoa(p)?.pos||null;}
function statusPessoaMapa(p){
  const participacoes=dependencias.ocorrencias.flatMap(o=>o.participacoes||[]).filter(x=>x.voluntarioId===p.id);
  if(participacoes.some(x=>x.status==='no_local') || p.checkin_status==='presente') return ['local','No local · chegada registrada'];
  if(participacoes.some(x=>x.status==='em_caminho') || p.checkin_status==='em_caminho') return ['caminho','A caminho · deslocamento confirmado'];
  if(p.checkin_status==='finalizado'||participacoes.some(x=>x.status==='concluida')) return ['fora','Fora da obra · saída registrada'];
  const ficticio=p.demo===true && (p.oficial || (p.cpf==null && p.endereco==null));
  if(ficticio){
    const numero=Number(String(p.id).replace(/\D/g,''));
    if(Number.isFinite(numero)){
      return [
        ['local','No local · situação simulada'],
        ['caminho','A caminho · situação simulada'],
        ['fora','Fora da obra · situação simulada']
      ][numero%3];
    }
  }
  return ['indefinido','Situação não informada'];
}
function textoMarcadorPessoa(p){
  const [,status]=statusPessoaMapa(p);
  const local=referenciaPessoa(p);
  return `<strong>${dependencias.escHtml(p.nome)}</strong><br>${dependencias.escHtml([p.sub||p.ajuda,p.bairroOrigem||p.bairro||p.zona,status,local?.aproximado?'Localização aproximada da área':'',p.demo?'Demonstração':''].filter(Boolean).join(' · '))}`;
}
function configurarMarcadorPessoa(marcador,p,deslocamento=0){
  marcador.setIcon(dependencias.volIcon(!!posicaoAtual(p.id),statusPessoaMapa(p)[0],deslocamento));
  marcador.bindTooltip(textoMarcadorPessoa(p),{direction:'top',offset:[0,-8]});
  marcador.on('click',()=>mostrarFicha(p.id));
  return marcador;
}
function pessoasPainel(){
  return pessoasMunicipio().filter(p=>dependencias.noRecorte(p.bairroOrigem));
}
function mostrarFicha(id){
  if(dependencias.currentPanelOcId) document.getElementById('panel-close').click();
  fichaAberta=id;
  const painel=document.getElementById('floatwin-body');
  if(painel.hidden || document.getElementById('floatwin').classList.contains('minimized')) document.getElementById('floatwin-min').click();
  dependencias.renderCollaborators();
  document.getElementById('ficha-pessoa')?.scrollIntoView({block:'nearest'});
}
function renderOfficialMarkers(){
  dependencias.officialLayer.clearLayers();
  marcadoresPessoas.clear();
  const referenciasPorArea=new Map();
  pessoasPainel().filter(p=>(p.oficial||p.id.startsWith('cad:'))&&pontoPessoa(p)).forEach(p=>{
    const referencia=referenciaPessoa(p);
    let deslocamento=0;
    if(referencia.aproximado){const chave=dependencias.normalizarTerritorio(referencia.area);deslocamento=(referenciasPorArea.get(chave)||0)+1;referenciasPorArea.set(chave,deslocamento);}
    const marcador=configurarMarcadorPessoa(L.marker(referencia.pos,{icon:dependencias.volIcon(),title:p.nome}),p,deslocamento).addTo(dependencias.officialLayer);
    marcadoresPessoas.set(p.id,marcador);
  });
}
function atualizarCadastroMapa(){
  // Alterações dos limites territoriais exigem reconstruir as camadas, não reaproveitar polígonos antigos.
  const assinatura=assinaturaTerritorial();
  if(assinatura!==ultimaAssinaturaTerritorial){
   ultimaAssinaturaTerritorial=assinatura;location.reload();return;
  }
  // A Gestão é a fonte dos cadastros: atualiza os eventos e as opções dos
  // filtros junto dos recursos e equipes ao retornar ao mapa ou mudar outra aba.
  dependencias.atualizarFiltroEventos();
  dependencias.filtroOcorrencias?.atualizarOpcoes();
  dependencias.atualizarRecorte();
  dependencias.montarMarcadoresPublicos();
  dependencias.atualizarFiltroCadastros();
}
function posicaoAtual(id){
  const atual=localizacoes.get(id);
  return atual?.pos && Date.now()-atual.ts<=VALIDADE_GPS_MS ? atual : null;
}
function atualizarPontoAoVivo(id){
  const voluntario=dependencias.voluntarios.find(v=>v.id===id);
  if(!voluntario?.marker)return;
  const atual=posicaoAtual(id);
  voluntario.marker.setLatLng(atual?.pos||voluntario.pos);
  const pessoa={...voluntario,demo:voluntario.cpf==null&&voluntario.endereco==null};
  voluntario.marker.setIcon(dependencias.volIcon(!!atual,statusPessoaMapa(pessoa)[0]));
  voluntario.marker.setTooltipContent(textoMarcadorPessoa(pessoa));
}
function pararLocalizacao(id){
  const atual=localizacoes.get(id);
  if(!atual)return;
  navigator.geolocation.clearWatch(atual.watch);
  clearTimeout(atual.expiracao);
  localizacoes.delete(id);
  atualizarPontoAoVivo(id);
}
function checkInValido(o,id){
  const atual=posicaoAtual(id);
  return atual?.ocorrenciaId===o.id && Number.isFinite(atual.precisao)
    && dependencias.map.distance(atual.pos,o.pos)+atual.precisao<=RAIO_CHECK_IN_M;
}
function colaboradorAtivo(id){
  const pessoa=pessoasMunicipio().find(p=>p.id===id);
  if(pessoa?.id.startsWith('cad:')) return pessoa.checkin_status==='presente'&&dependencias.normalizarTerritorio(pessoa.checkin_bairro)===dependencias.normalizarTerritorio(pessoa.bairroOrigem);
  const atual=posicaoAtual(id);
  const ocorrencia=atual&&dependencias.ocorrencias.find(o=>o.id===atual.ocorrenciaId);
  if(ocorrencia?.participacoes?.some(p=>p.voluntarioId===id&&p.status==='no_local'&&p.checkInGPS)) return true;
  const [situacao,descricao]=pessoa?statusPessoaMapa(pessoa):[];
  return situacao==='local'&&descricao==='No local · situação simulada';
}
 async function iniciar(){
 (fichaAberta=null);
(marcadoresPessoas=new Map());
(assinaturaTerritorial=()=>JSON.stringify(["zonas","bairros"].flatMap(modulo=>
 dependencias.gestao.lista(modulo,dependencias.tenantId).map(x=>[modulo,x.id,x.nome,x.zona,x.geojson,x.verificacao]))));
(ultimaAssinaturaTerritorial=assinaturaTerritorial());
window.addEventListener('storage',e=>{
  if(e.key===AlertaGestaoDados.CHAVE) atualizarCadastroMapa();
});
window.addEventListener('focus',atualizarCadastroMapa);
(localizacoes=new Map());
(VALIDADE_GPS_MS=AlertaGestaoDados.parametros.gps.validadeMs);
(RAIO_CHECK_IN_M=AlertaGestaoDados.parametros.gps.raioCheckinMetros);
 return true;
 }
 return {iniciar,pessoasMunicipio,referenciaPessoa,pontoPessoa,statusPessoaMapa,textoMarcadorPessoa,configurarMarcadorPessoa,pessoasPainel,get fichaAberta(){return fichaAberta;},set fichaAberta(valor){fichaAberta=valor;},get marcadoresPessoas(){return marcadoresPessoas;},mostrarFicha,renderOfficialMarkers,get assinaturaTerritorial(){return assinaturaTerritorial;},get ultimaAssinaturaTerritorial(){return ultimaAssinaturaTerritorial;},set ultimaAssinaturaTerritorial(valor){ultimaAssinaturaTerritorial=valor;},atualizarCadastroMapa,get localizacoes(){return localizacoes;},get VALIDADE_GPS_MS(){return VALIDADE_GPS_MS;},get RAIO_CHECK_IN_M(){return RAIO_CHECK_IN_M;},posicaoAtual,atualizarPontoAoVivo,pararLocalizacao,checkInValido,colaboradorAtivo};
 }
});
})(globalThis);
/* Controlador painel-colaboradores: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('painel-colaboradores',{
 dependencias:{
  "initials": "contexto",
  "escHtml": "contexto",
  "PAPEL_LABEL": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "areasSelecionadas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "map": "mapa",
  "pessoasMunicipio": "pessoas",
  "referenciaPessoa": "pessoas",
  "pontoPessoa": "pessoas",
  "statusPessoaMapa": "pessoas",
  "pessoasPainel": "pessoas",
  "fichaAberta": "pessoas",
  "marcadoresPessoas": "pessoas",
  "posicaoAtual": "pessoas",
  "colaboradorAtivo": "pessoas",
  "chatOverlay": "mensagens",
  "chatContatoAtivo": "mensagens",
  "renderChatContacts": "mensagens",
  "openChatThread": "mensagens",
  "isViewOnly": "permissoes"
},
 criar(dependencias){
 let janelaColaboradores,barraColaboradores,areaMapa,arrasteColaboradores;
 function renderCollaborators(){
  const body=document.getElementById('floatwin-body');
  const pessoas=dependencias.pessoasPainel();
  const todosCadastrados=dependencias.pessoasMunicipio().filter(p=>!p.oficial&&!p.demo);
  const exibidos=pessoas.filter(p=>!p.oficial&&!p.demo).length;
  const ocultos=Math.max(0,todosCadastrados.length-exibidos);
  const semTerritorio=todosCadastrados.filter(p=>!String(p.bairroOrigem||'').trim()).length;
  const avisoRecorte=dependencias.selecao.size&&ocultos
    ? ocultos+' colaborador(es) não aparecem no recorte selecionado'+(semTerritorio?' ('+semTerritorio+' sem bairro/zona confirmado).':'.')+' Selecione "Todo o município" para conferir a lista completa.'
    : !dependencias.selecao.size&&semTerritorio
      ? semTerritorio+' colaborador(es) aguardam identificação do bairro ou zona; continuam cadastrados e listados em "Bairro a confirmar".'
      : !dependencias.selecao.size&&!todosCadastrados.length
        ? (globalThis.AlertaNuvem?.ativo
          ? 'Não há colaboradores cadastrados para esta prefeitura. Gerencie os cadastros de colaboradores na Gestão.'
          : 'Não há colaboradores cadastrados para esta prefeitura neste navegador. Este protótipo utiliza armazenamento local e não sincroniza cadastros entre dispositivos.')
        : '';
  const antes=body.scrollTop;
  const comFiltro=dependencias.filtroOcorrencias&&dependencias.filtroOcorrencias.descricao()!=='Sem filtros de ocorrência';
  const pessoasEmOcorrencias=new Set(comFiltro?dependencias.ocorrencias.filter(dependencias.ocorrenciaVisivel).flatMap(o=>(o.participacoes||[]).map(p=>p.voluntarioId)):[]);
  const item=p=>{
    const aberto=dependencias.fichaAberta===p.id;
    const [situacao,descricaoSituacao]=dependencias.statusPessoaMapa(p);
    const telefone=String(p.telefone||p.tel||'').replace(/[^+\d]/g,'');
    const email=String(p.email||'');
    const contato=telefone?`tel:${telefone}`:/^[^\s@]+@[^\s@]+$/.test(email)?`mailto:${encodeURIComponent(email)}`:'';
    return `<div class="person-card${pessoasEmOcorrencias.has(p.id)?' filter-participante':''}"${aberto?' id="ficha-pessoa"':''}>
      <button type="button" class="collab-row person-toggle" data-person="${dependencias.escHtml(p.id)}" aria-expanded="${aberto}">
        <span class="c-avatar">${dependencias.escHtml(dependencias.initials(p.nome))}</span><span class="c-info"><span class="c-name">${dependencias.escHtml(p.nome)}${pessoasEmOcorrencias.has(p.id)?' · em ocorrência filtrada':''}</span>
        <span class="c-meta">${dependencias.escHtml([p.sub,p.bairroOrigem].filter(Boolean).join(' · '))}</span></span>
        <span class="person-status-dot pessoa-${situacao}" title="${dependencias.escHtml(descricaoSituacao)}" aria-label="${dependencias.escHtml(descricaoSituacao)}" role="img"></span>
      </button>
      ${aberto?`<div class="person-details">
        <div>${dependencias.escHtml([p.cargo,p.orgao,p.sub,p.bairroOrigem].filter(Boolean).join(' · '))}</div>
        <div>${dependencias.posicaoAtual(p.id)?'Localização ao vivo · '+new Date(dependencias.posicaoAtual(p.id).ts).toLocaleTimeString('pt-BR'):p.pos?'Ponto de demonstração · posição fixa':dependencias.referenciaPessoa(p)?.aproximado?'Localização aproximada da área':'Localização indisponível'}</div>
        <div class="person-actions">
          <button type="button" class="admin-btn" data-chat="${dependencias.escHtml(p.id)}"${dependencias.isViewOnly()?' disabled':''} title="Abre uma conversa interna simulada">Chat interno</button>
          ${contato&&!dependencias.isViewOnly()?`<a class="admin-btn" href="${dependencias.escHtml(contato)}" title="Abre o telefone ou e-mail cadastrado">Contatar</a>`:'<button class="admin-btn" disabled>Contatar</button>'}
          ${dependencias.pontoPessoa(p)?`<button type="button" class="admin-btn" data-locate="${dependencias.escHtml(p.id)}">Ver no mapa</button>`:''}
        </div></div>`:''}
    </div>`;
  };
  const selecionadas=dependencias.areasSelecionadas();
  const grupos=new Map(selecionadas.map(area=>[area.chave,{nome:area.nome,pessoas:[]}]));
  pessoas.forEach(p=>{
    const origem=dependencias.normalizarTerritorio(p.bairroOrigem);
    const direto=origem&&selecionadas.find(area=>[area.id,area.nome].some(valor=>dependencias.normalizarTerritorio(valor)===origem));
    const area=direto||selecionadas.find(area=>dependencias.pertence(area,p.bairroOrigem));
    if(area){
      grupos.get(area.chave).pessoas.push(p);
      return;
    }
    const bairro=dependencias.areas.find(a=>a.tipoArea==='Bairro'&&a.id===p.bairroOrigem);
    const nome=bairro?.nome||p.bairroOrigem||'Bairro a confirmar';
    const chave=dependencias.normalizarTerritorio(nome);
    if(!grupos.has(chave)) grupos.set(chave,{nome,pessoas:[]});
    grupos.get(chave).pessoas.push(p);
  });
  if(!selecionadas.length){
    function indiceDoGrupo(grupo){
      const nome=dependencias.normalizarTerritorio(grupo.nome);
      const demonstracao=grupo.pessoas.every(p=>p.demo);
      const indice=dependencias.areas.findIndex(area=>dependencias.normalizarTerritorio(area.nome)===nome
        && (demonstracao?!!area.demo:!area.demo));
      return indice<0?Infinity:indice;
    }
    const ordenados=[...grupos.entries()].sort(([,a],[,b])=>
      indiceDoGrupo(a)-indiceDoGrupo(b)||a.nome.localeCompare(b.nome,'pt-BR'));
    grupos.clear();
    ordenados.forEach(([chave,grupo])=>grupos.set(chave,grupo));
  }
  const papeis=Object.keys(dependencias.PAPEL_LABEL);
  const ordem=p=>{const i=papeis.indexOf(p.papel||p.funcao);return i<0?papeis.length:i;};
  const ordemSituacao={local:0,caminho:1,fora:2,indefinido:3};
  const compararPessoas=(a,b)=>{
    const diferenca=ordemSituacao[dependencias.statusPessoaMapa(a)[0]]-ordemSituacao[dependencias.statusPessoaMapa(b)[0]];
    return diferenca||ordem(a)-ordem(b)||a.nome.localeCompare(b.nome,'pt-BR');
  };
  document.getElementById('fw-count').textContent=pessoas.filter(p=>!p.oficial).length;
  body.innerHTML=(avisoRecorte?'<p class="equipe-nota" role="status">'+dependencias.escHtml(avisoRecorte)+'</p>':'')+[...grupos.values()].map(grupo=>{
    const oficiais=grupo.pessoas.filter(p=>p.oficial).sort(compararPessoas);
    const colaboradores=grupo.pessoas.filter(p=>!p.oficial).sort(compararPessoas);
    const ativos=colaboradores.filter(p=>dependencias.colaboradorAtivo(p.id)).length;
    const percentual=colaboradores.length?Math.round(100*ativos/colaboradores.length):0;
    return `<section class="person-territory">
      <h4>${dependencias.escHtml(grupo.nome)} <span class="equipe-kpis" title="${globalThis.AlertaNuvem?.ativo?'Ativos incluem presenças registradas.':'Ativos incluem presenças registradas e, para cadastros fictícios, situações simuladas.'}">Colab: ${colaboradores.length} · Act: ${ativos} · ${percentual}%</span></h4>
      <h3 class="person-section">Responsáveis da equipe</h3>
      ${oficiais.map(item).join('')||'<p>Nenhum responsável cadastrado.</p>'}
      <h3 class="person-section">Colaboradores · ${colaboradores.length}</h3>
      ${colaboradores.map(item).join('')||'<p>Nenhum colaborador cadastrado.</p>'}
      <p class="equipe-nota">${globalThis.AlertaNuvem?.ativo?'Act: presença registrada.':'Act: presença registrada e situações simuladas.'}</p>
    </section>`;
  }).join('')||'<p>Nenhuma equipe no recorte.</p>';
  body.scrollTop=antes;
  body.querySelectorAll('[data-person]').forEach(botao=>botao.onclick=()=>{
    dependencias.fichaAberta=dependencias.fichaAberta===botao.dataset.person?null:botao.dataset.person;
    renderCollaborators();
    [...body.querySelectorAll('[data-person]')].find(el=>el.dataset.person===botao.dataset.person)?.focus({preventScroll:true});
  });
  body.querySelector('[data-chat]')?.addEventListener('click',e=>{
    if(dependencias.isViewOnly()) return;
    dependencias.chatContatoAtivo=e.currentTarget.dataset.chat;
    dependencias.chatOverlay.hidden=false;
    dependencias.renderChatContacts();
    dependencias.openChatThread(dependencias.chatContatoAtivo);
  });
  body.querySelector('[data-locate]')?.addEventListener('click',e=>{
    const id=e.currentTarget.dataset.locate;
    const marcador=dependencias.marcadoresPessoas.get(id)||dependencias.voluntarios.find(v=>v.id===id)?.marker;
    if(!marcador)return;
    dependencias.map.setView(marcador.getLatLng(),Math.max(dependencias.map.getZoom(),15),{animate:false});
    const rect=janelaColaboradores.getBoundingClientRect(),mapa=areaMapa.getBoundingClientRect();
    if(rect.left<mapa.left+mapa.width*.65) dependencias.map.panBy([-Math.min(rect.width/2,120),0],{animate:false});
    else dependencias.map.panBy([Math.min(rect.width/2,120),0],{animate:false});
    marcador.openTooltip();
  });
}
 async function iniciar(){
 (janelaColaboradores=document.getElementById('floatwin'));
(barraColaboradores=document.getElementById('floatwin-head'));
(areaMapa=document.getElementById('mapwrap'));
(arrasteColaboradores=null);
 return true;
 }
 return {iniciar,renderCollaborators,get janelaColaboradores(){return janelaColaboradores;},get barraColaboradores(){return barraColaboradores;},get areaMapa(){return areaMapa;},get arrasteColaboradores(){return arrasteColaboradores;},set arrasteColaboradores(valor){arrasteColaboradores=valor;}};
 }
});
})(globalThis);
/* Controlador janela-colaboradores: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('janela-colaboradores',{
 dependencias:{
  "janelaColaboradores": "painel-colaboradores",
  "barraColaboradores": "painel-colaboradores",
  "areaMapa": "painel-colaboradores",
  "arrasteColaboradores": "painel-colaboradores"
},
 criar(dependencias){

 function posicionarColaboradores(x,y){
  dependencias.janelaColaboradores.style.right='auto';
  dependencias.janelaColaboradores.style.left=Math.max(0,Math.min(x,dependencias.areaMapa.clientWidth-dependencias.janelaColaboradores.offsetWidth))+'px';
  dependencias.janelaColaboradores.style.top=Math.max(0,Math.min(y,dependencias.areaMapa.clientHeight-dependencias.janelaColaboradores.offsetHeight))+'px';
}
function ajustarJanelaColaboradores(){
  if(dependencias.janelaColaboradores.style.left) posicionarColaboradores(dependencias.janelaColaboradores.offsetLeft,dependencias.janelaColaboradores.offsetTop);
}
 async function iniciar(){
 dependencias.barraColaboradores.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('button'))return;
  dependencias.arrasteColaboradores={id:e.pointerId,x:e.clientX-dependencias.janelaColaboradores.offsetLeft,y:e.clientY-dependencias.janelaColaboradores.offsetTop};
  dependencias.barraColaboradores.setPointerCapture(e.pointerId);
  dependencias.barraColaboradores.classList.add('dragging');
});
dependencias.barraColaboradores.addEventListener('pointermove',e=>{
  if(dependencias.arrasteColaboradores?.id!==e.pointerId)return;
  posicionarColaboradores(e.clientX-dependencias.arrasteColaboradores.x,e.clientY-dependencias.arrasteColaboradores.y);
});
dependencias.barraColaboradores.addEventListener('lostpointercapture',()=>{
  dependencias.arrasteColaboradores=null;
  dependencias.barraColaboradores.classList.remove('dragging');
});
new ResizeObserver(ajustarJanelaColaboradores).observe(dependencias.areaMapa);
document.getElementById('floatwin-min').onclick=e=>{
  const recolhido=dependencias.janelaColaboradores.classList.toggle('minimized');
  document.getElementById('floatwin-body').hidden=recolhido;
  e.currentTarget.textContent=recolhido?'+':'_';
  const rotulo=recolhido?'Abrir colaboradores':'Recolher colaboradores';
  e.currentTarget.title=rotulo;
  e.currentTarget.setAttribute('aria-label',rotulo);
  e.currentTarget.setAttribute('aria-expanded',String(!recolhido));
  ajustarJanelaColaboradores();
};
 return true;
 }
 return {iniciar,posicionarColaboradores,ajustarJanelaColaboradores};
 }
});
})(globalThis);
/* Controlador ocorrencias: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('ocorrencias',{
 dependencias:{
  "initials": "contexto",
  "escHtml": "contexto",
  "minutosDesde": "contexto",
  "fmtDist": "contexto",
  "GRAV_LABEL": "equipes",
  "GRAV_COLOR": "equipes",
  "RESP_LABEL": "equipes",
  "RESP_COLOR": "equipes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "map": "mapa",
  "pessoasMunicipio": "pessoas",
  "auditPush": "trilha",
  "canActZone": "permissoes",
  "PARTICIPACAO_LABEL": "conversas",
  "registrarEtapa": "conversas",
  "acionarAjuda": "conversas",
  "atualizarFluxo": "conversas",
  "participantesDaConversa": "conversas",
  "abrirWhatsapp": "conversas",
  "renderAnexos": "localizacao",
  "salvarAnexos": "persistencia",
  "salvarPrototipo": "persistencia",
  "painelPonto": "inicializacao"
},
 criar(dependencias){
 let currentPanelOcId,STATUS_BADGE;
 function badgeChip(label, color){
  return `<span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}66">${label}</span>`;
}
function openOcorrencia(o){
  if(root.AlertaOcorrenciasServidor?.abrir(o))return;
  if(document.getElementById('panel').classList.contains('com-ficha-ponto')) dependencias.painelPonto.fechar();
  currentPanelOcId=o.id;
  const panel=document.getElementById('panel'), body=document.getElementById('panel-body');
  const [badgeClass,badgeLabel]=o.confirmado===false?['ativa','EM TRIAGEM']:(STATUS_BADGE[o.status]||STATUS_BADGE.ativa);
  document.getElementById('panel-title').innerHTML=`${o.icone} ${dependencias.escHtml(o.tipo)} <span class="badge ${badgeClass}">${badgeLabel}</span><div style="font-family:var(--mono);font-size:10px;color:var(--muted);width:100%;margin-top:5px">${dependencias.escHtml(o.protocolo)} · ${dependencias.escHtml(o.bairro)}</div>`;
  const pessoas=dependencias.participantesDaConversa(o);
  const apoios=o.apoiosBairro||[];
  const candidatosApoio=dependencias.pessoasMunicipio().filter(p=>p.bairroOrigem
    && dependencias.normalizarTerritorio(p.bairroOrigem)!==dependencias.normalizarTerritorio(o.bairro)
    && !apoios.some(apoio=>apoio.pessoaId===p.id));
  const noLocal=pessoas.filter(p=>p.status==='no_local').length;
  const convidados=pessoas.filter(p=>p.status==='convidado').length;
  const concluidos=pessoas.filter(p=>p.status==='concluida').length;
  const mensagem=o.confirmado===false?'Relato salvo para triagem. Ainda não houve acionamento.':o.status==='resolvida'?'Atendimento concluído. Obrigado a quem ajudou.':noLocal?`${noLocal} ${noLocal===1?'pessoa confirmou':'pessoas confirmaram'} chegada. O atendimento continua.`:o.atendimentoEquipe?`${o.atendimentoEquipe.nome}: encaminhamento simulado. Aguardando chegada.`:`${convidados} ${convidados===1?'convite enviado':'convites enviados'}. Aguardando confirmação de chegada.`;
  const tempoChegada=o.confirmadoEm?Math.max(0,Math.round((o.confirmadoEm-o.reportadoEm)/60000)):null;
  body.innerHTML=`
    <div class="photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.4"/></svg><div class="tag">${dependencias.escHtml(o.fotoTag||'Registro de demonstração')}</div></div>
    <div class="grid2" style="margin-bottom:12px">${badgeChip('Gravidade: '+dependencias.GRAV_LABEL[o.gravidade],dependencias.GRAV_COLOR[o.gravidade])}${badgeChip('Resp.: '+dependencias.RESP_LABEL[o.responsabilidade],dependencias.RESP_COLOR[o.responsabilidade])}</div>
    <div class="flow-note">${dependencias.escHtml(mensagem)}${o.confirmado!==false&&o.responsavel?.id!=='sem-responsavel'?'<small>Aviso simulado ao responsável regional. ': '<small>'}${concluidos?`${concluidos} participação(ões) concluída(s).`:''}</small></div>
    <div class="grid2"><div class="field"><label>${tempoChegada===null?'Recebida há':'Tempo até chegada'}</label><div class="val mono">${tempoChegada===null?dependencias.minutosDesde(o.reportadoEm):tempoChegada} min</div></div><div class="field"><label>${o.status==='resolvida'?'Tempo total':'Em atendimento'}</label><div class="val mono" id="live-atendimento">${o.status==='resolvida'?`${o.tempoReal||0} min`:o.confirmadoEm?`${dependencias.minutosDesde(o.confirmadoEm)} min`:'Aguardando chegada'}</div></div></div>
    ${o.orientacaoAjuda?`<div class="demo-caption">${dependencias.escHtml(o.orientacaoAjuda)}</div>`:''}
    ${o.gravidade===3&&o.status!=='resolvida'?`<div class="sla-box">Contatos de emergência: <a href="tel:192">SAMU 192</a> · <a href="tel:193">Bombeiros 193</a> · <a href="tel:199">Defesa Civil 199</a><div class="demo-caption">Esta demonstração não aciona esses serviços.</div>${o.acionamentoOficial?`<div>Contato registrado: ${dependencias.escHtml(o.acionamentoOficial.servico)}</div>`:`<button class="admin-btn" id="acionar-oficial-btn">Registrar contato com serviço</button>`}</div>`:''}
    <div class="resp-card"><div class="avatar">${dependencias.initials(o.responsavel.nome)}</div><div><div class="name">${dependencias.escHtml(o.responsavel.nome)}</div><div class="role">${dependencias.escHtml(o.responsavel.cargo)} · responsável da zona</div><div class="demo-caption">${dependencias.escHtml(o.responsavel.tel)}</div></div></div>
    ${pessoas.length?`<div class="flow-actions"><button class="admin-btn primary" id="open-whatsapp-oc">Abrir WhatsApp simulado</button></div>`:''}
    <div class="flow-title">Pessoas e equipe acionadas</div>
    ${pessoas.map(p=>{const v=dependencias.voluntarios.find(x=>x.id===p.id);return `<div class="flow-person"><div class="avatar small">${dependencias.initials(p.nome)}</div><div class="person-copy"><div class="p-name">${dependencias.escHtml(p.nome)}</div><div class="p-help">${v?dependencias.escHtml(v.ajuda)+' · '+dependencias.fmtDist(dependencias.map.distance(v.pos,o.pos)):'Atendimento de demonstração'}</div><span class="flow-tag ${p.status}">${dependencias.PARTICIPACAO_LABEL[p.status]||'Encaminhamento registrado'}</span></div><button class="admin-btn" data-wa-pessoa="${dependencias.escHtml(p.id)}" aria-label="Ver conversa de ${dependencias.escHtml(p.nome)}">Conversa</button></div>`;}).join('')||'<p class="demo-caption">Sem participações registradas nesta ocorrência de histórico.</p>'}
    <div class="flow-title">Apoio de outro bairro</div>
    ${apoios.map(a=>`<p class="demo-caption">${dependencias.escHtml(a.nome)} · ${dependencias.escHtml(a.bairro)} · Pedido registrado</p>`).join('')}
    ${dependencias.canActZone(o.bairro)&&o.status!=='resolvida'&&candidatosApoio.length?`<form id="apoio-bairro-form">
      <select name="pessoa" aria-label="Pessoa de outro bairro" required><option value="">Selecione a pessoa</option>
      ${candidatosApoio.map(p=>`<option value="${dependencias.escHtml(p.id)}">${dependencias.escHtml(p.nome+' · '+p.bairroOrigem)}</option>`).join('')}</select>
      <button class="admin-btn" type="submit">Registrar pedido de apoio</button>
      <p class="demo-caption">Registro local nesta demonstração.</p></form>`:''}
    ${o.organizacoes?.length?`<div class="flow-title">Organizações e equipes previstas</div><p class="demo-caption">Acionamento preparado neste navegador. Nenhum aviso real foi enviado.</p>${o.organizacoes.map(x=>`<p>${dependencias.escHtml(x.nome)} · Preparado</p>`).join('')}`:''}
    ${o.endereco?`<div class="flow-title">Local e relato</div><p>${dependencias.escHtml(o.endereco)} · ${dependencias.escHtml(o.acesso||'')}</p><p>${dependencias.escHtml(o.descricao||'')}</p><p>Origem: ${dependencias.escHtml(o.origem||'Operador')} · Evento: ${dependencias.escHtml(o.evento||'Não informado')}</p><p>Riscos: ${dependencias.escHtml(o.riscos||'Não informados')} · Pessoas afetadas: ${dependencias.escHtml(o.afetados||'Não informado')}</p>${(o.relatos||[]).map(r=>`<p>${dependencias.escHtml(r.origem)} · ${dependencias.escHtml(r.descricao||r.endereco)}</p><div class="attachment-previews">${(r.fotos||[]).map(f=>`<img src="${dependencias.escHtml(f.dados)}" alt="${dependencias.escHtml(f.nome)}">`).join('')}</div>`).join('')}`:''}
    ${o.confirmado===false&&dependencias.canActZone(o.bairro)?'<button type="button" id="confirmar-triagem" class="admin-btn primary">Confirmar e acionar</button>':''}
    <div class="flow-title">Histórico da ocorrência</div>
    <ol class="flow-timeline">${(o.timeline||[{ts:o.reportadoEm,texto:'Ocorrência registrada no histórico de demonstração'}]).map(e=>`<li><time>${new Date(e.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time><span>${dependencias.escHtml(e.texto)}</span></li>`).join('')}</ol>
    ${dependencias.renderAnexos(o)}
  `;
  panel.classList.add('open');
  body.querySelector('#confirmar-triagem')?.addEventListener('click',()=>{
    o.confirmado=true;
    dependencias.registrarEtapa(o,'confirmada','Ocorrência confirmada');
    if(!dependencias.salvarPrototipo()){o.confirmado=false;o.timeline.pop();return;}
    dependencias.acionarAjuda(o);
    dependencias.salvarPrototipo();dependencias.atualizarFluxo();openOcorrencia(o);
  });
  body.querySelector('#apoio-bairro-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const pessoa=candidatosApoio.find(p=>p.id===new FormData(e.currentTarget).get('pessoa'));
    if(!pessoa||!dependencias.canActZone(o.bairro)||o.status==='resolvida')return;
    o.apoiosBairro=[...apoios,{pessoaId:pessoa.id,nome:pessoa.nome,bairro:pessoa.bairroOrigem,ts:Date.now()}];
    const detalhe=`Pedido de apoio registrado para ${pessoa.nome} · ${pessoa.bairroOrigem}`;
    dependencias.registrarEtapa(o,'apoio-bairro',detalhe);
    dependencias.auditPush('Operação','Registrou pedido de apoio',`${o.protocolo} · ${detalhe}`,[o.bairro]);
    dependencias.salvarPrototipo();
    openOcorrencia(o);
  });
  body.querySelectorAll('[data-wa-pessoa]').forEach(btn=>{btn.onclick=()=>dependencias.abrirWhatsapp(o,btn.dataset.waPessoa);});
  const abrir=document.getElementById('open-whatsapp-oc');if(abrir)abrir.onclick=()=>dependencias.abrirWhatsapp(o);
  document.getElementById('report-submit').onclick=()=>dependencias.salvarAnexos(o);
  const oficial=document.getElementById('acionar-oficial-btn');
  if(oficial)oficial.onclick=()=>{
    const servico=prompt('Qual serviço você contatou? Este registro não envia um acionamento.','Bombeiros 193');
    if(!servico)return;
    o.acionamentoOficial={servico,quando:Date.now()};
    dependencias.registrarEtapa(o,'contato',`Contato informado: ${servico}`);
    dependencias.auditPush(o.responsavel.nome,'Registrou contato com serviço',`${o.protocolo}: ${servico}`,[o.bairro]);
    dependencias.salvarPrototipo();openOcorrencia(o);
  };
  if(!dependencias.canActZone(o.bairro)){
    body.querySelectorAll('button,input,textarea').forEach(el=>{el.disabled=true;});
    const note=document.createElement('p');note.className='view-only-note';note.textContent='Perfil de visualização desta demonstração. Troque o perfil para testar as ações.';body.appendChild(note);
  }
}
 async function iniciar(){
 (currentPanelOcId=null);
(STATUS_BADGE={ ativa:['ativa','AGUARDANDO EQUIPE'], em_atendimento:['ativa','EM ATENDIMENTO'], resolvida:['resolvida','RESOLVIDA'] });
setInterval(()=>{
  if(!currentPanelOcId) return;
  const o = dependencias.ocorrencias.find(x=>x.id===currentPanelOcId);
  if(o && o.status==='em_atendimento'){
    const el = document.getElementById('live-atendimento');
    if(el) el.textContent = dependencias.minutosDesde(o.confirmadoEm)+' min';
  }
}, 5000);
 return true;
 }
 return {iniciar,get currentPanelOcId(){return currentPanelOcId;},set currentPanelOcId(valor){currentPanelOcId=valor;},get STATUS_BADGE(){return STATUS_BADGE;},badgeChip,openOcorrencia};
 }
});
})(globalThis);
/* Controlador resumo: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('resumo',{
 dependencias:{
  "escHtml": "contexto",
  "GRAV_COLOR": "equipes",
  "RESP_COLOR": "equipes",
  "ocorrencias": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "pessoasPainel": "pessoas",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias"
},
 criar(dependencias){
 let eventStart;
 function closePanel(){ document.getElementById('panel').classList.remove('open'); dependencias.currentPanelOcId = null; }
function showReco(o){
  const banner = document.getElementById('reco-banner');
  banner.textContent = `🏅 Reconhecimento oficial: equipe de ${o.bairro} resolveu em ${o.tempoReal} min — ato da Prefeitura em preparação`;
  banner.classList.add('show');
  setTimeout(()=>banner.classList.remove('show'), 5200);
}
function updateKpis(){
  const ocList = dependencias.ocorrencias.filter(dependencias.ocorrenciaVisivel);
  const volList = dependencias.pessoasPainel().filter(p=>!p.oficial);
  const abertas = ocList.filter(o=>o.status==='ativa'||o.status==='em_atendimento');
  const resolvidas = ocList.filter(o=>o.status==='resolvida');
  document.getElementById('kpi-ativas').textContent = abertas.length;
  document.getElementById('kpi-resolvidas').textContent = resolvidas.length;
  document.getElementById('kpi-voluntarios').textContent = volList.length;
  document.getElementById('kpi-tempo').textContent = resolvidas.length>0
    ? Math.round(resolvidas.reduce((s,o)=>s+o.tempoReal,0)/resolvidas.length)+"min" : "—";
  renderResumo(abertas);
}
function renderResumo(abertas){
  const el = document.getElementById('sidebar-footer');
  const porGrav = {1:0,2:0,3:0};
  const porResp = {publica:0, privada:0, mista:0};
  abertas.forEach(o=>{ porGrav[o.gravidade]++; porResp[o.responsabilidade]++; });

  const resolvidas = dependencias.ocorrencias
    .filter(o=> o.status==='resolvida' && dependencias.ocorrenciaVisivel(o))
    .sort((a,c)=> (c.resolvidoEm||0) - (a.resolvidoEm||0))
    .slice(0,5);

  el.innerHTML = `
    <div class="sf-label">Gravidade (${dependencias.escHtml(dependencias.recorteLabel())})</div>
    <div class="sf-row"><span style="color:${dependencias.GRAV_COLOR[3]}">Alta</span><b>${porGrav[3]}</b></div>
    <div class="sf-row"><span style="color:${dependencias.GRAV_COLOR[2]}">Média</span><b>${porGrav[2]}</b></div>
    <div class="sf-row"><span style="color:${dependencias.GRAV_COLOR[1]}">Baixa</span><b>${porGrav[1]}</b></div>
    <div class="sf-label" style="margin-top:10px">Responsabilidade</div>
    <div class="sf-row"><span style="color:${dependencias.RESP_COLOR.publica}">Pública</span><b>${porResp.publica}</b></div>
    <div class="sf-row"><span style="color:${dependencias.RESP_COLOR.privada}">Privada</span><b>${porResp.privada}</b></div>
    <div class="sf-row"><span style="color:${dependencias.RESP_COLOR.mista}">Mista</span><b>${porResp.mista}</b></div>
    <div class="sf-label" style="margin-top:10px">Resolvidas recentes</div>
    ${resolvidas.map(o=>`<div class="sf-resolvida" data-oc="${o.id}">${o.icone} ${dependencias.escHtml(o.tipo)} <span>${o.relatorio?'· complemento salvo':'· concluída'}</span></div>`).join('') || '<div style="color:var(--muted);font-size:10.5px">Nenhuma ainda.</div>'}
  `;
  el.querySelectorAll('.sf-resolvida').forEach(elm=>{
    elm.onclick = ()=>{ const o = dependencias.ocorrencias.find(x=>x.id===elm.dataset.oc); if(o) dependencias.openOcorrencia(o); };
  });
}
function tickClock(){
  const now = new Date();
  document.getElementById('clock').textContent=new Intl.DateTimeFormat('pt-BR',{
    dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
  }).format(now);
}
 async function iniciar(){
 document.getElementById('panel-close').onclick = closePanel;
(eventStart=Date.now() - (4*60+12)*60000);
setInterval(tickClock, 30000);
 return true;
 }
 return {iniciar,closePanel,showReco,updateKpis,renderResumo,get eventStart(){return eventStart;},set eventStart(valor){eventStart=valor;},tickClock};
 }
});
})(globalThis);
/* Controlador administracao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('administracao',{
 dependencias:{
  "escHtml": "contexto",
  "bairros": "regioes",
  "PAPEL_LABEL": "regioes",
  "todosFuncionarios": "regioes",
  "saveAdminState": "cadastros",
  "equipePrefIdCursor": "equipes",
  "equipesPrefeitura": "equipes",
  "ocorrencias": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "currentRole": "cadastro-territorial",
  "renderZoneList": "recorte",
  "updateZoneStrip": "recorte",
  "renderOfficialMarkers": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "renderAdminColab": "administracao-colaboradores",
  "renderChatContacts": "mensagens",
  "auditPush": "trilha"
},
 criar(dependencias){
 let adminTab,adminOverlay;
 function renderAdminBody(){
  const body = document.getElementById('admin-body');
  if(adminTab==='func') return renderAdminFunc(body);
  if(adminTab==='equipes') return renderAdminEquipes(body);
  dependencias.renderAdminColab(body);
}
function renderAdminFunc(body){
  const grupos = { responsavel:'Responsáveis', substituto:'Substitutos', coordenador:'Coordenadores' };
  let html = '';
  Object.entries(grupos).forEach(([papel,label])=>{
    let lista = dependencias.todosFuncionarios().filter(p=>p.papel===papel && dependencias.noRecorte(p.zona));
    if(dependencias.currentRole && dependencias.currentRole.tipo==='responsavel') lista = lista.filter(p=>p.zona===dependencias.currentRole.zona);
    if(!lista.length) return;
    html += `<div class="admin-section-title">${label}</div>
      <table class="admin-table"><thead><tr><th>Zona</th><th>Nome</th><th>Cargo</th><th>Telefone</th><th></th></tr></thead><tbody>
      ${lista.map(p=>`
        <tr data-id="${p.id}">
          <td>${dependencias.escHtml(p.zona)}</td>
          <td><input value="${dependencias.escHtml(p.nome)}" data-field="nome"></td>
          <td><input value="${dependencias.escHtml(p.cargo)}" data-field="cargo"></td>
          <td><input value="${dependencias.escHtml(p.tel)}" data-field="tel"></td>
          <td><button class="admin-btn primary" data-action="save-func">Salvar</button></td>
        </tr>
      `).join('')}
      </tbody></table>`;
  });
  body.innerHTML = html;
  body.querySelectorAll('[data-action="save-func"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const p = dependencias.todosFuncionarios().find(x=>x.id===tr.dataset.id);
      if(!p) return;
      p.nome = tr.querySelector('[data-field="nome"]').value.trim() || p.nome;
      p.cargo = tr.querySelector('[data-field="cargo"]').value.trim() || p.cargo;
      p.tel = tr.querySelector('[data-field="tel"]').value.trim() || p.tel;
      dependencias.saveAdminState();
      dependencias.auditPush('Administração', 'Editou funcionário', `${p.nome} (${dependencias.PAPEL_LABEL[p.papel]}, ${p.zona})`,[p.zona]);
      dependencias.updateZoneStrip(); dependencias.renderZoneList(); dependencias.renderOfficialMarkers(); dependencias.renderCollaborators(); dependencias.renderChatContacts();
      btn.textContent = 'Salvo ✓'; setTimeout(()=>btn.textContent='Salvar', 1400);
    };
  });
}
function recursosResumo(e){
  const disp = e.recursos.reduce((s,r)=>s+(r.qtd-r.emUso),0);
  const uso = e.recursos.reduce((s,r)=>s+r.emUso,0);
  return {disp, uso, texto: e.recursos.map(r=>`${r.tipo} ${r.qtd-r.emUso}/${r.qtd} livre`).join(', ')};
}
function renderAdminEquipes(body){
  const zonasAtivas = {};
  dependencias.ocorrencias.filter(o=>o.status==='ativa'||o.status==='em_atendimento').forEach(o=>{ zonasAtivas[o.bairro]=(zonasAtivas[o.bairro]||0)+1; });
  const souResponsavel = dependencias.currentRole && dependencias.currentRole.tipo==='responsavel';
  const equipesVisiveis=dependencias.equipesPrefeitura.filter(e=>dependencias.noRecorte(e.zona) && (!souResponsavel || e.zona===dependencias.currentRole.zona));
  body.innerHTML = `
    <div class="admin-section-title">Equipes e equipamentos cadastrados</div>
    <table class="admin-table"><thead><tr><th>Equipe</th><th>Zona</th><th>Recursos</th><th>Membros</th><th>Status</th><th>Ocorrências na zona</th><th></th></tr></thead><tbody>
      ${equipesVisiveis.map(e=>{
        const r = recursosResumo(e);
        const falta = zonasAtivas[e.zona] > 0 && r.disp===0;
        return `<tr data-id="${e.id}">
          <td><input value="${dependencias.escHtml(e.nome)}" data-field="nome"></td>
          <td>
            <select data-field="zona">${dependencias.bairros.map(b=>`<option value="${dependencias.escHtml(b.nome)}" ${b.nome===e.zona?'selected':''}>${dependencias.escHtml(b.nome)}</option>`).join('')}</select>
          </td>
          <td style="font-size:10.5px;color:var(--muted)">${dependencias.escHtml(r.texto)}</td>
          <td><input value="${dependencias.escHtml(e.membros.join(', '))}" data-field="membros"></td>
          <td>
            <select data-field="status">
              <option ${e.status==='disponível'?'selected':''}>disponível</option>
              <option ${e.status==='em campo'?'selected':''}>em campo</option>
            </select>
          </td>
          <td style="text-align:center">${zonasAtivas[e.zona]||0} ${falta?`<div style="color:var(--red);font-size:9.5px">sem equip. livre</div>`:''}</td>
          <td style="display:flex;gap:4px">
            <button class="admin-btn primary" data-action="save-eq">Salvar</button>
            ${souResponsavel ? '' : '<button class="admin-btn danger" data-action="del-eq">Remover</button>'}
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>
    ${souResponsavel ? '' : `
    <div class="admin-section-title">Nova equipe</div>
    <div class="admin-new-form" id="new-eq-form">
      <input placeholder="Nome da equipe" id="neq-nome">
      <select id="neq-zona">${dependencias.bairros.map(b=>`<option value="${dependencias.escHtml(b.nome)}">${dependencias.escHtml(b.nome)}</option>`).join('')}</select>
      <input placeholder="Recursos: ex. Motosserra x2, Caminhão x1" id="neq-recursos">
      <input placeholder="Membros, separados por vírgula" id="neq-membros">
      <button class="admin-btn primary" id="neq-add">+ Adicionar equipe</button>
    </div>`}
  `;
  body.querySelectorAll('[data-action="save-eq"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const e = dependencias.equipesPrefeitura.find(x=>x.id===tr.dataset.id);
      if(!e) return;
      e.nome = tr.querySelector('[data-field="nome"]').value.trim() || e.nome;
      e.zona = tr.querySelector('[data-field="zona"]').value;
      e.membros = tr.querySelector('[data-field="membros"]').value.split(',').map(s=>s.trim()).filter(Boolean);
      e.status = tr.querySelector('[data-field="status"]').value;
      dependencias.saveAdminState();
      dependencias.auditPush('Administração', 'Editou equipe', `${e.nome} (${e.zona})`,[e.zona]);
      btn.textContent = 'Salvo ✓'; setTimeout(()=>renderAdminEquipes(body), 900);
    };
  });
  body.querySelectorAll('[data-action="del-eq"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const idx = dependencias.equipesPrefeitura.findIndex(x=>x.id===tr.dataset.id);
      if(idx>-1){ dependencias.auditPush('Administração', 'Removeu equipe', dependencias.equipesPrefeitura[idx].nome,[dependencias.equipesPrefeitura[idx].zona]); dependencias.equipesPrefeitura.splice(idx,1); }
      dependencias.saveAdminState();
      renderAdminEquipes(body);
    };
  });
  const addBtn = document.getElementById('neq-add');
  if(addBtn) addBtn.onclick = ()=>{
    const nome = document.getElementById('neq-nome').value.trim();
    const zona = document.getElementById('neq-zona').value;
    const recTxt = document.getElementById('neq-recursos').value.trim();
    const membros = document.getElementById('neq-membros').value.split(',').map(s=>s.trim()).filter(Boolean);
    if(!nome){ return; }
    const recursos = recTxt.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{
      const m = s.match(/^(.*?)\s*x\s*(\d+)$/i);
      return m ? {tipo:m[1].trim(), qtd:parseInt(m[2]), emUso:0} : {tipo:s, qtd:1, emUso:0};
    });
    dependencias.equipesPrefeitura.push({ id:"eq"+(dependencias.equipePrefIdCursor++), nome, zona, recursos: recursos.length?recursos:[{tipo:'Mão de obra',qtd:1,emUso:0}], membros: membros.length?membros:['A definir'], status:'disponível' });
    dependencias.saveAdminState();
    dependencias.auditPush('Administração', 'Criou equipe', `${nome} (${zona})`,[zona]);
    renderAdminEquipes(body);
  };
}
 async function iniciar(){
 (adminTab='func');
(adminOverlay=document.getElementById('admin-overlay'));
document.getElementById('open-admin').onclick = ()=>{ adminOverlay.hidden=false; renderAdminBody(); };
document.getElementById('admin-close').onclick = ()=>{ adminOverlay.hidden=true; };
adminOverlay.addEventListener('click', e=>{ if(e.target===adminOverlay) adminOverlay.hidden=true; });
document.getElementById('admin-tabs').querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick = ()=>{
    adminTab = btn.dataset.tab;
    document.getElementById('admin-tabs').querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    renderAdminBody();
  };
});
 return true;
 }
 return {iniciar,get adminTab(){return adminTab;},set adminTab(valor){adminTab=valor;},get adminOverlay(){return adminOverlay;},renderAdminBody,renderAdminFunc,recursosResumo,renderAdminEquipes};
 }
});
})(globalThis);
/* Controlador administracao-colaboradores: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('administracao-colaboradores',{
 dependencias:{
  "escHtml": "contexto",
  "noRecorte": "cadastro-territorial",
  "pessoasMunicipio": "pessoas",
  "estadoPessoa": "conversas"
},
 criar(dependencias){

 function renderAdminColab(body){
  // Leitura do mesmo cadastro utilizado pela Gestão e pelo Mapa de Colaboradores.
  // Os voluntários legados do simulador continuam visíveis, mas não são um segundo cadastro.
  const visiveis=dependencias.pessoasMunicipio().filter(v=>!v.oficial&&dependencias.noRecorte(v.bairroOrigem));
  body.innerHTML='<div class="admin-section-title">Colaboradores do município</div>'+
    '<p style="font-size:11px;color:var(--muted);margin:8px 0 14px">A inclusão, edição e exclusão acontecem exclusivamente no cadastro da Gestão. Registros do simulador são identificados como demonstração.</p>'+
    '<a class="admin-btn primary" href="gestao/#voluntarios" style="display:inline-block;margin-bottom:15px">Gerenciar colaboradores na Gestão</a>'+
    '<table class="admin-table"><thead><tr><th>Nome</th><th>Origem</th><th>Território de cadastro</th><th>Capacidades</th><th>Presença</th></tr></thead><tbody>'+
    (visiveis.map(v=>{
      const canonico=String(v.id).startsWith("cad:");
      const capacidades=v.sub||(Array.isArray(v.contribuicoes)?v.contribuicoes.join(", "):v.ajuda||"");
      const status=canonico?(v.checkin_status==="presente"?"Chegada GPS registrada":v.checkin_status==="finalizado"?"Saída registrada":"Não confirmado"):dependencias.estadoPessoa(v.id)+" (simulação)";
      return '<tr><td>'+dependencias.escHtml(v.nome)+'</td><td>'+(canonico?"Cadastro municipal":"Simulação")+'</td>'+
        '<td>'+dependencias.escHtml(v.bairroOrigem||"Não informado")+'</td><td>'+dependencias.escHtml(capacidades||"A definir")+'</td>'+
        '<td>'+dependencias.escHtml(status)+'</td></tr>';
    }).join("")||'<tr><td colspan="5" style="color:var(--muted)">Nenhum colaborador nesta visão.</td></tr>')+
    '</tbody></table>';
}
 async function iniciar(){

 return true;
 }
 return {iniciar,renderAdminColab};
 }
});
})(globalThis);
/* Controlador triagem: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('triagem',{
 dependencias:{
  "escHtml": "contexto",
  "minutosDesde": "contexto",
  "tenantId": "contexto",
  "GRAV_LABEL": "equipes",
  "RESP_LABEL": "equipes",
  "ocorrencias": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "openOcorrencia": "ocorrencias",
  "isViewOnly": "permissoes"
},
 criar(dependencias){
 let filaOverlay;
 function calcPrioridade(o){ return AlertaFluxo.prioridade(o,Date.now()); }
function renderFila(){
  const body = document.getElementById('fila-body');
  // A entrada cidadã não confirma nem aciona uma ocorrência: segue para triagem.
  const relatosCidadaos = dependencias.isViewOnly() ? [] : AlertaGestaoDados.criar(undefined,{municipioId:dependencias.tenantId})
    .lista('relatos',dependencias.tenantId).filter(r=>r.status==='Em triagem');
  const lista = dependencias.ocorrencias
    .filter(o=> o.status==='ativa'||o.status==='em_atendimento')
    .filter(dependencias.ocorrenciaVisivel)
    .map(o=>({o, score:calcPrioridade(o)}))
    .sort((a,c)=>c.score-a.score);
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Gravidade define a ordem; o tempo de espera desempata dentro de cada classe. Presença da equipe e propriedade pública/privada não reduzem o risco. Recorte: ${dependencias.escHtml(dependencias.recorteLabel())}.</div>
    ${relatosCidadaos.length?'<section class="fila-relatos"><h3>Relatos enviados por cidadãos · '+relatosCidadaos.length+'</h3><p style="font-size:11px;color:var(--muted)">Ainda não são ocorrências confirmadas. Consulte os dados e fotografias na Gestão antes do acionamento.</p>'+relatosCidadaos.map(r=>'<div class="fila-item"><div class="fila-rank">●</div><div class="fila-info"><div class="fi-title">Relato cidadão · '+dependencias.escHtml(r.endereco)+'</div><div class="fi-meta">'+dependencias.escHtml((r.pessoas_no_local||[]).filter(x=>x!=="NÃO HÁ").join(" · ")||"Sem pessoas vulneráveis informadas")+' · Em triagem</div></div></div>').join('')+'<a href="./gestao/#relatos" target="_blank" rel="noopener" class="sidebar-btn" style="display:inline-block;margin:9px 0 16px">Abrir relatos na Gestão</a></section>':''}
    ${lista.map(({o,score},i)=>`
      <div class="fila-item" data-oc="${o.id}">
        <div class="fila-rank">#${i+1}</div>
        <div class="fila-info">
          <div class="fi-title">${o.icone} ${dependencias.escHtml(o.tipo)} · ${dependencias.escHtml(o.bairro)}</div>
          <div class="fi-meta">${dependencias.GRAV_LABEL[o.gravidade]} gravidade · ${dependencias.RESP_LABEL[o.responsabilidade]} · ${o.status==='ativa'?`aguardando há ${dependencias.minutosDesde(o.reportadoEm)}min`:'em atendimento'}</div>
        </div>
        <div class="fila-score">${dependencias.GRAV_LABEL[o.gravidade]}</div>
      </div>
    `).join('') || '<div style="color:var(--muted);font-size:12px">Nenhuma ocorrência em aberto nesta visão.</div>'}
  `;
  body.querySelectorAll('.fila-item').forEach(elm=>{
    elm.onclick = ()=>{ const o = dependencias.ocorrencias.find(x=>x.id===elm.dataset.oc); if(o){ filaOverlay.hidden=true; dependencias.openOcorrencia(o); } };
  });
}
 async function iniciar(){
 (filaOverlay=document.getElementById('fila-overlay'));
document.getElementById('open-fila').onclick = ()=>{ filaOverlay.hidden=false; renderFila(); };
document.getElementById('fila-close').onclick = ()=>{ filaOverlay.hidden=true; };
filaOverlay.addEventListener('click', e=>{ if(e.target===filaOverlay) filaOverlay.hidden=true; });
 return true;
 }
 return {iniciar,calcPrioridade,get filaOverlay(){return filaOverlay;},renderFila};
 }
});
})(globalThis);
/* Controlador escalonamento: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('escalonamento',{
 dependencias:{
  "rnd": "contexto",
  "pick": "contexto",
  "minutosDesde": "contexto",
  "bairros": "regioes",
  "todosFuncionarios": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "marcarZonasEmAlerta": "prontidao",
  "renderAlertasIfOpen": "prontidao",
  "renderProntidaoIfOpen": "prontidao",
  "chatHistorico": "mensagens",
  "renderChatContacts": "mensagens",
  "auditPush": "trilha"
},
 criar(dependencias){
 let SLA_LIMITE_MIN,alertaTipos,NIVEL_COLOR,NIVEL_LABEL,fontesAlerta,alertaIdCursor,alertasClimaticos,prontidao;
 function pessoaNome(id){
  const f = dependencias.todosFuncionarios().find(p=>p.id===id); if(f) return f.nome;
  const v = dependencias.voluntarios.find(x=>x.id===id); if(v) return v.nome;
  return id;
}
function gerarAlerta(){
  const t = dependencias.pick(alertaTipos);
  const nZonas = Math.floor(dependencias.rnd(1,4));
  const zonasAfetadas = [...dependencias.bairros].sort(()=>Math.random()-0.5).slice(0,nZonas).map(b=>b.nome);
  const alerta = {
    id:"al"+(alertaIdCursor++), fonte: dependencias.pick(fontesAlerta),
    nivel: t.nivel, tipo: t.tipo, zonasAfetadas,
    emitidoEm: Date.now(), janelaHoras: Math.floor(dependencias.rnd(3,18)),
  };
  alertasClimaticos.unshift(alerta);
  dependencias.auditPush(alerta.fonte, 'Emitiu alerta meteorológico', `${alerta.tipo} (${NIVEL_LABEL[alerta.nivel]}) em ${zonasAfetadas.join(', ')}`,zonasAfetadas);
  dispararPreAtivacao(alerta);
  return alerta;
}
function dispararPreAtivacao(alerta){
  prontidao[alerta.id] = {};
  const pessoas = [
    ...dependencias.todosFuncionarios().filter(p=> alerta.zonasAfetadas.includes(p.zona)),
    ...dependencias.voluntarios.filter(v=> alerta.zonasAfetadas.includes(v.bairro) && ['antes','todos'].includes(v.alertaPreferencia||'todos')),
  ];
  pessoas.forEach(p=>{
    prontidao[alerta.id][p.id] = { status:'pendente', respondidoEm:null };
    if(!dependencias.chatHistorico[p.id]) dependencias.chatHistorico[p.id] = [];
    dependencias.chatHistorico[p.id].push({
      de:'eu',
      texto:`[Alerta ${NIVEL_LABEL[alerta.nivel]} · ${alerta.fonte}] ${alerta.tipo} previsto para sua zona nas próximas ${alerta.janelaHoras}h. Você está disponível para ajudar se a situação piorar?`,
      ts: Date.now(),
    });
    setTimeout(()=>{
      const r = Math.random();
      const status = r<0.55 ? 'confirmado' : r<0.82 ? 'indisponivel' : 'pendente';
      prontidao[alerta.id][p.id] = { status, respondidoEm: status==='pendente'?null:Date.now() };
      if(status!=='pendente'){
        dependencias.chatHistorico[p.id].push({ de:'eles', texto: status==='confirmado' ? 'Confirmado, estou disponível se precisar.' : 'Não vou conseguir dessa vez, desculpa.', ts: Date.now() });
      }
      dependencias.renderProntidaoIfOpen();
      dependencias.renderChatContacts();
    }, 3000 + Math.random()*9000);
  });
  dependencias.renderAlertasIfOpen();
  dependencias.renderProntidaoIfOpen();
  showAlertBanner(alerta);
  dependencias.marcarZonasEmAlerta();
}
function showAlertBanner(alerta){
  const b = document.getElementById('alert-banner');
  b.style.background = NIVEL_COLOR[alerta.nivel]+'22';
  b.style.border = '1px solid '+NIVEL_COLOR[alerta.nivel];
  b.style.color = NIVEL_COLOR[alerta.nivel];
  b.textContent = `🌦 Alerta ${NIVEL_LABEL[alerta.nivel]} (${alerta.fonte}): ${alerta.tipo} em ${alerta.zonasAfetadas.join(', ')} — pré-ativação de equipe disparada`;
  b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'), 6500);
}
function zonasComAlertaAtivo(){
  const agora = Date.now();
  const ativas = new Set();
  alertasClimaticos.forEach(a=>{
    if(agora - a.emitidoEm < a.janelaHoras*3600000) a.zonasAfetadas.forEach(z=>ativas.add(z));
  });
  return ativas;
}
 async function iniciar(){
 (SLA_LIMITE_MIN=2);
setInterval(()=>{
  dependencias.ocorrencias.forEach(o=>{
    if(!o.remota && o.confirmado!==false && o.status==='ativa' && o.gravidade===3 && !o._escalado && dependencias.minutosDesde(o.reportadoEm) >= SLA_LIMITE_MIN){
      o._escalado = true;
      const zona = dependencias.bairros.find(b=>b.nome===o.bairro);
      const coord = zona?.equipe?.coordenador;
      if(!coord)return;
      if(!dependencias.chatHistorico[coord.id]) dependencias.chatHistorico[coord.id] = [];
      dependencias.chatHistorico[coord.id].push({ de:'eles', texto:`⚠ SLA excedido: "${o.tipo}" em ${o.bairro} sem confirmação de presença há ${dependencias.minutosDesde(o.reportadoEm)}min. Precisa de apoio?`, ts: Date.now() });
      dependencias.renderChatContacts();
      const b = document.getElementById('alert-banner');
      b.style.background = 'rgba(255,59,59,.15)'; b.style.border='1px solid var(--red)'; b.style.color='var(--red)';
      b.textContent = `⏱ SLA excedido: ocorrência de alta gravidade em ${o.bairro} sem confirmação há ${dependencias.minutosDesde(o.reportadoEm)}min — coordenador notificado`;
      b.classList.add('show');
      setTimeout(()=>b.classList.remove('show'), 6500);
    }
  });
}, 15000);
(alertaTipos=[
  {tipo:"Chuva intensa", nivel:"laranja"},
  {tipo:"Vendaval / rajadas de vento", nivel:"laranja"},
  {tipo:"Risco de alagamento", nivel:"amarelo"},
  {tipo:"Queda de granizo", nivel:"amarelo"},
  {tipo:"Ciclone extratropical", nivel:"vermelho"},
]);
(NIVEL_COLOR={amarelo:"#f2c230", laranja:"#ff8a3b", vermelho:"#ff3b3b"});
(NIVEL_LABEL={amarelo:"Atenção", laranja:"Perigo", vermelho:"Grande perigo"});
(fontesAlerta=["INMET","SIMEPAR","Defesa Civil PR"]);
(alertaIdCursor=1);
(alertasClimaticos=[]);
(prontidao={});
 return true;
 }
 return {iniciar,get SLA_LIMITE_MIN(){return SLA_LIMITE_MIN;},get alertaTipos(){return alertaTipos;},get NIVEL_COLOR(){return NIVEL_COLOR;},get NIVEL_LABEL(){return NIVEL_LABEL;},get fontesAlerta(){return fontesAlerta;},get alertaIdCursor(){return alertaIdCursor;},set alertaIdCursor(valor){alertaIdCursor=valor;},get alertasClimaticos(){return alertasClimaticos;},get prontidao(){return prontidao;},pessoaNome,gerarAlerta,dispararPreAtivacao,showAlertBanner,zonasComAlertaAtivo};
 }
});
})(globalThis);
/* Controlador prontidao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('prontidao',{
 dependencias:{
  "escHtml": "contexto",
  "minutosDesde": "contexto",
  "bairros": "regioes",
  "PAPEL_LABEL": "regioes",
  "todosFuncionarios": "regioes",
  "voluntarios": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "renderZoneList": "recorte",
  "NIVEL_COLOR": "escalonamento",
  "NIVEL_LABEL": "escalonamento",
  "alertasClimaticos": "escalonamento",
  "prontidao": "escalonamento",
  "gerarAlerta": "escalonamento",
  "zonasComAlertaAtivo": "escalonamento"
},
 criar(dependencias){
 let alertasOverlay,alertasTab;
 function marcarZonasEmAlerta(){
  const ativas = dependencias.zonasComAlertaAtivo();
  dependencias.areas.filter(area=>area.layer).forEach(area=>{
    const emAlerta = [...ativas].some(z=>dependencias.pertence(area,z));
    area.layer.setStyle(emAlerta
      ? { color:'#ff8a3b', weight:2.8, opacity:.95, dashArray:'3,5', fillOpacity:.1, fillColor:'#ff8a3b' }
      : { color:'#f2c230', weight:2.2, opacity:.85, dashArray:'7,5', fillOpacity:.06, fillColor:'#f2c230' });
  });
  dependencias.renderZoneList();
}
function renderAlertasIfOpen(){ if(!alertasOverlay.hidden && alertasTab==='alertas') renderAlertasBody(); }
function renderProntidaoIfOpen(){ if(!alertasOverlay.hidden && alertasTab==='prontidao') renderAlertasBody(); }
function renderAlertasBody(){
  const body = document.getElementById('alertas-body');
  if(alertasTab==='alertas') return renderAlertasTab(body);
  renderProntidaoTab(body);
}
function renderAlertasTab(body){
  body.innerHTML = `
    <button class="admin-btn primary" id="gerar-alerta-btn" style="margin-bottom:14px">🔔 Simular novo alerta meteorológico</button>
    ${dependencias.alertasClimaticos.filter(a=>a.zonasAfetadas.some(dependencias.noRecorte)).map(a=>{
      const minutos = dependencias.minutosDesde(a.emitidoEm);
      const ativo = minutos < a.janelaHoras*60;
      return `<div class="alert-card">
        <span class="alert-nivel" style="background:${dependencias.NIVEL_COLOR[a.nivel]}22;color:${dependencias.NIVEL_COLOR[a.nivel]}">${dependencias.NIVEL_LABEL[a.nivel]}</span>
        <strong style="margin-left:8px">${dependencias.escHtml(a.tipo)}</strong>
        <div class="alert-meta">Fonte: ${dependencias.escHtml(a.fonte)} · emitido há ${minutos} min · janela de ${a.janelaHoras}h · ${ativo?'<span style="color:var(--green)">em vigor</span>':'<span style="color:var(--muted)">expirado</span>'}</div>
        <div class="alert-zonas">${a.zonasAfetadas.filter(dependencias.noRecorte).map(z=>`<span>${dependencias.escHtml(z)}</span>`).join('')}</div>
      </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:12px">Nenhum alerta emitido ainda. Clique no botão acima para simular um.</div>'}
  `;
  document.getElementById('gerar-alerta-btn').onclick = ()=>{ dependencias.gerarAlerta(); renderAlertasTab(body); };
}
function renderProntidaoTab(body){
  const zonasRelevantes = dependencias.bairros.filter(b=> dependencias.noRecorte(b.nome) && dependencias.alertasClimaticos.some(a=>a.zonasAfetadas.includes(b.nome)));
  if(!zonasRelevantes.length){
    body.innerHTML = '<div style="color:var(--muted);font-size:12px">Nenhuma zona em alerta ainda. A prontidão aparece aqui depois que um alerta for emitido.</div>';
    return;
  }
  body.innerHTML = zonasRelevantes.map(b=>{
    const alertasDaZona = dependencias.alertasClimaticos.filter(a=>a.zonasAfetadas.includes(b.nome));
    const ultimoAlerta = alertasDaZona[0];
    const mapa = dependencias.prontidao[ultimoAlerta.id] || {};
    const pessoas = [
      ...dependencias.todosFuncionarios().filter(p=>p.zona===b.nome).map(p=>({id:p.id, nome:p.nome, tipo:dependencias.PAPEL_LABEL[p.papel]})),
      ...dependencias.voluntarios.filter(v=>v.bairro===b.nome).map(v=>({id:v.id, nome:v.nome, tipo:'Colaborador'})),
    ];
    const conf = pessoas.filter(p=> mapa[p.id]?.status==='confirmado').length;
    const indisp = pessoas.filter(p=> mapa[p.id]?.status==='indisponivel').length;
    const pend = pessoas.length - conf - indisp;
    const pct = n => pessoas.length ? (n/pessoas.length*100) : 0;
    return `<div class="prontidao-zone">
      <h4>${dependencias.escHtml(b.nome)} <span style="font-size:10.5px;color:var(--muted);font-family:var(--mono)">· alerta ${dependencias.NIVEL_LABEL[ultimoAlerta.nivel].toLowerCase()} (${dependencias.escHtml(ultimoAlerta.tipo)})</span></h4>
      <div class="prontidao-bar">
        <div style="width:${pct(conf)}%;background:var(--green)"></div>
        <div style="width:${pct(indisp)}%;background:var(--red)"></div>
        <div style="width:${pct(pend)}%;background:var(--muted)"></div>
      </div>
      <div class="prontidao-legend">
        <span><i style="background:var(--green)"></i>Confirmados: ${conf}</span>
        <span><i style="background:var(--red)"></i>Indisponíveis: ${indisp}</span>
        <span><i style="background:var(--muted)"></i>Sem resposta: ${pend}</span>
      </div>
      <div class="prontidao-people">
        ${pessoas.map(p=>{
          const st = mapa[p.id]?.status || 'pendente';
          const cor = st==='confirmado'?'var(--green)':st==='indisponivel'?'var(--red)':'var(--muted)';
          return `<span class="pp-chip" style="color:${cor};border-color:${cor}66">${dependencias.escHtml(p.nome.split(' ')[0])} · ${dependencias.escHtml(p.tipo)}</span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}
 async function iniciar(){
 (alertasOverlay=document.getElementById('alertas-overlay'));
(alertasTab='alertas');
document.getElementById('open-alertas').onclick = ()=>{ alertasOverlay.hidden=false; renderAlertasBody(); };
document.getElementById('alertas-close').onclick = ()=>{ alertasOverlay.hidden=true; };
alertasOverlay.addEventListener('click', e=>{ if(e.target===alertasOverlay) alertasOverlay.hidden=true; });
document.getElementById('alertas-tabs').querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick = ()=>{
    alertasTab = btn.dataset.tab;
    document.getElementById('alertas-tabs').querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    renderAlertasBody();
  };
});
 return true;
 }
 return {iniciar,marcarZonasEmAlerta,get alertasOverlay(){return alertasOverlay;},get alertasTab(){return alertasTab;},set alertasTab(valor){alertasTab=valor;},renderAlertasIfOpen,renderProntidaoIfOpen,renderAlertasBody,renderAlertasTab,renderProntidaoTab};
 }
});
})(globalThis);
/* Controlador mensagens: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('mensagens',{
 dependencias:{
  "pick": "contexto",
  "escHtml": "contexto",
  "pessoasPainel": "pessoas",
  "enfileirarOffline": "offline",
  "salvarPrototipo": "persistencia"
},
 criar(dependencias){
 let chatOverlay,chatHistorico,respostasAuto,chatContatoAtivo;
 function chatContatos(){
  return dependencias.pessoasPainel().map(p=>({id:p.id,nome:p.nome,sub:[p.sub,p.zona].filter(Boolean).join(' · ')}));
}
function renderChatContacts(){
  const el = document.getElementById('chat-contacts');
  if(!el) return;
  el.innerHTML = chatContatos().map(c=>`
    <div class="chat-contact${chatContatoAtivo===c.id?' active':''}" data-id="${c.id}">
      <div>${dependencias.escHtml(c.nome)}</div>
      <div class="cc-role">${dependencias.escHtml(c.sub)}</div>
    </div>
  `).join('');
  el.querySelectorAll('.chat-contact').forEach(elm=>{
    elm.onclick = ()=>{ chatContatoAtivo = elm.dataset.id; renderChatContacts(); openChatThread(elm.dataset.id); };
  });
}
function openChatThread(id){
  const contato = chatContatos().find(c=>c.id===id);
  if(!contato) return;
  if(!chatHistorico[id]){
    chatHistorico[id] = [
      { de:'eles', texto:`Oi, aqui é ${contato.nome.split(' ')[0]}. Pode me passar instruções?`, ts: Date.now()-9*60000 },
    ];
  }
  const thread = document.getElementById('chat-thread');
  thread.innerHTML = `
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Mensagem para ${dependencias.escHtml(contato.nome.split(' ')[0])}...">
      <button id="chat-send">Enviar</button>
    </div>
  `;
  renderChatMessages(id);
  document.getElementById('chat-send').onclick = ()=>sendChatMsg(id);
  document.getElementById('chat-input').addEventListener('keydown', e=>{ if(e.key==='Enter') sendChatMsg(id); });
}
function renderChatMessages(id){
  const box = document.getElementById('chat-messages');
  if(!box) return;
  box.innerHTML = (chatHistorico[id]||[]).map(m=>`
    <div class="chat-bubble ${m.de==='eu'?'me':'them'}">${dependencias.escHtml(m.texto)}<span class="cb-time">${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}
function sendChatMsg(id){
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if(!texto) return;
  input.value = '';
  if(!navigator.onLine){
    const filaId=dependencias.enfileirarOffline('chat', { contatoId:id, texto });
    chatHistorico[id].push({ de:'eu', texto:texto+' ⏳ (aguardando reconexão simulada)', ts:Date.now(),filaId });
    dependencias.salvarPrototipo();
    renderChatMessages(id);
    return;
  }
  chatHistorico[id].push({ de:'eu', texto, ts:Date.now() });
  renderChatMessages(id);
  setTimeout(()=>{
    chatHistorico[id].push({ de:'eles', texto: dependencias.pick(respostasAuto), ts:Date.now() });
    if(chatContatoAtivo===id)renderChatMessages(id);
    dependencias.salvarPrototipo();
  }, 1400 + Math.random()*1600);
}
 async function iniciar(){
 (chatOverlay=document.getElementById('chat-overlay'));
(chatHistorico={});
(respostasAuto=[
  "Recebido, chegando em breve.",
  "Estou a caminho, deve levar uns 10 minutos.",
  "Mensagem recebida. Vou conferir a informação.",
  "Vou enviar a foto da situação em seguida.",
  "Precisamos de mais um caminhão aqui, pode verificar disponibilidade?",
  "Obrigado por avisar.",
]);
(chatContatoAtivo=null);
document.getElementById('open-chat').onclick = ()=>{ chatOverlay.hidden=false; renderChatContacts(); };
document.getElementById('chat-close').onclick = ()=>{ chatOverlay.hidden=true; };
chatOverlay.addEventListener('click', e=>{ if(e.target===chatOverlay) chatOverlay.hidden=true; });
 return true;
 }
 return {iniciar,get chatOverlay(){return chatOverlay;},get chatHistorico(){return chatHistorico;},get respostasAuto(){return respostasAuto;},get chatContatoAtivo(){return chatContatoAtivo;},set chatContatoAtivo(valor){chatContatoAtivo=valor;},chatContatos,renderChatContacts,openChatThread,renderChatMessages,sendChatMsg};
 }
});
})(globalThis);
/* Controlador trilha: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('trilha',{
 dependencias:{
  "escHtml": "contexto",
  "conectado": "contexto",
  "storageKey": "contexto",
  "selecao": "cadastro-territorial",
  "noRecorte": "cadastro-territorial"
},
 criar(dependencias){
 let auditoriaLocal,auditPush,verificarIntegridadeAudit,auditOverlay;
 function renderAuditIfOpen(){ if(!auditOverlay.hidden) renderAudit(); }
function renderAudit(){
  const auditLog=auditoriaLocal.listar();
  const body = document.getElementById('audit-body');
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Cada ação fica registrada com o hash da entrada anterior, formando uma cadeia. Editar ou apagar uma entrada no meio quebra a cadeia a partir dali. A verificação percorre toda a cadeia municipal. Registros gerais e antigos sem território aparecem em todos os recortes.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="admin-btn primary" id="audit-verify">🔒 Verificar integridade</button>
      <button class="admin-btn danger" id="audit-tamper">⚠ Simular adulteração (demo)</button>
    </div>
    <div id="audit-result" style="margin-bottom:12px;font-size:12px"></div>
    <table class="admin-table"><thead><tr><th>Quando</th><th>Ator</th><th>Ação</th><th>Detalhe</th><th>Hash</th></tr></thead><tbody>
      ${auditLog.filter(e=>!dependencias.selecao.size||!e.territorios?.length||e.territorios.some(dependencias.noRecorte)).reverse().map(e=>`
        <tr><td style="white-space:nowrap">${new Date(e.ts).toLocaleTimeString('pt-BR')}</td><td>${dependencias.escHtml(e.ator)}</td><td>${dependencias.escHtml(e.acao)}</td><td>${dependencias.escHtml(e.detalhe)}</td><td style="font-family:var(--mono);font-size:9.5px;color:var(--muted)">${e.hash.slice(0,10)}…</td></tr>
      `).join('') || '<tr><td colspan="5" style="color:var(--muted)">Nenhuma ação registrada ainda.</td></tr>'}
    </tbody></table>
  `;
  document.getElementById('audit-verify').onclick = async ()=>{
    const r = await verificarIntegridadeAudit();
    document.getElementById('audit-result').innerHTML = r.ok
      ? `<span style="color:var(--green)">✓ Cadeia municipal íntegra: ${auditLog.length} entradas, nenhuma adulteração detectada.</span>`
      : `<span style="color:var(--red)">✗ Adulteração detectada na entrada #${r.indice+1} — o hash não corresponde ao conteúdo.</span>`;
  };
  document.getElementById('audit-tamper').onclick = ()=>{
    if(!auditLog.length){ document.getElementById('audit-result').textContent = 'Não há entradas para adulterar ainda.'; return; }
    auditoriaLocal.simularAdulteracao();
    renderAudit();
  };
}
 async function iniciar(){
 (auditoriaLocal=AlertaEventoAuditoriaLocal.criar({armazenamento:localStorage,chave:dependencias.storageKey('audit'),habilitado:!dependencias.conectado,onChange:()=>renderAuditIfOpen()}));
(auditPush=auditoriaLocal.adicionar);
(verificarIntegridadeAudit=auditoriaLocal.verificar);
(auditOverlay=document.getElementById('audit-overlay'));
document.getElementById('open-audit').onclick = ()=>{ auditOverlay.hidden=false; renderAudit(); };
document.getElementById('audit-close').onclick = ()=>{ auditOverlay.hidden=true; };
auditOverlay.addEventListener('click', e=>{ if(e.target===auditOverlay) auditOverlay.hidden=true; });
 return true;
 }
 return {iniciar,get auditoriaLocal(){return auditoriaLocal;},get auditPush(){return auditPush;},get verificarIntegridadeAudit(){return verificarIntegridadeAudit;},get auditOverlay(){return auditOverlay;},renderAuditIfOpen,renderAudit};
 }
});
})(globalThis);
/* Controlador status-publico: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('status-publico',{
 dependencias:{
  "escHtml": "contexto",
  "ocorrencias": "cadastro-territorial"
},
 criar(dependencias){

 function statusSteps(o){
  const steps = [
    { label:'Ocorrência recebida', done:true },
    ...(o.confirmado===false?[{label:'Em triagem',done:false,now:true}]:[]),
    { label:'Equipe confirmou presença na área', done: o.status!=='ativa', now: o.status==='ativa'&&o.confirmado!==false },
    { label:'Atendimento concluído', done: o.status==='resolvida', now: o.status==='em_atendimento' },
  ];
  return steps.map(s=> s.done ? {...s, cls:'done'} : s.now ? {...s, cls:'now'} : {...s, cls:'pending'});
}
function renderStatusResultado(o){
  const el = document.getElementById('status-resultado');
  if(!o){
    el.innerHTML = '<div style="color:var(--red);font-size:12.5px;margin-top:8px">Protocolo não encontrado. Confira o código recebido no WhatsApp.</div>';
    return;
  }
  const steps = statusSteps(o);
  el.innerHTML = `
    <div class="status-result-card">
      <div style="font-size:13px;font-weight:700;margin-bottom:2px">${o.icone} ${dependencias.escHtml(o.tipo)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Zona: ${dependencias.escHtml(o.bairro)} · Protocolo ${dependencias.escHtml(o.protocolo)}</div>
      ${steps.map(s=>`<div class="status-step ${s.cls}"><span class="dot2"></span><span>${s.label}</span></div>`).join('')}
      ${o.status==='resolvida'
        ? `<div style="margin-top:12px;font-size:12px;color:var(--green)">✓ Atendida em ${o.tempoChegada+o.tempoAtendimento} minutos.</div>
           ${o.relatorio && o.relatorio.fotosPublicas ? `
              <div class="grid2" style="margin-top:10px">
                ${o.relatorio.fotoAtual?`<img src="${o.relatorio.fotoAtual}" alt="Situação inicial" style="width:100%;border-radius:6px">`:""}
                ${o.relatorio.fotoFinal?`<img src="${o.relatorio.fotoFinal}" alt="Situação final" style="width:100%;border-radius:6px">`:""}
              </div>` : `<div style="margin-top:8px;font-size:11px;color:var(--muted)">Não há fotos públicas neste registro.</div>`}`
        : o.tempoEstimado>0?`<div style="margin-top:12px;font-size:12px;color:var(--muted)">Tempo estimado: ${o.tempoEstimado} minutos a partir do recebimento.</div>`:'<div style="margin-top:12px;font-size:12px;color:var(--muted)">Tempo estimado ainda não informado.</div>'}
    </div>
  `;
}
function applyRoute(){
  const isStatus = location.hash === '#status';
  document.getElementById('app-view').hidden = isStatus;
  document.getElementById('status-view').hidden = !isStatus;
  if(isStatus) document.getElementById('status-resultado').innerHTML = '';

}
 async function iniciar(){
 document.getElementById('status-buscar').onclick = ()=>{
  const codigo = document.getElementById('status-protocolo').value.trim().toUpperCase();
  const o = dependencias.ocorrencias.find(x=>x.protocolo===codigo);
  renderStatusResultado(o);
};
document.getElementById('status-protocolo').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('status-buscar').click(); });
document.getElementById('status-voltar').onclick = (e)=>{ e.preventDefault(); location.hash=''; };
window.addEventListener('hashchange', applyRoute);
applyRoute();
 return true;
 }
 return {iniciar,statusSteps,renderStatusResultado,applyRoute};
 }
});
})(globalThis);
/* Controlador relatorio: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('relatorio',{
 dependencias:{
  "escHtml": "contexto",
  "tenantConfig": "contexto",
  "ocorrencias": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "areasSelecionadas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "pessoasPainel": "pessoas",
  "prontidao": "escalonamento",
  "pessoaNome": "escalonamento"
},
 criar(dependencias){
 let relatorioOverlay;
 function renderRelatorioEvento(){
  const body = document.getElementById('relatorio-body');
  const filtradas=dependencias.ocorrencias.filter(dependencias.ocorrenciaVisivel);
  const resolvidas=filtradas.filter(o=>o.status==='resolvida');
  const ativas=filtradas.filter(o=>o.status==='ativa'||o.status==='em_atendimento');
  const comChegada=filtradas.filter(o=>Number.isFinite(o.confirmadoEm)&&Number.isFinite(o.reportadoEm));
  const tempoResposta=comChegada.length?Math.round(comChegada.reduce((s,o)=>s+Math.max(0,o.confirmadoEm-o.reportadoEm),0)/comChegada.length/60000):null;
  const comDuracao=resolvidas.filter(o=>Number.isFinite(o.tempoReal));
  const tempoMedioGeral=comDuracao.length?Math.round(comDuracao.reduce((s,o)=>s+o.tempoReal,0)/comDuracao.length):null;

  const porZona = (dependencias.selecao.size?dependencias.areasSelecionadas():dependencias.areas).map(b=>{
    const ocz = filtradas.filter(o=>dependencias.pertence(b,o.bairro));
    const resz = ocz.filter(o=>o.status==='resolvida');
    const tempo = resz.length ? Math.round(resz.reduce((s,o)=>s+o.tempoReal,0)/resz.length) : null;
    return { zona:b.nome, total:ocz.length, resolvidas:resz.length, ativas:ocz.length-resz.length, tempo };
  });

  const rankingColab = {};
  filtradas.forEach(o=> (o.participacoes||[]).filter(p=>p.status==='concluida').forEach(p=>{rankingColab[p.voluntarioId]=(rankingColab[p.voluntarioId]||0)+1;}));
  const topColab = Object.entries(rankingColab).sort((a,c)=>c[1]-a[1]).slice(0,5).map(([id,n])=>({nome:dependencias.pessoaNome(id), n}));

  let totalProntos=0, totalConf=0;
  const idsRecorte=new Set(dependencias.pessoasPainel().map(p=>p.id));
  Object.values(dependencias.prontidao).forEach(mapa=>{
    Object.entries(mapa).filter(([id])=>!dependencias.selecao.size||idsRecorte.has(id)).forEach(([,st])=>{ totalProntos++; if(st.status==='confirmado') totalConf++; });
  });
  const pctProntidao = totalProntos ? Math.round(totalConf/totalProntos*100) : null;

  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Gerado em ${new Date().toLocaleString('pt-BR')} · ${dependencias.escHtml(dependencias.tenantConfig.nome)} · ${dependencias.escHtml(dependencias.recorteLabel())} · ${dependencias.escHtml(document.getElementById('filtro-evento').selectedOptions[0]?.textContent||'Todos')} · ${dependencias.escHtml(dependencias.filtroOcorrencias?.descricao()||'Sem filtros de ocorrência')} · evento de demonstração. Consolidado automaticamente a partir dos registros do protótipo.</div>
    <div class="rel-grid">
      <div class="rel-tile"><b>${filtradas.length}</b><span>Ocorrências totais</span></div>
      <div class="rel-tile"><b>${resolvidas.length}</b><span>Resolvidas</span></div>
      <div class="rel-tile"><b>${ativas.length}</b><span>Ainda abertas</span></div>
      <div class="rel-tile"><b>${tempoResposta===null?'—':tempoResposta+'min'}</b><span>Tempo médio até chegada</span></div><div class="rel-tile"><b>${tempoMedioGeral===null?'—':tempoMedioGeral+'min'}</b><span>Tempo médio até conclusão</span></div>
      <div class="rel-tile"><b>${dependencias.pessoasPainel().filter(p=>!p.oficial).length}</b><span>Colaboradores cadastrados</span></div>
      <div class="rel-tile"><b>${pctProntidao!==null?pctProntidao+'%':'—'}</b><span>Prontidão confirmada pré-evento</span></div>
    </div>
    <h3 style="font-size:13px;margin-bottom:8px">Desempenho por zona</h3>
    <table class="rel-table"><thead><tr><th>Zona</th><th>Total</th><th>Resolvidas</th><th>Ainda abertas</th><th>Tempo médio</th></tr></thead><tbody>
      ${porZona.map(z=>`<tr><td>${dependencias.escHtml(z.zona)}</td><td>${z.total}</td><td>${z.resolvidas}</td><td>${z.ativas}</td><td>${z.tempo!==null?z.tempo+'min':'—'}</td></tr>`).join('')}
    </tbody></table>
    <h3 style="font-size:13px;margin-bottom:8px">Colaboradores que mais ajudaram</h3>
    <table class="rel-table"><thead><tr><th>Nome</th><th>Participações concluídas</th></tr></thead><tbody>
      ${topColab.map(c=>`<tr><td>${dependencias.escHtml(c.nome)}</td><td>${c.n}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--muted)">As participações aparecem aqui quando a pessoa confirma o término.</td></tr>'}
    </tbody></table>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">Contagens das confirmações de término nesta demonstração. O agradecimento é automático, sem nota de qualidade ou comprovação adicional.</div>
  `;
}
 async function iniciar(){
 (relatorioOverlay=document.getElementById('relatorio-overlay'));
document.getElementById('open-relatorio-evento').onclick = ()=>{ relatorioOverlay.hidden=false; renderRelatorioEvento(); };
document.getElementById('relatorio-close').onclick = ()=>{ relatorioOverlay.hidden=true; };
document.getElementById('relatorio-print').onclick = ()=>{ window.print(); };
relatorioOverlay.addEventListener('click', e=>{ if(e.target===relatorioOverlay) relatorioOverlay.hidden=true; });
 return true;
 }
 return {iniciar,get relatorioOverlay(){return relatorioOverlay;},renderRelatorioEvento};
 }
});
})(globalThis);
/* Controlador offline: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('offline',{
 dependencias:{
  "conectado": "contexto",
  "storageKey": "contexto",
  "chatHistorico": "mensagens",
  "renderChatContacts": "mensagens",
  "salvarPrototipo": "persistencia"
},
 criar(dependencias){
 let filaLocal,enfileirarOffline;
 function atualizarBannerOffline(){
  document.getElementById('offline-banner').hidden = navigator.onLine;
}
function processarFilaOffline(){
  const processados=filaLocal.processar(item=>{
    if(item.tipo!=='chat')return false;
    const id=item.dados.contatoId;
    dependencias.chatHistorico[id]=dependencias.chatHistorico[id]||[];
    const pendente=dependencias.chatHistorico[id].find(m=>m.filaId===item.id);
    if(pendente){pendente.texto=item.dados.texto+' (reconexão simulada)';delete pendente.filaId;}
    else dependencias.chatHistorico[id].push({de:'eu',texto:item.dados.texto+' (reconexão simulada)',ts:item.ts});
    return true;
  });
  if(processados){dependencias.renderChatContacts();dependencias.salvarPrototipo();}
}
 async function iniciar(){
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{ /* alguns navegadores/visualizacoes bloqueiam; segue sem offline */ });
}
(filaLocal=AlertaEventoFilaLocal.criar({armazenamento:localStorage,chave:dependencias.storageKey('offline'),habilitado:!dependencias.conectado}));
(enfileirarOffline=filaLocal.enfileirar);
window.addEventListener('offline', atualizarBannerOffline);
window.addEventListener('online', ()=>{ atualizarBannerOffline(); processarFilaOffline(); });
atualizarBannerOffline();
 return true;
 }
 return {iniciar,get filaLocal(){return filaLocal;},get enfileirarOffline(){return enfileirarOffline;},atualizarBannerOffline,processarFilaOffline};
 }
});
})(globalThis);
/* Controlador permissoes: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('permissoes',{
 dependencias:{
  "conectado": "contexto",
  "tenantId": "contexto",
  "tenantConfig": "contexto",
  "bairros": "regioes",
  "ocorrencias": "cadastro-territorial",
  "currentRole": "cadastro-territorial",
  "map": "mapa",
  "heatLayer": "mapa",
  "heatOn": "mapa",
  "rebuildHeat": "mapa",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "renderAdminBody": "administracao",
  "applyRoute": "status-publico"
},
 criar(dependencias){

 function canAdmin(){ return !!dependencias.currentRole && dependencias.currentRole.tipo==='admin'; }
function canActZone(zona){ return !!dependencias.currentRole && (dependencias.currentRole.tipo==='admin' || (dependencias.currentRole.tipo==='responsavel' && dependencias.currentRole.zona===zona)); }
function isViewOnly(){ return !dependencias.currentRole || dependencias.currentRole.tipo==='visualizacao'; }
function applyRolePermissions(){
  document.getElementById('open-audit').style.display = canAdmin() ? '' : 'none';
  document.getElementById('open-admin').style.display = isViewOnly() ? 'none' : '';
  document.getElementById('demo-new').disabled = dependencias.conectado?!root.AlertaNuvem.repositorio().pode('incidentes','gravar'):isViewOnly();
}
function selecionarPerfilDemo(perfil) {
  dependencias.currentRole = perfil && ['admin','responsavel','visualizacao'].includes(perfil.tipo)
    ? perfil : {tipo:'visualizacao'};
  applyRolePermissions();
  dependencias.renderCollaborators();
  if(dependencias.currentPanelOcId) {
    const o=dependencias.ocorrencias.find(x=>x.id===dependencias.currentPanelOcId);
    if(o)dependencias.openOcorrencia(o);
  }
  if(!document.getElementById('admin-overlay').hidden){
    if(isViewOnly())document.getElementById('admin-overlay').hidden=true;
    else dependencias.renderAdminBody();
  }
  if(!canAdmin())document.getElementById('audit-overlay').hidden=true;
}
 async function iniciar(){
 if(dependencias.conectado){
  selecionarPerfilDemo({tipo:'visualizacao'});
  const cadastro=document.getElementById('demo-new');
  cadastro.title=root.AlertaGestaoDados.ESQUEMAS.incidentes?'Registrar ocorrência':'Registro de ocorrências indisponível.';
  cadastro.setAttribute('aria-label',cadastro.title);
  document.getElementById('session-anchor').textContent=window.AlertaNuvem.email;
}else if(window.AlertaSessao && window.AlertaSessaoUI){
  const servicoSessao = AlertaSessao.criar({ municipioId:dependencias.tenantId });
  const sessaoAtual = servicoSessao.obterSessao();
  selecionarPerfilDemo(sessaoAtual?.conta?.perfil || {tipo:'visualizacao'});
  AlertaSessaoUI.criar({
    target:document.getElementById('session-anchor'),
    sessao:servicoSessao,
    municipio:dependencias.tenantConfig.nome,
    zonas:dependencias.bairros.map(b=>b.nome),
    aoMudar:atual=>selecionarPerfilDemo(atual?.conta?.perfil || {tipo:'visualizacao'})
  });
}else{
  selecionarPerfilDemo({tipo:'visualizacao'});
  const item=document.createElement('span'); item.textContent='Sessão indisponível';
  document.getElementById('session-anchor').appendChild(item);
}
dependencias.applyRoute();
document.getElementById('heat-toggle').onclick = (e)=>{
  dependencias.heatOn = !dependencias.heatOn;
  if(dependencias.heatOn){ dependencias.rebuildHeat(); dependencias.heatLayer.addTo(dependencias.map); e.target.textContent = '🔥 Mapa de gravidade: ligado'; }
  else { dependencias.map.removeLayer(dependencias.heatLayer); e.target.textContent = '🔥 Mapa de gravidade: desligado'; }
};
 return true;
 }
 return {iniciar,canAdmin,canActZone,isViewOnly,applyRolePermissions,selecionarPerfilDemo};
 }
});
})(globalThis);
/* Controlador conversas: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('conversas',{
 dependencias:{
  "escHtml": "contexto",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "map": "mapa",
  "rebuildHeat": "mapa",
  "ocIcon": "mapa",
  "refreshOcTooltip": "mapa",
  "renderZoneList": "recorte",
  "applyZoneVisibility": "recorte",
  "localizacoes": "pessoas",
  "posicaoAtual": "pessoas",
  "atualizarPontoAoVivo": "pessoas",
  "pararLocalizacao": "pessoas",
  "checkInValido": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "updateKpis": "resumo",
  "filaOverlay": "triagem",
  "renderFila": "triagem",
  "chatOverlay": "mensagens",
  "chatHistorico": "mensagens",
  "chatContatoAtivo": "mensagens",
  "renderChatContacts": "mensagens",
  "renderChatMessages": "mensagens",
  "relatorioOverlay": "relatorio",
  "renderRelatorioEvento": "relatorio",
  "iniciarLocalizacao": "localizacao",
  "salvarPrototipo": "persistencia"
},
 criar(dependencias){
 let whatsappContexto,estadoPronto,ultimaSerializacao,PARTICIPACAO_LABEL;
 function registrarEtapa(o, tipo, texto){
  o.timeline = o.timeline || [];
  o.timeline.push({tipo, texto, ts:Date.now()});
}
function enviarMensagemDemo(id, texto, o, tipo='sistema', pessoa=false){
  dependencias.chatHistorico[id] = dependencias.chatHistorico[id] || [];
  dependencias.chatHistorico[id].push({de:pessoa?'eles':'eu', texto, ts:Date.now(), ocorrenciaId:o.id, tipo, pessoa});
}
function estadoPessoa(id){
  const participacoes = dependencias.ocorrencias.flatMap(o=>o.participacoes||[]).filter(p=>p.voluntarioId===id);
  if(participacoes.some(p=>p.status==='no_local')) return 'no local';
  if(participacoes.some(p=>p.status==='convidado')) return 'convidado';
  return 'disponível';
}
function acionarAjuda(o, candidatos=dependencias.voluntarios){
  if(o.atendimentoEquipe && o.atendimentoEquipe.status!=='concluida')return {ok:true,novos:[]};
  const resultado = AlertaFluxo.ativar(o, candidatos.filter(v=>v.bairro===o.bairro), dependencias.ocorrencias, {
    agora:Date.now(), limite:2, distancia:(v,oc)=>dependencias.map.distance(v.pos,oc.pos)
  });
  if(!o.responsavelAvisadoEm&&o.responsavel?.id!=='sem-responsavel'){
    o.responsavelAvisadoEm=Date.now();
    registrarEtapa(o,'responsavel','Responsável da região avisado automaticamente');
    enviarMensagemDemo(o.responsavel.id,`Ocorrência confirmada: ${o.tipo}, ${o.bairro}. Protocolo ${o.protocolo}. O sistema já iniciou o acionamento conforme a necessidade.`,o,'aviso_regional');
  }
  (resultado.novos||[]).forEach(id=>{
    const v=dependencias.voluntarios.find(p=>p.id===id);
    if(!v) return;
    enviarMensagemDemo(id,`Olá, ${v.nome.split(' ')[0]}. Há uma ocorrência confirmada em ${o.bairro}: ${o.tipo}.\n\nLocal: ponto indicado no mapa · ${o.protocolo}.\n${o.orientacaoAjuda||""}\nResponsável: ${o.responsavel.nome}, ${o.responsavel.tel}.\n\nSe puder ajudar, confirme quando chegar. Ao terminar, é só avisar por aqui.`,o,'convite');
    registrarEtapa(o,'convite',`Convite enviado a ${v.nome}`);
  });
  if(resultado.ok && !resultado.resolvida && (resultado.encaminhamentoEspecializado || resultado.faltam>0) && !o.atendimentoEquipe){
    const especial=o.encaminhamentoEspecializado;
    o.pendenciaTecnica=true;
    o.atendimentoEquipe={id:`equipe:${o.id}`, nome:especial?.servico || 'Equipe municipal de apoio', status:'acionada'};
    enviarMensagemDemo(o.atendimentoEquipe.id,`Acionamento de demonstração: ${o.tipo}, ${o.bairro}.\nProtocolo ${o.protocolo}.\n${especial?.motivo || 'Não há voluntários disponíveis suficientes. A equipe municipal foi acionada para completar o atendimento, e o responsável regional já foi avisado.'}\n\nConfirme a chegada e o término por aqui.`,o,'encaminhamento');
    registrarEtapa(o,'encaminhamento',`${o.atendimentoEquipe.nome}: encaminhamento simulado registrado`);
  }
  AlertaFluxo.sincronizarDisponibilidade(dependencias.voluntarios,dependencias.ocorrencias);
  return resultado;
}
function calcularTempos(o){
  if(o.status!=='resolvida') return;
  o.resolvidoEm=o.resolvidoEm||Date.now();
  o.tempoChegada=Math.max(0,Math.round(((o.confirmadoEm||o.resolvidoEm)-o.reportadoEm)/60000));
  o.tempoAtendimento=Math.max(0,Math.round((o.resolvidoEm-(o.confirmadoEm||o.resolvidoEm))/60000));
  o.tempoReal=o.tempoChegada+o.tempoAtendimento;
}
function atualizarFluxo(){
  AlertaFluxo.sincronizarDisponibilidade(dependencias.voluntarios,dependencias.ocorrencias);
  dependencias.voluntarios.forEach(v=>dependencias.atualizarPontoAoVivo(v.id));
  dependencias.ocorrencias.forEach(o=>{
    calcularTempos(o);
    if(o.marker){o.marker.setIcon(dependencias.ocIcon(o.status));dependencias.refreshOcTooltip(o);}
  });
  dependencias.applyZoneVisibility();dependencias.updateKpis();dependencias.renderZoneList();dependencias.rebuildHeat();dependencias.renderChatContacts();
  if(dependencias.currentPanelOcId){const o=dependencias.ocorrencias.find(x=>x.id===dependencias.currentPanelOcId);if(o)dependencias.openOcorrencia(o);}
  if(dependencias.chatContatoAtivo && !dependencias.chatOverlay.hidden) dependencias.renderChatMessages(dependencias.chatContatoAtivo);
  if(!dependencias.filaOverlay.hidden)dependencias.renderFila();
  if(!dependencias.relatorioOverlay.hidden)dependencias.renderRelatorioEvento();
  dependencias.salvarPrototipo();
}
function participantesDaConversa(o){
  const pessoas=(o.participacoes||[]).map(p=>{
    const v=dependencias.voluntarios.find(x=>x.id===p.voluntarioId);
    return v?{id:v.id,nome:v.nome,status:p.status}:null;
  }).filter(Boolean);
  if(o.atendimentoEquipe) pessoas.push({id:o.atendimentoEquipe.id,nome:o.atendimentoEquipe.nome,status:o.atendimentoEquipe.status});
  return pessoas;
}
function abrirWhatsapp(o, pessoaId){
  const pessoas=participantesDaConversa(o);
  const pessoa=pessoas.find(p=>p.id===pessoaId)||pessoas.find(p=>p.status==='convidado'||p.status==='acionada')||pessoas[0];
  if(!pessoa)return;
  whatsappContexto={ocorrenciaId:o.id,pessoaId:pessoa.id};
  document.getElementById('whatsapp-overlay').hidden=false;
  renderWhatsapp();
}
function renderWhatsapp(){
  if(!whatsappContexto)return;
  const o=dependencias.ocorrencias.find(x=>x.id===whatsappContexto.ocorrenciaId);
  if(!o)return;
  const pessoas=participantesDaConversa(o), pessoa=pessoas.find(p=>p.id===whatsappContexto.pessoaId);
  if(!pessoa)return;
  document.getElementById('wa-demo-protocolo').textContent=`${o.protocolo} · ${o.bairro}`;
  const select=document.getElementById('wa-demo-pessoa');
  select.innerHTML=pessoas.map(p=>`<option value="${dependencias.escHtml(p.id)}">${dependencias.escHtml(p.nome)}</option>`).join('');
  select.value=pessoa.id;
  select.onchange=()=>{whatsappContexto.pessoaId=select.value;renderWhatsapp();};
  const box=document.getElementById('wa-demo-messages');
  const mensagens=(dependencias.chatHistorico[pessoa.id]||[]).filter(m=>m.ocorrenciaId===o.id);
  box.innerHTML=mensagens.map(m=>`<div class="wa-message${m.pessoa?' pessoa':''}">${dependencias.escHtml(m.texto)}<time>${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join('');
  box.scrollTop=box.scrollHeight;
  const chegou=pessoa.status==='no_local', terminou=pessoa.status==='concluida';
  document.getElementById('wa-cheguei').disabled=chegou||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  document.getElementById('wa-terminei').disabled=!chegou;
  document.getElementById('wa-demo-status').textContent=terminou?'Obrigado! Sua participação terminou.':chegou?'Presença registrada. Quando terminar, avise por aqui.':'Confirme ao chegar. O responsável da região já foi avisado.';
  const gps=document.getElementById('wa-localizacao');
  const individual=dependencias.voluntarios.some(v=>v.id===pessoa.id);
  const compartilhando=dependencias.localizacoes.get(pessoa.id)?.ocorrenciaId===o.id;
  gps.hidden=!individual||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  gps.textContent=compartilhando?'Parar localização':'Ativar localização';
  gps.setAttribute('aria-pressed',String(compartilhando));
  gps.onclick=()=>{
    if(compartilhando){
      dependencias.pararLocalizacao(pessoa.id);
      dependencias.renderCollaborators();renderWhatsapp();
    }else dependencias.iniciarLocalizacao(o,pessoa.id);
  };
  if(individual&&!chegou&&!terminou&&pessoa.status!=='recusada'&&o.status!=='resolvida'){
    document.getElementById('wa-cheguei').disabled=!dependencias.checkInValido(o,pessoa.id);
    const atual=dependencias.posicaoAtual(pessoa.id);
    document.getElementById('wa-demo-status').textContent=dependencias.checkInValido(o,pessoa.id)
      ? 'Localização confirmada no local. Toque em Cheguei.'
      : !compartilhando?'Ative a localização deste dispositivo para fazer o check-in.'
      : !atual?'Aguardando um sinal de localização recente.'
      : `Check-in indisponível. Distância aproximada: ${Math.round(dependencias.map.distance(atual.pos,o.pos))} m. Aproxime-se do ponto da ocorrência e aguarde uma posição precisa.`;
  }
  const proxima=dependencias.ocorrencias.find(x=>x.id!==o.id && (x.participacoes||[]).some(p=>p.voluntarioId===pessoa.id&&p.status==='convidado'));
  const proximoBtn=document.getElementById('wa-demo-next');
  proximoBtn.hidden=!terminou||!proxima;
  if(proxima){proximoBtn.textContent=`Ver outro convite · ${proxima.bairro}`;proximoBtn.onclick=()=>abrirWhatsapp(proxima,pessoa.id);}
  document.getElementById('wa-demo-input').placeholder='Escreva Cheguei ou Terminei';
}
 async function iniciar(){
 (whatsappContexto=null);
(estadoPronto=false);
(ultimaSerializacao=null);
(PARTICIPACAO_LABEL={convidado:'Convite enviado', no_local:'No local', concluida:'Ajuda concluída', recusada:'Não pode ir'});
 return true;
 }
 return {iniciar,get whatsappContexto(){return whatsappContexto;},set whatsappContexto(valor){whatsappContexto=valor;},get estadoPronto(){return estadoPronto;},set estadoPronto(valor){estadoPronto=valor;},get ultimaSerializacao(){return ultimaSerializacao;},set ultimaSerializacao(valor){ultimaSerializacao=valor;},get PARTICIPACAO_LABEL(){return PARTICIPACAO_LABEL;},registrarEtapa,enviarMensagemDemo,estadoPessoa,acionarAjuda,calcularTempos,atualizarFluxo,participantesDaConversa,abrirWhatsapp,renderWhatsapp};
 }
});
})(globalThis);
/* Controlador localizacao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('localizacao',{
 dependencias:{
  "escHtml": "contexto",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "localizacoes": "pessoas",
  "VALIDADE_GPS_MS": "pessoas",
  "atualizarPontoAoVivo": "pessoas",
  "pararLocalizacao": "pessoas",
  "checkInValido": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "auditPush": "trilha",
  "whatsappContexto": "conversas",
  "registrarEtapa": "conversas",
  "enviarMensagemDemo": "conversas",
  "acionarAjuda": "conversas",
  "atualizarFluxo": "conversas",
  "participantesDaConversa": "conversas",
  "renderWhatsapp": "conversas"
},
 criar(dependencias){

 function iniciarLocalizacao(o,id){
  if(!navigator.geolocation){
    document.getElementById('wa-demo-status').textContent='Localização indisponível neste dispositivo.';
    return;
  }
  dependencias.localizacoes.forEach((_,pessoaId)=>dependencias.pararLocalizacao(pessoaId));
  const sessao={ocorrenciaId:o.id};
  dependencias.localizacoes.set(id,sessao);
  const atualizar=()=>{
    dependencias.atualizarPontoAoVivo(id);
    dependencias.renderCollaborators();
    if(dependencias.whatsappContexto?.pessoaId===id && dependencias.whatsappContexto.ocorrenciaId===o.id) dependencias.renderWhatsapp();
  };
  sessao.watch=navigator.geolocation.watchPosition(({coords,timestamp})=>{
    if(dependencias.localizacoes.get(id)!==sessao)return;
    Object.assign(sessao,{pos:[coords.latitude,coords.longitude],precisao:coords.accuracy,ts:timestamp});
    clearTimeout(sessao.expiracao);
    sessao.expiracao=setTimeout(atualizar,Math.max(1,timestamp+dependencias.VALIDADE_GPS_MS-Date.now()+1));
    atualizar();
  },erro=>{
    if(dependencias.localizacoes.get(id)!==sessao)return;
    dependencias.pararLocalizacao(id);
    atualizar();
    if(dependencias.whatsappContexto?.pessoaId===id && dependencias.whatsappContexto.ocorrenciaId===o.id){
      document.getElementById('wa-demo-status').textContent=erro.code===1?'Permissão de localização negada.':'Sinal de localização indisponível. Tente novamente.';
    }
  },{enableHighAccuracy:true,maximumAge:0,timeout:AlertaGestaoDados.parametros.gps.timeoutMs});
  dependencias.renderWhatsapp();
}
function confirmarWhatsApp(acao){
  if(!dependencias.whatsappContexto)return;
  const o=dependencias.ocorrencias.find(x=>x.id===dependencias.whatsappContexto.ocorrenciaId), id=dependencias.whatsappContexto.pessoaId;
  if(!o)return;
  const equipe=o.atendimentoEquipe?.id===id?o.atendimentoEquipe:null;
  const pessoa=dependencias.participantesDaConversa(o).find(p=>p.id===id);
  if(!pessoa)return;
  let resultado;
  if(equipe){
    if(acao==='cheguei'){
      if(equipe.status!=='acionada')return;
      equipe.status='no_local';equipe.chegouEm=Date.now();
      o.status='em_atendimento';o.confirmadoEm=o.confirmadoEm||Date.now();
    }else{
      if(equipe.status!=='no_local')return;
      equipe.status='concluida';equipe.terminouEm=Date.now();
      if(o.encaminhamentoEspecializado)o.encaminhamentoEspecializado.status='concluido';
      o.pendenciaTecnica=false;
      const pendente=(o.participacoes||[]).some(p=>p.status==='convidado'||p.status==='no_local');
      if(!pendente){o.status='resolvida';o.resolvidoEm=Date.now();}
    }
    resultado={ok:true};
  }else{
    const antes=(o.participacoes||[]).find(p=>p.voluntarioId===id)?.status;
    if(acao==='cheguei'&&antes!=='convidado')return;
    if(acao==='cheguei'&&!dependencias.checkInValido(o,id)){
      document.getElementById('wa-demo-status').textContent='O check-in exige localização ativa e posição confirmada no local.';
      return;
    }
    if(acao==='terminei'&&antes!=='no_local')return;
    resultado=acao==='cheguei'?AlertaFluxo.chegar(o,id,Date.now()):AlertaFluxo.terminar(o,id,Date.now());
  }
  if(!resultado.ok){document.getElementById('wa-demo-status').textContent=resultado.motivo||'Esta confirmação já foi registrada.';return;}
  if(!equipe){
    if(acao==='cheguei') o.participacoes.find(p=>p.voluntarioId===id).checkInGPS=true;
    else dependencias.pararLocalizacao(id);
  }
  dependencias.enviarMensagemDemo(id,acao==='cheguei'?'Cheguei':'Terminei',o,acao,true);
  dependencias.enviarMensagemDemo(id,acao==='cheguei'?'Chegada registrada. Obrigado por ajudar.':'Obrigado pela ajuda! Sua participação foi encerrada.',o,'resposta');
  dependencias.registrarEtapa(o,acao,`${pessoa.nome}: ${acao==='cheguei'?'chegada confirmada':'ajuda concluída'}`);
  dependencias.auditPush(pessoa.nome,acao==='cheguei'?'Chegada pelo WhatsApp simulado':'Término pelo WhatsApp simulado',o.protocolo,[o.bairro]);
  AlertaFluxo.sincronizarDisponibilidade(dependencias.voluntarios,dependencias.ocorrencias);
  if(acao==='terminei'&&!equipe){
    const v=dependencias.voluntarios.find(x=>x.id===id);
    if(v){
      const abertas=dependencias.ocorrencias.filter(x=>x.id!==o.id&&['ativa','em_atendimento'].includes(x.status)).sort((a,b)=>AlertaFluxo.prioridade(b)-AlertaFluxo.prioridade(a));
      for(const outra of abertas){
        const convite=dependencias.acionarAjuda(outra,[v]);
        if((convite.novos||[]).includes(id)){
          dependencias.enviarMensagemDemo(id,`Há outra ocorrência em ${outra.bairro} precisando de ajuda. Se puder continuar, veja o novo convite ${outra.protocolo}.`,o,'proximo_convite');
          break;
        }
      }
    }
  }
  dependencias.atualizarFluxo();dependencias.renderWhatsapp();
}
function renderAnexos(o){
  const r=o.relatorio||{};
  return `<details class="optional-report"><summary>Fotos e observações opcionais</summary><div class="report-form">
    <p class="demo-caption">Estes registros complementam o atendimento. Não são necessários para confirmar o término da ajuda.</p>
    <div class="field"><label for="foto-atual">Foto da situação inicial</label><input type="file" accept="image/*" id="foto-atual" class="file-in"></div>
    <div class="field"><label for="foto-final">Foto da situação final</label><input type="file" accept="image/*" id="foto-final" class="file-in"></div>
    <div class="field"><label for="pendencias">Observações e necessidades restantes</label><textarea id="pendencias" rows="2" class="file-in" placeholder="Opcional">${dependencias.escHtml(r.pendencias||'')}</textarea></div>
    <label style="font-size:11px;display:flex;gap:7px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="fotos-publicas"${r.fotosPublicas?' checked':''}>Mostrar as fotos no status público desta demonstração</label>
    <button class="admin-btn" id="report-submit">Salvar complemento</button><div id="report-err" class="demo-caption" role="status"></div>
    <div class="attachment-previews">${r.fotoAtual?`<img src="${r.fotoAtual}" alt="Situação inicial registrada">`:''}${r.fotoFinal?`<img src="${r.fotoFinal}" alt="Situação final registrada">`:''}</div>
  </div></details>`;
}
 async function iniciar(){

 return true;
 }
 return {iniciar,iniciarLocalizacao,confirmarWhatsApp,renderAnexos};
 }
});
})(globalThis);
/* Controlador persistencia: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('persistencia',{
 dependencias:{
  "conectado": "contexto",
  "tenantId": "contexto",
  "storageKey": "contexto",
  "bairros": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "idCounter": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "eventoAtivo": "cadastro-territorial",
  "eventosCache": "cadastro-territorial",
  "eventosMunicipio": "cadastro-territorial",
  "abriuEventoDaUrl": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "ocLayer": "mapa",
  "volLayer": "mapa",
  "volIcon": "mapa",
  "ocIcon": "mapa",
  "refreshOcTooltip": "mapa",
  "atualizarRecorte": "recorte",
  "configurarMarcadorPessoa": "pessoas",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "eventStart": "resumo",
  "alertaIdCursor": "escalonamento",
  "alertasClimaticos": "escalonamento",
  "prontidao": "escalonamento",
  "chatHistorico": "mensagens",
  "estadoPronto": "conversas",
  "ultimaSerializacao": "conversas",
  "registrarEtapa": "conversas",
  "enviarMensagemDemo": "conversas"
},
 criar(dependencias){

 function salvarAnexos(o){
  const arquivos=[document.getElementById('foto-atual').files[0],document.getElementById('foto-final').files[0]];
  const err=document.getElementById('report-err');
  if(arquivos.some(f=>f&&(!f.type.startsWith('image/')||f.size>1500000))){err.textContent='Escolha imagens de até 1,5 MB para este protótipo. Sua participação não depende destes anexos.';return;}
  const ler=f=>f?new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(f);}):Promise.resolve(null);
  const pendencias=document.getElementById('pendencias').value.trim();
  const fotosPublicas=document.getElementById('fotos-publicas').checked;
  Promise.all(arquivos.map(ler)).then(([inicial,final])=>{
    const r=o.relatorio||{};
    o.relatorio={fotoAtual:inicial||r.fotoAtual||null,fotoFinal:final||r.fotoFinal||null,pendencias,fotosPublicas,preenchidoPor:o.responsavel.nome,enviadoEm:Date.now()};
    dependencias.registrarEtapa(o,'complemento','Complemento opcional salvo');
    if(pendencias){
      dependencias.enviarMensagemDemo(o.responsavel.id,`Necessidade/observação em ${o.protocolo}: ${pendencias}`,o,'pendencia');
      dependencias.registrarEtapa(o,'pendencia','Observação encaminhada automaticamente ao responsável');
    }
    salvarPrototipo();dependencias.openOcorrencia(o);
  }).catch(()=>{err.textContent='Não foi possível ler a imagem. Você pode tentar novamente; isso não impede o término da ajuda.';});
}
function salvarPrototipo(){
  if(dependencias.conectado)return false;
  if(!dependencias.estadoPronto)return;
  try{
    const dados={versao:1,tenantId:dependencias.tenantId,idCounter:dependencias.idCounter,eventStart:dependencias.eventStart,
      voluntarios:dependencias.voluntarios.map(({marker,...v})=>v),
      ocorrencias:dependencias.ocorrencias.map(({marker,responsavel,...o})=>({...o,responsavelId:responsavel?.id})),
      chatHistorico:dependencias.chatHistorico,alertasClimaticos:dependencias.alertasClimaticos,prontidao:dependencias.prontidao,alertaIdCursor:dependencias.alertaIdCursor};
    const serializado=JSON.stringify(dados);
    if(serializado===dependencias.ultimaSerializacao)return true;
    if(localStorage.getItem(dependencias.storageKey('operacao'))!==dependencias.ultimaSerializacao){
      const aviso=document.getElementById('demo-save-status');aviso.textContent='Os dados foram alterados em outra aba. Recarregue antes de continuar; não substituímos os dados salvos.';aviso.hidden=false;return false;
    }
    localStorage.setItem(dependencias.storageKey('operacao'),serializado);
    dependencias.ultimaSerializacao=serializado;
    document.getElementById('demo-save-status').hidden=true;
    return true;
  }catch(e){const aviso=document.getElementById('demo-save-status');aviso.textContent='Não foi possível salvar neste navegador.';aviso.hidden=false;return false;}
}
function restaurarPrototipo(dados){
  dependencias.idCounter=dados.idCounter||1;if(Number.isFinite(dados.eventStart))dependencias.eventStart=dados.eventStart;
  dependencias.voluntarios=dados.voluntarios.map(v=>{
    const marker=L.marker(v.pos,{icon:dependencias.volIcon(),title:v.nome}).addTo(dependencias.volLayer);
    dependencias.configurarMarcadorPessoa(marker,{...v,demo:v.cpf==null&&v.endereco==null});
    return {...v,tenantId:dependencias.tenantId,marker};
  });
  dependencias.ocorrencias=dados.ocorrencias.map(item=>{
    const o={...item,tenantId:dependencias.tenantId,responsavel:responsavelDaOcorrencia(item.bairro),marker:null};
    if(o.status!=='resolvida'){
      o.marker=L.marker(o.pos,{icon:dependencias.ocIcon(o.status)}).addTo(dependencias.ocLayer);
      o.marker.on('click',()=>dependencias.openOcorrencia(o));dependencias.refreshOcTooltip(o);
    }
    return o;
  });
  Object.assign(dependencias.chatHistorico,dados.chatHistorico||{});
  dependencias.alertasClimaticos.push(...(dados.alertasClimaticos||[]));Object.assign(dependencias.prontidao,dados.prontidao||{});
  dependencias.alertaIdCursor=dados.alertaIdCursor||1;
  dependencias.ultimaSerializacao=JSON.stringify(dados);
  return true;
}
function responsavelDaOcorrencia(nome){
  const demo=dependencias.bairros.find(b=>b.nome===nome);
  if(demo)return demo.equipe.responsavel;
  const registro=AlertaGestaoDados.criar().lista('responsaveis',dependencias.tenantId).find(p=>dependencias.normalizarTerritorio(p.bairro||p.zona)===dependencias.normalizarTerritorio(nome));
  return registro?{id:registro.id,nome:registro.nome,cargo:registro.cargo||'Responsável',tel:registro.telefone||''}
    :{id:'sem-responsavel',nome:'Não cadastrado',cargo:'Responsável',tel:''};
}
function atualizarFiltroEventos(){
  const select=document.getElementById('filtro-evento');
  dependencias.eventosCache=AlertaGestaoDados.criar(undefined,{municipioId:dependencias.tenantId}).lista('eventos');const lista=dependencias.eventosMunicipio();
  if(!dependencias.abriuEventoDaUrl&&dependencias.eventoAtivo){const grupo=EventosMapa.membros(dependencias.eventoAtivo,lista);if(grupo.length>1)dependencias.eventoAtivo='mapa:'+EventosMapa.raiz(dependencias.eventoAtivo,lista);dependencias.abriuEventoDaUrl=true;}
  const grupos=lista.filter(e=>EventosMapa.membros(e.id,lista).length>1&&EventosMapa.raiz(e.id,lista)===e.id);
  select.replaceChildren(new Option('Todos os eventos',''),...grupos.map(e=>new Option('Mapa conjunto · '+e.nome,'mapa:'+e.id)),...lista.map(e=>new Option(e.nome,e.id)));
  if(![...select.options].some(e=>e.value===dependencias.eventoAtivo))dependencias.eventoAtivo='';
  select.value=dependencias.eventoAtivo;renderEventoReferencias();
}
function renderEventoReferencias(){
  const target=document.getElementById('evento-referencias'),lista=dependencias.eventosMunicipio();
  const ids=dependencias.eventoAtivo.startsWith('mapa:')?EventosMapa.membros(dependencias.eventoAtivo.slice(5),lista):[dependencias.eventoAtivo];
  EventoReferencias.render(target,lista.filter(e=>ids.includes(e.id)));
}
 async function iniciar(){
 document.getElementById('filtro-evento').addEventListener('change',e=>{
  dependencias.eventoAtivo=e.target.value;renderEventoReferencias();
  if(dependencias.currentPanelOcId&&!dependencias.noEvento(dependencias.ocorrencias.find(o=>o.id===dependencias.currentPanelOcId)||{}))document.getElementById('panel-close').click();
  dependencias.atualizarRecorte();
});
 return true;
 }
 return {iniciar,salvarAnexos,salvarPrototipo,restaurarPrototipo,responsavelDaOcorrencia,atualizarFiltroEventos,renderEventoReferencias};
 }
});
})(globalThis);
/* Controlador inicializacao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('inicializacao',{
 dependencias:{
  "sortGravidade": "contexto",
  "rnd": "contexto",
  "pick": "contexto",
  "escHtml": "contexto",
  "randPointInBox": "contexto",
  "conectado": "contexto",
  "tenantId": "contexto",
  "demoMode": "contexto",
  "tenantConfig": "contexto",
  "storageKey": "contexto",
  "bairros": "regioes",
  "MUNICIPIO_CENTER": "regioes",
  "saveAdminState": "cadastros",
  "tiposOcorrencia": "equipes",
  "ocorrencias": "cadastro-territorial",
  "idCounter": "cadastro-territorial",
  "gestao": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "eventoAtivo": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "map": "mapa",
  "ocLayer": "mapa",
  "ocIcon": "mapa",
  "gerarVoluntarios": "mapa",
  "gerarOcorrencia": "mapa",
  "refreshOcTooltip": "mapa",
  "atualizarRecorte": "recorte",
  "renderOfficialMarkers": "pessoas",
  "localizacoes": "pessoas",
  "pararLocalizacao": "pessoas",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "tickClock": "resumo",
  "processarFilaOffline": "offline",
  "canActZone": "permissoes",
  "estadoPronto": "conversas",
  "ultimaSerializacao": "conversas",
  "acionarAjuda": "conversas",
  "atualizarFluxo": "conversas",
  "confirmarWhatsApp": "localizacao",
  "salvarPrototipo": "persistencia",
  "restaurarPrototipo": "persistencia",
  "responsavelDaOcorrencia": "persistencia",
  "atualizarFiltroEventos": "persistencia"
},
 criar(dependencias){
 let recuperacao,buscaMapa,resultadosMapa,INVENTARIO,filtrosCadastros,listarRecursosPublicos,linhasInventario,layerRecursosPublicos,painelPonto,marcadorBusca;
 function instalarCadastroOcorrencia(){
  CadastroOcorrenciaMapa.instalar({
    tenantId:dependencias.tenantId,tenantConfig:dependencias.tenantConfig,areas:dependencias.areas,tiposOcorrencia:dependencias.tiposOcorrencia,map:dependencias.map,ocLayer:dependencias.ocLayer,MUNICIPIO_CENTER:dependencias.MUNICIPIO_CENTER,
    normalizarTerritorio:dependencias.normalizarTerritorio,pertence:dependencias.pertence,canActZone:dependencias.canActZone,responsavelDaOcorrencia:dependencias.responsavelDaOcorrencia,ocIcon:dependencias.ocIcon,
    refreshOcTooltip:dependencias.refreshOcTooltip,salvarPrototipo:dependencias.salvarPrototipo,acionarAjuda:dependencias.acionarAjuda,atualizarFluxo:dependencias.atualizarFluxo,atualizarFiltroEventos:dependencias.atualizarFiltroEventos,
    openOcorrencia:dependencias.openOcorrencia,fecharMenuMobile,obterOcorrencias:()=>dependencias.ocorrencias,
    proximoId:()=>dependencias.idCounter++,reverterId:id=>{if(dependencias.idCounter===id+1)dependencias.idCounter=id;},
    setEventoFiltro:id=>{if(!dependencias.noEvento({eventoId:id}))dependencias.eventoAtivo=id;},
    obterEventoSelecionado:()=>EventosMapa.selecionadoIndividual(dependencias.eventoAtivo)
  });
}
function iniciarControlesDemo(){
  document.querySelector('.brand').innerHTML=`<span class="dot"></span>${dependencias.escHtml(dependencias.tenantConfig.marca)}`;
  document.querySelector('.status-brand').textContent=dependencias.tenantConfig.marca;
  document.title=dependencias.tenantConfig.marca;
  dependencias.atualizarFiltroEventos();
  instalarCadastroOcorrencia();
  document.getElementById('whatsapp-close').onclick=()=>document.getElementById('whatsapp-overlay').hidden=true;
  document.getElementById('whatsapp-overlay').onclick=e=>{if(e.target.id==='whatsapp-overlay')e.currentTarget.hidden=true;};
  document.getElementById('wa-cheguei').onclick=()=>dependencias.confirmarWhatsApp('cheguei');
  document.getElementById('wa-terminei').onclick=()=>dependencias.confirmarWhatsApp('terminei');
  function enviar(){
    const input=document.getElementById('wa-demo-input');
    const texto=input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!]/g,'');
    input.value='';
    if(['cheguei','estou no local','ja cheguei'].includes(texto))dependencias.confirmarWhatsApp('cheguei');
    else if(['terminei','conclui','finalizei','ja terminei'].includes(texto))dependencias.confirmarWhatsApp('terminei');
    else document.getElementById('wa-demo-status').textContent='Nesta simulação, use Cheguei ou Terminei. No sistema real, a conversa será recebida pelo WhatsApp.';
  }
  document.getElementById('wa-demo-send').onclick=enviar;
  document.getElementById('wa-demo-input').onkeydown=e=>{if(e.key==='Enter')enviar();};
  document.getElementById('mobile-menu').onclick=()=>{
    const abriu=document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('menu-backdrop').classList.toggle('open',abriu);
    document.getElementById('mobile-menu').setAttribute('aria-expanded',String(abriu));
  };
  document.getElementById('menu-backdrop').onclick=fecharMenuMobile;
  document.querySelectorAll('.sidebar-actions button,.sidebar-actions a').forEach(el=>el.addEventListener('click',fecharMenuMobile));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    fecharMenuMobile();document.querySelectorAll('.modal-overlay:not([hidden]):not(#role-overlay)').forEach(el=>{el.hidden=true;});
  });
  window.addEventListener('beforeunload',dependencias.salvarPrototipo);
  window.addEventListener('pagehide',()=>dependencias.localizacoes.forEach((_,id)=>dependencias.pararLocalizacao(id)));
  setInterval(dependencias.salvarPrototipo,5000);
}
function fecharMenuMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menu-backdrop').classList.remove('open');
  document.getElementById('mobile-menu').setAttribute('aria-expanded','false');
}
function montarMarcadoresPublicos(){
 layerRecursosPublicos.clearLayers();
 if(!filtrosCadastros?.mostrar())return 0;
 const registros=linhasInventario().filter(x=>x.georreferenciado&&!x.privado);
 for(const r of registros){
  const simbolo=INVENTARIO.simbolo(r);
  const ic=L.divIcon({className:'ponto-publico-marker',html:'<span title="'+dependencias.escHtml(r.nome)+'">'+simbolo+'</span>',iconSize:[30,30],iconAnchor:[15,30]});
  L.marker([r.lat,r.lng],{icon:ic,title:r.nome}).bindTooltip('<strong>'+dependencias.escHtml(r.nome)+'</strong><br>'+dependencias.escHtml(r.endereco||'Endereço não informado'),{direction:'top'}).on('click',()=>painelPonto.abrir(r)).addTo(layerRecursosPublicos);
 }
 return registros.length;
}
 async function iniciar(){
 iniciarControlesDemo();
if(window.innerWidth<=860)document.getElementById('floatwin-min').click();
(recuperacao=dependencias.conectado?{estado:'vazio'}:OperacaoRestauracao.ler(localStorage,dependencias.storageKey('operacao'),dependencias.tenantId));
if(recuperacao.estado==='bloqueado'){
  const overlay=document.createElement('div');overlay.className='recuperacao-overlay';
  overlay.innerHTML='<section class="recuperacao-card" role="alertdialog" aria-modal="true" aria-labelledby="recuperacao-title"><h2 id="recuperacao-title">Seus dados foram preservados</h2><p id="recuperacao-motivo"></p><p>O mapa foi interrompido para impedir que os dados sejam substituídos. Salve uma cópia e procure suporte para recuperar o conteúdo.</p><button type="button" id="recuperacao-backup">Baixar cópia dos dados</button></section>';
  overlay.querySelector('#recuperacao-motivo').textContent=recuperacao.motivo;
  const backup=overlay.querySelector('#recuperacao-backup');backup.hidden=recuperacao.original===null;
  backup.onclick=()=>{const url=URL.createObjectURL(new Blob([recuperacao.original],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='backup-mapa-operacional.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.body.appendChild(overlay);(backup.hidden?overlay.querySelector('h2'):backup).focus();
  return false;
}
if(recuperacao.estado==='restauravel'){dependencias.restaurarPrototipo(recuperacao.dados);dependencias.ultimaSerializacao=recuperacao.original;}
if(recuperacao.estado==='vazio'&&dependencias.demoMode){
dependencias.gerarVoluntarios();
for(let i=0;i<5;i++) dependencias.gerarOcorrencia();
dependencias.gerarOcorrencia({zona:dependencias.bairros[0].nome,tipo:dependencias.tiposOcorrencia[0]});

// historico de ocorrencias ja resolvidas antes da sessao atual, distribuidas entre os bairros
dependencias.bairros.forEach(b=>{
  const n = Math.floor(dependencias.rnd(1,3));
  for(let i=0;i<n;i++){
    const t = dependencias.pick(dependencias.tiposOcorrencia);
    const tChegada = Math.floor(dependencias.rnd(10,35)), tAtend = Math.floor(dependencias.rnd(20,70));
    const reportado = Date.now()-Math.floor(dependencias.rnd(60,230))*60000;
    const numIdHist = dependencias.idCounter++;
    dependencias.ocorrencias.push({
      id:"oc"+numIdHist, demo:true, protocolo:dependencias.tenantConfig.prefixo+"-"+String(10000+numIdHist).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos: dependencias.randPointInBox(b.poly),
      gravidade: dependencias.sortGravidade(t.gravBase), responsabilidade: dependencias.pick(t.resp),
      reportadoEm: reportado, confirmadoEm: reportado+tChegada*60000, resolvidoEm: reportado+(tChegada+tAtend)*60000,
      status:"resolvida", tempoChegada:tChegada, tempoAtendimento:tAtend, tempoReal: tChegada+tAtend,
      responsavel: b.equipe.responsavel, voluntariosProx: [], marker:null,
    });
  }
});


}
dependencias.filtroOcorrencias=FiltrosOcorrencias.montar({target:document.getElementById('filtros-ocorrencias'),
 obterDados:()=>({ocorrencias:dependencias.ocorrencias,tipos:[...dependencias.tiposOcorrencia.map(x=>x.tipo),...dependencias.gestao.lista('ocorrencias',dependencias.tenantId).map(x=>x.nome)],
 organizacoes:['saude','emergencias','parceiros','equipes'].flatMap(modulo=>dependencias.gestao.lista(modulo,dependencias.tenantId).map(x=>({id:modulo+':'+x.id,nome:x.nome})))}),
 aoMudar:()=>dependencias.atualizarRecorte()});
document.getElementById('fil-toggle').click();
PainelEventos.iniciar({painel:document.getElementById('eventos-painel'),barra:document.getElementById('eventos-painel-head'),
 abrir:document.getElementById('eventos-open'),fechar:document.getElementById('eventos-close'),area:document.getElementById('mapwrap'),
 aoAbrir:()=>{dependencias.filtroOcorrencias.atualizarOpcoes();filtrosCadastros?.abrir();}});
setInterval(()=>{const f=dependencias.filtroOcorrencias.obter();if(f.horas||f.espera)dependencias.atualizarRecorte();},30000);
dependencias.estadoPronto=true;
dependencias.saveAdminState();
dependencias.atualizarFluxo();
dependencias.tickClock();
dependencias.renderOfficialMarkers();
dependencias.processarFilaOffline();
(buscaMapa=document.getElementById('event-search'));
(resultadosMapa=document.getElementById('event-results'));
(INVENTARIO=globalThis.AlertaInventarioMapas);
(listarRecursosPublicos=()=>INVENTARIO.registros(dependencias.gestao).filter(x=>!x.privado));
(linhasInventario=()=>filtrosCadastros?filtrosCadastros.rows():[]);
(layerRecursosPublicos=L.layerGroup().addTo(dependencias.map));
(painelPonto=FichaPonto.criar({painel:document.getElementById('panel'),abrirPainel:()=>{dependencias.currentPanelOcId=null;document.getElementById('panel').classList.add('open')},aoFechar:()=>document.getElementById('panel').classList.remove('open'),obterRegistro:(modulo,id)=>dependencias.gestao.registro(modulo,id),waLink:MaringaCrise.waLink}));
 return true;
 }
 return {iniciar,instalarCadastroOcorrencia,iniciarControlesDemo,fecharMenuMobile,get recuperacao(){return recuperacao;},get buscaMapa(){return buscaMapa;},get resultadosMapa(){return resultadosMapa;},get INVENTARIO(){return INVENTARIO;},get filtrosCadastros(){return filtrosCadastros;},set filtrosCadastros(valor){filtrosCadastros=valor;},get listarRecursosPublicos(){return listarRecursosPublicos;},get linhasInventario(){return linhasInventario;},get layerRecursosPublicos(){return layerRecursosPublicos;},get painelPonto(){return painelPonto;},get marcadorBusca(){return marcadorBusca;},set marcadorBusca(valor){marcadorBusca=valor;},montarMarcadoresPublicos};
 }
});
})(globalThis);
/* Controlador busca: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('busca',{
 dependencias:{
  "escHtml": "contexto",
  "prefeituraContexto": "contexto",
  "tenantConfig": "contexto",
  "ocorrencias": "cadastro-territorial",
  "gestao": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areasCadastradas": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "eventoAtivo": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "map": "mapa",
  "selectZone": "recorte",
  "atualizarRecorte": "recorte",
  "pessoasMunicipio": "pessoas",
  "mostrarFicha": "pessoas",
  "openOcorrencia": "ocorrencias",
  "atualizarFiltroEventos": "persistencia",
  "buscaMapa": "inicializacao",
  "resultadosMapa": "inicializacao",
  "INVENTARIO": "inicializacao",
  "filtrosCadastros": "inicializacao",
  "listarRecursosPublicos": "inicializacao",
  "marcadorBusca": "inicializacao",
  "montarMarcadoresPublicos": "inicializacao"
},
 criar(dependencias){
 let bairroSolicitado;
 function atualizarFiltroCadastros(){dependencias.filtrosCadastros?.atualizar();}
function incluirTerritorio(territorio){
  if(dependencias.noRecorte(territorio)) return;
  const area=dependencias.areas.find(a=>a.tipoArea==='Bairro'&&dependencias.pertence(a,territorio))||dependencias.areas.find(a=>dependencias.pertence(a,territorio));
  if(area) dependencias.selectZone(area.chave);
}
function abrirRecurso(recurso){
  incluirTerritorio(recurso.bairro||recurso.zona);
  dependencias.marcadorBusca?.remove();
  const pos=[Number(recurso.lat),Number(recurso.lng)];
  const localizado=recurso.lat && recurso.lng && pos.every(Number.isFinite);
  const conteudo=`<strong>${dependencias.escHtml(recurso.nome)}</strong><br>${dependencias.escHtml(recurso.endereco||recurso.localizacao||'')}`;
  if(localizado){
    dependencias.marcadorBusca=L.marker(pos).addTo(dependencias.map).bindPopup(conteudo);
    dependencias.map.setView(pos,Math.max(dependencias.map.getZoom(),15));
    dependencias.marcadorBusca.openPopup();
  }else{
    L.popup().setLatLng(dependencias.map.getCenter()).setContent(conteudo+'<br>Sem coordenadas cadastradas.').openOn(dependencias.map);
  }
}
function buscarNoMapa(){
  const termos=dependencias.normalizarTerritorio(dependencias.buscaMapa.value).split(/\s+/).filter(Boolean);
  dependencias.resultadosMapa.replaceChildren();
  dependencias.resultadosMapa.hidden=!termos.length;
  dependencias.buscaMapa.setAttribute('aria-expanded',String(!!termos.length));
  if(!termos.length)return;
  const grupos=[
    ['Bairros e zonas',dependencias.areas.map(a=>({nome:a.nome,meta:a.tipoArea,abrir:()=>{if(!dependencias.selecao.has(a.chave))dependencias.selectZone(a.chave);}}))],
    ['Ocorrências',dependencias.ocorrencias.map(o=>({nome:o.tipo,meta:[o.protocolo,o.bairro,o.endereco].filter(Boolean).join(' · '),territorio:o.bairro,
      abrir:()=>{if(!dependencias.noEvento(o)){dependencias.eventoAtivo='';dependencias.atualizarFiltroEventos();dependencias.atualizarRecorte();}incluirTerritorio(o.bairro);if(o.pos)dependencias.map.panTo(o.pos);dependencias.openOcorrencia(o);}}))],
    ['Pessoas',dependencias.pessoasMunicipio().map(p=>({nome:p.nome,meta:[p.sub,p.bairroOrigem].filter(Boolean).join(' · '),territorio:p.bairroOrigem,
      abrir:()=>{incluirTerritorio(p.bairroOrigem);dependencias.mostrarFicha(p.id);}}))],
    ['Cadastros da Prefeitura',dependencias.listarRecursosPublicos().map(r=>({nome:r.nome,meta:[r.moduloNome,r.categoria,r.classe,r.endereco].filter(Boolean).join(' · '),
      territorio:r.bairro||r.zona,abrir:()=>abrirRecurso(r)}))]
  ];
  for(const [titulo,registros] of grupos){
    const encontrados=registros.filter(r=>termos.every(t=>dependencias.normalizarTerritorio(r.nome+' '+r.meta).includes(t)));
    if(!encontrados.length)continue;
    const secao=document.createElement('section');
    const cabecalho=document.createElement('h3');
    cabecalho.textContent=titulo;
    secao.append(cabecalho);
    encontrados.forEach(r=>{
      const botao=document.createElement('button');
      botao.type='button';
      botao.textContent=[r.nome,r.meta,r.territorio&&!dependencias.noRecorte(r.territorio)?'Fora do filtro':''].filter(Boolean).join(' · ');
      botao.onclick=()=>{dependencias.buscaMapa.value='';buscarNoMapa();r.abrir();};
      secao.append(botao);
    });
    dependencias.resultadosMapa.append(secao);
  }
  if(!dependencias.resultadosMapa.childElementCount) dependencias.resultadosMapa.textContent='Nenhum resultado em '+dependencias.tenantConfig.nome+'.';
}
 async function iniciar(){
 void Promise.allSettled((AlertaGestaoDados.config.referencias(dependencias.prefeituraContexto).publicas||[]).map(url=>AlertaImportacaoPublica.carregar(dependencias.gestao,{url}))).then(()=>{
 dependencias.montarMarcadoresPublicos();
 if(dependencias.buscaMapa.value.trim())buscarNoMapa();
 atualizarFiltroCadastros();
}).catch(error=>console.warn("Referências municipais de abrigo e apoio indisponíveis",error));
dependencias.montarMarcadoresPublicos();
dependencias.filtrosCadastros=FiltrosCadastros.montar({alvo:document.getElementById('filtros-cadastros-municipais'),inventario:dependencias.INVENTARIO,db:dependencias.gestao,recorte:x=>dependencias.noRecorte(x.zona||x.bairro),aoMudar:()=>dependencias.montarMarcadoresPublicos(),localizar:x=>dependencias.map.flyTo([x.lat,x.lng],Math.max(dependencias.map.getZoom(),15))});
dependencias.montarMarcadoresPublicos();
dependencias.buscaMapa.addEventListener('input',buscarNoMapa);
dependencias.buscaMapa.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();dependencias.resultadosMapa.querySelector('button')?.click();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!dependencias.resultadosMapa.hidden){dependencias.buscaMapa.value='';buscarNoMapa();dependencias.buscaMapa.focus();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.event-search')&&!dependencias.resultadosMapa.hidden){dependencias.buscaMapa.value='';buscarNoMapa();}
});
(bairroSolicitado=new URLSearchParams(location.search).get('bairro'));
if(bairroSolicitado){
  const area=dependencias.areasCadastradas.find(a=>dependencias.normalizarTerritorio(a.nome)===dependencias.normalizarTerritorio(bairroSolicitado));
  if(area) dependencias.selectZone(area.chave);
}
 return true;
 }
 return {iniciar,atualizarFiltroCadastros,incluirTerritorio,abrirRecurso,buscarNoMapa,get bairroSolicitado(){return bairroSolicitado;}};
 }
});
})(globalThis);
/* Entrada única do Mapa de Evento. */
void AlertaEventoControladores.criar().iniciar().catch(error=>{console.error('Não foi possível iniciar o mapa',error);const alvo=document.getElementById('map');if(alvo){const aviso=document.createElement('p');aviso.setAttribute('role','alert');aviso.textContent='Não foi possível carregar o mapa. Recarregue a página.';alvo.appendChild(aviso);}});
