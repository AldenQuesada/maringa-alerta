/* perfil: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({SEM_ZONA,esc,get,grupoOfertas,linha,nomePessoa,pessoaTipo,zonaDaPessoa}){
function renderPerfil(p,bairros) {
      if (!p) {
        get("cv-profile").innerHTML = '<div class="cv-profile-empty">Abra um cadastro para consultar os dados completos da pessoa.</div>';
        return;
      }
      const z = zonaDaPessoa(p,bairros);
      const status = p.checkin_status === "presente" ? "No local" :
        p.checkin_status === "finalizado" ? "Saída registrada" : "Sem check-in ativo";
      get("cv-profile").innerHTML =
        '<div class="cv-profile-head"><span>' + (p.status_simulacao==="simulado"?"CADASTRO DEMONSTRATIVO":"CADASTRO CANÔNICO") + '</span><h3>' + esc(nomePessoa(p)) +
        '</h3><p>' + esc(pessoaTipo(p.tipo_pessoa)||"Tipo não informado") + '</p></div>' +
        '<dl class="cv-profile-grid">' +
        linha("Telefone / WhatsApp",p.telefone) +
        linha("Endereço",p.endereco) +
        linha("Bairro",p.bairro) +
        linha("Zona",z===SEM_ZONA ? "Não atribuída" : z) +
        linha("Disponibilidade",p.disponibilidade) +
        linha("Presença",status) +
        (p.email ? linha("E-mail registrado",p.email) : "") +
        (p.forma_entrega_doacao ? linha("Doações",p.forma_entrega_doacao) : "") +
        (p.outros ? linha("Outra colaboração",p.outros) : "") +
        (p.contribuicao ? linha("Observações",p.contribuicao) : "") +
        '</dl>' +
        grupoOfertas("Ajuda a pessoas atingidas",p.ajudas) +
        grupoOfertas("Maquinário e equipamentos",p.maquinas) +
        grupoOfertas("Apoio a empreendedores",p.empreendedores) +
        grupoOfertas("Materiais",p.materiais) +
        '<button type="button" class="cv-edit" data-cv-edit="' + esc(p.id) + '">Editar cadastro original</button>';
    }
return {renderPerfil};
}
root.AlertaConversasVistaPerfil={criar};
})(globalThis);
