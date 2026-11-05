
function renderAdminColab(body){
  // Leitura do mesmo cadastro utilizado pela Gestão e pelo Mapa de Colaboradores.
  // Os voluntários legados do simulador continuam visíveis, mas não são um segundo cadastro.
  const visiveis=pessoasMunicipio().filter(v=>!v.oficial&&noRecorte(v.bairroOrigem));
  body.innerHTML='<div class="admin-section-title">Colaboradores do município</div>'+
    '<p style="font-size:11px;color:var(--muted);margin:8px 0 14px">A inclusão, edição e exclusão acontecem exclusivamente no cadastro da Gestão. Registros do simulador são identificados como demonstração.</p>'+
    '<a class="admin-btn primary" href="gestao/#voluntarios" style="display:inline-block;margin-bottom:15px">Gerenciar colaboradores na Gestão</a>'+
    '<table class="admin-table"><thead><tr><th>Nome</th><th>Origem</th><th>Território de cadastro</th><th>Capacidades</th><th>Presença</th></tr></thead><tbody>'+
    (visiveis.map(v=>{
      const canonico=String(v.id).startsWith("cad:");
      const capacidades=v.sub||(Array.isArray(v.contribuicoes)?v.contribuicoes.join(", "):v.ajuda||"");
      const status=canonico?(v.checkin_status==="presente"?"Chegada GPS registrada":v.checkin_status==="finalizado"?"Saída registrada":"Não confirmado"):estadoPessoa(v.id)+" (simulação)";
      return '<tr><td>'+escHtml(v.nome)+'</td><td>'+(canonico?"Cadastro municipal":"Simulação")+'</td>'+
        '<td>'+escHtml(v.bairroOrigem||"Não informado")+'</td><td>'+escHtml(capacidades||"A definir")+'</td>'+
        '<td>'+escHtml(status)+'</td></tr>';
    }).join("")||'<tr><td colspan="5" style="color:var(--muted)">Nenhum colaborador nesta visão.</td></tr>')+
    '</tbody></table>';
}

