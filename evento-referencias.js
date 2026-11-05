/* Apresentação das referências registradas no cadastro canônico de eventos. */
(function (root) {
  'use strict';
  function linkSeguro(doc, endereco, texto) {
    try {
      const url = new URL(endereco);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      const link = doc.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = texto;
      return link;
    } catch (_) { return null; }
  }
  function preencherTexto(doc, elemento, texto) {
    const padrao = /https?:\/\/[^\s]+/g;
    let inicio = 0, resultado;
    while ((resultado = padrao.exec(texto))) {
      elemento.append(doc.createTextNode(texto.slice(inicio, resultado.index)));
      const endereco = resultado[0].replace(/[.,;]+$/, '');
      const link = linkSeguro(doc, endereco, 'Consultar fonte');
      elemento.append(link || doc.createTextNode(endereco));
      elemento.append(doc.createTextNode(resultado[0].slice(endereco.length)));
      inicio = resultado.index + resultado[0].length;
    }
    elemento.append(doc.createTextNode(texto.slice(inicio)));
  }
  function render(target, eventos) {
    const doc = target.ownerDocument;
    const abertos = new Set(Array.from(target.querySelectorAll('details[open]'), item => item.dataset.evento));
    target.replaceChildren();
    eventos.forEach(evento => {
      const detalhes = doc.createElement('details');
      detalhes.className = 'evento-referencia';
      detalhes.dataset.evento = evento.id;
      detalhes.open = abertos.has(String(evento.id));
      const resumo = doc.createElement('summary');
      resumo.textContent = evento.nome;
      detalhes.append(resumo);
      const corpo = doc.createElement('div');
      corpo.className = 'evento-referencia-corpo';
      String(evento.referencias).split(/\r?\n/).map(linha => linha.trim()).filter(Boolean).forEach(linha => {
        const paragrafo = doc.createElement('p');
        const partes = linha.match(/^([^:]{2,100}):\s+(.+)$/);
        if (partes && !partes[1].includes('http')) {
          const titulo = doc.createElement('strong');
          titulo.textContent = partes[1];
          paragrafo.append(titulo, doc.createTextNode(': '));
          preencherTexto(doc, paragrafo, partes[2]);
        } else preencherTexto(doc, paragrafo, linha);
        corpo.append(paragrafo);
      });
      const fonte = linkSeguro(doc, evento.url_fonte, 'Consultar fonte principal');
      if (fonte) corpo.append(fonte);
      detalhes.append(corpo);
      target.append(detalhes);
    });
  }
  root.EventoReferencias = { render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
