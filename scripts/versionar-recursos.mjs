import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
const PAGINAS=['index.html','gestao/index.html','plataforma/index.html','mapas/index.html','mapas/monitoramento-animal.html','atendimento/index.html','acesso/index.html','colaboradores/index.html'];
const hash=bytes=>createHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex').slice(0,12);
export function versionarRecursos(root,checking=false){
 let erros=0;
 function arquivo(url,base){
  const caminho=resolve(base,url);
  if(relative(root,caminho).startsWith('..'))throw Error('Recurso fora do projeto: '+url);
  return readFileSync(caminho);
 }
 function atualizar(path,atual,novo){
  if(atual===novo)return;
  if(checking){console.error('DESATUALIZADO '+path+': execute npm run build');erros++;}
  else{writeFileSync(resolve(root,path),novo);console.log('Versões atualizadas: '+path);}
 }
 for(const page of PAGINAS){
  const atual=readFileSync(resolve(root,page),'utf8'),base=dirname(resolve(root,page));
  const novo=atual.replace(/((?:src|href)=")([^"?]+\.(?:js|css))(?:\?[^"\s]*)?(")/g,(match,inicio,url,fim)=>{
   if(/^(?:https?:|\/\/)/.test(url))return match;
   return inicio+url+'?v='+hash(arquivo(url,base))+fim;
  });
  atualizar(page,atual,novo);
 }
 const sw=readFileSync(resolve(root,'sw.js'),'utf8');
 let novo=sw.replace(/"(\.\/[^"?]+\.(?:js|css))(?:\?[^"\s]*)?"/g,(_match,url)=>'"'+url+'?v='+hash(arquivo(url,root))+'"');
 const conteudo=PAGINAS.map(page=>readFileSync(resolve(root,page),'utf8')).join('\n');
 const versao=hash(novo.replace(/const CACHE_NAME = "[^"]+";/,'')+conteudo);
 novo=novo.replace(/const CACHE_NAME = "[^"]+";/,'const CACHE_NAME = "maringa-alerta-shell-'+versao+'";');
 atualizar('sw.js',sw,novo);
 return erros;
}
