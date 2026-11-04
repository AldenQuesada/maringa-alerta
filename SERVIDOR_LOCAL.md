# Servidor local — Sistema Integrado de Gestão de Crise

Servidor HTTP local para **todos** os módulos existentes na pasta do repositório, sem GitHub Pages nem Vercel.

## Como iniciar no iMac

Abra o Terminal **na pasta do repositório** e execute:

```bash
git pull origin main
python3 servidor_local.py
```

A página abre automaticamente em http://127.0.0.1:8788/plataforma/#municipios

Outras rotas:
- Administração Geral: http://127.0.0.1:8788/plataforma/
- Administração municipal: http://127.0.0.1:8788/gestao/?municipio=maringa
- Mapa operacional: http://127.0.0.1:8788/
- Mapas: http://127.0.0.1:8788/mapas/
- Diagnóstico: http://127.0.0.1:8788/__saude

Para encerrar o servidor, pressione Ctrl+C no Terminal.

**Limite:** este servidor entrega os arquivos locais; não transforma o protótipo em um backend. Os cadastros existentes ainda utilizam localStorage no navegador, não um banco compartilhado; não há autenticação de produção. Não expor a porta à internet nem inserir dados sensíveis. A implantação de API, banco central e segurança é uma etapa separada.

O servidor usa somente a biblioteca padrão Python 3 e mantém cache HTTP desativado para evitar telas antigas.
