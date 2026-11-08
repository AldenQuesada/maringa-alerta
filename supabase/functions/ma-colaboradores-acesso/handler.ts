// Cadastro administrativo já salvo. Nenhuma senha, token ou resposta do provedor é registrada em logs.
export type Config = {url:string; anonKey:string; serviceKey:string; secret:string; appUrl:string; emailFrom:string; resendKey:string; mailUrl?:string};
const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),x=>x.toString(16).padStart(2,'0')).join('');
export const hashToken=async(token:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
export async function tokenFor(secret:string,command:string,municipio:string,colaborador:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify([command,municipio,colaborador]))));
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
class Failure extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function createHandler(config:Config,request:typeof fetch=fetch){
 const app=new URL(config.appUrl.endsWith('/')?config.appUrl:config.appUrl+'/');
 async function call(path:string,body:unknown,bearer=config.serviceKey,method='POST'){
  const response=await request(config.url+path,{method,headers:{apikey:bearer===config.serviceKey?config.serviceKey:config.anonKey,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   const safe=path.startsWith('/rest/v1/rpc/')?data?.message:null;
   throw new Failure(safe||'Não foi possível concluir o acesso. Confira os dados e tente novamente.',response.status===401||response.status===403?403:400);
  }
  return data;
 }
 const rpc=(name:string,args:unknown,bearer?:string)=>call('/rest/v1/rpc/'+name,args,bearer);
 return async(req:Request)=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':app.origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(req.headers.get('origin')&&req.headers.get('origin')!==app.origin)return json({error:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return json({error:'Método não permitido.'},405);
  try{
   const body=await req.text(); if(body.length>16000)throw new Failure('Pedido muito grande.',413);
   let input;try{input=JSON.parse(body);}catch{throw new Failure('Pedido inválido.');}
   if(input.acao==='enviar'){
    if(config.secret.length<32||!config.resendKey||!config.emailFrom)throw new Failure('O envio de acesso ainda não está configurado. A ficha permanece salva.',503);
    if(!/^[a-f0-9-]{36}$/.test(input.comando||'')||typeof input.municipio!=='string'||typeof input.colaborador!=='string'||!Number.isSafeInteger(input.versao))throw new Failure('Pedido de envio inválido.');
    const bearer=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
    if(!bearer||bearer===config.serviceKey||bearer===config.anonKey)throw new Failure('Entre como administrador.',403);
    const actor=await call('/auth/v1/user',null,bearer,'GET');
    if(!actor?.id)throw new Failure('Entre como administrador.',403);
    const token=await tokenFor(config.secret,input.comando,input.municipio,input.colaborador);
    const saved=await rpc('ma_acesso_preparar',{municipio:input.municipio,colaborador:input.colaborador,versao_esperada:input.versao,comando:input.comando,hash_token:await hashToken(token),ator:actor.id});
    if(saved.estado==='enviado')return json({estado:'enviado',comando:input.comando});
    const link=new URL('acesso/',app);link.hash=new URLSearchParams({token}).toString();
    let provider;
    try{
     const sent=await request(config.mailUrl||'https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.resendKey,'Content-Type':'application/json','Idempotency-Key':'pra-somar-acesso/'+input.comando},body:JSON.stringify({from:config.emailFrom,to:[saved.email],subject:'Seu acesso ao Pra Somar',text:`Olá, ${saved.nome}. Seu cadastro foi concluído pelo administrador. Para definir sua senha ou entrar com sua conta, abra: ${link.href}\nO link é válido por 48 horas. Se você não esperava este acesso, ignore esta mensagem.`,html:`<p>Olá, ${escape(saved.nome)}.</p><p>Seu cadastro foi concluído pelo administrador.</p><p><a href="${escape(link.href)}">Concluir primeiro acesso</a></p><p>Defina sua senha ou entre com sua conta existente. O link é válido por 48 horas.</p>`}),signal:AbortSignal.timeout(20000)});
     provider=await sent.json();if(!sent.ok||!provider?.id)throw new Error('delivery');
    }catch{
     await rpc('ma_acesso_entrega',{comando:input.comando,estado_novo:'falhou',identificador_provedor:null}).catch(()=>{});
     throw new Failure('Cadastro salvo. Não foi possível confirmar o envio. Tente enviar novamente.',502);
    }
    await rpc('ma_acesso_entrega',{comando:input.comando,estado_novo:'enviado',identificador_provedor:provider.id});
    return json({estado:'enviado',comando:input.comando});
   }
   if(!['consultar','criar_conta','confirmar_email'].includes(input.acao)||!/^[a-f0-9]{64}$/.test(input.token||''))throw new Failure('Link inválido ou expirado. Solicite novo envio ao administrador.');
   const preview=await rpc('ma_acesso_consultar',{hash_token:await hashToken(input.token)});
   const {conta_id,email_confirmado,...publicPreview}=preview;
   if(input.acao==='consultar')return json(publicPreview);
   if(input.acao==='confirmar_email'){
    // A posse do link entregue confirma este e-mail, sem alterar a senha existente.
    if(conta_id&&!email_confirmado)await call('/auth/v1/admin/users/'+encodeURIComponent(conta_id),{email_confirm:true},config.serviceKey,'PUT');
    return json({confirmado:true});
   }
   if(preview.conta_existente)return json({conta_existente:true});
   if(typeof input.senha!=='string'||input.senha.length<12||input.senha.length>128)throw new Failure('Use uma senha de 12 a 128 caracteres.');
   // O link já prova a posse do e-mail. Não usar signUp, que pode devolver usuário sem sessão.
   try{await call('/auth/v1/admin/users',{email:preview.email,password:input.senha,email_confirm:true});}
   catch(error){
    // Concorrência ou retorno perdido: nunca sobrescrever senha de conta existente.
    const retry=await rpc('ma_acesso_consultar',{hash_token:await hashToken(input.token)});
    if(retry.conta_existente)return json({conta_existente:true});throw error;
   }
   return json({conta_criada:true});
  }catch(error){return json({error:error instanceof Failure?error.message:'Não foi possível confirmar a operação. Tente novamente.',},error instanceof Failure?error.status:503);}
 };
}
