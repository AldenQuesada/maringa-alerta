// Cadastro administrativo já salvo. Nenhuma senha, token ou resposta do provedor é registrada em logs.
export type Config = {url:string; anonKey:string; serviceKey:string; secret:string; appUrl:string};
const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),x=>x.toString(16).padStart(2,'0')).join('');
export const hashToken=async(token:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
export async function tokenFor(secret:string,command:string,municipio:string,colaborador:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify([command,municipio,colaborador]))));
}
class Failure extends Error{status:number;code:string;constructor(message:string,status=400,code=''){super(message);this.status=status;this.code=code;}}
export function createHandler(config:Config,request:typeof fetch=fetch){
 const app=new URL(config.appUrl.endsWith('/')?config.appUrl:config.appUrl+'/');
 async function call(path:string,body:unknown,bearer=config.serviceKey,method='POST'){
  const response=await request(config.url+path,{method,headers:{apikey:bearer===config.serviceKey?config.serviceKey:config.anonKey,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   const safe=path.startsWith('/rest/v1/rpc/')?data?.message:null;
   throw new Failure(safe||'Não foi possível concluir o acesso. Confira os dados e tente novamente.',response.status===401||response.status===403?403:400,data?.code||data?.error_code||'');
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
    if(config.secret.length<32)throw new Failure('O envio de acesso ainda não está configurado. A ficha permanece salva.',503);
    if(!/^[a-f0-9-]{36}$/.test(input.comando||'')||typeof input.municipio!=='string'||typeof input.colaborador!=='string'||!Number.isSafeInteger(input.versao))throw new Failure('Pedido de envio inválido.');
    const bearer=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
    if(!bearer||bearer===config.serviceKey||bearer===config.anonKey)throw new Failure('Entre como administrador.',403);
    const actor=await call('/auth/v1/user',null,bearer,'GET');
    if(!actor?.id)throw new Failure('Entre como administrador.',403);
    const token=await tokenFor(config.secret,input.comando,input.municipio,input.colaborador);
    const saved=await rpc('ma_acesso_preparar',{municipio:input.municipio,colaborador:input.colaborador,versao_esperada:input.versao,comando:input.comando,hash_token:await hashToken(token),ator:actor.id});
    if(saved.estado==='enviado')return json({estado:'enviado',comando:input.comando});
    const link=new URL('acesso/',app);link.hash=new URLSearchParams({token}).toString();
    const person=await rpc('ma_acesso_consultar',{hash_token:await hashToken(token)});
    const lease=await rpc('ma_acesso_reservar_envio',{comando:input.comando});
    if(!lease.enviar)return json({estado:lease.estado,comando:input.comando},lease.estado==='enviado'?200:202);
    try{
     const redirect='?redirect_to='+encodeURIComponent(link.href);
     if(person.email_confirmado){
      await call('/auth/v1/otp'+redirect,{email:saved.email,create_user:false});
     }else{
      try{await call('/auth/v1/invite'+redirect,{email:saved.email});}
      catch(error){
       // Uma confirmação concorrente não autoriza redefinir senha nem recriar conta.
       if(!(error instanceof Failure)||!['email_exists','user_already_exists'].includes(error.code))throw error;
       await call('/auth/v1/otp'+redirect,{email:saved.email,create_user:false});
      }
     }
    }catch(error){
     await rpc('ma_acesso_finalizar_envio',{comando:input.comando,tentativa_atual:lease.tentativa,resultado:error instanceof Failure?'falhou':'incerto'}).catch(()=>{});
     const message=error instanceof Failure&&error.code==='email_address_not_authorized'
      ?'Cadastro salvo. O serviço de e-mail ainda não está habilitado para este destinatário. Consulte a administração.'
      :'Cadastro salvo. Não foi possível confirmar o envio. Aguarde um momento e tente novamente.';
     throw new Failure(message,502);
    }
    await rpc('ma_acesso_finalizar_envio',{comando:input.comando,tentativa_atual:lease.tentativa,resultado:'enviado'});
    return json({estado:'enviado',comando:input.comando});
   }
   if(!['consultar','confirmar_email'].includes(input.acao)||!/^[a-f0-9]{64}$/.test(input.token||''))throw new Failure('Link inválido ou expirado. Solicite novo envio ao administrador.');
   const preview=await rpc('ma_acesso_consultar',{hash_token:await hashToken(input.token)});
   const {conta_id,email_confirmado,...publicPreview}=preview;
   if(input.acao==='consultar')return json(publicPreview);
   if(!conta_id)throw new Failure('O envio ainda não foi concluído. Consulte o administrador.');
   if(!email_confirmado){
    if(!/^[a-f0-9]{32,128}$/.test(input.auth_hash||'')||!['invite','email'].includes(input.tipo))throw new Failure('Abra o link completo recebido por e-mail.');
    const verified=await call('/auth/v1/verify',{token_hash:input.auth_hash,type:input.tipo},config.anonKey);
    if(verified.user?.id!==conta_id||verified.user?.email?.toLowerCase()!==preview.email)throw new Failure('A conta não corresponde ao cadastro.',403);
   }
   return json({confirmado:true});
  }catch(error){return json({error:error instanceof Failure?error.message:'Não foi possível confirmar a operação. Tente novamente.',},error instanceof Failure?error.status:503);}
 };
}
