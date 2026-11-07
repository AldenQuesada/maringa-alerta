const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('mapa de evento usa azul e verde sem reutilizar cores do menu',()=>{
 const s=fs.readFileSync('src/evento/controladores/mapa.js','utf8');
 const code=s.slice(s.indexOf('function volIcon('),s.indexOf('\nfunction ocIcon('));
 const ctx={L:{divIcon:o=>o}};ctx.dependencias=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
 for(const status of ['fora','indefinido','caminho'])assert.match(ctx.volIcon(false,status).html,/mapa-inativo/);
 assert.match(ctx.volIcon(false,'local').html,/mapa-ativo/);
 assert.match(ctx.volIcon(true,'local').html,/vol-live/);
 assert.doesNotMatch(ctx.volIcon(false,'local').html,/vol-live/);
});
test('a localização aproximada usa área cadastrada e nunca inventa ponto sem geometria',()=>{
 const s=fs.readFileSync('src/evento/controladores/pessoas.js','utf8');
 const code=s.slice(s.indexOf('function referenciaPessoa('),s.indexOf('\nfunction statusPessoaMapa('));
 const area={nome:'Zona 7',layer:{getBounds:()=>({isValid:()=>true,getCenter:()=>({lat:-23.4,lng:-51.9})})}};
 const ctx={areas:[area],normalizarTerritorio:x=>String(x||'').toLowerCase()};ctx.dependencias=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(ctx.referenciaPessoa({zona:'Zona 7'}).aproximado,true);
 assert.equal(ctx.referenciaPessoa({zona:'Zona 42'}),null);
 assert.equal(ctx.referenciaPessoa({zona:'Zona 7',checkin_status:'presente',checkin_lat:-23.41,checkin_lng:-51.91}).aproximado,false);
});
test('equipes anteriores são lidas sem duplicar telefones já cadastrados',()=>{
 const ref=require('../mapas/colaboradores-referencia.js');
 const existentes=[{id:'1',nome:'Cadastrado',telefone:'44999999999'}];
 const anterior={estado:'restauravel',dados:{voluntarios:[{id:'v1',nome:'Mesma pessoa',telefone:'44999999999',bairro:'Zona 7'},{id:'v2',nome:'Antigo',bairro:'Zona 2',ajuda:'Limpeza'}]}};
 const result=ref.listar(existentes,anterior);
 assert.equal(result.length,2);assert.equal(result[1].registroAnterior,true);assert.equal(result[1].zona,'Zona 2');assert.deepEqual(result[1].ajudas,['Limpeza']);
 assert.equal(ref.listar(existentes,{estado:'bloqueado'}).length,1);
});
test('cadastro importado preserva posição do registro anterior para exibição',()=>{
 const ref=require('../mapas/colaboradores-referencia.js');
 const atual=[{id:'cad-1',nome:'Ana',origem_id_legado:'v1',status_simulacao:'simulado'}];
 const legado={estado:'restauravel',dados:{voluntarios:[{id:'v1',nome:'Ana',pos:[-23.42,-51.93]}]}};
 const result=ref.listar(atual,legado);
 assert.equal(result.length,1);assert.deepEqual(result[0].posicaoAnterior,[-23.42,-51.93]);assert.equal(atual[0].posicaoAnterior,undefined);
});
