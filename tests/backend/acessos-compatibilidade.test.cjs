const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
test('vínculos atuais abrem o editor existente; novo cadastro só aparece quando habilitado',async()=>{
 for(const cadastroAdministrativo of [false,true]){
  const {document,window}=parseHTML('<html><body><main></main></body></html>');
  window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.focus=function(){};
  const scope={MARINGA_SUPABASE:{cadastroAdministrativo}};
  for(const name of ['ui','acessos'])vm.runInNewContext(fs.readFileSync('src/plataforma/'+name+'.js','utf8'),scope);
  const el=document.querySelector('main');
  const ctx={el,state:{},show(html){el.innerHTML=html;return true;},render(){},service:{remoto:true,detalhe:async()=>({id:'maringa',nome:'Maringá',status:'ativa'}),acessos:async()=>[]}};
  await scope.AlertaPlataformaUI.acessos(ctx,'maringa');
  if(cadastroAdministrativo){assert.equal(el.querySelector('a').getAttribute('href'),'../colaboradores/?municipio=maringa');assert.equal(Boolean(el.querySelector('[data-new-access]')),false);}
  else{assert.equal(Boolean(el.querySelector('a[href*="colaboradores"]')),false);el.querySelector('[data-new-access]').click();assert.equal(Boolean(el.querySelector('#access-form')),true);}
 }
});
