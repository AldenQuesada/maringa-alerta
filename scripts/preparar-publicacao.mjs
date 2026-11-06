import {cpSync,mkdirSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const dest=resolve('.publicacao');
if(existsSync(dest))throw Error('Use uma pasta de publicação nova; não reutilizar artefatos antigos.');
mkdirSync(dest);
const excluir=/(^|\/)(\.git|\.github|\.publicacao|node_modules|auditorias|tests|scripts|src|supabase|atendimento)(\/|$)/;
for(const entry of readdirSync('.', {withFileTypes:true})){
 if(excluir.test(entry.name))continue;
 if(!entry.isDirectory()&&!/\.(html|js|css|svg|png|ico|webmanifest)$/.test(entry.name))continue;
 cpSync(entry.name,resolve(dest,entry.name),{recursive:true,filter:source=>!excluir.test(source)&&!(/\.(json|geojson|md|sql|cjs|mjs)$/.test(source))});
}
mkdirSync(resolve(dest,'atendimento'));
writeFileSync(resolve(dest,'atendimento/index.html'),'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Atendimento</title><h1>Atendimento ainda não disponível</h1><p>A integração real será habilitada após validação. Nenhum atendimento é simulado.</p><a href="../gestao/">Abrir gestão</a></html>');
