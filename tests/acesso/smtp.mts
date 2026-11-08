// Captura SMTP descartável, somente na rede Docker interna. Não retransmite mensagens.
import net from 'node:net';
import {randomUUID} from 'node:crypto';
export function captureSmtp(mails:Map<string,unknown>,fails:()=>boolean){
 return net.createServer(socket=>{
  let buffer='',data=false,lines:string[]=[],recipients:string[]=[];
  socket.setEncoding('utf8');socket.write('220 smtp-teste ESMTP\r\n');
  socket.on('error',()=>{});
  socket.on('data',chunk=>{
   buffer+=chunk;if(buffer.length>2000000){socket.destroy();return;}
   let end;
   while((end=buffer.indexOf('\r\n'))>=0){
    const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
    if(data){
     if(line!=='.'){lines.push(line.startsWith('..')?line.slice(1):line);continue;}
     data=false;
     if(fails()){socket.write('451 4.3.0 Falha SMTP de teste\r\n');continue;}
     const raw=lines.join('\r\n');
     const decoded=raw.replace(/=\r\n/g,'').replace(/=([A-F0-9]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
     const id=randomUUID();mails.set(id,{id,to:[...recipients],text:decoded});
     socket.write('250 2.0.0 Aceito no teste\r\n');continue;
    }
    if(/^EHLO/i.test(line))socket.write('250-smtp-teste\r\n250 SIZE 2000000\r\n');
    else if(/^HELO/i.test(line))socket.write('250 smtp-teste\r\n');
    else if(/^MAIL FROM:/i.test(line)){recipients=[];socket.write('250 OK\r\n');}
    else if(/^RCPT TO:/i.test(line)){const address=line.match(/<([^>]+)>/);if(address)recipients.push(address[1]);socket.write('250 OK\r\n');}
    else if(/^DATA$/i.test(line)){data=true;lines=[];socket.write('354 Envie a mensagem\r\n');}
    else if(/^QUIT$/i.test(line)){socket.end('221 Bye\r\n');}
    else if(/^(RSET|NOOP)/i.test(line))socket.write('250 OK\r\n');
    else socket.write('502 Comando indisponível\r\n');
   }
  });
 }).listen(2525,'0.0.0.0');
}
