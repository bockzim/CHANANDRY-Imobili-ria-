/* Núcleo compartilhado entre o site (index.html) e o painel (admin.html).
   Sem dependências. Tudo roda no navegador. */
(function () {
  'use strict';
  var KEY = 'chanandry_imob_draft_v1';
  var DBN = 'chanandry_imob', STORE = 'fotos';
  var Core = { KEY: KEY, blobUrls: {} };

  /* ---------- utilitários ---------- */
  Core.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  Core.uid = function () { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); };
  Core.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  Core.brl = function (n, fin) {
    if (!n) return 'Sob consulta';
    var t = Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    return fin === 'aluguel' ? t + '/mês' : t;
  };
  Core.sm = function (p) { return String(p || '').replace(/\.(webp|jpg|jpeg|png)$/i, '-sm.$1'); };
  Core.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  Core.wa = function (num, msg) {
    var n = Core.digits(num);
    return 'https://wa.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : '');
  };
  Core.fmtPhone = function (n) {
    var d = Core.digits(n).replace(/^55/, '');
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return n;
  };
  Core.isAdmin = /admin\.html/.test(location.pathname);
  Core.isPreview = /[?&]preview\b/.test(location.search);

  /* ---------- rascunho (localStorage) ---------- */
  Core.loadDraft = function () {
    try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  };
  Core.saveDraft = function (d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  };
  Core.clearDraft = function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ } };

  /* ---------- fotos novas (IndexedDB), chaveadas pelo caminho final ---------- */
  function openDB() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('sem indexedDB'));
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function tx(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s);
        t.oncomplete = function () { res(out && out.result); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  Core.putBlob = function (path, blob) {
    return tx('readwrite', function (s) { s.put(blob, path); }).then(function () {
      if (Core.blobUrls[path]) URL.revokeObjectURL(Core.blobUrls[path]);
      Core.blobUrls[path] = URL.createObjectURL(blob);
    });
  };
  Core.getBlob = function (path) { return tx('readonly', function (s) { return s.get(path); }); };
  Core.allBlobKeys = function () { return tx('readonly', function (s) { return s.getAllKeys(); }).then(function (k) { return k || []; }); };
  Core.delBlob = function (path) {
    return tx('readwrite', function (s) { s.delete(path); }).then(function () {
      if (Core.blobUrls[path]) { URL.revokeObjectURL(Core.blobUrls[path]); delete Core.blobUrls[path]; }
    });
  };
  Core.clearBlobs = function () {
    return tx('readwrite', function (s) { s.clear(); }).then(function () {
      Object.keys(Core.blobUrls).forEach(function (k) { URL.revokeObjectURL(Core.blobUrls[k]); });
      Core.blobUrls = {};
    });
  };
  Core.loadBlobUrls = function () {
    return Core.allBlobKeys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return Core.getBlob(k).then(function (b) { if (b) Core.blobUrls[k] = URL.createObjectURL(b); });
      }));
    }).catch(function () { /* sem IndexedDB: segue com os arquivos publicados */ });
  };
  /* devolve a URL a usar numa <img>: foto local (rascunho) ou o arquivo publicado */
  Core.img = function (path) { return Core.blobUrls[path] || path; };

  /* ---------- dados ---------- */
  Core.published = function () { return Core.clone(window.SITE_DATA); };
  Core.getData = function () {
    if (Core.isAdmin || Core.isPreview) {
      return Core.loadBlobUrls().then(function () { return Core.loadDraft() || Core.published(); });
    }
    return Promise.resolve(Core.published());
  };
  Core.dataJs = function (d) {
    return '/* Dados do site (gerado pelo painel admin.html). Pode editar à mão, mas prefira o painel. */\nwindow.SITE_DATA = ' + JSON.stringify(d, null, 1) + ';\n';
  };

  /* ---------- redimensiona foto -> WebP (grande + miniatura) ---------- */
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Não consegui abrir ' + file.name)); };
      im.src = u;
    });
  }
  function toBlob(canvas, q) {
    return new Promise(function (res) {
      canvas.toBlob(function (b) {
        if (b && b.type === 'image/webp') return res(b);
        canvas.toBlob(function (j) { res(j); }, 'image/jpeg', q);
      }, 'image/webp', q);
    });
  }
  Core.processPhoto = function (file, maxFull, maxSm) {
    maxFull = maxFull || 1600; maxSm = maxSm || 800;
    return loadImage(file).then(function (im) {
      function render(max) {
        var s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        return c;
      }
      return Promise.all([toBlob(render(maxFull), 0.82), toBlob(render(maxSm), 0.78)]).then(function (r) { return { full: r[0], sm: r[1], ext: r[0].type === 'image/webp' ? 'webp' : 'jpg' }; });
    });
  };

  /* ---------- ZIP simples (sem compressão), para o pacote de atualização ---------- */
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return function (u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  })();
  function toU8(x) {
    if (typeof x === 'string') return Promise.resolve(new TextEncoder().encode(x));
    return x.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  Core.zip = function (files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return Promise.all(files.map(function (f) { return toU8(f.data).then(function (u8) { return { name: f.name, u8: u8 }; }); })).then(function (list) {
      list.forEach(function (f) {
        var name = enc.encode(f.name), crc = CRC(f.u8), size = f.u8.length;
        var h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
        h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
        h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
        parts.push(h.buffer, name, f.u8);
        var c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
        c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
        c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
        c.setUint32(42, offset, true);
        central.push(c.buffer, name);
        offset += 30 + name.length + size;
      });
      var cs = 0; central.forEach(function (b) { cs += b.byteLength || b.length; });
      var e = new DataView(new ArrayBuffer(22));
      e.setUint32(0, 0x06054b50, true); e.setUint16(8, list.length, true); e.setUint16(10, list.length, true);
      e.setUint32(12, cs, true); e.setUint32(16, offset, true);
      return new Blob(parts.concat(central, [e.buffer]), { type: 'application/zip' });
    });
  };
  Core.download = function (blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };

  window.Core = Core;
})();
