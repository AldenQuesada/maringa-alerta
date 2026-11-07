/* Controlador administracao-colaboradores: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('administracao-colaboradores',{
 dependencias:{
  "escHtml": "contexto",
  "noRecorte": "cadastro-territorial",
  "pessoasMunicipio": "pessoas",
  "estadoPessoa": "conversas"
},
 criar(dependencias){

 function renderAdminColab(body){
  // Leitura do mesmo cadastro utilizado pela Gestão e pelo Mapa de Colaboradores.
  // Os voluntários legados do simulador continuam visíveis, mas não são um segundo cadastro.
  const visiveis=dependencias.pessoasMunicipio().filter(v=>!v.oficial&&dependencias.noRecorte(v.bairroOrigem));
  body.innerHTML='<div class="admin-section-title">Colaboradores do município</div>'+
    '<p style="font-size:11px;color:var(--muted);margin:8px 0 14px">A inclusão, edição e exclusão acontecem exclusivamente no cadastro da Gestão. Registros do simulador são identificados como demonstração.</p>'+
    '<a class="admin-btn primary" href="gestao/#voluntarios" style="display:inline-block;margin-bottom:15px">Gerenciar colaboradores na Gestão</a>'+
    '<table class="admin-table"><thead><tr><th>Nome</th><th>Origem</th><th>Território de cadastro</th><th>Capacidades</th><th>Presença</th></tr></thead><tbody>'+
    (visiveis.map(v=>{
      const canonico=String(v.id).startsWith("cad:");
      const capacidades=v.sub||(Array.isArray(v.contribuicoes)?v.contribuicoes.join(", "):v.ajuda||"");
      const status=canonico?(v.checkin_status==="presente"?"Chegada GPS registrada":v.checkin_status==="finalizado"?"Saída registrada":"Não confirmado"):dependencias.estadoPessoa(v.id)+" (simulação)";
      return '<tr><td>'+dependencias.escHtml(v.nome)+'</td><td>'+(canonico?"Cadastro municipal":"Simulação")+'</td>'+
        '<td>'+dependencias.escHtml(v.bairroOrigem||"Não informado")+'</td><td>'+dependencias.escHtml(capacidades||"A definir")+'</td>'+
        '<td>'+dependencias.escHtml(status)+'</td></tr>';
    }).join("")||'<tr><td colspan="5" style="color:var(--muted)">Nenhum colaborador nesta visão.</td></tr>')+
    '</tbody></table>';
}
 async function iniciar(){

 return true;
 }
 return {iniciar,renderAdminColab};
 }
});
})(globalThis);
