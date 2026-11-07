'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../gestao/dados.js'),I=require('../dados-territoriais/importacao-publica.js'),M=require('../mapas/inventario.js');
const seed=require('../dados-territoriais/maringa-apoio-imagens-2026.json');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))}};
test('pontos informados são importados sem duplicação no cadastro municipal e possuem localização identificada',()=>{
 const db=D.criar(storage(),{municipioId:'maringa'});
 assert.equal(I.importar(db,seed).novos,17);assert.equal(I.importar(db,seed).novos,0);
 const itens=M.registros(db).filter(x=>x.modulo==='bases');assert.equal(itens.length,17);
 assert.equal(itens.filter(x=>x.categoria==='Unidade de assistência social (CRAS)').length,12);
 assert.equal(itens.filter(x=>x.categoria==='Ponto de água potável').length,4);
 assert.equal(itens.filter(x=>x.categoria==='Ponto de banho').length,1);
 assert.ok(itens.every(x=>x.georreferenciado&&x.precisao&&x.situacao==='Em conferência'));
 assert.deepEqual(['Ponto de água potável','Ponto de banho','Unidade de assistência social (CRAS)'].map(categoria=>M.simbolo({modulo:'bases',categoria})),['🚰','🚿','🏢']);
 assert.match(itens.find(x=>x.nome.startsWith('Igreja')).telefone,/99918/);
});
test('dashboard e mapas carregam o mesmo conjunto e usam símbolo compartilhado',()=>{
 for(const p of ['gestao/gestao.js','evento/app.js','mapas/app.js'])assert.match(fs.readFileSync(p,'utf8'),/config.referencias/);
 assert.ok(require('../gestao/dados.js').config.referencias({codigo_ibge:'4115200'}).publicas.includes('dados-territoriais/maringa-apoio-imagens-2026.json'));
 assert.deepEqual(require('../gestao/dados.js').config.referencias({codigo_ibge:'1302603'}),{});
 for(const p of ['evento/app.js','mapas/app.js'])assert.match(fs.readFileSync(p,'utf8'),/INVENTARIO\.simbolo\(/);
});
