const {test,expect}=require('@playwright/test');
const {createHash,randomUUID}=require('node:crypto');
const password=' Senha de teste 2026! ';
let service,adminToken;
async function assets(context){await context.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',route=>route.fulfill({path:require.resolve('leaflet/dist/leaflet.js'),contentType:'text/javascript'}));}
test.beforeEach(async({context,request})=>{await assets(context);await request.get('/test/mail/fail?value=0');});
async function requestJson(request,path,body,token=service){
 const response=await request.post(path,{headers:{Authorization:'Bearer '+token,apikey:token},data:body});
 const result=await response.json();if(!response.ok())throw Error(path+': '+JSON.stringify(result));return result;
}
async function rpc(request,name,args,token=adminToken){return requestJson(request,'/rest/v1/rpc/'+name,args,token);}
async function register(request,email){
 const id=randomUUID();const saved=await rpc(request,'ma_colaborador_salvar',{municipio:'maringa',identificador:id,versao_esperada:null,ficha:{nome:'Colaborador de teste',email,telefone:'44999999999',endereco:'Endereço de teste',bairro:'Bairro de teste',cargo:'Apoio',funcao:'operador',horarios:[]},acesso:{papel:'leitor',colecoes:['eventos','incidentes'],situacao:'pendente'}});return{id,saved};
}
async function send(request,person,command=randomUUID()){
 return request.post('/functions/v1/ma-colaboradores-acesso',{headers:{Authorization:'Bearer '+adminToken},data:{acao:'enviar',municipio:'maringa',colaborador:person.id,versao:person.saved.versao,comando:command}});
}
async function mailLink(request,email,firstAccess=true){const response=await request.get('/test/mails');const mails=await response.json();const mail=mails.filter(x=>x.to.includes(email)).at(-1);expect(mail).toBeTruthy();const link=mail.text.match(/href="([^\"]+)"/)[1].replace(/&amp;/g,'&');if(firstAccess)expect(link).toContain('auth_hash=');return link;}
test.beforeAll(async({request})=>{
 const keys=await(await request.get('/test/keys')).json();service=keys.service;
 const created=await request.post('/auth/v1/admin/users',{headers:{Authorization:'Bearer '+service},data:{email:'administrador@example.invalid',password,email_confirm:true}});expect([200,422],await created.text()).toContain(created.status());
 const auth=await requestJson(request,'/auth/v1/token?grant_type=password',{email:'administrador@example.invalid',password});adminToken=auth.access_token;
});
async function adminSession(page){
 await page.goto('/acesso/');
 await page.evaluate(async({token,service,password})=>{
  const c=window.supabase.createClient('http://127.0.0.1:8785','sb_publishable_test',{auth:{storageKey:'maringa-supabase-auth-v1'}});
  const {error}=await c.auth.signInWithPassword({email:'administrador@example.invalid',password});if(error)throw error;
 },{token:adminToken,service,password});
}
test('admin cadastra ficha inteira; e-mail só depois; primeiro acesso e login real com senha',async({page,browser,request},info)=>{
 const email='novo-'+info.project.name+'-'+randomUUID()+'@example.invalid';
 await adminSession(page);await page.goto('/colaboradores/?municipio=maringa');
 await page.getByRole('button',{name:'Novo colaborador',exact:true}).click();
 await page.getByLabel('Nome completo').fill('Pessoa nova de homologação');await page.getByLabel('E-mail de acesso').fill(email);
 await page.getByLabel('Telefone',{exact:true}).fill('44999999999');await page.getByLabel('Endereço',{exact:true}).fill('Rua de homologação');await page.getByLabel('Bairro',{exact:true}).fill('Centro');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByLabel('Cargo',{exact:true}).fill('Apoio operacional');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:'Adicionar horário'}).click();
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 expect((await(await request.get('/test/mails')).json()).filter(x=>x.to.includes(email))).toHaveLength(0);
 await page.locator('#editor').screenshot({path:'.test-results/acesso/cadastro-'+info.project.name+'.png'});
 await page.getByRole('button',{name:'Salvar e enviar acesso',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Cadastro salvo',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('aceitou o envio');
 const ctx=await rpc(request,'ma_colaboradores_contexto',{municipio:'maringa'});const saved=ctx.colaboradores.find(x=>x.dados.email===email);expect(saved.dados.horarios).toHaveLength(1);expect(saved.acesso.situacao).toBe('pendente');
 const link=await mailLink(request,email);const fresh=await browser.newContext({viewport:info.project.use.viewport,isMobile:!!info.project.use.isMobile,hasTouch:!!info.project.use.hasTouch});await assets(fresh);const recipient=await fresh.newPage();
 await recipient.goto(link);await expect(recipient.getByRole('heading',{name:'Definir sua senha'})).toBeVisible();expect(recipient.url()).not.toContain('token=');
 await recipient.getByLabel('Senha',{exact:true}).fill(password);await recipient.getByLabel('Confirme a senha').fill('diferente');await recipient.getByRole('button',{name:'Salvar senha e entrar'}).click();await expect(recipient.getByRole('alert')).toHaveText('As senhas não conferem.');
 await recipient.getByLabel('Confirme a senha').fill(password);await recipient.getByRole('button',{name:'Salvar senha e entrar'}).click();
 await expect(recipient).toHaveURL(/\/gestao\/\?municipio=maringa/);await expect(recipient.locator('#session-anchor')).toHaveText(email);await expect(recipient.locator('#backend-acesso')).toHaveCount(0);
 const logged=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});expect(logged.access_token).toBeTruthy();
 const caps=await rpc(request,'ma_minhas_capacidades',{},logged.access_token);expect(caps.maringa.eventos.ler).toBe(true);expect(caps.maringa.eventos.gravar).toBe(false);expect(caps.maringa.usuarios.ler).toBe(false);
 const again=await rpc(request,'ma_colaboradores_contexto',{municipio:'maringa'});expect(again.colaboradores.filter(x=>x.dados.email===email)).toHaveLength(1);expect(again.colaboradores.find(x=>x.dados.email===email).acesso.situacao).toBe('ativo');
 await recipient.goto(link);await expect(recipient.getByRole('heading',{name:'Entrar e ativar acesso'})).toBeVisible();await recipient.getByLabel('Senha',{exact:true}).fill(password);await recipient.getByRole('button',{name:'Entrar e ativar',exact:true}).click();await expect(recipient).toHaveURL(/\/gestao\//);
 await expect(recipient.locator('#session-anchor')).toHaveText(email);
 await recipient.evaluate(()=>{void window.AlertaSupabaseClient.auth.signOut({scope:'local'});});
 await expect(recipient.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
 await recipient.getByLabel('E-mail',{exact:true}).fill(email);await recipient.getByLabel('Senha',{exact:true}).fill(password);
 await recipient.getByRole('button',{name:'Entrar',exact:true}).click();await expect(recipient.locator('#session-anchor')).toHaveText(email);
 await expect(recipient.locator('#backend-acesso')).toHaveCount(0);
 await fresh.close();
});
test('falha de entrega preserva a ficha; repetição usa um envio; conta existente não perde senha',async({request,page},info)=>{
 const email='existente-'+info.project.name+'-'+randomUUID()+'@example.invalid';await requestJson(request,'/auth/v1/admin/users',{email,password,email_confirm:true});
 const person=await register(request,email),command=randomUUID();await request.get('/test/mail/fail?value=1');
 const failed=await send(request,person,command);expect(failed.status()).toBe(502);
 const ctx=await rpc(request,'ma_colaboradores_contexto',{municipio:'maringa'});expect(ctx.colaboradores.find(x=>x.dados.id===person.id).envio.estado).toBe('falhou');
 await request.get('/test/mail/fail?value=0');expect((await send(request,person,command)).ok()).toBe(true);expect((await send(request,person,command)).ok()).toBe(true);
 const mails=await(await request.get('/test/mails')).json();expect(mails.filter(x=>x.to.includes(email))).toHaveLength(1);
 await adminSession(page);await page.goto(await mailLink(request,email));await expect(page.getByRole('heading',{name:'Entrar e ativar acesso'})).toBeVisible();
 await page.getByLabel('Senha',{exact:true}).fill('senha errada');await page.getByRole('button',{name:'Entrar e ativar',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Confira sua senha');
 await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar e ativar',exact:true}).click();await expect(page).toHaveURL(/\/gestao\//);
 const logged=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});expect(logged.access_token).toBeTruthy();
});
test('link revogado e inválido são recusados; suspensão corta sessão já emitida',async({request,page},info)=>{
 const email='revogado-'+info.project.name+'-'+randomUUID()+'@example.invalid';const person=await register(request,email);expect((await send(request,person)).ok()).toBe(true);const link=await mailLink(request,email);
 await rpc(request,'ma_colaborador_salvar',{municipio:'maringa',identificador:person.id,ficha:{cargo:'Cargo atualizado'},acesso:{papel:'leitor',colecoes:['eventos'],situacao:'pendente'},versao_esperada:1});
 await page.goto(link);await expect(page.getByRole('alert')).toContainText('inválido ou expirado');
 await page.goto('/acesso/#token='+ '0'.repeat(64));await expect(page.getByRole('alert')).toContainText('inválido ou expirado');
 const activeEmail='suspenso-'+info.project.name+'-'+randomUUID()+'@example.invalid';await requestJson(request,'/auth/v1/admin/users',{email:activeEmail,password,email_confirm:true});const active=await register(request,activeEmail);await send(request,active);
 const activeLink=await mailLink(request,activeEmail);const token=new URLSearchParams(new URL(activeLink).hash.slice(1)).get('token');const logged=await requestJson(request,'/auth/v1/token?grant_type=password',{email:activeEmail,password});
 await rpc(request,'ma_acesso_ativar',{hash_token:createHash('sha256').update(token).digest('hex')},logged.access_token);
 await rpc(request,'ma_colaborador_salvar',{municipio:'maringa',identificador:active.id,ficha:{},acesso:{papel:'leitor',colecoes:['eventos'],situacao:'suspenso'},versao_esperada:1});
 const caps=await rpc(request,'ma_minhas_capacidades',{},logged.access_token);expect(caps.maringa).toBeUndefined();
});
test('conta existente sem confirmação entra pelo link sem trocar a senha',async({request,page},info)=>{
 const email='confirmar-'+info.project.name+'-'+randomUUID()+'@example.invalid';await requestJson(request,'/auth/v1/admin/users',{email,password,email_confirm:false});const person=await register(request,email);expect((await send(request,person)).ok()).toBe(true);
 const link=await mailLink(request,email);await page.goto(link);await expect(page.getByRole('heading',{name:'Entrar e ativar acesso'})).toBeVisible();
 await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar e ativar',exact:true}).click();await expect(page).toHaveURL(/\/gestao\//);
 const login=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});expect(login.access_token).toBeTruthy();
});
test('falha na renovação da sessão preserva ativação e permite login posterior',async({request,page},info)=>{
 const email='refresh-'+info.project.name+'-'+randomUUID()+'@example.invalid';const person=await register(request,email);await send(request,person);await page.goto(await mailLink(request,email));
 await page.route('**/auth/v1/token?grant_type=refresh_token',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'refresh_token_not_found',msg:'Refresh token not found'})}));
 await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByLabel('Confirme a senha').fill(password);await page.getByRole('button',{name:'Salvar senha e entrar'}).click();
 await expect(page.getByRole('heading',{name:'Acesso ativado'})).toBeVisible();
 const login=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});expect(login.access_token).toBeTruthy();const caps=await rpc(request,'ma_minhas_capacidades',{},login.access_token);expect(caps.maringa.eventos.ler).toBe(true);
});

test('envios concorrentes usam uma entrega SMTP e preservam o cadastro',async({request},info)=>{
 const email='simultaneo-'+info.project.name+'-'+randomUUID()+'@example.invalid',person=await register(request,email),command=randomUUID();
 const results=await Promise.all(Array.from({length:4},()=>send(request,person,command)));
 for(const result of results)expect([200,202]).toContain(result.status());
 expect((await send(request,person,command)).status()).toBe(200);
 const mails=await(await request.get('/test/mails')).json();expect(mails.filter(x=>x.to.includes(email))).toHaveLength(1);
});

for(const lostResponse of [false,true])test('falha ao salvar senha '+(lostResponse?'com resposta perdida':'antes da gravação')+' pode ser retomada',async({request,page},info)=>{
 const email='senha-retry-'+info.project.name+'-'+randomUUID()+'@example.invalid',person=await register(request,email);
 await send(request,person);let failed=false,verifications=0;
 await page.route('**/auth/v1/verify',async route=>{verifications++;await route.continue();});
 await page.route('**/auth/v1/user',async route=>{
  if(route.request().method()==='PUT'&&!failed){failed=true;if(lostResponse)await route.fetch();await route.fulfill({status:503,contentType:'application/json',body:'{"msg":"Falha de teste"}'});return;}
  await route.continue();
 });
 const link=await mailLink(request,email);await page.goto(link);await expect(page.getByRole('heading',{name:'Definir sua senha'})).toBeVisible();expect(verifications).toBe(0);
 await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByLabel('Confirme a senha').fill(password);await page.getByRole('button',{name:'Salvar senha e entrar'}).click();
 await expect(page.getByRole('alert')).toContainText('Não foi possível salvar a senha');expect(verifications).toBe(1);
 if(!lostResponse){
  const token=new URLSearchParams(new URL(link).hash.slice(1)).get('token');
  const activation=await page.evaluate(async token=>{
   const c=window.supabase.createClient('http://127.0.0.1:8785','sb_publishable_test',{auth:{storageKey:'maringa-supabase-auth-v1'}});
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
   return (await c.rpc('ma_acesso_ativar',{hash_token:digest})).error?.message;
  },token);
  expect(activation).toContain('Entre com sua senha');
 }
 await page.getByRole('button',{name:'Salvar senha e entrar'}).click();
 await expect(page).toHaveURL(/\/gestao\//);expect(verifications).toBe(1);
 const login=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});expect(login.access_token).toBeTruthy();
});

test('confirmação nativa inválida não grava senha nem ativa a ficha',async({request,page},info)=>{
 const email='prova-'+info.project.name+'-'+randomUUID()+'@example.invalid',person=await register(request,email);await send(request,person);
 const link=new URL(await mailLink(request,email)),params=new URLSearchParams(link.hash.slice(1));params.set('auth_hash','0'.repeat(64));link.hash=params.toString();
 await page.goto(link.href);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByLabel('Confirme a senha').fill(password);await page.getByRole('button',{name:'Salvar senha e entrar'}).click();
 await expect(page.getByRole('alert')).toContainText('confirmação venceu ou já foi utilizado');
 const ctx=await rpc(request,'ma_colaboradores_contexto',{municipio:'maringa'});expect(ctx.colaboradores.find(x=>x.dados.id===person.id).acesso.situacao).toBe('pendente');
});

test('recuperação por SMTP nativo permite definir outra senha e entrar normalmente',async({request,page},info)=>{
 const email='recuperacao-'+info.project.name+'-'+randomUUID()+'@example.invalid';await requestJson(request,'/auth/v1/admin/users',{email,password,email_confirm:true});
 await requestJson(request,'/auth/v1/recover?redirect_to='+encodeURIComponent('http://127.0.0.1:8785/acesso/?recuperar=1'),{email});
 await page.goto(await mailLink(request,email,false));await expect(page.getByRole('heading',{name:'Definir nova senha'})).toBeVisible();
 const newPassword=password+' nova';await page.getByLabel('Senha',{exact:true}).fill(newPassword);await page.getByLabel('Confirme a senha').fill(newPassword);await page.getByRole('button',{name:'Salvar senha',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Senha salva',exact:true})).toBeVisible();
 expect((await requestJson(request,'/auth/v1/token?grant_type=password',{email,password:newPassword})).access_token).toBeTruthy();
 const old=await request.post('/auth/v1/token?grant_type=password',{data:{email,password}});expect(old.ok()).toBe(false);
});

test('sessão normal não recupera senha por URL nem contorna a proteção na API',async({page,request},info)=>{
 const email='e1-sessao-'+info.project.name+'-'+randomUUID()+'@example.invalid';
 await requestJson(request,'/auth/v1/admin/users',{email,password,email_confirm:true});
 const signed=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});
 await page.goto('/acesso/');
 await page.evaluate(async session=>{
  const client=window.supabase.createClient('http://127.0.0.1:8785','sb_publishable_test',{auth:{storageKey:'maringa-supabase-auth-v1'}});
  const result=await client.auth.setSession(session);if(result.error)throw result.error;
 },signed);
 await page.goto('/acesso/?recuperar=1');
 await expect(page.getByRole('alert')).toContainText('sessão comum');await expect(page.locator('#senha')).toHaveCount(0);
 const forged=new URLSearchParams({access_token:signed.access_token,refresh_token:signed.refresh_token,token_type:'bearer',type:'recovery'});
 await page.goto('/acesso/?recuperar=1#'+forged);
 await expect(page.getByRole('alert')).toContainText('recuperação é inválida');await expect(page.locator('#senha')).toHaveCount(0);
 const change=(body)=>request.put('/auth/v1/user',{headers:{Authorization:'Bearer '+signed.access_token},data:body});
 const newPassword=password+' E1';
 const withoutProof=await change({password:newPassword,data:{amr:[{method:'recovery'}]}});
 expect(withoutProof.status()).toBe(400);expect((await withoutProof.json()).error_code).toBe('current_password_required');
 const wrongProof=await change({password:newPassword,current_password:'senha incorreta'});
 expect(wrongProof.status()).toBe(400);expect((await wrongProof.json()).error_code).toBe('current_password_invalid');
 expect((await requestJson(request,'/auth/v1/token?grant_type=password',{email,password})).access_token).toBeTruthy();
 const correct=await change({password:newPassword,current_password:password});expect(correct.ok(),await correct.text()).toBe(true);
 expect((await requestJson(request,'/auth/v1/token?grant_type=password',{email,password:newPassword})).access_token).toBeTruthy();
 expect((await(await request.get('/test/mails')).json()).filter(x=>x.to.includes(email))).toHaveLength(0);
});

test('Auth rejeita senha abaixo da política mesmo sem validação do formulário',async({request},info)=>{
 const email='e1-politica-'+info.project.name+'-'+randomUUID()+'@example.invalid';
 const weakCreation=await request.post('/auth/v1/admin/users',{headers:{Authorization:'Bearer '+service},data:{email,password:'12345678901',email_confirm:true}});
 expect(weakCreation.status()).toBe(422);expect((await weakCreation.json()).error_code).toBe('weak_password');
 await requestJson(request,'/auth/v1/admin/users',{email,password,email_confirm:true});
 const session=await requestJson(request,'/auth/v1/token?grant_type=password',{email,password});
 const weakUpdate=await request.put('/auth/v1/user',{headers:{Authorization:'Bearer '+session.access_token},data:{password:'12345678901',current_password:password}});
 expect(weakUpdate.status()).toBe(422);expect((await weakUpdate.json()).error_code).toBe('weak_password');
 expect((await requestJson(request,'/auth/v1/token?grant_type=password',{email,password})).access_token).toBeTruthy();
});

test('cadastro via API rejeita formato inválido e e-mail duplicado sem perder a ficha',async({request},info)=>{
 const email='e1-ficha-'+info.project.name+'-'+randomUUID()+'@example.invalid',person=await register(request,email);
 const access={papel:'leitor',colecoes:['eventos'],situacao:'pendente'};
 for(const ficha of [{telefone:'x'},{documento:{}},{nascimento:'3000-99-99'},{campo_inesperado:true}]){
  const response=await request.post('/rest/v1/rpc/ma_colaborador_salvar',{headers:{Authorization:'Bearer '+adminToken},data:{municipio:'maringa',identificador:person.id,versao_esperada:1,ficha,acesso:access}});
  expect(response.ok()).toBe(false);expect((await response.json()).code).toBe('23514');
 }
 const duplicate=await request.post('/rest/v1/rpc/ma_colaborador_salvar',{headers:{Authorization:'Bearer '+adminToken},data:{municipio:'maringa',identificador:randomUUID(),versao_esperada:null,ficha:{...person.saved.dados,email:' '+email.toUpperCase()+' '},acesso:access}});
 expect(duplicate.ok()).toBe(false);
 const context=await rpc(request,'ma_colaboradores_contexto',{municipio:'maringa'}),rows=context.colaboradores.filter(x=>x.dados.email===email);
 expect(rows).toHaveLength(1);expect(rows[0].versao).toBe(1);expect(rows[0].dados.telefone).toBe('44999999999');
});
