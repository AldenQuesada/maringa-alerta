// Servidor descartável dos testes. Sem credenciais, escrita ou acesso remoto.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=process.cwd(),port=8784;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+requested);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
  if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end('Não encontrado');}
});
server.listen(port,'127.0.0.1');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit()));
