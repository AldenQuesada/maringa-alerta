const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const D=require('../gestao/dados.js'),Core=require('../gestao/implantacao-core.js');
const mana={id:'manaus',nome:'Manaus',uf:'AM',codigo_ibge:'1302603',estado:'Amazonas',paisId:'BR',pais:'Brasil',lat:-3.1,lng:-60,bbox:[-3.5,-2.5,-60.5,-59.5],status:'implantacao'};
function storage(initial){let value=initial?JSON.stringify(initial):null;return {getItem:()=>value,setItem:(_,v)=>value=v};}
function banco(){const initial={version:1,municipioAtivo:mana.id,prefeituras:[{...mana}]};return D.criarLocal(storage(initial),{semBootstrap:true});}
test('importação nacional valida IBGE, UF e coordenadas do município recebido',()=>{
 const C=Core.criar(mana);
 assert.match(C.FONTES.ibge,/1302603$/);assert.match(C.FONTES.malha,/1302603\?/);
 assert.equal(C.validarMunicipioIBGE({id:1302603,nome:'Manaus',uf:{sigla:'AM'}}).estado,'Amazonas');
 assert.throws(()=>C.validarMunicipioIBGE({id:1302603,nome:'Manaus',uf:{sigla:'PR'}}),/UF/);
 assert.deepEqual(C.normalizeCoordinates(-3.1,-60),{lat:-3.1,lng:-60});
 assert.equal(C.normalizeCoordinates(-23.4,-51.9),null);
 assert.ok(C.cnesItem({codigo_municipio:'130260',codigo_cnes:'123',nome:'UBS fixture'}));
 assert.equal(C.cnesItem({codigo_municipio:'411520',codigo_cnes:'123',nome:'UBS fixture'}),null);
 assert.equal(Core.criar(D.config.demonstracao()).MUNICIPIO,'4115200');
 assert.equal(C.MUNICIPIO,'1302603','outra instância não muda o contexto existente');
});
test('pacote de outra cidade ou sem identidade não altera o cadastro',()=>{
 const db=banco(),before=db.estado();
 for(const codigo_ibge of [undefined,'4115200'])assert.throws(()=>db.implantarPacote({codigo_ibge,grupos:{saude:[{nome:'UBS fixture'}]}}),/IBGE/);
 assert.deepEqual(db.estado(),before);
 const result=db.implantarPacote({codigo_ibge:mana.codigo_ibge,grupos:{saude:[{nome:'UBS fixture',codigo_cnes:'123'}]}});
 assert.equal(result.totais.saude.novos,1);assert.equal(db.lista('saude')[0].municipioId,mana.id);
 assert.deepEqual(db.municipios().map(x=>x.id),[mana.id],'pacote não recria município demonstrativo');
});
test('contexto da sessão é validado e não recorre a uma cidade fixa',()=>{
 const db=banco(),dados={criar:()=>db};
 assert.equal(D.config.selecionar(dados,{getItem:()=>null}),mana.id);
 assert.equal(D.config.selecionar(dados,{getItem:()=>mana.id}),mana.id);
 assert.throws(()=>D.config.selecionar(dados,{getItem:()=> 'inexistente'}),/não está disponível/);
 assert.deepEqual(D.config.referencias(mana),{});
 assert.equal(D.config.marca(mana),'Manaus Alerta');
 assert.deepEqual(D.config.centro(mana),[-3.1,-60]);assert.deepEqual(D.config.limites(mana),[[-3.5,-60.5],[-2.5,-59.5]]);
 assert.equal(D.config.centro({id:'sem-geo'}),null);assert.equal(D.config.limites({}),null);
});
test('importador configurável não consulta referências de outra prefeitura',async()=>{
 const scope={};vm.runInNewContext(fs.readFileSync('src/gestao/referencias.js','utf8'),scope);
 let network=0;
 const service=scope.AlertaGestaoReferencias.criar({db:{municipioAtivo:()=>mana},config:D.config,fetch:()=>{network++},carregarPublica:()=>{network++}});
 await service.importarBasesERiscosPublicos();await service.importarUnidadesCNES();assert.equal(network,0);
});
test('núcleo dos cadastros e importação não contém identidade municipal fixa',()=>{
 for(const dir of ['src/cadastros','src/implantacao-core'])for(const file of fs.readdirSync(dir)){
  if(!file.endsWith('.js'))continue;
  assert.doesNotMatch(fs.readFileSync(dir+'/'+file,'utf8'),/4115200|\bmaringa\b|Maringá|\bCopel\b|\bSanepar\b/,dir+'/'+file);
 }
});

test('modo conectado preserva dados recebidos e usa território do banco em qualquer município',()=>{
 const scope={AlertaNuvem:{ativo:true}};
 vm.runInNewContext(fs.readFileSync('gestao/dados.js','utf8'),scope);
 const api=scope.AlertaGestaoDados;
 assert.equal(typeof api.aplicarConfiguracao,'function');
 for(const city of [mana,{id:'maringa',codigo_ibge:'4115200',nome:'Maringá'}]){
  const refs=api.config.referencias(city);
  assert.equal(refs.catalogoBairros,'MaringaBairros');
  assert.equal(refs.mapaDemonstrativo,false);
  assert.equal(refs.importarZonasReferencia,false);
  assert.equal(refs.publicas,undefined);
  const db=api.criarLocal(storage({version:1,municipioAtivo:city.id,prefeituras:[city]}),{semBootstrap:true});
  assert.equal(JSON.stringify(db.municipios()),JSON.stringify([city]));
  assert.equal(db.lista('bases').length,0);
 }
});
