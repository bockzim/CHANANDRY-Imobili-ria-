/* Painel de edição. Tudo acontece no navegador: o rascunho fica salvo neste aparelho
   e só vai para o site quando você publica (GitHub direto ou pacote .zip). */
(async function () {
  'use strict';
  if (window.Gate) await Gate.ready();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = Core.esc;
  await Core.loadBlobUrls();

  var PUB = JSON.stringify(Core.published());
  var K_LAST = 'chan_imob_lastpub', K_GH = 'chan_imob_gh', K_PUSHED = 'chan_imob_pushed';
  var draft = Core.loadDraft() || Core.published();
  draft.empresa = draft.empresa || {}; draft.textos = draft.textos || {};
  draft.imoveis = draft.imoveis || []; draft.corretoras = draft.corretoras || [];
  draft.servicos = draft.servicos || []; draft.faq = draft.faq || [];
  var tab = 'imoveis', searchQ = '';
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var ls = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignora */ } };
  var today = function () { return new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  var getp = function (o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); };
  var setp = function (o, p, v) { var ks = p.split('.'), l = ks.pop(); var t = ks.reduce(function (a, k) { return (a[k] = a[k] || {}); }, o); t[l] = v; };

  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function ask(title, msg, ok, danger) {
    var cf = $('#cf');
    return new Promise(function (res) {
      cf.innerHTML = '<h3>' + esc(title) + '</h3><p>' + msg + '</p><div class="acts"><button class="b b-line" data-r="0" type="button">Cancelar</button><button class="b ' + (danger ? 'b-danger' : 'b-gold') + '" data-r="1" type="button">' + esc(ok) + '</button></div>';
      cf.onclick = function (e) { var b = e.target.closest('[data-r]'); if (b) { cf.close(); res(b.getAttribute('data-r') === '1'); } };
      cf.oncancel = function () { res(false); };
      cf.showModal();
    });
  }
  function dirty() { var c = JSON.stringify(draft); return c !== PUB && c !== localStorage.getItem(K_LAST); }
  function paintStatus() { var s = $('#st'), d = dirty(); s.textContent = d ? 'Alterações ainda não publicadas' : 'Tudo publicado'; s.classList.toggle('dirty', d); }
  function persist() { Core.saveDraft(draft); paintStatus(); }
  var saveT; function persistSoon() { clearTimeout(saveT); saveT = setTimeout(persist, 250); paintStatus(); }

  /* ================= abas ================= */
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go(b.getAttribute('data-t')); });
  $('#btnPub').addEventListener('click', function () { go('publicar'); });
  function go(t) {
    tab = t; $$('#tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t); });
    render(); window.scrollTo(0, 0);
  }
  function render() {
    var v = $('#view');
    v.innerHTML = { imoveis: viewImoveis, textos: viewTextos, equipe: viewEquipe, servicos: viewServicos, publicar: viewPublicar }[tab]();
    if (tab === 'imoveis') renderList();
    if (tab === 'publicar') bindPublicar();
    paintStatus();
  }

  /* ================= campos genéricos ================= */
  function field(path, label, type, hint) {
    var v = getp(draft, path), id = 'f-' + path.replace(/\./g, '-');
    if (type === 'image') {
      return '<div class="fld"><span>' + esc(label) + '</span><div class="imgf" data-img="' + esc(path) + '">' +
        (v ? '<img src="' + esc(Core.img(Core.sm(v)) || Core.img(v)) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(Core.img(v)) + '\'">' : '<div class="none">sem imagem</div>') +
        '<button type="button" class="b b-line sm" data-act="img-pick">' + (v ? 'Trocar' : 'Escolher') + ' imagem</button>' +
        (v ? '<button type="button" class="b b-ghost sm" data-act="img-clear">Remover</button>' : '') + '</div>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
    }
    var val = type === 'list' ? (v || []).join('\n') : (v == null ? '' : v);
    var el = (type === 'textarea' || type === 'list')
      ? '<textarea id="' + id + '" data-path="' + esc(path) + '" data-type="' + type + '" rows="' + (type === 'list' ? 4 : 3) + '">' + esc(val) + '</textarea>'
      : '<input id="' + id + '" data-path="' + esc(path) + '" data-type="' + (type || 'text') + '" type="' + (type === 'number' ? 'number' : 'text') + '"' + (type === 'number' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(val) + '">';
    return '<label class="fld"><span>' + esc(label) + '</span>' + el + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
  }
  $('#view').addEventListener('input', function (e) {
    var t = e.target, p = t.getAttribute && t.getAttribute('data-path'); if (!p) return;
    var type = t.getAttribute('data-type'), v = t.value;
    if (type === 'number') v = v === '' ? 0 : parseFloat(v) || 0;
    else if (type === 'list') v = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    setp(draft, p, v); persistSoon();
  });

  /* envio de imagem para campos de texto/equipe */
  var imgInput = document.createElement('input');
  imgInput.type = 'file'; imgInput.accept = 'image/*'; imgInput.hidden = true; document.body.appendChild(imgInput);
  var imgTarget = null;
  imgInput.addEventListener('change', async function () {
    var f = imgInput.files[0]; imgInput.value = ''; if (!f || !imgTarget) return;
    var path = imgTarget, isLogo = /logo/i.test(path);
    try {
      toast('Processando imagem…');
      var r = await Core.processPhoto(f, isLogo ? 700 : 1800, isLogo ? 350 : 800);
      var dir = isLogo ? 'assets/img/site/logo-' : 'assets/img/site/';
      var np = dir + Core.uid() + '.' + r.ext;
      await Core.putBlob(np, r.full); await Core.putBlob(Core.sm(np), r.sm);
      setp(draft, path, np); persist(); render(); toast('Imagem atualizada');
    } catch (err) { toast(err.message || 'Não consegui usar essa imagem'); }
  });
  $('#view').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), box = b.closest('[data-img]');
    if (act === 'img-pick' && box) { imgTarget = box.getAttribute('data-img'); imgInput.click(); }
    else if (act === 'img-clear' && box) { setp(draft, box.getAttribute('data-img'), ''); persist(); render(); }
    else if (ACT[act]) ACT[act](b);
  });
  var ACT = {};

  /* ================= IMÓVEIS ================= */
  var FIN = { venda: 'Venda', aluguel: 'Aluguel', lancamento: 'Lançamento' };
  var ST = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido', alugado: 'Alugado', oculto: 'Oculto (não aparece no site)' };
  function viewImoveis() {
    var demo = draft.imoveis.filter(function (i) { return i.demo; }).length;
    return '<div class="h"><div><h2>Imóveis</h2><p class="sub">Cadastre, edite e esconda imóveis. As fotos são redimensionadas sozinhas. Depois de mexer, vá em <b>Publicar</b>.</p></div><button class="b b-gold" type="button" data-act="new">+ Novo imóvel</button></div>' +
      (demo ? '<div class="banner"><span><b>' + demo + ' imóvel' + (demo > 1 ? 'is' : '') + ' de exemplo</b> no site. Eles aparecem com o aviso "exemplo". Edite-os ou apague quando tiver os imóveis reais.</span><button class="b b-danger sm" type="button" data-act="rm-demo">Apagar exemplos</button></div>' : '') +
      '<div class="row-tools"><label class="fld"><span>Buscar</span><input id="iq" type="search" placeholder="Título, bairro ou código" value="' + esc(searchQ) + '"></label></div><div class="il" id="il"></div>';
  }
  function renderList() {
    var q = norm(searchQ), box = $('#il'); if (!box) return;
    var rows = draft.imoveis.map(function (i, k) { return [i, k]; }).filter(function (r) { return !q || norm([r[0].titulo, r[0].bairro, r[0].id].join(' ')).indexOf(q) > -1; });
    box.innerHTML = rows.length ? rows.map(function (r) {
      var i = r[0], k = r[1], ft = (i.fotos || [])[0];
      var price = i.preco ? Number(i.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + (i.finalidade === 'aluguel' ? '/mês' : '') : 'Sob consulta';
      return '<article class="it' + (i.status === 'oculto' ? ' off' : '') + '" data-k="' + k + '">' +
        (ft ? '<img src="' + esc(Core.img(Core.sm(ft))) + '" alt="">' : '<div class="ph">sem foto</div>') +
        '<div><b>' + esc(i.titulo || '(sem título)') + '</b><div class="tg"><span class="pill">' + esc(FIN[i.finalidade] || '') + '</span>' +
        (i.destaque ? '<span class="pill g">Destaque</span>' : '') + (i.status !== 'disponivel' ? '<span class="pill ' + (i.status === 'oculto' ? 'r' : 'w') + '">' + esc((ST[i.status] || '').split(' (')[0]) + '</span>' : '') + (i.demo ? '<span class="pill w">Exemplo</span>' : '') + '</div>' +
        '<p>' + esc(i.id) + ' · ' + esc(price) + ' · ' + esc([i.bairro, i.cidade].filter(Boolean).join(', ')) + ' · ' + (i.fotos || []).length + ' foto(s)</p></div>' +
        '<div class="it-act"><button class="b b-line sm" type="button" data-act="edit">Editar</button><button class="b b-ghost sm" type="button" data-act="dup">Duplicar</button><button class="b b-ghost sm" type="button" data-act="hide">' + (i.status === 'oculto' ? 'Mostrar' : 'Ocultar') + '</button><button class="b b-ghost sm" type="button" data-act="del" style="color:var(--bad)">Excluir</button></div></article>';
    }).join('') : '<p class="sub">Nenhum imóvel encontrado.</p>';
  }
  $('#view').addEventListener('input', function (e) { if (e.target.id === 'iq') { searchQ = e.target.value; renderList(); } });
  function nextId() {
    var m = 0; draft.imoveis.forEach(function (i) { var n = parseInt((String(i.id).match(/(\d+)$/) || [])[1], 10); if (n > m) m = n; });
    return 'CH-' + String(m + 1).padStart(3, '0');
  }
  ACT.new = function () { openEditor(-1); };
  ACT['rm-demo'] = async function () {
    if (!await ask('Apagar imóveis de exemplo?', 'Só os marcados como exemplo serão removidos. Os que você cadastrou ficam.', 'Apagar exemplos', true)) return;
    draft.imoveis = draft.imoveis.filter(function (i) { return !i.demo; }); persist(); render(); toast('Exemplos apagados');
  };
  function rowK(b) { return +b.closest('.it').getAttribute('data-k'); }
  ACT.edit = function (b) { openEditor(rowK(b)); };
  ACT.dup = function (b) {
    var o = Core.clone(draft.imoveis[rowK(b)]); o.id = nextId(); o.titulo += ' (cópia)'; o.demo = false; o.criadoEm = today();
    draft.imoveis.unshift(o); persist(); render(); toast('Imóvel duplicado');
  };
  ACT.hide = function (b) {
    var i = draft.imoveis[rowK(b)]; i.status = i.status === 'oculto' ? 'disponivel' : 'oculto'; persist(); renderList();
    toast(i.status === 'oculto' ? 'Imóvel escondido do site' : 'Imóvel visível de novo');
  };
  ACT.del = async function (b) {
    var k = rowK(b), i = draft.imoveis[k];
    if (!await ask('Excluir imóvel?', 'Você vai excluir <b>' + esc(i.titulo) + '</b>. Para só esconder do site, use "Ocultar".', 'Excluir', true)) return;
    draft.imoveis.splice(k, 1); persist(); render(); toast('Imóvel excluído');
  };

  /* ---- editor ---- */
  var cur = null, curIdx = -1;
  function openEditor(idx) {
    curIdx = idx;
    cur = idx >= 0 ? Core.clone(draft.imoveis[idx]) : {
      id: nextId(), titulo: '', finalidade: 'venda', tipo: 'Casa', status: 'disponivel', destaque: false, demo: false, preco: 0,
      bairro: '', cidade: (draft.empresa.cidade || '').split(' – ')[0], quartos: 0, suites: 0, banheiros: 0, vagas: 0, area: 0,
      descricao: '', diferenciais: [], fotos: [], corretora: (draft.corretoras[0] || {}).id || '', criadoEm: today()
    };
    var opt = function (obj, sel) { return Object.keys(obj).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(obj[k]) + '</option>'; }).join(''); };
    var tipos = ['Casa', 'Apartamento', 'Cobertura', 'Terreno', 'Comercial', 'Condomínio', 'Chácara'];
    draft.imoveis.forEach(function (i) { if (tipos.indexOf(i.tipo) < 0) tipos.push(i.tipo); });
    var bairros = []; draft.imoveis.forEach(function (i) { if (i.bairro && bairros.indexOf(i.bairro) < 0) bairros.push(i.bairro); });
    var n = function (k, l) { return '<label class="fld"><span>' + l + '</span><input data-e="' + k + '" type="number" inputmode="numeric" min="0" step="any" value="' + (cur[k] || 0) + '"></label>'; };
    $('#ed').innerHTML = '<div class="ed-in"><div class="ed-h"><h2>' + (idx >= 0 ? 'Editar imóvel' : 'Novo imóvel') + '</h2><button class="b b-line sm" type="button" data-ed="cancel">Fechar</button></div><div class="ed-b">' +
      '<fieldset class="fs"><legend>Informações</legend>' +
      '<label class="fld"><span>Título do anúncio *</span><input data-e="titulo" type="text" value="' + esc(cur.titulo) + '" placeholder="Ex.: Casa com piscina no Jardim Marco Zero"></label>' +
      '<div class="grid2"><label class="fld"><span>Finalidade</span><select data-e="finalidade">' + opt(FIN, cur.finalidade) + '</select></label>' +
      '<label class="fld"><span>Tipo</span><input data-e="tipo" list="dl-tipos" value="' + esc(cur.tipo) + '"><datalist id="dl-tipos">' + tipos.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></label>' +
      '<label class="fld"><span>Situação</span><select data-e="status">' + opt(ST, cur.status) + '</select></label>' +
      '<label class="fld"><span>Código</span><input data-e="id" type="text" value="' + esc(cur.id) + '"></label></div>' +
      '<label class="chk"><input data-e="destaque" type="checkbox"' + (cur.destaque ? ' checked' : '') + '> Mostrar como destaque (aparece primeiro)</label>' +
      '<label class="chk"><input data-e="demo" type="checkbox"' + (cur.demo ? ' checked' : '') + '> Imóvel de exemplo (mostra o aviso "exemplo" no site)</label></fieldset>' +
      '<fieldset class="fs"><legend>Valor e local</legend><div class="grid2">' +
      '<label class="fld"><span>Preço (R$)</span><input data-e="preco" type="number" inputmode="numeric" min="0" step="any" value="' + (cur.preco || '') + '" placeholder="0 = sob consulta"><small>Aluguel: valor por mês. Lançamento: valor "a partir de".</small></label>' +
      '<label class="fld"><span>Quem atende</span><select data-e="corretora">' + draft.corretoras.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === cur.corretora ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>Bairro</span><input data-e="bairro" list="dl-bairros" value="' + esc(cur.bairro) + '"><datalist id="dl-bairros">' + bairros.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></label>' +
      '<label class="fld"><span>Cidade</span><input data-e="cidade" type="text" value="' + esc(cur.cidade) + '"></label></div></fieldset>' +
      '<fieldset class="fs"><legend>Características</legend><div class="grid4">' + n('quartos', 'Quartos') + n('suites', 'Suítes') + n('banheiros', 'Banheiros') + n('vagas', 'Vagas') + n('area', 'Área (m²)') + '</div></fieldset>' +
      '<fieldset class="fs"><legend>Descrição</legend><label class="fld"><span>Texto do anúncio</span><textarea data-e="descricao" rows="5">' + esc(cur.descricao) + '</textarea></label>' +
      '<label class="fld"><span>Diferenciais (um por linha)</span><textarea data-e="diferenciais" rows="4" placeholder="Piscina&#10;Área gourmet">' + esc((cur.diferenciais || []).join('\n')) + '</textarea></label></fieldset>' +
      '<fieldset class="fs"><legend>Fotos</legend><p class="sub">A primeira foto é a capa. Use as setas para mudar a ordem.</p><div class="ph-grid" id="phGrid"></div>' +
      '<div class="drop" id="drop"><span>Arraste as fotos aqui ou escolha no aparelho</span><button class="b b-line" type="button" data-ed="pick">Adicionar fotos</button><small id="phMsg"></small></div></fieldset>' +
      '<p class="err" id="edErr" role="alert"></p></div>' +
      '<div class="ed-f"><button class="b b-line" type="button" data-ed="cancel">Cancelar</button><button class="b b-gold" type="button" data-ed="save">Salvar imóvel</button></div></div>';
    renderPhotos(); $('#ed').showModal(); var eb = $('.ed-b', $('#ed')); if (eb) eb.scrollTop = 0;
  }
  function renderPhotos() {
    var g = $('#phGrid'); if (!g) return;
    g.innerHTML = cur.fotos.length ? cur.fotos.map(function (f, k) {
      return '<div class="ph-i" data-k="' + k + '"><img src="' + esc(Core.img(Core.sm(f))) + '" alt="Foto ' + (k + 1) + '">' + (k === 0 ? '<span class="pill g cap">Capa</span>' : '') +
        '<div class="ctl"><button type="button" data-ed="left" aria-label="Mover para trás"' + (k === 0 ? ' disabled' : '') + '>←</button><button type="button" data-ed="right" aria-label="Mover para frente"' + (k === cur.fotos.length - 1 ? ' disabled' : '') + '>→</button><button type="button" class="x" data-ed="rm" aria-label="Remover foto">✕</button></div></div>';
    }).join('') : '<p class="sub full">Nenhuma foto ainda.</p>';
  }
  var phInput = document.createElement('input'); phInput.type = 'file'; phInput.accept = 'image/*'; phInput.multiple = true; phInput.hidden = true; document.body.appendChild(phInput);
  phInput.addEventListener('change', function () { addFiles(phInput.files); phInput.value = ''; });
  async function addFiles(files) {
    var list = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name); });
    var msg = $('#phMsg'), ok = 0;
    for (var i = 0; i < list.length; i++) {
      if (msg) msg.textContent = 'Processando foto ' + (i + 1) + ' de ' + list.length + '…';
      try {
        var r = await Core.processPhoto(list[i]);
        var p = 'assets/img/imoveis/' + Core.uid() + '.' + r.ext;
        await Core.putBlob(p, r.full); await Core.putBlob(Core.sm(p), r.sm);
        cur.fotos.push(p); ok++; renderPhotos();
      } catch (err) { if (msg) msg.textContent = err.message; }
    }
    if (msg && ok) msg.textContent = ok + ' foto(s) adicionada(s).';
  }
  var ed = $('#ed');
  ed.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ed]'); if (!b) return;
    var a = b.getAttribute('data-ed'), k = +(b.closest('.ph-i') || { getAttribute: function () { return -1; } }).getAttribute('data-k');
    if (a === 'pick') phInput.click();
    else if (a === 'left' && k > 0) { cur.fotos.splice(k - 1, 0, cur.fotos.splice(k, 1)[0]); renderPhotos(); }
    else if (a === 'right' && k < cur.fotos.length - 1) { cur.fotos.splice(k + 1, 0, cur.fotos.splice(k, 1)[0]); renderPhotos(); }
    else if (a === 'rm') { cur.fotos.splice(k, 1); renderPhotos(); }
    else if (a === 'cancel') ed.close();
    else if (a === 'save') saveEditor();
  });
  ['dragover', 'dragenter'].forEach(function (ev) { ed.addEventListener(ev, function (e) { var d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } }); });
  ['dragleave', 'drop'].forEach(function (ev) { ed.addEventListener(ev, function (e) { var d = e.target.closest('#drop'); if (d) { d.classList.remove('over'); if (ev === 'drop') { e.preventDefault(); addFiles(e.dataTransfer.files); } } }); });
  function saveEditor() {
    var v = {}; $$('[data-e]', ed).forEach(function (el) { v[el.getAttribute('data-e')] = el.type === 'checkbox' ? el.checked : el.value; });
    var err = $('#edErr');
    if (!String(v.titulo).trim()) { err.textContent = 'Dê um título para o anúncio.'; $('[data-e=titulo]', ed).focus(); return; }
    var id = String(v.id).trim() || nextId();
    if (draft.imoveis.some(function (i, k) { return i.id === id && k !== curIdx; })) { err.textContent = 'Já existe um imóvel com o código ' + id + '. Mude o código.'; return; }
    var num = function (x) { return Math.max(0, parseFloat(x) || 0); };
    var o = Object.assign({}, cur, {
      id: id, titulo: String(v.titulo).trim(), finalidade: v.finalidade, tipo: String(v.tipo).trim() || 'Imóvel', status: v.status, destaque: v.destaque, demo: v.demo,
      preco: num(v.preco), bairro: String(v.bairro).trim(), cidade: String(v.cidade).trim(), corretora: v.corretora,
      quartos: num(v.quartos), suites: num(v.suites), banheiros: num(v.banheiros), vagas: num(v.vagas), area: num(v.area),
      descricao: String(v.descricao).trim(), diferenciais: String(v.diferenciais).split('\n').map(function (s) { return s.trim(); }).filter(Boolean), fotos: cur.fotos.slice()
    });
    if (curIdx >= 0) draft.imoveis[curIdx] = o; else draft.imoveis.unshift(o);
    persist(); ed.close(); render(); toast('Imóvel salvo');
  }

  /* ================= TEXTOS ================= */
  var SCHEMA = [
    ['Topo do site', [['textos.heroEyebrow', 'Frase pequena acima do título'], ['textos.heroTitulo', 'Título (parte branca)'], ['textos.heroDestaque', 'Título (parte dourada)'], ['textos.heroSub', 'Texto de apoio', 'textarea'], ['textos.heroImagem', 'Foto de fundo do topo', 'image', 'Use uma foto horizontal, de boa qualidade.'], ['textos.confianca', 'Selos de confiança (um por linha)', 'list']]],
    ['Lista de imóveis', [['textos.catalogoTitulo', 'Título'], ['textos.catalogoSub', 'Texto', 'textarea']]],
    ['Sobre a empresa', [['textos.sobreEyebrow', 'Frase pequena'], ['textos.sobreTitulo', 'Título'], ['textos.sobreTexto', 'Texto (um parágrafo por linha)', 'list'], ['textos.sobreImagem', 'Foto da seção', 'image']]],
    ['Financiamento', [['textos.financiarTitulo', 'Título'], ['textos.financiarSub', 'Texto', 'textarea'], ['textos.taxaPadrao', 'Juros ao ano sugeridos no simulador (%)', 'number']]],
    ['Contato e rodapé', [['textos.contatoTitulo', 'Título'], ['textos.contatoSub', 'Texto', 'textarea'], ['textos.rodape', 'Frase do rodapé'], ['empresa.instagram', 'Instagram (sem @)'], ['empresa.email', 'E-mail (opcional)'], ['empresa.horario', 'Horário de atendimento (opcional)'], ['empresa.areas', 'Região de atendimento']]],
    ['Empresa e logo', [['empresa.nome', 'Nome'], ['empresa.sub', 'Complemento do nome'], ['empresa.creci', 'CRECI'], ['empresa.cidade', 'Cidade – UF'], ['empresa.logo', 'Logo completa', 'image', 'Aparece no começo do site e no rodapé. Prefira PNG com fundo transparente.'], ['empresa.icone', 'Ícone da casa (topo do site)', 'image', 'Só o desenho, sem o nome. Se ficar vazio, o topo usa um desenho provisório.']]]
  ];
  function viewTextos() {
    return '<div class="h"><div><h2>Textos e contatos</h2><p class="sub">As mudanças são salvas sozinhas neste aparelho. Para ver como ficou, toque em "Ver prévia". Para colocar no ar, use "Publicar".</p></div></div>' +
      SCHEMA.map(function (g) { return '<section class="card"><h3>' + esc(g[0]) + '</h3><div class="grid2">' + g[1].map(function (f) { return '<div class="' + (f[2] === 'textarea' || f[2] === 'list' || f[2] === 'image' ? 'full' : '') + '">' + field(f[0], f[1], f[2], f[3]) + '</div>'; }).join('') + '</div></section>'; }).join('');
  }

  /* ================= EQUIPE ================= */
  function viewEquipe() {
    return '<div class="h"><div><h2>Equipe</h2><p class="sub">Quem aparece no site e recebe os contatos pelo WhatsApp. O número vai com 55 + DDD + número, só dígitos (ex.: 5596984101661).</p></div><button class="b b-gold" type="button" data-act="c-add">+ Adicionar pessoa</button></div>' +
      draft.corretoras.map(function (c, k) {
        var p = 'corretoras.' + k + '.';
        return '<section class="rep"><div class="rep-h"><b>' + esc(c.nome || 'Nova pessoa') + '</b><div class="acts"><button class="b b-ghost sm" type="button" data-act="c-up" data-i="' + k + '"' + (k === 0 ? ' disabled' : '') + '>↑ Subir</button><button class="b b-ghost sm" type="button" data-act="c-dn" data-i="' + k + '"' + (k === draft.corretoras.length - 1 ? ' disabled' : '') + '>↓ Descer</button><button class="b b-ghost sm" type="button" data-act="c-rm" data-i="' + k + '" style="color:var(--bad)">Remover</button></div></div>' +
          '<div class="grid2">' + field(p + 'nome', 'Nome') + field(p + 'cargo', 'Cargo') + field(p + 'creci', 'CRECI pessoal (opcional)') + field(p + 'whatsapp', 'WhatsApp (com 55 e DDD)') +
          '<div class="full">' + field(p + 'bio', 'Apresentação', 'textarea') + '</div><div class="full">' + field(p + 'foto', 'Foto', 'image', 'Foto em pé (retrato) fica melhor.') + '</div></div></section>';
      }).join('');
  }
  var slug = function (s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pessoa'; };
  ACT['c-add'] = function () {
    var id = 'pessoa-' + Core.uid().slice(0, 4);
    draft.corretoras.push({ id: id, nome: 'Nova pessoa', cargo: 'Corretor(a) de imóveis', creci: '', whatsapp: '', foto: '', bio: '' });
    persist(); render(); toast('Pessoa adicionada. Preencha os dados.');
  };
  ACT['c-up'] = function (b) { var i = +b.getAttribute('data-i'); draft.corretoras.splice(i - 1, 0, draft.corretoras.splice(i, 1)[0]); persist(); render(); };
  ACT['c-dn'] = function (b) { var i = +b.getAttribute('data-i'); draft.corretoras.splice(i + 1, 0, draft.corretoras.splice(i, 1)[0]); persist(); render(); };
  ACT['c-rm'] = async function (b) {
    var i = +b.getAttribute('data-i'), c = draft.corretoras[i];
    if (draft.corretoras.length < 2) { toast('Mantenha pelo menos uma pessoa no site.'); return; }
    if (!await ask('Remover ' + (c.nome || 'pessoa') + '?', 'Os imóveis dela passam para a primeira pessoa da lista.', 'Remover', true)) return;
    draft.corretoras.splice(i, 1);
    draft.imoveis.forEach(function (im) { if (im.corretora === c.id) im.corretora = draft.corretoras[0].id; });
    persist(); render();
  };

  /* ================= SERVIÇOS E FAQ ================= */
  function viewServicos() {
    var sv = draft.servicos.map(function (s, k) {
      var p = 'servicos.' + k + '.';
      return '<section class="rep"><div class="rep-h"><b>' + esc(s.titulo || 'Serviço') + '</b><div class="acts">' + mv('s', k, draft.servicos.length) + '</div></div><div class="grid2">' + field(p + 'titulo', 'Título') + field(p + 'resumo', 'Resumo (uma linha)') + '<div class="full">' + field(p + 'itens', 'O que está incluído (um por linha)', 'list') + '</div></div></section>';
    }).join('');
    var fq = draft.faq.map(function (f, k) {
      var p = 'faq.' + k + '.';
      return '<section class="rep"><div class="rep-h"><b>' + esc(f.q || 'Pergunta') + '</b><div class="acts">' + mv('q', k, draft.faq.length) + '</div></div>' + field(p + 'q', 'Pergunta') + field(p + 'a', 'Resposta', 'textarea') + '</section>';
    }).join('');
    return '<div class="h"><div><h2>Serviços</h2><p class="sub">Os cartões que se abrem na seção "Serviços" do site.</p></div><button class="b b-gold" type="button" data-act="s-add">+ Serviço</button></div>' + sv +
      '<div class="h" style="margin-top:30px"><div><h2>Perguntas frequentes</h2><p class="sub">Ajudam o cliente e também o Google.</p></div><button class="b b-gold" type="button" data-act="q-add">+ Pergunta</button></div>' + fq;
  }
  function mv(t, k, n) {
    return '<button class="b b-ghost sm" type="button" data-act="' + t + '-up" data-i="' + k + '"' + (k === 0 ? ' disabled' : '') + '>↑</button><button class="b b-ghost sm" type="button" data-act="' + t + '-dn" data-i="' + k + '"' + (k === n - 1 ? ' disabled' : '') + '>↓</button><button class="b b-ghost sm" type="button" data-act="' + t + '-rm" data-i="' + k + '" style="color:var(--bad)">Remover</button>';
  }
  function listOps(t, arr, blank) {
    ACT[t + '-add'] = function () { arr().push(blank()); persist(); render(); };
    ACT[t + '-up'] = function (b) { var i = +b.getAttribute('data-i'), a = arr(); a.splice(i - 1, 0, a.splice(i, 1)[0]); persist(); render(); };
    ACT[t + '-dn'] = function (b) { var i = +b.getAttribute('data-i'), a = arr(); a.splice(i + 1, 0, a.splice(i, 1)[0]); persist(); render(); };
    ACT[t + '-rm'] = async function (b) { var i = +b.getAttribute('data-i'); if (!await ask('Remover?', 'Este item será removido do site.', 'Remover', true)) return; arr().splice(i, 1); persist(); render(); };
  }
  listOps('s', function () { return draft.servicos; }, function () { return { id: 'srv-' + Core.uid().slice(0, 4), titulo: 'Novo serviço', resumo: '', itens: [] }; });
  listOps('q', function () { return draft.faq; }, function () { return { q: 'Nova pergunta', a: '' }; });

  /* ================= PUBLICAR ================= */
  function refPaths() {
    var s = [], add = function (p) { if (p && s.indexOf(p) < 0) { s.push(p); s.push(Core.sm(p)); } };
    draft.imoveis.forEach(function (i) { (i.fotos || []).forEach(add); });
    add(draft.textos.heroImagem); add(draft.textos.sobreImagem); add(draft.empresa.logo);
    draft.corretoras.forEach(function (c) { add(c.foto); });
    return s;
  }
  async function pendingBlobs(onlyNew) {
    var keys = await Core.allBlobKeys(), pushed = ls(K_PUSHED, []);
    var want = refPaths().filter(function (p) { return keys.indexOf(p) > -1 && (!onlyNew || pushed.indexOf(p) < 0); });
    var out = [];
    for (var i = 0; i < want.length; i++) out.push({ path: want[i], blob: await Core.getBlob(want[i]) });
    return out.filter(function (o) { return o.blob; });
  }
  function ghCfg() {
    var g = ls(K_GH, {}), pb = (window.SITE_DATA && window.SITE_DATA.publicacao) || {};
    return { repo: g.repo || pb.repo || '', branch: g.branch || pb.branch || 'main', token: g.token || '' };
  }
  function viewPublicar() {
    var g = ghCfg(), d = dirty(), ok = !!g.token;
    return '<div class="h"><div><h2>Publicar</h2><p class="sub">Quando terminar de editar, publique para as mudanças aparecerem no site. Antes, confira como ficou em <b>Ver prévia</b>.</p></div><a class="b b-line" href="index.html?preview" target="_blank" rel="noopener">Ver prévia do site</a></div>' +
      '<section class="card"><h3>Publicar no site</h3>' +
      '<p class="sub" style="margin-bottom:14px">' + (d ? 'Você tem alterações que ainda não estão no ar.' : 'O site está igual ao que você vê aqui. Nada para publicar agora.') + '</p>' +
      (ok ? '' : '<label class="fld" style="margin-bottom:12px"><span>Chave de publicação</span><input id="ghToken" type="password" placeholder="Cole aqui a chave que você recebeu" autocomplete="off"><small>Você só precisa colar uma vez neste aparelho.</small></label>') +
      '<div class="row-tools"><button class="b b-gold" type="button" id="ghGo">Publicar agora</button></div>' +
      '<div class="log" id="log" aria-live="polite">' + (ok ? 'Tudo pronto para publicar.' : 'Cole a chave acima para começar.') + '</div>' +
      '<p class="sub" style="margin-top:10px">Depois de publicar, o site atualiza sozinho em 1 a 2 minutos.</p></section>' +
      '<section class="card"><h3>Outras ações</h3><div class="row-tools"><button class="b b-line" type="button" id="discard">Descartar alterações</button><button class="b b-line" type="button" id="rmDemo">Apagar imóveis de exemplo</button><button class="b b-line" type="button" id="logout">Sair do painel</button></div></section>' +
      '<details class="hp"><summary>Opções avançadas</summary><div>' +
      '<div class="grid2"><label class="fld"><span>Repositório</span><input id="ghRepo" value="' + esc(g.repo) + '" autocomplete="off"></label><label class="fld"><span>Ramo</span><input id="ghBranch" value="' + esc(g.branch) + '" autocomplete="off"></label></div>' +
      (ok ? '<div class="row-tools"><button class="b b-line sm" type="button" id="ghForget">Trocar a chave neste aparelho</button></div>' : '') +
      '<div class="row-tools"><button class="b b-line sm" type="button" id="ghTest">Testar conexão</button><button class="b b-line sm" type="button" id="zipGo">Baixar pacote (.zip)</button></div></div></details>';
  }
  function logLine(m, cls) { var l = $('#log'); if (!l) return; var s = document.createElement('div'); if (cls) s.className = cls; s.textContent = m; l.appendChild(s); l.scrollTop = l.scrollHeight; }
  function readGh() {
    var cur = ghCfg(), tk = $('#ghToken'), rp = $('#ghRepo'), br = $('#ghBranch');
    var g = { repo: (rp ? rp.value : cur.repo).trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), branch: ((br ? br.value : cur.branch).trim() || 'main'), token: (tk && tk.value.trim()) || cur.token };
    if (g.token) lsSet(K_GH, { repo: g.repo, branch: g.branch, token: g.token });
    return g;
  }
  async function gh(g, path, opt) {
    var r = await fetch('https://api.github.com/repos/' + g.repo + path, Object.assign({ headers: { Authorization: 'Bearer ' + g.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' } }, opt || {}));
    if (!r.ok) {
      var t = ''; try { t = (await r.json()).message; } catch (e) { /* ignora */ }
      var hint = r.status === 401 ? ' (token inválido ou vencido)' : r.status === 403 ? ' (o token não tem permissão de escrita neste repositório)' : r.status === 404 ? ' (repositório ou ramo não encontrado, ou o token não enxerga este repositório)' : '';
      var er = new Error(r.status === 401 ? 'A chave não foi aceita. Cole uma chave válida para tentar de novo.' : r.status === 403 || r.status === 404 ? 'Sem permissão para publicar. Confira a chave e o repositório em Opções avançadas.' : 'Não foi possível publicar agora (' + r.status + '). Tente de novo em instantes.'); er.status = r.status; throw er;
    }
    return r.json();
  }
  function b64(blob) { return new Promise(function (res, rej) { var f = new FileReader(); f.onload = function () { res(String(f.result).split(',')[1]); }; f.onerror = rej; f.readAsDataURL(blob); }); }
  async function ghPublish(g) {
    var files = [{ path: 'assets/js/data.js', blob: new Blob([Core.dataJs(draft)], { type: 'text/javascript' }) }];
    var imgs = await pendingBlobs(true); imgs.forEach(function (o) { files.push({ path: o.path, blob: o.blob }); });
    logLine('Preparando ' + (imgs.length ? imgs.length / 2 + ' foto(s) nova(s) e ' : '') + 'as alterações…');
    var ref = await gh(g, '/git/ref/heads/' + encodeURIComponent(g.branch).replace(/%2F/g, '/')); var base = ref.object.sha;
    var commit = await gh(g, '/git/commits/' + base);
    var tree = [];
    for (var i = 0; i < files.length; i++) {
      logLine('Enviando ' + (i + 1) + ' de ' + files.length + '…');
      var bl = await gh(g, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: await b64(files[i].blob), encoding: 'base64' }) });
      tree.push({ path: files[i].path, mode: '100644', type: 'blob', sha: bl.sha });
    }
    var nt = await gh(g, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree: tree }) });
    var nc = await gh(g, '/git/commits', { method: 'POST', body: JSON.stringify({ message: 'Atualização pelo painel (' + new Date().toLocaleString('pt-BR') + ')', tree: nt.sha, parents: [base] }) });
    await gh(g, '/git/refs/heads/' + g.branch, { method: 'PATCH', body: JSON.stringify({ sha: nc.sha }) });
    lsSet(K_PUSHED, ls(K_PUSHED, []).concat(imgs.map(function (o) { return o.path; })));
    localStorage.setItem(K_LAST, JSON.stringify(draft)); paintStatus();
    logLine('Publicado! O site atualiza em 1 a 2 minutos.', 'o');
  }
  function bindPublicar() {
    $('#ghTest').onclick = async function () {
      var g = readGh(); $('#log').textContent = '';
      if (!/^[^/\s]+\/[^/\s]+$/.test(g.repo) || !g.token) { logLine('Confira o repositório e a chave de publicação.', 'e'); return; }
      try { var r = await gh(g, ''); logLine('Conectado a ' + r.full_name + '. Permissão de escrita: ' + (r.permissions && r.permissions.push ? 'sim' : 'NÃO'), r.permissions && r.permissions.push ? 'o' : 'e'); }
      catch (e) { logLine(e.message, 'e'); }
    };
    $('#ghGo').onclick = async function () {
      var g = readGh(); $('#log').textContent = '';
      if (!/^[^/\s]+\/[^/\s]+$/.test(g.repo)) { logLine('Confira o repositório em Opções avançadas.', 'e'); return; }
      if (!g.token) { logLine('Cole a chave de publicação para continuar.', 'e'); return; }
      this.disabled = true;
      try { await ghPublish(g); } catch (e) {
        if (e.status === 401) { lsSet(K_GH, { repo: g.repo, branch: g.branch, token: '' }); render(); logLine(e.message, 'e'); return; }
        logLine(e.message, 'e');
      }
      this.disabled = false;
    };
    $('#zipGo').onclick = async function () {
      var imgs = await pendingBlobs(false);
      var files = [{ name: 'assets/js/data.js', data: Core.dataJs(draft) }].concat(imgs.map(function (o) { return { name: o.path, data: o.blob }; }));
      files.push({ name: 'LEIA-ME-ATUALIZACAO.txt', data: 'Pacote de atualização do site.\n\nEnvie a pasta "assets" para o repositório do site (GitHub > Add file > Upload files) e confirme em "Commit changes".\nO arquivo assets/js/data.js tem os textos e imóveis; as fotos novas estão em assets/img/.\n' });
      Core.download(await Core.zip(files), 'atualizacao-site-' + today() + '.zip'); toast('Pacote baixado');
    };
    var fg = $('#ghForget'); if (fg) fg.onclick = function () { var c = ghCfg(); lsSet(K_GH, { repo: c.repo, branch: c.branch, token: '' }); render(); toast('Chave removida deste aparelho'); };
    $('#discard').onclick = async function () {
      if (!await ask('Descartar alterações?', 'Tudo o que você mudou e ainda não publicou será perdido neste aparelho.', 'Descartar', true)) return;
      Core.clearDraft(); localStorage.removeItem(K_LAST); await Core.clearBlobs(); lsSet(K_PUSHED, []);
      draft = Core.published(); render(); toast('Voltou ao que está no ar');
    };
    $('#logout').onclick = function () { Gate.logout(); };
    $('#rmDemo').onclick = function () { ACT['rm-demo'](); };
  }

  /* ================= início ================= */
  render();
})();
