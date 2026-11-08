/* Ativação da ficha existente. Senha nunca é gravada em storage, logs ou estado persistente. */
(async function(){
'use strict';
const section=document.querySelector('section'),config=window.MARINGA_SUPABASE;
const url=new URL(location.href),fragment=new URLSearchParams(url.hash.slice(1)),token=fragment.get('token');
const authHash=fragment.get('auth_hash'),authType=fragment.get('tipo');
const recovery=url.searchParams.get('recuperar')==='1';
const recoveryLink=recovery&&fragment.get('type')==='recovery'&&fragment.has('access_token')&&fragment.has('refresh_token');
const minimoSenha=window.PraSomarPoliticaSenha.minimo;
// Um novo link pode ser aberto na mesma aba já posicionada em /acesso/.
window.addEventListener('hashchange',()=>{const next=new URLSearchParams(location.hash.slice(1));if(next.has('token')||(next.get('type')==='recovery'&&next.has('access_token')))location.reload();});
if(token||authHash){history.replaceState(null,'',url.pathname);}
const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:recovery?'pra-somar-recuperacao':'maringa-supabase-auth-v1',persistSession:!recovery,autoRefreshToken:!recovery,flowType:recovery?'implicit':'pkce',detectSessionInUrl:!!recoveryLink}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function service(acao,extra={}){
 const response=await fetch(config.url+'/functions/v1/ma-colaboradores-acesso',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({acao,token,...extra}),cache:'no-store'});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível concluir. Tente novamente.');return result;
}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
try{
 let preview,verifiedEmail=false;
 if(recovery){
  if(!recoveryLink)throw Error('Abra o link de recuperação recebido por e-mail. Uma sessão comum não autoriza trocar a senha.');
  const claims=await client.auth.getClaims();
  if(claims.error||!claims.data?.claims?.amr?.some(x=>['otp','recovery','magiclink'].includes(x.method)))throw Error('A confirmação de recuperação é inválida. Solicite um novo link.');
  const {data,error}=await client.auth.getUser();if(error||!data.user)throw Error('Link de recuperação inválido ou expirado. Solicite uma nova recuperação na tela de entrada.');
  preview={email:data.user.email,nome:'',minimo_senha:minimoSenha,senha_definida:false};
 }else{
  preview=await service('consultar');preview.minimo_senha=minimoSenha;
  // Nunca aproveitar a sessão de outra pessoa nem ativar sem a senha desta conta.
  await client.auth.signOut({scope:'local'});
 }
 function render(){
  const existing=preview.senha_definida;
  section.innerHTML='<small>PRA SOMAR</small><h1>'+(recovery?'Definir nova senha':existing?'Entrar e ativar acesso':'Definir sua senha')+'</h1><p>'+esc(preview.nome)+'</p><p class="email">'+esc(preview.email)+'</p><p>'+(existing?'Use a senha da sua conta. Seu cadastro já está pronto.':'Seu cadastro já está pronto. Escolha uma senha com pelo menos '+preview.minimo_senha+' caracteres.')+'</p><form><label for="senha">Senha</label><input id="senha" type="password" autocomplete="'+(existing?'current-password':'new-password')+'" required '+(existing?'':'minlength="'+preview.minimo_senha+'" maxlength="128"')+'>'+(existing?'':'<label for="confirmacao">Confirme a senha</label><input id="confirmacao" type="password" autocomplete="new-password" required>')+'<button type="submit">'+(recovery?'Salvar senha':existing?'Entrar e ativar':'Salvar senha e entrar')+'</button><p role="alert"></p></form><p><a href="../gestao/">Voltar à entrada</a></p>';
  section.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const button=section.querySelector('button'),feedback=section.querySelector('[role=alert]');if(button.disabled)return;
   const password=section.querySelector('#senha').value;
   if(!existing&&Array.from(password).length<minimoSenha){feedback.textContent='Use pelo menos '+minimoSenha+' caracteres na senha.';return;}
   if(!existing&&password!==section.querySelector('#confirmacao').value){feedback.textContent='As senhas não conferem.';return;}
   button.disabled=true;feedback.textContent='Confirmando acesso…';
   try{
    if(recovery){const {error}=await client.auth.updateUser({password});if(error)throw Error('Não foi possível salvar a senha. Abra um novo link de recuperação e tente novamente.');await client.auth.signOut({scope:'local'});section.innerHTML='<h1>Senha salva</h1><p>Entre com seu e-mail e a nova senha.</p><a href="../gestao/">Entrar no Pra Somar</a>';return;}
    if(existing)await service('confirmar_email',{auth_hash:authHash,tipo:authType});
    if(!existing){
     const current=await service('consultar');
     if(current.senha_definida){preview={...current,minimo_senha:minimoSenha};render();section.querySelector('[role=alert]').textContent='A senha já foi definida. Entre com ela; nenhuma senha foi substituída.';return;}
     // Retorno perdido após salvar: testar a senha antes de tentar redefini-la.
     const resumed=await client.auth.signInWithPassword({email:preview.email,password});
     if(resumed.error){
     if(!verifiedEmail){
      if(!/^[a-f0-9]{32,128}$/.test(authHash||'')||!['invite','email'].includes(authType))throw Error('Abra o link completo recebido por e-mail.');
      const proof=await client.auth.verifyOtp({token_hash:authHash,type:authType});
      if(proof.error)throw Error('Este link de confirmação venceu ou já foi utilizado. Solicite novo envio ao administrador.');
      const identity=await client.auth.getUser();
      if(identity.error||identity.data.user?.email?.toLowerCase()!==preview.email.toLowerCase()){await client.auth.signOut({scope:'local'});throw Error('A conta não corresponde ao cadastro. Solicite novo envio.');}
      verifiedEmail=true;
     }
     const saved=await client.auth.updateUser({password});
     if(saved.error)throw Error('Não foi possível salvar a senha. Tente novamente nesta página.');
     }
    }
    const {error}=await client.auth.signInWithPassword({email:preview.email,password});
    if(error){preview.senha_definida=true;render();section.querySelector('[role=alert]').textContent='Não foi possível entrar. Confira sua senha. Se você acabou de criá-la, use a mesma senha para tentar novamente.';return;}
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
