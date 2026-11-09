/* Login primeiro; controladores existentes só iniciam após carregar o repositório autorizado. */
(async function(){
'use strict';
const gate=document.createElement('div');gate.id='backend-acesso';
const scripts=[...document.querySelectorAll('script[type="application/x-maringa-modulo"]')];
const entry=document.currentScript?.dataset.area||'gestao';
const mapa=entry==='evento'||entry==='mapas';
const permissionsUrl=new URL('permissoes-ui.js',document.currentScript.src).href;
// Antecipar somente arquivos públicos. Os módulos só executam após sessão,
// regras e permissões validadas; a ordem de suas dependências é preservada.
if(mapa)for(const src of [...scripts.map(item=>item.src),permissionsUrl]){
 const link=document.createElement('link');link.rel='preload';link.as='script';link.href=src;document.head.appendChild(link);
}
function carregarScript(item){return new Promise((resolve,reject)=>{
 const s=document.createElement('script');s.async=false;s.src=item.src;
 s.onload=resolve;s.onerror=()=>reject(Error('Não foi possível carregar '+new URL(item.src).pathname));document.body.appendChild(s);
});}
function aguardarEstilos(){return Promise.all([...document.querySelectorAll('link[data-mapa-estilo]')].map(link=>new Promise((resolve,reject)=>{
 const falhou=()=>reject(Error('Não foi possível preparar o mapa. Recarregue a página.'));
 if(link.dataset.falhou)return falhou();
 if(link.sheet)return resolve();
 link.addEventListener('load',resolve,{once:true});link.addEventListener('error',falhou,{once:true});
})));}
function encerrarCarregamento(){document.getElementById('mapa-carregando')?.remove();}
async function start(){
 if(mapa){await aguardarEstilos();await Promise.all(scripts.map(carregarScript));}
 else for(const item of scripts)await carregarScript(item);
 document.documentElement.classList.remove('backend-pendente');gate.remove();encerrarCarregamento();
 // Os mapas iniciam ocultos pelo bloqueio de acesso; recalcular ao torná-los visíveis.
 window.dispatchEvent(new Event('resize'));
 if(window.AlertaNuvem?.ativo){
  const anchor=document.getElementById('session-anchor');if(anchor){anchor.textContent=window.AlertaNuvem.email;anchor.classList.add('backend-session');anchor.title=window.AlertaNuvem.email;}
  for(const a of document.querySelectorAll('a[href]')){const u=new URL(a.href,location.href);if(u.origin===location.origin&&/\/atendimento\//.test(u.pathname)){a.hidden=true;a.removeAttribute('href');}}
 }
}
let client;
try{

 const config=window.MARINGA_SUPABASE;
 if(entry==='colaboradores'&&config?.cadastroAdministrativo!==true){location.replace(new URL('../gestao/#integrantes',permissionsUrl).href);return;}
 if(!config?.publishableKey?.startsWith('sb_publishable_'))throw Error('O acesso está indisponível. Tente novamente mais tarde.');
 // Convites e links administrativos retornam sessão no fragmento; o login normal usa PKCE.
 // O SDK valida a sessão e remove o fragmento. Nenhum token é copiado pela aplicação.
 const retorno=new URLSearchParams(new URL(location.href).hash.slice(1));
 const fluxo=retorno.get('access_token')&&retorno.get('refresh_token')&&retorno.get('token_type')==='bearer'?'implicit':'pkce';
 client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'maringa-supabase-auth-v1',flowType:fluxo,detectSessionInUrl:true}});
 window.AlertaSupabaseClient=client;
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(session){
  const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user)throw authError||Error('Sessão inválida.');
  const cityKey='alerta_contexto_municipal_demo_v1';
  let remote;
  if(entry==='plataforma'||entry==='colaboradores'){
   const result=await client.rpc('ma_meu_perfil');if(result.error)throw result.error;
   if(entry==='plataforma'&&!result.data?.admin_plataforma)throw Error('Esta área requer acesso de Administração Geral.');
   if(entry==='plataforma')remote={perfil:result.data,admin:AlertaAdminRemoto.criar(client)};
   else{
    const solicitado=new URLSearchParams(location.search).get('municipio')||sessionStorage.getItem(cityKey);
    let query=client.from('ma_prefeituras').select('id,nome:dados->>nome').order('id');if(solicitado)query=query.eq('id',solicitado);
    const cities=await query.limit(1);if(cities.error)throw cities.error;
    const municipio=cities.data?.[0]?.id;if(!municipio)throw Error('Prefeitura indisponível para este acesso.');
    const ctx=await client.rpc('ma_colaboradores_contexto',{municipio});if(ctx.error)throw ctx.error;
    remote={perfil:result.data,colaboradores:ctx.data,municipios:cities.data.map(x=>({id:x.id,dados:{nome:x.nome}}))};
   }
  }else{
   const [contrato,operacao]=await Promise.all([
    client.from('ma_configuracao').select('documento').eq('id','interface').single(),
    client.from('ma_configuracao').select('documento').eq('id','operacao').single()
   ]);
   if(contrato.error||!contrato.data)throw Error('Regras do servidor indisponíveis.');
   AlertaGestaoDados.aplicarConfiguracao(contrato.data.documento);
   if(operacao.error||!operacao.data)throw Error('Regras operacionais indisponíveis.');
   window.AlertaRegrasOperacionais=operacao.data.documento;
   const municipioId=new URLSearchParams(location.search).get('municipio')||sessionStorage.getItem(cityKey)||null;
   remote=await AlertaRepositorioSupabase.criar({client,dados:AlertaGestaoDados,municipioId});
   sessionStorage.setItem(cityKey,remote.repositorio().municipioAtivo().id);
  }
  window.AlertaNuvem={...remote,ativo:true,email:user.email};
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){window.AlertaNuvem=null;location.reload();}});
  if(entry!=='plataforma'&&entry!=='colaboradores'){
   await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=permissionsUrl;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});
   AlertaPermissoesUI.instalar({document,db:remote.repositorio({municipioId:sessionStorage.getItem(cityKey)}),location,MutationObserver});
  }
  if(remote.atualizarPermissoes)window.addEventListener('focus',()=>remote.atualizarPermissoes().then(changed=>{if(changed)location.reload();else window.dispatchEvent(new Event('backend:permissoes'));}).catch(()=>location.reload()));
  await start();return;
 }
 showLogin();
}catch(error){showLogin(error.message||'Não foi possível conectar. Tente novamente.');}
function showLogin(error=''){
 if(window.MARINGA_SUPABASE?.cadastroAdministrativo!==true)return showLoginLink(error);
 encerrarCarregamento();
 document.documentElement.classList.add('backend-pendente');
 gate.innerHTML='<section><small>GESTÃO MUNICIPAL</small><h1>Acesso à gestão municipal</h1><p>Entre com o e-mail e a senha da sua conta. Seu cadastro é feito pelo administrador.</p><form><label for="backend-email">E-mail</label><input id="backend-email" type="email" autocomplete="username" required><label for="backend-senha">Senha</label><input id="backend-senha" type="password" autocomplete="current-password" required><button type="submit">Entrar</button></form><button type="button" id="backend-recuperar">Esqueci minha senha</button><p role="alert"></p><button type="button" id="backend-reset" hidden>Sair da sessão atual</button></section>';
 gate.querySelector('[role=alert]').textContent=error;
 if(entry==='plataforma'){gate.querySelector('small').textContent='ADMINISTRAÇÃO GERAL';gate.querySelector('h1').textContent='Acesso à administração do sistema';}

 gate.querySelector('#backend-reset').hidden=!error;
 gate.querySelector('#backend-reset').onclick=async()=>{if(client)await client.auth.signOut({scope:'local'});location.reload();};
 gate.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button'),feedback=gate.querySelector('[role=alert]');button.disabled=true;
  try{if(!client)throw Error('Conexão indisponível. Atualize a página.');const {error}=await client.auth.signInWithPassword({email:gate.querySelector('#backend-email').value.trim(),password:gate.querySelector('#backend-senha').value});if(error)throw Error('E-mail ou senha não conferem, ou o acesso está indisponível.');location.reload();}
  catch(err){feedback.textContent=err.message;}finally{button.disabled=false;}
 };
 gate.querySelector('#backend-recuperar').onclick=async()=>{
  const email=gate.querySelector('#backend-email'),feedback=gate.querySelector('[role=alert]'),button=gate.querySelector('#backend-recuperar');
  if(!email.reportValidity())return;button.disabled=true;
  try{
   const config=window.MARINGA_SUPABASE,redirect=new URL('../acesso/?recuperar=1',permissionsUrl);
   const recovery=window.supabase.createClient(config.url,config.publishableKey,{auth:{flowType:'implicit',persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
   const {error}=await recovery.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:redirect.href});if(error)throw Error('Não foi possível enviar a recuperação agora. Tente novamente mais tarde.');
   feedback.textContent='Se o e-mail estiver cadastrado, você receberá as instruções para recuperar a senha.';
  }catch(err){feedback.textContent=err.message;}finally{button.disabled=false;}
 };
 document.body.appendChild(gate);gate.querySelector('input').focus();
}
function showLoginLink(error=''){
 encerrarCarregamento();
 document.documentElement.classList.add('backend-pendente');
 gate.innerHTML='<section><small>GESTÃO MUNICIPAL</small><h1>Acesso à gestão municipal</h1><p>Entre com seu e-mail autorizado. Você receberá um link de acesso, sem precisar criar uma senha.</p><form><label for="backend-email">E-mail</label><input id="backend-email" type="email" autocomplete="email" required><button type="submit">Receber link de acesso</button></form><p role="alert"></p><button type="button" id="backend-reset" hidden>Sair da sessão atual</button></section>';
 gate.querySelector('[role=alert]').textContent=error;
 if(entry==='plataforma'){gate.querySelector('small').textContent='ADMINISTRAÇÃO GERAL';gate.querySelector('h1').textContent='Acesso à administração do sistema';}

 gate.querySelector('#backend-reset').hidden=!error;
 gate.querySelector('#backend-reset').onclick=async()=>{if(client)await client.auth.signOut({scope:'local'});location.reload();};
 gate.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button'),feedback=gate.querySelector('[role=alert]');button.disabled=true;
  try{if(!client)throw Error('Conexão indisponível. Atualize a página.');const redirect=new URL(location.href);redirect.hash='';redirect.search='';const {error}=await client.auth.signInWithOtp({email:gate.querySelector('input').value.trim(),options:{emailRedirectTo:redirect.href}});if(error)throw error;feedback.textContent='Link enviado. Abra seu e-mail neste navegador para entrar.';}
  catch(err){feedback.textContent=err.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(err.message)?'O limite de envio de e-mails foi atingido. Seu cadastro continua ativo. Use o último link recebido ou tente novamente mais tarde.':err.message;}finally{button.disabled=false;}
 };
 document.body.appendChild(gate);gate.querySelector('input').focus();
}
})();
