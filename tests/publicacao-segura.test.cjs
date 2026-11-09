const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const project=path.resolve(__dirname,'..');
const importer=import(pathToFileURL(path.join(project,'scripts/preparar-publicacao.mjs')));
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pra-somar-publicacao-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'index.html'),'<title>Fixture</title>');
 fs.writeFileSync(path.join(root,'sw.js'),'const SHELL_FILES = ["./index.html"];');
 const manifest=path.join(root,'manifest.json');
 fs.writeFileSync(manifest,JSON.stringify({versao:1,arquivos:['index.html','sw.js']}));
 return {root,manifest};
}
test('publicação não inclui canários privados, mesmo dentro de diretório público',async t=>{
 const {prepararPublicacao}=await importer,{root,manifest}=fixture(t);
 for(const f of ['.fase0-privado/pg_service.conf','.env','.aws/credentials','assets/credencial.js','pasta-nova/publico.html']){
  fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),'CANARIO_PRIVADO');
 }
 const dest=prepararPublicacao(root,manifest);
 assert.deepEqual(fs.readdirSync(dest).sort(),['atendimento','index.html','sw.js']);
 assert.equal(fs.readFileSync(path.join(dest,'index.html'),'utf8'),'<title>Fixture</title>');
 assert.throws(()=>prepararPublicacao(root,manifest),/nova/);
});
test('manifesto recusa diretórios privados, travessia e tipos de arquivo não públicos',async t=>{
 const {prepararPublicacao}=await importer;
 for(const bad of ['../segredo.js','/tmp/segredo.js','.fase0-privado/segredo.js','assets/../segredo.js','backend/pg_service.conf','supabase/segredo.js']){
  const {root,manifest}=fixture(t);fs.writeFileSync(manifest,JSON.stringify({versao:1,arquivos:['index.html','sw.js',bad]}));
  assert.throws(()=>prepararPublicacao(root,manifest));assert.equal(fs.existsSync(path.join(root,'.publicacao')),false);
 }
});
test('arquivos e diretórios simbólicos são recusados antes de produzir artefato',async t=>{
 const {prepararPublicacao}=await importer;
 for(const directory of [false,true]){
  const {root,manifest}=fixture(t),external=fs.mkdtempSync(path.join(os.tmpdir(),'pra-somar-canario-'));
  t.after(()=>fs.rmSync(external,{recursive:true,force:true}));fs.writeFileSync(path.join(external,'logo.svg'),'CANARIO');
  if(directory)fs.symlinkSync(external,path.join(root,'assets'),'dir');
  else{fs.mkdirSync(path.join(root,'assets'));fs.symlinkSync(path.join(external,'logo.svg'),path.join(root,'assets/logo.svg'));}
  fs.writeFileSync(manifest,JSON.stringify({versao:1,arquivos:['index.html','sw.js','assets/logo.svg']}));
  assert.throws(()=>prepararPublicacao(root,manifest),/regulares/);assert.equal(fs.existsSync(path.join(root,'.publicacao')),false);
 }
});
test('manifesto real inclui os assets referidos por todas as páginas publicadas',()=>{
 const {arquivos}=JSON.parse(fs.readFileSync(path.join(project,'scripts/publicacao-arquivos.json'),'utf8'));
 for(const page of arquivos.filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(path.join(project,page),'utf8');
  for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   if(/^(?:https?:|\/\/|data:|mailto:)/.test(url))continue;
   const file=url.split(/[?#]/)[0];if(!/\.(js|css|svg|png|ico|webmanifest)$/.test(file))continue;
   const target=path.posix.normalize(path.posix.join(path.posix.dirname(page),file));
   assert.ok(arquivos.includes(target),page+' requer '+target);
  }
 }
});
test('política nativa e arquivo público gerado não divergem',async()=>{
 const {politicaAuth,gerarPoliticaAuth}=await import(pathToFileURL(path.join(project,'scripts/politica-auth.mjs')));
 const policy=politicaAuth(project);assert.ok(policy.minimo>=12);assert.equal(policy.exigirSenhaAtual,true);assert.equal(policy.reautenticar,true);
 assert.doesNotThrow(()=>gerarPoliticaAuth(project,true));
});
test('pacote real é completo, inclui a página inicial do cache e contém somente o manifesto',async t=>{
 const {prepararPublicacao}=await importer,{root}=fixture(t);
 const manifest=path.join(project,'scripts/publicacao-arquivos.json'),{arquivos}=JSON.parse(fs.readFileSync(manifest,'utf8'));
 for(const file of arquivos){
  const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(project,file),target);
 }
 const output=prepararPublicacao(root,manifest);
 const list=fs.readdirSync(output,{recursive:true}).filter(file=>fs.statSync(path.join(output,file)).isFile()).map(file=>file.split(path.sep).join('/')).sort();
 assert.deepEqual(list,[...arquivos,'atendimento/index.html'].sort());
 for(const file of arquivos)assert.deepEqual(fs.readFileSync(path.join(output,file)),fs.readFileSync(path.join(project,file)),file);
});
