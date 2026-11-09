import {readFileSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const contrato=Object.freeze(JSON.parse(readFileSync(new URL('../config/liberacao.json',import.meta.url),'utf8')));
export function verificarJobs(jobs){
 for(const nome of contrato.checks)if(jobs?.[nome]?.result!=='success')throw Error('Liberação bloqueada: '+nome+' não passou.');
}
export function verificarProtecao(protecao){
 const required=protecao?.required_status_checks;
 for(const nome of [...contrato.checks,contrato.check_agregado]){
  if(!required?.checks?.some(x=>x.context===nome&&x.app_id===contrato.github_app_id))throw Error('Check obrigatório ausente ou sem origem confiável: '+nome);
 }
 if(required.strict!==true||protecao.enforce_admins?.enabled!==true||protecao.allow_force_pushes?.enabled!==false||protecao.allow_deletions?.enabled!==false)throw Error('Proteção da main insuficiente.');
 const review=protecao.required_pull_request_reviews;
 if(!review||review.required_approving_review_count<contrato.revisoes_independentes||!review.dismiss_stale_reviews||!review.require_last_push_approval)throw Error('Revisão independente e atualizada obrigatória.');
}
export function verificarPublicacao(commit,autorizado){
 if(!/^[a-f0-9]{40}$/.test(commit||'')||commit!==autorizado)throw Error('Publicação reservada à E6 e ao commit explicitamente autorizado.');
}
if(process.argv[1]&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(mode==='jobs')verificarJobs(JSON.parse(process.env.NEEDS_JSON||'null'));
 else if(mode==='protecao')verificarProtecao(JSON.parse(readFileSync(process.argv[3],'utf8')));
 else if(mode==='publicacao')verificarPublicacao(process.env.GITHUB_SHA,process.env.PRA_SOMAR_E6_RELEASE_SHA);
 else throw Error('Modo de verificação desconhecido.');
 console.log('Verificação de liberação aprovada: '+mode);
}
