const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../gestao/dados.js');
function contexto(){
 const ctx={};vm.createContext(ctx);
 for(const file of ['config/evento-demonstracao.js','src/evento/regioes-demonstrativas.js','src/evento/administracao-local.js','src/evento/territorio.js','src/gestao/catalogo-territorial.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 return ctx;
}
const mana={id:'manaus',codigo_ibge:'1302603'},maringa=D.config.demonstracao();
test('catálogo consulta o IBGE selecionado, isola cache e tenta novamente após falha',async()=>{
 const ctx=contexto(),urls=[];let city=mana,fail=true;
 const db={municipioAtivo:()=>city,lista:()=>[]};
 const service=ctx.AlertaCatalogoTerritorial.criar({obterBanco:()=>db,config:D.config,fetch:async url=>{
  urls.push(url);if(fail){fail=false;return {ok:false};}return {ok:true,json:async()=>[{id:city.codigo_ibge+'01',nome:'Zona 01'}]};
 }});
 assert.equal(await service.zonasOficiais(),null);
 assert.equal((await service.zonasOficiais())[0].codigo,'130260301');
 await service.zonasOficiais();assert.equal(urls.length,2);
 city=maringa;assert.equal((await service.zonasOficiais())[0].codigo,'411520001');
 city=mana;assert.equal((await service.zonasOficiais())[0].codigo,'130260301');assert.equal(urls.length,3);
 assert.ok(urls[0].includes('/municipios/1302603/subdistritos'));
 assert.equal((await service.bairrosOficiais()).length,0,'sem referência, não usar bairros de outra cidade');
});
test('território usa somente cadastro conectado e recorta bairros pela zona',async()=>{
 const ctx=contexto();let reads=0;
 const zona={id:'z1',nome:'Zona Norte'},bairro={id:'b1',nome:'Bairro Norte',zona:'z1'};
 const data={zonas:[zona],bairros:[bairro,{id:'rejeitado',nome:'Rejeitado',verificacao:'Rejeitado'}]};
 const db={lista:(tipo,id)=>{assert.equal(id,mana.id);return data[tipo];}};
 const config={referencias:()=>({catalogoBairros:'fixture'})};
 const adapter={fixture:{carregar:async()=>{reads++;throw Error('não consultar em modo conectado');}}};
 const service=await ctx.AlertaEventoTerritorio.criar({db,municipio:mana,config,adaptadores:adapter,conectado:true});
 assert.equal(service.areas.length,2);assert.equal(reads,0);
 service.selecao.add('zonas:z1');assert.equal(service.noRecorte('Bairro Norte'),true);assert.equal(service.noRecorte('Bairro Sul'),false);
 assert.equal(service.recorteLabel(),'Zona Norte');
 service.selecao.clear();assert.equal(service.noRecorte('Bairro Sul'),true);
 assert.equal(zona.chave,undefined,'o serviço não altera o registro persistido');
});
test('referência pública completa geometria sem duplicar zona nem substituir cadastro',async()=>{
 const ctx=contexto(),zone={id:'z1',nome:'Zona 01',fonte:'edição municipal'};
 const geo={type:'Polygon',coordinates:[]};
 const service=await ctx.AlertaEventoTerritorio.criar({db:{lista:tipo=>tipo==='zonas'?[zone]:[]},municipio:maringa,config:D.config,adaptadores:{MaringaBairros:{carregar:async()=>({zonasNumeradas:{source:'fixture IBGE',features:[{properties:{id:'ref',nome:'Zona 1'},geometry:geo}]}})}}});
 assert.equal(service.areas.length,1);assert.equal(service.areas[0].id,'z1');assert.equal(service.areas[0].geojson,geo);assert.equal(zone.geojson,undefined);
});
test('fixtures demonstrativas são opt-in por cidade e não alteram configuração original',()=>{
 const ctx=contexto(),config=ctx.AlertaEventoDemonstracaoConfiguracao;
 const criar=referencia=>ctx.AlertaEventoRegioesDemonstrativas.criar({referencia,habilitado:true,sortear:()=>0.5,ponto:poly=>poly[0]});
 assert.equal(criar(config[mana.codigo_ibge]).length,0);
 assert.equal(ctx.AlertaEventoRegioesDemonstrativas.criar({referencia:config[maringa.codigo_ibge],habilitado:false}).length,0);
 const a=criar(config[maringa.codigo_ibge]),b=criar(config[maringa.codigo_ibge]);
 assert.equal(a.length,6);a[0].equipe.responsavel.nome='alterado';assert.notEqual(b[0].equipe.responsavel.nome,'alterado');
 assert.equal(config[maringa.codigo_ibge].bairros[0].equipe,undefined);
});
test('admin local preserva chave legada autorizada, isola prefeitura e não acessa storage conectado',()=>{
 const ctx=contexto(),values=new Map([['legado',JSON.stringify({funcionarios:[{id:'f1',nome:'Pessoa'}],equipes:[]})]]);
 const store={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const a=ctx.AlertaEventoAdministracaoLocal.criar({armazenamento:store,chave:'cidade-a',chaveLegada:'legado',habilitado:true});
 assert.equal(a.carregar().funcionarios[0].nome,'Pessoa');a.salvar(a.carregar());assert.ok(values.has('legado'));assert.ok(values.has('cidade-a'));
 const b=ctx.AlertaEventoAdministracaoLocal.criar({armazenamento:store,chave:'cidade-b',habilitado:true});assert.equal(b.carregar(),null);
 const real=ctx.AlertaEventoAdministracaoLocal.criar({armazenamento:{getItem(){throw Error('leitura');},setItem(){throw Error('escrita');}},chave:'x',habilitado:false});
 assert.equal(real.carregar(),null);assert.equal(real.salvar({funcionarios:[],equipes:[]}),false);
});
