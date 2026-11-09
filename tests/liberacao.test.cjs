const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=import('../scripts/verificar-liberacao.mjs');
test('cada gate crítico bloqueia falha, cancelamento, skip, ausência e resultado pendente',async()=>{
 const {contrato,verificarJobs}=await source;
 const base=Object.fromEntries(contrato.checks.map(n=>[n,{result:'success'}]));assert.doesNotThrow(()=>verificarJobs(base));
 for(const name of contrato.checks)for(const result of ['failure','cancelled','skipped',null,undefined])assert.throws(()=>verificarJobs({...base,[name]:result===undefined?undefined:{result}}),new RegExp(name));
});
test('publicação exige autorização E6 para o SHA exato',async()=>{
 const {verificarPublicacao}=await source,sha='a'.repeat(40);assert.doesNotThrow(()=>verificarPublicacao(sha,sha));
 for(const authorization of ['',undefined,'true','b'.repeat(40)])assert.throws(()=>verificarPublicacao(sha,authorization));
 assert.throws(()=>verificarPublicacao('main','main'));
});
test('proteção exige todos os checks da aplicação confiável e revisão independente',async()=>{
 const {contrato,verificarProtecao}=await source;
 const base={required_status_checks:{strict:true,checks:[...contrato.checks,contrato.check_agregado].map(context=>({context,app_id:contrato.github_app_id}))},enforce_admins:{enabled:true},allow_force_pushes:{enabled:false},allow_deletions:{enabled:false},required_pull_request_reviews:{required_approving_review_count:1,dismiss_stale_reviews:true,require_last_push_approval:true}};
 assert.doesNotThrow(()=>verificarProtecao(base));
 for(const name of [...contrato.checks,contrato.check_agregado])assert.throws(()=>verificarProtecao({...base,required_status_checks:{...base.required_status_checks,checks:base.required_status_checks.checks.filter(x=>x.context!==name)}}));
 assert.throws(()=>verificarProtecao({...base,required_pull_request_reviews:null}));
 assert.throws(()=>verificarProtecao({...base,required_status_checks:{strict:true,checks:base.required_status_checks.checks.map(x=>({...x,app_id:-1}))}}));
});
test('workflow agregado depende de todos os gates, e Pages exige o agregado e autorização E6',async()=>{
 const {contrato}=await source,root=path.join(__dirname,'..');
 const ci=fs.readFileSync(path.join(root,'.github/workflows/testes-prototipo.yml'),'utf8');
 const aggregate=ci.slice(ci.indexOf('\n  liberacao:'));
 assert.ok(aggregate.includes('if: always()'));assert.ok(aggregate.includes('needs: ['+contrato.checks.join(', ')+']'));
 assert.ok(aggregate.includes('node scripts/verificar-liberacao.mjs jobs'));
 const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
 assert.ok(pages.includes('needs: testes'));assert.ok(pages.includes('node scripts/verificar-liberacao.mjs publicacao'));
 assert.ok(pages.indexOf('verificar-liberacao.mjs publicacao')<pages.indexOf('actions/deploy-pages'));
});
