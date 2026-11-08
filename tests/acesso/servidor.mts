import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHmac} from 'node:crypto';
import {createHandler} from '../../supabase/functions/ma-colaboradores-acesso/handler.ts';
const base='http://127.0.0.1:8785',secret='segredo-jwt-exclusivo-dos-testes-descartaveis-2026';
const jwt=role=>{const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role,iss:'supabase',iat:Math.floor(Date.now()/1000)-10,exp:Math.floor(Date.now()/1000)+7200});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
const anon=jwt('anon'),service=jwt('service_role');
const mails=new Map();let failMail=false;
const handler=createHandler({url:base,anonKey:anon,serviceKey:service,secret:'segredo-token-exclusivo-dos-testes-descartaveis-2026',appUrl:base+'/',emailFrom:'Pra Somar <teste@example.invalid>',resendKey:'teste',mailUrl:base+'/mail'});
const root=resolve('.');
http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,base);const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
 if(url.pathname==='/health'){res.end('ok');return;}
 if(url.pathname==='/test/mail/fail'){failMail=url.searchParams.get('value')==='1';res.end('{}');return;}
 if(url.pathname==='/test/mails'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify([...mails.values()]));return;}
 if(url.pathname==='/test/keys'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({anon,service}));return;}
 if(url.pathname==='/mail'){
  res.setHeader('Content-Type','application/json');if(failMail){res.statusCode=503;res.end('{}');return;}
  const key=req.headers['idempotency-key'];if(!mails.has(key))mails.set(key,{...JSON.parse(body.toString()),id:key});res.end(JSON.stringify({id:key}));return;
 }
 if(url.pathname.startsWith('/functions/v1/ma-colaboradores-acesso')){
  const result=await handler(new Request(base+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})}));
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
 }
 if(url.pathname.startsWith('/auth/v1/')||url.pathname.startsWith('/rest/v1/')){
  const auth=url.pathname.startsWith('/auth/v1/');const endpoint=(auth?'http://auth:9999':'http://rest:3000')+url.pathname.replace(auth?'/auth/v1':'/rest/v1','')+url.search;
  const headers={...req.headers};delete headers.host;delete headers['content-length'];
  if(headers.authorization==='Bearer sb_publishable_test')headers.authorization='Bearer '+anon;
  const response=await fetch(endpoint,{method:req.method,headers,...(body.length?{body}:{}),redirect:'manual'});
  res.writeHead(response.status,Object.fromEntries([...response.headers].filter(([k])=>!['content-length','content-encoding','transfer-encoding'].includes(k))));res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 if(url.pathname==='/backend/config.js'){res.setHeader('Content-Type','text/javascript');res.end(`window.MARINGA_SUPABASE={url:'${base}',publishableKey:'sb_publishable_test'};`);return;}
 let path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'/'))throw Error('path');if(url.pathname.endsWith('/'))path+='/index.html';
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(path)]||'application/octet-stream'));res.end(await readFile(path));
 }catch(error){res.statusCode=500;res.end('Erro no servidor descartável: '+error.message);}
}).listen(8785,'0.0.0.0');
