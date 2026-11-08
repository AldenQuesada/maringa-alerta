import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function politicaAuth(root=process.cwd()){
 const source=readFileSync(resolve(root,'supabase/config.toml'),'utf8');
 const section=name=>source.match(new RegExp('\\['+name.replaceAll('.','\\.')+'\\]([^]*?)(?=\\n\\[|$)'))?.[1]||'';
 const auth=section('auth'),email=section('auth.email');
 const minimo=Number(auth.match(/^minimum_password_length\s*=\s*(\d+)/m)?.[1]);
 const exigirSenhaAtual=/^require_current_password\s*=\s*true\s*$/m.test(email);
 const reautenticar=/^secure_password_change\s*=\s*true\s*$/m.test(email);
 if(!Number.isInteger(minimo)||minimo<12||!exigirSenhaAtual||!reautenticar)throw Error('Política de autenticação incompleta.');
 return {minimo,exigirSenhaAtual,reautenticar};
}
export function gerarPoliticaAuth(root,checking=false){
 const policy=politicaAuth(root),path=resolve(root,'config/politica-auth.js');
 const expected='/* Gerado de supabase/config.toml; executar npm run build. */\nwindow.PraSomarPoliticaSenha=Object.freeze('+JSON.stringify({minimo:policy.minimo})+');\n';
 if(checking){if(readFileSync(path,'utf8')!==expected)throw Error('Política de senha da interface desatualizada.');}
 else writeFileSync(path,expected);
}
if(process.argv[1]&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
 const policy=politicaAuth();if(!(process.argv[2] in policy))throw Error('Parâmetro desconhecido.');console.log(policy[process.argv[2]]);
}
