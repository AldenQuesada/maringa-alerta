const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const catalogFile=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_contatos_catalogo.sql'));
const config=JSON.parse(fs.readFileSync('supabase/migrations/'+catalogFile,'utf8').split('$catalog$')[1]);
config.deletion={mode:'permanent',revision_prefix:'delete-v1:'};
const tick=()=>new Promise(r=>setImmediate(r));
function env(){
 const {window,document}=parseHTML('<html><body><main id="page"></main><button id="origin">Ver</button></body></html>');
 let focused=document.body;
 Object.defineProperty(document,'activeElement',{get:()=>focused});window.HTMLElement.prototype.focus=function(){focused=this;};
 window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLElement.prototype.close=function(){this.removeAttribute('open');};
 const scope={document,URL,console,setTimeout,clearTimeout,location:{hash:'#voluntarios'}};scope.window=scope;
 for(const f of ['servico','apresentacao','dialogo','app'])vm.runInNewContext(fs.readFileSync('src/contatos/'+f+'.js','utf8'),scope);
 return {scope,document,window};
}
const contact={id:'s:one',session_id:'one',name:'Nome <img src=x>',name_source:'draft',category:'relato',category_label:'Relatar ocorrência',stage:'question',stage_label:'Preenchendo informações',phone:'550000001111',revision:'v1',total:6,completed_steps:3,can_delete:true};
const detail=()=>({contact:{...contact},answers:[{question:'Pergunta canônica <b>',kind:'text',answered:true,value:'Resposta canônica <script>'}],records:[],history_allowed:true,conversation:{items:[{key:'1',at:'2026-11-07T18:00:00Z',direction:'outbound',state:'delivered',payload:{text:'Mensagem exata do banco',buttons:[{label:'Confirmar',full_label:'Confirmar e concluir'}]}}],more:false}});
test('templates use canonical database labels and escape untrusted profile/answers',()=>{
 const {scope}=env(),U=scope.AlertaContatosApresentacao;
 const html=U.linhas([contact],config);assert.match(html,/Nome &lt;img/);assert.match(html,/data-ct-action="view"/);assert.match(html,/data-ct-action="delete"/);assert.doesNotMatch(html,/href=/);
 assert.match(U.respostas(detail(),config),/Resposta canônica &lt;script&gt;/);
 assert.match(U.mensagens(detail().conversation.items,config),/Confirmar e concluir/);
});
test('one popup has peer tabs and deletes only after explicit confirmation with revision',async()=>{
 const {scope,document}=env();let deleted=0,calls=[];
 const service={detalhe:async()=>detail(),excluir:async(...args)=>calls.push(args)};
 const dialog=scope.AlertaContatosDialogo.criar({service,config,onDeleted:()=>deleted++,onEdit:()=>{}});
 const origin=document.getElementById('origin');origin.focus();await dialog.open(contact);
 assert.equal(document.querySelectorAll('dialog').length,1);assert.equal(document.querySelectorAll('[role=tab]').length,3);
 document.querySelector('[data-tab=answers]').click();assert.match(document.querySelector('[role=tabpanel]').textContent,/Resposta canônica <script>/);
 document.querySelector('[data-tab=conversation]').click();assert.match(document.querySelector('[role=tabpanel]').textContent,/Mensagem exata do banco/);
 assert.equal(scope.location.hash,'#voluntarios');dialog.close();assert.equal(document.activeElement,origin);
 await dialog.open(contact,'delete');assert.equal(calls.length,0);document.querySelector('[data-ct-action=cancel-delete]').click();assert.equal(deleted,0);
 await dialog.open(contact,'delete');document.querySelector('[data-ct-action=confirm-delete]').click();await tick();
 assert.deepEqual(calls,[['s:one','delete-v1:v1']]);assert.equal(deleted,1);assert.equal(document.querySelector('dialog'),null);
});
test('directory mounts real RPC rows, triage filters and disposes polling on route exit',async(t)=>{
 const {scope,document}=env();let calls=[];
 t.after(()=>scope.AlertaContatos.desmontar());
 scope.AlertaSupabaseClient={rpc:async(name,args)=>{calls.push([name,args]);return {data:{items:[contact],total:1,page:1,config,categories:[{key:'relato',position:2,label:'Relatar ocorrência'}]}};}};
 scope.AlertaContatos.montar({target:document.getElementById('page'),db:{municipioAtivo:()=>({id:'city'}),pode:()=>true},onEdit:()=>{}});await tick();
 assert.equal(document.querySelector('h1').textContent,config.title);assert.equal(document.querySelectorAll('tbody tr').length,1);
 assert.equal(calls[0][0],'ma_contatos_listar');assert.equal(calls[0][1].municipio,'city');
 assert.equal(document.querySelector('[data-new]').getAttribute('data-new'),'voluntarios');
 scope.AlertaContatos.desmontar();
});
test('service signs private citizen photos and cannot accept arbitrary buckets',async()=>{
 const {scope}=env();const calls=[];
 const service=scope.AlertaContatosServico.criar({storage:{from:b=>({createSignedUrl:async(p,t)=>{calls.push([b,p,t]);return {data:{signedUrl:'https://example.invalid/signed'}};}})}},'city');
 await service.imagem({bucket:'ma-whatsapp',path:'channel/1.png'});assert.deepEqual(calls,[['ma-whatsapp','channel/1.png',120]]);
 await assert.rejects(service.imagem({bucket:'public',path:'x'}));
});
