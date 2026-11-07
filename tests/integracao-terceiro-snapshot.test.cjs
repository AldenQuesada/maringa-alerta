const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('roteador extraído impede consulta sem permissão antes de renderizar cadastro',()=>{
 const scope={location:{hash:'#bases'},AlertaPermissoesUI:{podeRota:()=>false}};
 vm.runInNewContext(fs.readFileSync('src/gestao/roteador.js','utf8'),scope);
 const PAGE={};let rendered=0;
 const router=scope.AlertaGestaoRoteador.criar({D:{ESQUEMAS:{bases:{}}},PAGE,db:{tipo:'supabase',municipioAtivo:()=>({status:'ativa'})},state:{atual:'inicio'},topo:(...parts)=>parts.join(' '),renderModulo:()=>rendered++});
 router.render();assert.match(PAGE.innerHTML,/Acesso restrito/);assert.equal(rendered,0);
});
test('controlador de exclusão impede acesso ao registro sem permissão',async()=>{
 const scope={};vm.runInNewContext(fs.readFileSync('src/gestao/operacoes.js','utf8'),scope);
 let touched=0;const element={};scope.setTimeout=()=>1;scope.clearTimeout=()=>{};
 const service=scope.AlertaGestaoOperacoes.criar({$:()=>element,db:{tipo:'supabase',pode:()=>false,registro:()=>{touched++;}},state:{atual:'bases'}});
 await service.excluir('registro');assert.equal(touched,0);assert.match(element.textContent,/permissão/);
});
