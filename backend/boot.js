/* Login primeiro; controladores existentes só iniciam após carregar o repositório autorizado. */
(async function(){
'use strict';
const demo=new URLSearchParams(location.search).get('modo')==='demo';
const gate=document.createElement('div');gate.id='backend-acesso';
const scripts=[...document.querySelectorAll('script[type="application/x-maringa-modulo"]')];
const entry=document.currentScript?.dataset.area||'gestao';
function status(kind,message){const bar=document.getElementById('backend-bar');if(bar){bar.dataset.status=kind;bar.querySelector('span').textContent=message||({salvando:'Salvando no Supabase…',salvo:'Conectado · cadastros no Supabase',erro:'Não foi possível salvar. Revise o aviso e tente novamente.'}[kind]||'Conectado ao Supabase');}}
async function start(){
 for(const item of scripts)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=item.src;s.onload=resolve;s.onerror=()=>reject(Error('Não foi possível carregar '+new URL(item.src).pathname));document.body.appendChild(s);});
 document.documentElement.classList.remove('backend-pendente');gate.remove();
 // Os mapas iniciam ocultos pelo bloqueio de acesso; recalcular ao torná-los visíveis.
 window.dispatchEvent(new Event('resize'));
 if(window.AlertaNuvem?.ativo){
  const anchor=document.getElementById('session-anchor');if(anchor)anchor.textContent=window.AlertaNuvem.email;
  for(const a of document.querySelectorAll('a[href]')){const u=new URL(a.href,location.href);if(u.origin===location.origin&&/\/atendimento\//.test(u.pathname)){a.title='Demonstração local · sem gravação no Supabase';const label=a.querySelector('.map-name');if(label)label.textContent+=' · demonstração';}}
  const bar=document.createElement('div');bar.id='backend-bar';bar.innerHTML='<span>Conectado · cadastros no Supabase</span><button type="button" data-refresh>Atualizar</button><button type="button" data-logout>Sair</button>';document.body.appendChild(bar);
  bar.querySelector('[data-refresh]').onclick=()=>location.reload();
  bar.querySelector('[data-logout]').onclick=async()=>{await client.auth.signOut({scope:'local'});location.reload();};
 }else{const bar=document.createElement('div');bar.id='backend-bar';bar.textContent='Demonstração local · nenhum dado enviado ao Supabase';document.body.appendChild(bar);}
}
// Manter as duas origens de dados separadas ao navegar.
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;if(demo&&(/\/(gestao|plataforma|mapas)\//.test(url.pathname)||/\/index\.html$/.test(url.pathname))){url.searchParams.set('modo','demo');a.href=url.href;}},true);
let client;
try{
 if(demo){await start();return;}
 const config=window.MARINGA_SUPABASE;
 if(!config?.publishableKey?.startsWith('sb_publishable_'))throw Error('Configuração pública do Supabase ausente.');
 client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'maringa-supabase-auth-v1',flowType:'pkce',detectSessionInUrl:true}});
 window.AlertaSupabaseClient=client;
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(session){
  const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user)throw authError||Error('Sessão inválida.');
  let remote;
  if(entry==='plataforma'){
   const result=await client.rpc('ma_meu_perfil');if(result.error)throw result.error;
   if(!result.data?.admin_plataforma)throw Error('Esta área requer acesso de Administração Geral.');
   remote={perfil:result.data,admin:AlertaAdminRemoto.criar(client)};
  }else {
   const municipioId=new URLSearchParams(location.search).get('municipio')||sessionStorage.getItem('alerta_contexto_municipal_demo_v1')||null;
   remote=await AlertaRepositorioSupabase.criar({client,dados:AlertaGestaoDados,municipioId,onStatus:status});
  }
  window.AlertaNuvem={...remote,ativo:true,email:user.email};
  if(remote.repositorio){
   const cityKey='alerta_contexto_municipal_demo_v1',available=remote.repositorio().municipios();
   const requested=new URLSearchParams(location.search).get('municipio');
   if(requested&&!available.some(p=>p.id===requested))throw Error('Sem acesso à prefeitura solicitada.');
   if(requested)sessionStorage.setItem(cityKey,requested);
   if(!available.some(p=>p.id===sessionStorage.getItem(cityKey)))sessionStorage.setItem(cityKey,available[0].id);
  }
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){window.AlertaNuvem=null;location.reload();}});
  await start();return;
 }
 showLogin();
}catch(error){showLogin(error.message||'Falha ao conectar ao Supabase.');}
function showLogin(error=''){
 document.documentElement.classList.add('backend-pendente');
 gate.innerHTML='<section><small>GESTÃO MUNICIPAL</small><h1>Acesso à gestão municipal</h1><p>Entre com seu e-mail autorizado. Você receberá um link de acesso, sem precisar criar uma senha.</p><form><label for="backend-email">E-mail</label><input id="backend-email" type="email" autocomplete="email" required><button type="submit">Receber link de acesso</button></form><p role="alert"></p><button type="button" id="backend-reset" hidden>Sair da sessão atual</button><a id="backend-demo">Abrir demonstração local</a></section>';
 gate.querySelector('[role=alert]').textContent=error;
 if(entry==='plataforma'){
  gate.querySelector('small').textContent='ADMINISTRAÇÃO GERAL';
  gate.querySelector('h1').textContent='Acesso à administração do sistema';
 }
 const url=new URL(location.href);url.searchParams.set('modo','demo');url.hash='';gate.querySelector('a').href=url.href;
 gate.querySelector('#backend-reset').hidden=!error;
 gate.querySelector('#backend-reset').onclick=async()=>{if(client)await client.auth.signOut({scope:'local'});location.reload();};
 gate.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button'),feedback=gate.querySelector('[role=alert]');button.disabled=true;
  try{if(!client)throw Error('Conexão indisponível. Atualize a página.');const redirect=new URL(location.href);redirect.hash='';redirect.search='';const {error}=await client.auth.signInWithOtp({email:gate.querySelector('input').value.trim(),options:{emailRedirectTo:redirect.href}});if(error)throw error;feedback.textContent='Link enviado. Abra seu e-mail neste navegador para entrar.';}
  catch(err){feedback.textContent=err.message;}finally{button.disabled=false;}
 };
 document.body.appendChild(gate);gate.querySelector('input').focus();
}
})();
