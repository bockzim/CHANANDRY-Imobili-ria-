/* Site público. Lê tudo de assets/js/data.js (editado pelo painel admin.html). */
(async function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = Core.esc, brl = Core.brl, wa = Core.wa, img = Core.img, sm = Core.sm;
  var D = await Core.getData();
  var E = D.empresa || {}, T = D.textos || {}, C = D.corretoras || [];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINLBL = { venda: 'À venda', aluguel: 'Para alugar', lancamento: 'Lançamento' };
  var STLBL = { reservado: 'Reservado', vendido: 'Vendido', alugado: 'Alugado' };
  var IMOVEIS = (D.imoveis || []).filter(function (i) { return i.status !== 'oculto'; });
  var corr = function (id) { return C.filter(function (c) { return c.id === id; })[0] || C[0] || { nome: '', whatsapp: '' }; };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var uniq = function (a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }).sort(); };
  var pageUrl = function (hash) { return location.origin.replace('null', '') + location.pathname + (hash || ''); };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  /* ---------- logo ---------- */
  var ICON = '<svg class="logo-i" viewBox="0 0 56 52" aria-hidden="true"><path d="M6 27 28 7l22 20" fill="none" stroke="url(#gg)" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M39 15V9h5v10" fill="none" stroke="url(#gg)" stroke-width="3"/><g fill="url(#gg)"><rect x="22" y="22" width="5" height="5"/><rect x="29" y="22" width="5" height="5"/><rect x="22" y="29" width="5" height="5"/><rect x="29" y="29" width="5" height="5"/></g><path d="M8 40c12 6 30 6 42-4" fill="none" stroke="url(#gg)" stroke-width="3" stroke-linecap="round"/></svg>';
  /* modo 'full' = logo completa (rodapé/herói); padrão = ícone + nome (topo, ocupa pouco espaço) */
  function logoHTML(mode) {
    var alt = esc((E.nome || '') + ' ' + (E.sub || ''));
    if (mode === 'full' && E.logo) return '<img class="logo-img" src="' + esc(img(E.logo)) + '" alt="' + alt + '">';
    var ico = E.icone ? '<img class="logo-i" src="' + esc(img(Core.sm(E.icone))) + '" alt="">' : ICON;
    return ico + '<span class="logo-t"><b>' + esc((E.nome || '').toUpperCase()) + '</b><small>' + esc((E.sub || '').toUpperCase()) + '</small></span>';
  }

  /* ---------- textos fixos ---------- */
  document.title = (E.nome || '') + ' ' + (E.sub || '') + ' | Compra, venda e locação' + (E.cidade ? ' em ' + E.cidade.split(' – ')[0] : '');
  $('#logo').innerHTML = logoHTML();
  var iconUrl = E.icone ? img(Core.sm(E.icone)) : '';
  if (iconUrl) document.documentElement.style.setProperty('--icone', 'url("' + new URL(iconUrl, location.href).href + '")');
  $('#heroBrand').innerHTML = (iconUrl ? '<img class="hb-icon" src="' + esc(img(E.icone)) + '" alt="' + esc((E.nome || '') + ' ' + (E.sub || '')) + '" fetchpriority="high">' : '<p class="hb-name">' + esc((E.nome || '').toUpperCase()) + '<small>' + esc((E.sub || '').toUpperCase()) + '</small></p>') +
    (E.creci ? '<p class="hb-creci"><span>' + esc(E.creci) + '</span></p>' : '');
  $('#heroT').innerHTML = esc(T.heroTitulo) + ' <em>' + esc(T.heroDestaque) + '</em>';
  $('#heroSub').textContent = T.heroSub || '';
  if (T.heroImagem) { var hi = $('#heroImg'); hi.src = img(T.heroImagem); }
  var trust = (T.confianca || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  $('#trust').innerHTML = trust; $('#trust2').innerHTML = trust;
  $('#t-im').textContent = T.catalogoTitulo || 'Imóveis';
  $('#imSub').textContent = T.catalogoSub || '';
  $('#t-fin').textContent = T.financiarTitulo || ''; $('#finSub').textContent = T.financiarSub || '';
  $('#sbEy').textContent = T.sobreEyebrow || ''; $('#t-sb').textContent = T.sobreTitulo || '';
  $('#sbTxt').innerHTML = (T.sobreTexto || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  if (T.sobreImagem) { var si = $('#sbImg'); si.src = img(T.sobreImagem); si.alt = 'Imóvel atendido pela ' + (E.nome || ''); }
  $('#t-ct').textContent = T.contatoTitulo || 'Contato'; $('#ctSub').textContent = T.contatoSub || '';
  if (Core.isPreview) $('#pv').hidden = false;

  var c0 = C[0] || { whatsapp: '', nome: '' };
  var helloMsg = 'Olá! Vim pelo site da ' + (E.nome || 'Chanandry') + ' e gostaria de atendimento.';
  $('#hdrWa').href = wa(c0.whatsapp, helloMsg);

  /* ---------- favoritos ---------- */
  var FKEY = 'chan_fav';
  var favs = [];
  try { favs = JSON.parse(localStorage.getItem(FKEY) || '[]'); } catch (e) { favs = []; }
  favs = favs.filter(function (id) { return IMOVEIS.some(function (i) { return i.id === id; }); });
  function saveFavs() { try { localStorage.setItem(FKEY, JSON.stringify(favs)); } catch (e) { /* ignora */ } paintFavs(); }
  function isFav(id) { return favs.indexOf(id) > -1; }
  function toggleFav(id) {
    var k = favs.indexOf(id);
    if (k > -1) { favs.splice(k, 1); toast('Removido dos favoritos'); } else { favs.push(id); toast('Salvo nos favoritos'); }
    saveFavs();
  }
  function paintFavs() {
    var n = $('#favN'); n.textContent = favs.length; n.hidden = !favs.length;
    $$('[data-fav]').forEach(function (b) {
      var on = isFav(b.getAttribute('data-fav'));
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', on ? 'Remover dos favoritos' : 'Salvar nos favoritos');
    });
    if ($('#favDlg').open) renderFavs();
  }

  /* ---------- filtros e catálogo ---------- */
  var S = { fin: 'todos', tipo: '', bairro: '', quartos: 0, max: 0, q: '', ord: 'rel', shown: 0 };
  var pageSize = function () { return innerWidth >= 1000 ? 6 : 4; };
  var MAXOPT = {
    venda: [[0, 'Qualquer valor'], [300000, 'R$ 300 mil'], [500000, 'R$ 500 mil'], [800000, 'R$ 800 mil'], [1200000, 'R$ 1,2 mi'], [2000000, 'R$ 2 mi']],
    aluguel: [[0, 'Qualquer valor'], [1500, 'R$ 1.500'], [2500, 'R$ 2.500'], [3500, 'R$ 3.500'], [5000, 'R$ 5.000'], [8000, 'R$ 8.000']]
  };
  function fillSelect(sel, opts, val) {
    sel.innerHTML = opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
    sel.value = val;
  }
  var tipos = uniq(IMOVEIS.map(function (i) { return i.tipo; }));
  var bairros = uniq(IMOVEIS.map(function (i) { return i.bairro; }));
  var optsTipo = [['', 'Todos os tipos']].concat(tipos.map(function (t) { return [t, t]; }));
  var optsBairro = [['', 'Todos os bairros']].concat(bairros.map(function (t) { return [t, t]; }));
  fillSelect($('#hsTipo'), optsTipo, ''); fillSelect($('#hsBairro'), optsBairro, '');
  fillSelect($('#fTipo'), optsTipo, ''); fillSelect($('#fBairro'), optsBairro, '');

  function syncUI() {
    $$('#finChips .chip').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fin') === S.fin); });
    var maxSel = $('#fMax'), list = MAXOPT[S.fin];
    if (list) { fillSelect(maxSel, list, String(S.max)); maxSel.disabled = false; maxSel.title = ''; }
    else { fillSelect(maxSel, [[0, 'Escolha acima']], '0'); maxSel.disabled = true; S.max = 0; }
    $('#fTipo').value = S.tipo; $('#fBairro').value = S.bairro; $('#fQuartos').value = String(S.quartos);
    $('#fq').value = S.q; $('#fOrd').value = S.ord;
    var dirty = S.fin !== 'todos' || S.tipo || S.bairro || S.quartos || S.max || S.q;
    $('#fClear').hidden = !dirty;
  }
  function relOrder(a, b) {
    var av = function (x) { return STLBL[x.status] && x.status !== 'reservado' ? 1 : 0; };
    if (av(a) !== av(b)) return av(a) - av(b);
    if (!!b.destaque !== !!a.destaque) return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0);
    return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
  }
  function filtered() {
    var q = norm(S.q);
    var list = IMOVEIS.filter(function (i) {
      if (S.fin !== 'todos' && i.finalidade !== S.fin) return false;
      if (S.tipo && i.tipo !== S.tipo) return false;
      if (S.bairro && i.bairro !== S.bairro) return false;
      if (S.quartos && !(i.quartos >= S.quartos)) return false;
      if (S.max && i.preco && i.preco > S.max) return false;
      if (q && norm([i.titulo, i.bairro, i.cidade, i.tipo, i.id, i.descricao].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
    var by = {
      rel: relOrder,
      novos: function (a, b) { return String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')); },
      menor: function (a, b) { return (a.preco || 1e12) - (b.preco || 1e12); },
      maior: function (a, b) { return (b.preco || 0) - (a.preco || 0); },
      area: function (a, b) { return (b.area || 0) - (a.area || 0); }
    }[S.ord];
    list.sort(by);
    if (S.ord !== 'rel') list.sort(function (a, b) { return (STLBL[a.status] && a.status !== 'reservado' ? 1 : 0) - (STLBL[b.status] && b.status !== 'reservado' ? 1 : 0); });
    return list;
  }
  function specs(i, full) {
    var out = [];
    if (i.quartos) out.push(['i-bed', i.quartos + (full ? (i.quartos > 1 ? ' quartos' : ' quarto') : ''), 'Quartos']);
    if (i.banheiros) out.push(['i-bath', i.banheiros + (full ? (i.banheiros > 1 ? ' banheiros' : ' banheiro') : ''), 'Banheiros']);
    if (i.vagas) out.push(['i-car', i.vagas + (full ? (i.vagas > 1 ? ' vagas' : ' vaga') : ''), 'Vagas']);
    if (i.area) out.push(['i-area', i.area + ' m²', 'Área']);
    return out.map(function (s) { return '<li title="' + s[2] + '"><svg class="ico"><use href="#' + s[0] + '"/></svg><span>' + esc(s[1]) + '</span></li>'; }).join('');
  }
  function isNew(i) {
    var d = Date.parse(i.criadoEm); return d && (Date.now() - d) < 14 * 864e5 && !STLBL[i.status];
  }
  function tagsHTML(i) {
    var t = '<span class="tag tag-' + i.finalidade + '">' + (FINLBL[i.finalidade] || '') + '</span>';
    if (i.destaque) t += '<span class="tag tag-gold">Destaque</span>';
    else if (isNew(i)) t += '<span class="tag tag-new">Novo</span>';
    if (STLBL[i.status]) t += '<span class="tag tag-st">' + STLBL[i.status] + '</span>';
    return t;
  }
  function priceLbl(i) {
    var p = brl(i.preco, i.finalidade);
    return (i.finalidade === 'lancamento' && i.preco ? '<small>a partir de</small>' : '') + p;
  }
  function cardHTML(i) {
    var fotos = (i.fotos && i.fotos.length) ? i.fotos : [];
    var imgs = fotos.map(function (f, k) {
      return '<img src="' + esc(img(sm(f))) + '" alt="' + esc(i.titulo + (fotos.length > 1 ? ', foto ' + (k + 1) : '')) + '" loading="' + (k ? 'lazy' : 'lazy') + '" decoding="async" draggable="false">';
    }).join('') || '<div class="nophoto"><svg class="ico"><use href="#i-home"/></svg></div>';
    var nav = fotos.length > 1 ? '<button class="arr prev" type="button" aria-label="Foto anterior" tabindex="-1"><svg class="ico"><use href="#i-chev"/></svg></button><button class="arr next" type="button" aria-label="Próxima foto" tabindex="-1"><svg class="ico"><use href="#i-chev"/></svg></button><div class="dots" aria-hidden="true">' + fotos.map(function (_, k) { return '<i' + (k ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' : '';
    return '<article class="card' + (STLBL[i.status] && i.status !== 'reservado' ? ' off' : '') + '" data-id="' + esc(i.id) + '">' +
      '<div class="card-media"><div class="car" tabindex="-1">' + imgs + '</div>' + nav +
      '<div class="tags">' + tagsHTML(i) + '</div>' +
      '<button class="fav" type="button" data-fav="' + esc(i.id) + '" aria-pressed="false" aria-label="Salvar nos favoritos"><svg class="ico"><use href="#i-heart"/></svg></button></div>' +
      '<div class="card-body">' +
      '<p class="price">' + priceLbl(i) + '</p>' +
      '<h3 class="card-t"><button type="button" class="open" data-open="' + esc(i.id) + '">' + esc(i.titulo) + '</button></h3>' +
      '<p class="loc"><svg class="ico"><use href="#i-pin"/></svg>' + esc([i.bairro, i.cidade].filter(Boolean).join(', ')) + (i.demo ? ' <em class="demo">· exemplo</em>' : '') + '</p>' +
      '<ul class="specs">' + specs(i) + '</ul>' +
      '<div class="card-act"><button type="button" class="btn btn-line sm open" data-open="' + esc(i.id) + '"><span>Ver detalhes</span><svg class="ico"><use href="#i-arrow"/></svg></button>' +
      '<a class="btn btn-wa sm" target="_blank" rel="noopener" href="' + esc(wa(corr(i.corretora).whatsapp, 'Olá, ' + corr(i.corretora).nome + '! Tenho interesse no imóvel ' + i.id + ' (' + i.titulo + ', ' + i.bairro + '). ' + pageUrl('#imovel-' + i.id))) + '" aria-label="Chamar no WhatsApp sobre ' + esc(i.titulo) + '"><svg class="ico"><use href="#i-wa"/></svg></a></div>' +
      '</div></article>';
  }
  var grid = $('#grid');
  function render(reset) {
    if (reset) S.shown = pageSize();
    var list = filtered(), total = list.length;
    grid.innerHTML = list.slice(0, S.shown).map(cardHTML).join('');
    $('#empty').hidden = total > 0;
    var more = $('#more'); more.hidden = S.shown >= total;
    $('#moreBar').style.setProperty('--p', total ? Math.min(1, S.shown / total) : 0);
    $('#count').textContent = total ? (total === 1 ? '1 imóvel encontrado' : total + ' imóveis encontrados') : 'Nenhum imóvel encontrado';
    $('#moreBtn span').textContent = 'Ver mais imóveis (' + Math.min(S.shown, total) + ' de ' + total + ')';
    paintFavs();
    $$('.card', grid).forEach(function (c) { c.classList.add('shown'); });
    writeURL();
  }
  function writeURL() {
    try {
      var p = new URLSearchParams(location.search);
      ['fin', 'tipo', 'bairro', 'q', 'quartos', 'max', 'ord'].forEach(function (k) { p.delete(k); });
      if (S.fin !== 'todos') p.set('fin', S.fin);
      if (S.tipo) p.set('tipo', S.tipo);
      if (S.bairro) p.set('bairro', S.bairro);
      if (S.q) p.set('q', S.q);
      if (S.quartos) p.set('quartos', S.quartos);
      if (S.max) p.set('max', S.max);
      if (S.ord !== 'rel') p.set('ord', S.ord);
      var qs = p.toString();
      history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) { /* file:// não permite */ }
  }
  (function readURL() {
    var p = new URLSearchParams(location.search);
    if (['venda', 'aluguel', 'lancamento'].indexOf(p.get('fin')) > -1) S.fin = p.get('fin');
    if (tipos.indexOf(p.get('tipo')) > -1) S.tipo = p.get('tipo');
    if (bairros.indexOf(p.get('bairro')) > -1) S.bairro = p.get('bairro');
    S.q = p.get('q') || ''; S.quartos = +p.get('quartos') || 0; S.max = +p.get('max') || 0;
    if (['novos', 'menor', 'maior', 'area'].indexOf(p.get('ord')) > -1) S.ord = p.get('ord');
  })();
  syncUI(); render(true);

  $('#finChips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    S.fin = b.getAttribute('data-fin'); S.max = 0; syncUI(); render(true);
  });
  [['#fTipo', 'tipo'], ['#fBairro', 'bairro'], ['#fOrd', 'ord']].forEach(function (p) {
    $(p[0]).addEventListener('change', function (e) { S[p[1]] = e.target.value; render(true); syncUI(); });
  });
  $('#fQuartos').addEventListener('change', function (e) { S.quartos = +e.target.value; render(true); syncUI(); });
  $('#fMax').addEventListener('change', function (e) { S.max = +e.target.value; render(true); syncUI(); });
  var qT; $('#fq').addEventListener('input', function (e) { S.q = e.target.value.trim(); clearTimeout(qT); qT = setTimeout(function () { render(true); $('#fClear').hidden = !(S.fin !== 'todos' || S.tipo || S.bairro || S.quartos || S.max || S.q); }, 180); });
  $('#fClear').addEventListener('click', function () { S = { fin: 'todos', tipo: '', bairro: '', quartos: 0, max: 0, q: '', ord: 'rel', shown: 0 }; syncUI(); render(true); });
  $('#moreBtn').addEventListener('click', function () {
    var before = grid.children.length; S.shown += pageSize(); render(false);
    var first = grid.children[before]; if (first) { var b = first.querySelector('.open'); if (b) b.focus({ preventScroll: true }); }
  });

  /* busca do herói */
  var heroFin = 'venda';
  $('#hsTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    heroFin = b.getAttribute('data-fin');
    $$('#hsTabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
  });
  $('#heroForm').addEventListener('submit', function (e) {
    e.preventDefault();
    S.fin = heroFin; S.tipo = $('#hsTipo').value; S.bairro = $('#hsBairro').value; S.quartos = +$('#hsQuartos').value; S.max = 0; S.q = '';
    syncUI(); render(true);
    $('#imoveis').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- carrossel dos cards ---------- */
  grid.addEventListener('scroll', function (e) {
    var car = e.target; if (!car.classList || !car.classList.contains('car')) return;
    var k = Math.round(car.scrollLeft / car.clientWidth);
    $$('.dots i', car.parentNode).forEach(function (d, n) { d.classList.toggle('on', n === k); });
  }, true);
  grid.addEventListener('click', function (e) {
    var t = e.target;
    var arr = t.closest('.arr');
    if (arr) {
      var car = arr.parentNode.querySelector('.car');
      car.scrollBy({ left: (arr.classList.contains('next') ? 1 : -1) * car.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    var fav = t.closest('[data-fav]'); if (fav) { toggleFav(fav.getAttribute('data-fav')); return; }
    var op = t.closest('[data-open]'); if (op) { openDetail(op.getAttribute('data-open')); return; }
    var media = t.closest('.car'); if (media) { openDetail(media.closest('.card').getAttribute('data-id')); }
  });

  /* ---------- detalhes do imóvel ---------- */
  var dlg = $('#dlg'), opened = null;
  function openDetail(id, fromHash) {
    var i = IMOVEIS.filter(function (x) { return x.id === id; })[0]; if (!i) return;
    opened = id;
    var c = corr(i.corretora), other = C.filter(function (x) { return x.id !== c.id; })[0];
    var fotos = i.fotos || [];
    var url = pageUrl('#imovel-' + i.id);
    var msg = 'Olá, ' + c.nome + '! Tenho interesse no imóvel ' + i.id + ' (' + i.titulo + ', ' + i.bairro + '). ' + url;
    var gal = fotos.length ? '<div class="dg"><div class="dg-main" id="dgMain">' + fotos.map(function (f, k) {
      return '<img src="' + esc(img(f)) + '" alt="' + esc(i.titulo + ', foto ' + (k + 1)) + '" ' + (k ? 'loading="lazy"' : '') + ' decoding="async" draggable="false">';
    }).join('') + '</div>' +
      (fotos.length > 1 ? '<button class="arr prev" type="button" aria-label="Foto anterior"><svg class="ico"><use href="#i-chev"/></svg></button><button class="arr next" type="button" aria-label="Próxima foto"><svg class="ico"><use href="#i-chev"/></svg></button><p class="dg-n" id="dgN">1 / ' + fotos.length + '</p>' +
        '<div class="dg-th">' + fotos.map(function (f, k) { return '<button type="button" data-k="' + k + '" aria-label="Ver foto ' + (k + 1) + '"' + (k ? '' : ' class="on"') + '><img src="' + esc(img(sm(f))) + '" alt=""></button>'; }).join('') + '</div>' : '') + '</div>' : '<div class="dg"><div class="nophoto big"><svg class="ico"><use href="#i-home"/></svg></div></div>';
    var feats = (i.diferenciais || []).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    var sold = STLBL[i.status] && i.status !== 'reservado';
    dlg.innerHTML = '<div class="dlg-in"><button class="dlg-x" type="button" data-close aria-label="Fechar"><svg class="ico"><use href="#i-x"/></svg></button>' + gal +
      '<div class="dd"><div class="tags">' + tagsHTML(i) + '</div>' +
      '<p class="dd-code">Código ' + esc(i.id) + (i.demo ? ' · imóvel de exemplo' : '') + '</p>' +
      '<h2>' + esc(i.titulo) + '</h2>' +
      '<p class="loc"><svg class="ico"><use href="#i-pin"/></svg>' + esc([i.bairro, i.cidade].filter(Boolean).join(', ')) + ' · <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([i.bairro, i.cidade, 'AP'].filter(Boolean).join(', ')) + '" target="_blank" rel="noopener">ver no mapa</a></p>' +
      '<p class="price big">' + priceLbl(i) + '</p>' +
      '<ul class="specs full">' + specs(i, true) + (i.suites ? '<li><svg class="ico"><use href="#i-bed"/></svg><span>' + i.suites + (i.suites > 1 ? ' suítes' : ' suíte') + '</span></li>' : '') + '</ul>' +
      (i.descricao ? '<h3>Sobre o imóvel</h3><p class="desc">' + esc(i.descricao) + '</p>' : '') +
      (feats ? '<h3>Diferenciais</h3><ul class="feats">' + feats + '</ul>' : '') +
      '<div class="dd-act">' +
      '<a class="btn btn-gold" target="_blank" rel="noopener" href="' + esc(wa(c.whatsapp, sold ? 'Olá! Vi o imóvel ' + i.id + ' no site, mas ele já não está disponível. Podem me mostrar opções parecidas? ' + url : msg)) + '"><svg class="ico"><use href="#i-wa"/></svg><span>' + (sold ? 'Ver opções parecidas' : 'Falar com ' + esc(c.nome.split(' ')[0])) + '</span></a>' +
      (other ? '<a class="btn btn-line" target="_blank" rel="noopener" href="' + esc(wa(other.whatsapp, 'Olá, ' + other.nome + '! Tenho interesse no imóvel ' + i.id + ' (' + i.titulo + '). ' + url)) + '"><span>Chamar ' + esc(other.nome.split(' ')[0]) + '</span></a>' : '') +
      '</div><div class="dd-tools">' +
      '<button type="button" class="tool" data-fav="' + esc(i.id) + '" aria-pressed="false"><svg class="ico"><use href="#i-heart"/></svg><span>Favoritar</span></button>' +
      '<button type="button" class="tool" id="ddShare"><svg class="ico"><use href="#i-share"/></svg><span>Compartilhar</span></button>' +
      (i.finalidade !== 'aluguel' && i.preco ? '<button type="button" class="tool" id="ddSim"><svg class="ico"><use href="#i-area"/></svg><span>Simular financiamento</span></button>' : '') +
      '</div></div></div>';
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0; var inn = $('.dlg-in', dlg); if (inn) inn.scrollTop = 0;
    if (!fromHash) { try { history.pushState({ im: id }, '', '#imovel-' + id); } catch (e) { /* ignora */ } }
    paintFavs();
  }
  dlg.addEventListener('click', function (e) {
    var t = e.target;
    if (t === dlg || t.closest('[data-close]')) { dlg.close(); return; }
    var fav = t.closest('[data-fav]'); if (fav) { toggleFav(fav.getAttribute('data-fav')); return; }
    var main = $('#dgMain', dlg);
    var arr = t.closest('.arr');
    if (arr && main) { main.scrollBy({ left: (arr.classList.contains('next') ? 1 : -1) * main.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); return; }
    var th = t.closest('.dg-th button');
    if (th && main) { main.scrollTo({ left: +th.getAttribute('data-k') * main.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); return; }
    if (t.closest('#ddShare')) { share(); return; }
    if (t.closest('#ddSim')) {
      var i = IMOVEIS.filter(function (x) { return x.id === opened; })[0]; dlg.close(); fillCalc(i.preco);
      $('#financiar').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  });
  dlg.addEventListener('scroll', function (e) {
    var m = e.target; if (m.id !== 'dgMain') return;
    var k = Math.round(m.scrollLeft / m.clientWidth);
    var n = $('#dgN', dlg); if (n) n.textContent = (k + 1) + ' / ' + m.children.length;
    $$('.dg-th button', dlg).forEach(function (b, x) { b.classList.toggle('on', x === k); });
  }, true);
  dlg.addEventListener('close', function () {
    opened = null;
    if (history.state && history.state.im) { try { history.back(); } catch (e) { /* ignora */ } }
    else if (/^#imovel-/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search + '#imoveis'); } catch (e) { /* ignora */ } }
  });
  function share() {
    var i = IMOVEIS.filter(function (x) { return x.id === opened; })[0]; if (!i) return;
    var data = { title: i.titulo, text: i.titulo + ' · ' + brl(i.preco, i.finalidade), url: pageUrl('#imovel-' + i.id) };
    if (navigator.share) { navigator.share(data).catch(function () { /* cancelado */ }); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () { toast('Link copiado'); }, function () { toast(data.url); });
    else toast(data.url);
  }
  window.addEventListener('popstate', function () {
    if (dlg.open && !(history.state && history.state.im)) dlg.close();
    else if (!dlg.open) { var m = /^#imovel-(.+)$/.exec(location.hash); if (m) openDetail(decodeURIComponent(m[1]), true); }
  });
  (function fromHash() { var m = /^#imovel-(.+)$/.exec(location.hash); if (m) openDetail(decodeURIComponent(m[1]), true); })();

  /* ---------- favoritos (gaveta) ---------- */
  var favDlg = $('#favDlg');
  function renderFavs() {
    var list = favs.map(function (id) { return IMOVEIS.filter(function (i) { return i.id === id; })[0]; }).filter(Boolean);
    var msg = 'Olá! Salvei estes imóveis no site da ' + (E.nome || 'Chanandry') + ' e gostaria de conversar sobre eles:\n' + list.map(function (i) { return '• ' + i.id + ' - ' + i.titulo + ' (' + brl(i.preco, i.finalidade) + ') ' + pageUrl('#imovel-' + i.id); }).join('\n');
    favDlg.innerHTML = '<div class="side-in"><div class="side-h"><h2>Meus favoritos</h2><button class="dlg-x pos" type="button" data-close aria-label="Fechar"><svg class="ico"><use href="#i-x"/></svg></button></div>' +
      (list.length ? '<ul class="fl">' + list.map(function (i) {
        return '<li><button type="button" class="fl-i" data-open="' + esc(i.id) + '"><img src="' + esc(img(sm((i.fotos || [])[0] || ''))) + '" alt=""><span><b>' + esc(i.titulo) + '</b><small>' + esc(i.bairro) + ' · ' + brl(i.preco, i.finalidade) + '</small></span></button><button type="button" class="fl-x" data-fav="' + esc(i.id) + '" aria-label="Remover ' + esc(i.titulo) + '"><svg class="ico"><use href="#i-x"/></svg></button></li>';
      }).join('') + '</ul><a class="btn btn-gold" target="_blank" rel="noopener" href="' + esc(wa(c0.whatsapp, msg)) + '"><svg class="ico"><use href="#i-wa"/></svg><span>Enviar meus favoritos</span></a>'
        : '<p class="side-empty">Toque no coração dos imóveis que você gostar. Eles ficam salvos neste aparelho.</p>') + '</div>';
  }
  $('#favBtn').addEventListener('click', function () { renderFavs(); favDlg.showModal(); });
  favDlg.addEventListener('click', function (e) {
    var t = e.target;
    if (t === favDlg || t.closest('[data-close]')) { favDlg.close(); return; }
    var f = t.closest('[data-fav]'); if (f) { toggleFav(f.getAttribute('data-fav')); return; }
    var o = t.closest('[data-open]'); if (o) { favDlg.close(); openDetail(o.getAttribute('data-open')); }
  });

  /* ---------- serviços, equipe, FAQ, contatos, rodapé ---------- */
  $('#svc').innerHTML = (D.servicos || []).map(function (s, n) {
    return '<details class="sv"><summary><span class="n">' + String(n + 1).padStart(2, '0') + '</span><span class="sv-t"><b>' + esc(s.titulo) + '</b><small>' + esc(s.resumo) + '</small></span><svg class="ico pl"><use href="#i-plus"/></svg></summary><ul>' +
      (s.itens || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
  }).join('');
  $('#team').innerHTML = C.map(function (c) {
    var ini = c.nome.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
    return '<article class="tm"><div class="tm-f">' + (c.foto ? '<img src="' + esc(img(sm(c.foto))) + '" alt="' + esc(c.nome) + '" loading="lazy" decoding="async">' : '<span class="mono" aria-hidden="true">' + esc(ini) + '</span>') + '</div>' +
      '<div class="tm-b"><h3>' + esc(c.nome) + '</h3><p class="role">' + esc(c.cargo) + (c.creci ? ' · ' + esc(c.creci) : '') + '</p><p>' + esc(c.bio) + '</p>' +
      '<div class="tm-act"><a class="btn btn-gold sm" target="_blank" rel="noopener" href="' + esc(wa(c.whatsapp, 'Olá, ' + c.nome + '! Vim pelo site da ' + (E.nome || 'Chanandry') + '.')) + '"><svg class="ico"><use href="#i-wa"/></svg><span>WhatsApp</span></a>' +
      '<a class="btn btn-line sm" href="tel:+' + esc(Core.digits(c.whatsapp)) + '"><svg class="ico"><use href="#i-phone"/></svg><span>' + esc(Core.fmtPhone(c.whatsapp)) + '</span></a></div></div></article>';
  }).join('');
  $('#faqList').innerHTML = (D.faq || []).map(function (f) {
    return '<details class="fq"><summary><span>' + esc(f.q) + '</span><svg class="ico pl"><use href="#i-plus"/></svg></summary><p>' + esc(f.a) + '</p></details>';
  }).join('');

  var ig = E.instagram ? E.instagram.replace(/^@/, '') : '';
  var ct = C.map(function (c) {
    return '<li><svg class="ico"><use href="#i-wa"/></svg><span><small>WhatsApp · ' + esc(c.nome.split(' ')[0]) + '</small><a href="' + esc(wa(c.whatsapp, helloMsg)) + '" target="_blank" rel="noopener">' + esc(Core.fmtPhone(c.whatsapp)) + '</a></span></li>';
  }).join('');
  if (ig) ct += '<li><svg class="ico"><use href="#i-ig"/></svg><span><small>Instagram</small><a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(ig) + '</a></span></li>';
  if (E.email) ct += '<li><svg class="ico"><use href="#i-mail"/></svg><span><small>E-mail</small><a href="mailto:' + esc(E.email) + '">' + esc(E.email) + '</a></span></li>';
  if (E.cidade) ct += '<li><svg class="ico"><use href="#i-pin"/></svg><span><small>Atendimento</small>' + esc(E.areas || E.cidade) + '</span></li>';
  if (E.horario) ct += '<li><svg class="ico"><use href="#i-home"/></svg><span><small>Horário</small>' + esc(E.horario) + '</span></li>';
  $('#ctList').innerHTML = ct;
  $('#drawerFoot').innerHTML = C.map(function (c) { return '<a class="btn btn-gold" target="_blank" rel="noopener" href="' + esc(wa(c.whatsapp, helloMsg)) + '"><svg class="ico"><use href="#i-wa"/></svg><span>' + esc(c.nome.split(' ')[0]) + ' · WhatsApp</span></a>'; }).join('');
  $('#footer').innerHTML = '<div class="wrap ft-in"><div class="ft-b"><a class="logo" href="#topo">' + logoHTML('full') + '</a><p>' + esc(T.rodape || '') + '</p></div>' +
    '<nav class="ft-n" aria-label="Rodapé"><a href="#imoveis">Imóveis</a><a href="#servicos">Serviços</a><a href="#financiar">Financiamento</a><a href="#equipe">Equipe</a><a href="#contato">Contato</a></nav>' +
    '<div class="ft-c">' + (ig ? '<a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener"><svg class="ico"><use href="#i-ig"/></svg>@' + esc(ig) + '</a>' : '') + '<span>' + esc(E.creci || '') + (E.cidade ? ' · ' + esc(E.cidade) : '') + '</span></div></div>' +
    '<div class="wrap ft-l"><span>© ' + new Date().getFullYear() + ' ' + esc((E.nome || '') + ' ' + (E.sub || '')) + '. Todos os direitos reservados.</span></div>';

  /* ---------- formulários (WhatsApp) ---------- */
  var FORMS = {
    busca: [
      ['nome', 'Seu nome', 'text', true], ['fone', 'Seu WhatsApp', 'tel'],
      ['obj', 'Quero', 'select', ['Comprar', 'Alugar', 'Investir']],
      ['tipo', 'Tipo de imóvel', 'select', ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Qualquer']],
      ['onde', 'Bairro ou região', 'text'], ['valor', 'Valor máximo (R$)', 'text'],
      ['quartos', 'Quartos', 'select', ['Qualquer', '1', '2', '3', '4 ou mais']],
      ['obs', 'Algo importante para você?', 'textarea']
    ],
    anuncio: [
      ['nome', 'Seu nome', 'text', true], ['fone', 'Seu WhatsApp', 'tel'],
      ['obj', 'Quero', 'select', ['Vender', 'Alugar']],
      ['tipo', 'Tipo de imóvel', 'select', ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Outro']],
      ['onde', 'Bairro e cidade', 'text'], ['valor', 'Valor pretendido (R$)', 'text'],
      ['obs', 'Conte um pouco sobre o imóvel', 'textarea']
    ]
  };
  var formKind = 'busca';
  function buildFields() {
    $('#fields').innerHTML = FORMS[formKind].map(function (f) {
      var id = 'ff-' + f[0], req = f[3] === true;
      var inp = f[2] === 'select' ? '<select id="' + id + '">' + f[3].map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>'
        : f[2] === 'textarea' ? '<textarea id="' + id + '" rows="3"></textarea>'
          : '<input id="' + id + '" type="' + f[2] + '"' + (f[2] === 'tel' ? ' inputmode="tel" autocomplete="tel"' : f[0] === 'nome' ? ' autocomplete="name"' : '') + (req ? ' required' : '') + '>';
      return '<label class="f' + (f[2] === 'textarea' ? ' wide' : '') + '"><span>' + esc(f[1]) + (req ? ' *' : '') + '</span>' + inp + '</label>';
    }).join('');
  }
  function setFormKind(k) {
    formKind = k; $$('#formTabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-k') === k); });
    buildFields(); $('#ferr').textContent = '';
  }
  $('#formTabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setFormKind(b.getAttribute('data-k')); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-form]'); if (a) setFormKind(a.getAttribute('data-form'));
  });
  $('#fCorr').innerHTML = C.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>'; }).join('');
  buildFields();
  $('#form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (k) { var el = $('#ff-' + k); return el ? el.value.trim() : ''; };
    if (!v('nome')) { $('#ferr').textContent = 'Conte seu nome para a gente te atender.'; $('#ff-nome').focus(); return; }
    var c = corr($('#fCorr').value), m = [];
    if (formKind === 'busca') {
      m.push('Olá, ' + c.nome.split(' ')[0] + '! Sou ' + v('nome') + '.');
      m.push('Quero ' + v('obj').toLowerCase() + ' um imóvel (' + v('tipo').toLowerCase() + ')' + (v('onde') ? ' em ' + v('onde') : '') + (v('valor') ? ', até R$ ' + v('valor') : '') + (v('quartos') && v('quartos') !== 'Qualquer' ? ', com ' + v('quartos') + ' quartos' : '') + '.');
    } else {
      m.push('Olá, ' + c.nome.split(' ')[0] + '! Sou ' + v('nome') + '.');
      m.push('Quero ' + v('obj').toLowerCase() + ' meu imóvel (' + v('tipo').toLowerCase() + ')' + (v('onde') ? ' em ' + v('onde') : '') + (v('valor') ? ', valor pretendido R$ ' + v('valor') : '') + '.');
    }
    if (v('obs')) m.push(v('obs'));
    if (v('fone')) m.push('Meu WhatsApp: ' + v('fone'));
    $('#ferr').textContent = '';
    window.open(wa(c.whatsapp, m.join('\n')), '_blank', 'noopener');
  });

  /* ---------- simulador ---------- */
  var sys = 'price';
  var num = function (id) { return Math.max(0, parseFloat($(id).value) || 0); };
  $('#cTaxa').value = T.taxaPadrao || 11.5;
  function calc() {
    var valor = num('#cValor'), ent = Math.min(num('#cEntrada'), valor), anos = +$('#cPrazo').value, n = anos * 12;
    var pv = valor - ent, i = Math.pow(1 + num('#cTaxa') / 100, 1 / 12) - 1, p1, pn, total;
    $('#cPrazoV').textContent = anos + ' anos';
    if (!pv) { p1 = pn = total = 0; }
    else if (sys === 'price') { p1 = pn = i ? pv * i / (1 - Math.pow(1 + i, -n)) : pv / n; total = p1 * n; }
    else { var am = pv / n; p1 = am + pv * i; pn = am * (1 + i); total = n * am + i * pv * (n + 1) / 2; }
    var f = function (x) { return brl(Math.round(x)); };
    $('#rParcela').textContent = f(p1); $('#rFin').textContent = f(pv); $('#rUlt').textContent = f(pn);
    $('#rUltW').hidden = sys === 'price'; $('#rTotal').textContent = f(total); $('#rJuros').textContent = f(Math.max(0, total - pv));
    $('#rRenda').textContent = f(p1 / 0.3);
    var msg = 'Olá! Fiz uma simulação no site: imóvel de ' + f(valor) + ', entrada de ' + f(ent) + ', ' + anos + ' anos (' + (sys === 'price' ? 'Price' : 'SAC') + '), primeira parcela estimada de ' + f(p1) + '. Quero uma simulação real.';
    $('#cWa').href = wa(c0.whatsapp, msg);
  }
  function fillCalc(valor) {
    $('#cValor').value = valor; $('#cEntrada').value = Math.round(valor * 0.2 / 1000) * 1000; calc();
  }
  $('#calc').addEventListener('input', calc);
  $('#calc .seg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; sys = b.getAttribute('data-s');
    $$('#calc .seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); calc();
  });
  calc();

  /* ---------- cabeçalho, menu, botão flutuante ---------- */
  var hdr = $('#hdr');
  function onScroll() { hdr.classList.toggle('stuck', scrollY > 24); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var drawer = $('#drawer'), menuBtn = $('#menuBtn');
  function setMenu(open) {
    drawer.classList.toggle('open', open); drawer.setAttribute('aria-hidden', !open);
    menuBtn.setAttribute('aria-expanded', open); document.body.classList.toggle('lock', open);
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!drawer.classList.contains('open')); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); fabClose(); } });

  var fabP = $('#fabP'), fabB = $('#fabB');
  fabP.innerHTML = '<p>Quem você quer chamar?</p>' + C.map(function (c) {
    return '<a href="' + esc(wa(c.whatsapp, helloMsg)) + '" target="_blank" rel="noopener"><svg class="ico"><use href="#i-wa"/></svg><span><b>' + esc(c.nome.split(' ')[0]) + '</b><small>' + esc(Core.fmtPhone(c.whatsapp)) + '</small></span></a>';
  }).join('');
  function fabClose() { fabP.hidden = true; fabB.setAttribute('aria-expanded', 'false'); }
  fabB.addEventListener('click', function () {
    if (C.length === 1) { window.open(wa(c0.whatsapp, helloMsg), '_blank', 'noopener'); return; }
    fabP.hidden = !fabP.hidden; fabB.setAttribute('aria-expanded', !fabP.hidden);
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('#fab')) fabClose(); });

  /* ---------- revelar ao rolar + menu ativo ---------- */
  $$('.sec-h, .sv, .tm, .fq, .about-t, .about-f, .calc, .form, .ct-t').forEach(function (el) { el.classList.add('rv'); });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('shown'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
    var links = $$('#nav a'), secs = ['imoveis', 'servicos', 'financiar', 'sobre', 'equipe', 'contato'].map(function (id) { return document.getElementById(id); });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('act', a.getAttribute('href') === '#' + en.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { if (s) spy.observe(s); });
  } else { $$('.rv').forEach(function (el) { el.classList.add('shown'); }); }

  /* ---------- dados estruturados (SEO) ---------- */
  var ld = [{
    '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: ((E.nome || '') + ' ' + (E.sub || '')).trim(),
    url: pageUrl(''), telephone: C.map(function (c) { return '+' + Core.digits(c.whatsapp); }),
    address: { '@type': 'PostalAddress', addressLocality: (E.cidade || '').split(' – ')[0], addressRegion: (E.cidade || '').split(' – ')[1] || '', addressCountry: 'BR' },
    sameAs: ig ? ['https://instagram.com/' + ig] : []
  }, {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: (D.faq || []).map(function (f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; })
  }];
  var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
})();
