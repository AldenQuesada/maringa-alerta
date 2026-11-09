import {copyFileSync,mkdirSync,writeFileSync,existsSync,readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

export function prepararPublicacao(root=process.cwd(),manifestPath=new URL('./publicacao-arquivos.json',import.meta.url)){
 const dest=resolve(root,'.publicacao');
 if(existsSync(dest))throw Error('Use uma pasta de publicação nova; não reutilizar artefatos antigos.');
 const manifesto=JSON.parse(readFileSync(manifestPath,'utf8')),arquivos=manifesto.arquivos;
 if(manifesto.versao!==1||!Array.isArray(arquivos)||new Set(arquivos).size!==arquivos.length)throw Error('Manifesto público inválido.');
 const extensoes=new Set(['.html','.js','.css','.svg','.png','.ico','.webmanifest']);
 const privados=new Set(['src','scripts','supabase','tests','auditorias','node_modules','atendimento']);
 // Conferir tudo antes de criar o artefato. Arquivos não declarados nunca entram,
 // inclusive arquivos novos dentro de diretórios públicos.
 for(const arquivo of arquivos){
  if(typeof arquivo!=='string'||!arquivo||arquivo.includes('\\')||arquivo.startsWith('/')||(!extensoes.has(extname(arquivo))&&arquivo!=='backend/vendor/SUPABASE-LICENSE'))throw Error('Arquivo público inválido.');
  let caminho=root;const partes=arquivo.split('/');
  for(let i=0;i<partes.length;i++){
   const parte=partes[i];
   if(!parte||parte.startsWith('.')||privados.has(parte))throw Error('Caminho privado no manifesto público.');
   caminho=resolve(caminho,parte);const estado=lstatSync(caminho);
   if(estado.isSymbolicLink()||(i<partes.length-1?!estado.isDirectory():!estado.isFile()))throw Error('A publicação exige arquivos regulares: '+arquivo);
  }
 }
 const worker=readFileSync(resolve(root,'sw.js'),'utf8');
 const shell=JSON.parse(worker.match(/const SHELL_FILES = (\[[^;]*\]);/)?.[1]||'null');
 if(!Array.isArray(shell))throw Error('Precache inválido.');
 for(const file of shell){
  const caminho=file.split('?')[0].replace(/^\.\//,'');
  const pagina=caminho===''||caminho.endsWith('/')?caminho+'index.html':caminho;
  if(!arquivos.includes(pagina))throw Error('Precache referencia arquivo fora do manifesto: '+file);
 }
 for(const arquivo of arquivos){
  const output=resolve(dest,arquivo);mkdirSync(dirname(output),{recursive:true});copyFileSync(resolve(root,arquivo),output);
 }
 mkdirSync(resolve(dest,'atendimento'),{recursive:true});
 writeFileSync(resolve(dest,'atendimento/index.html'),'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Atendimento</title><h1>Atendimento ainda não disponível</h1><p>A integração real será habilitada após validação. Nenhum atendimento é simulado.</p><a href="../gestao/">Abrir gestão</a></html>');
 return dest;
}
if(process.argv[1]&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))prepararPublicacao();
