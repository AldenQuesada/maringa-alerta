/* Ativação da ficha existente. Senha nunca é gravada em storage, logs ou estado persistente. */
(async function(){
'use strict';
const section=document.querySelector('section'),config=window.MARINGA_SUPABASE;
const url=new URL(location.href),token=new URLSearchParams(url.hash.slice(1)).get('token');
const recovery=url.searchParams.get('recuperar')==='1';
// Um novo link pode ser aberto na mesma aba já posicionada em /acesso/.
window.addEventListener('hashchange',()=>{if(new URLSearchParams(location.hash.slice(1)).has('token'))location.reload();});
if(token){history.replaceState(null,'',url.pathname);}
const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'maringa-supabase-auth-v1',flowType:recovery?'implicit':'pkce',detectSessionInUrl:recovery}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function service(acao,extra={}){
 const response=await fetch(config.url+'/functions/v1/ma-colaboradores-acesso',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({acao,token,...extra}),cache:'no-store'});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível concluir. Tente novamente.');return result;
}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
try{
 let preview;
 if(recovery){
  const {data,error}=await client.auth.getUser();if(error||!data.user)throw Error('Link de recuperação inválido ou expirado. Solicite uma nova recuperação na tela de entrada.');
  preview={email:data.user.email,nome:'',minimo_senha:12,conta_existente:false};
 }else{
  preview=await service('consultar');
  // Nunca aproveitar a sessão de outra pessoa nem ativar sem a senha desta conta.
  await client.auth.signOut({scope:'local'});
 }
 function render(){
  const existing=preview.conta_existente;
  section.innerHTML='<small>PRA SOMAR</small><h1>'+(recovery?'Definir nova senha':existing?'Entrar e ativar acesso':'Definir sua senha')+'</h1><p>'+esc(preview.nome)+'</p><p class="email">'+esc(preview.email)+'</p><p>'+(existing?'Use a senha da sua conta. Seu cadastro já está pronto.':'Seu cadastro já está pronto. Escolha uma senha com pelo menos '+preview.minimo_senha+' caracteres.')+'</p><form><label for="senha">Senha</label><input id="senha" type="password" autocomplete="'+(existing?'current-password':'new-password')+'" required '+(existing?'':'minlength="'+preview.minimo_senha+'" maxlength="128"')+'>'+(existing?'':'<label for="confirmacao">Confirme a senha</label><input id="confirmacao" type="password" autocomplete="new-password" required>')+'<button type="submit">'+(recovery?'Salvar senha':existing?'Entrar e ativar':'Salvar senha e entrar')+'</button><p role="alert"></p></form><p><a href="../gestao/">Voltar à entrada</a></p>';
  section.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const button=section.querySelector('button'),feedback=section.querySelector('[role=alert]');if(button.disabled)return;
   const password=section.querySelector('#senha').value;
   if(!existing&&password!==section.querySelector('#confirmacao').value){feedback.textContent='As senhas não conferem.';return;}
   button.disabled=true;feedback.textContent='Confirmando acesso…';
   try{
    if(recovery){const {error}=await client.auth.updateUser({password});if(error)throw Error('Não foi possível salvar a senha. Abra um novo link de recuperação e tente novamente.');await client.auth.signOut({scope:'local'});section.innerHTML='<h1>Senha salva</h1><p>Entre com seu e-mail e a nova senha.</p><a href="../gestao/">Entrar no Pra Somar</a>';return;}
    if(existing)await service('confirmar_email');
    if(!existing){const created=await service('criar_conta',{senha:password});if(created.conta_existente){preview.conta_existente=true;render();section.querySelector('[role=alert]').textContent='Esta conta já existe. Entre com sua senha; nenhuma senha foi substituída.';return;}}
    const {error}=await client.auth.signInWithPassword({email:preview.email,password});
    if(error){preview.conta_existente=true;render();section.querySelector('[role=alert]').textContent='Não foi possível entrar. Confira sua senha. Se você acabou de criá-la, use a mesma senha para tentar novamente.';return;}
    const {data:user,error:identityError}=await client.auth.getUser();if(identityError||user.user?.email?.toLowerCase()!==preview.email.toLowerCase())throw Error('A conta não corresponde ao cadastro. Entre novamente.');
    const activation=await client.rpc('ma_acesso_ativar',{hash_token:await hash(token)});if(activation.error)throw Error(activation.error.message);
    sessionStorage.setItem('alerta_contexto_municipal_demo_v1',activation.data.municipio);
    const refresh=await client.auth.refreshSession();
    if(refresh.error){await client.auth.signOut({scope:'local'});section.innerHTML='<h1>Acesso ativado</h1><p>Sua senha foi salva. Entre novamente para iniciar sua sessão.</p><a href="../gestao/">Entrar no Pra Somar</a>';return;}
    location.replace('../gestao/?municipio='+encodeURIComponent(activation.data.municipio));
   }catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
  };
  section.querySelector('input').focus();
 }
 render();
}catch(error){section.innerHTML='<small>PRA SOMAR</small><h1>Acesso indisponível</h1><p role="alert">'+esc(error.message)+'</p><a href="../gestao/">Voltar à entrada</a>';}
})();
