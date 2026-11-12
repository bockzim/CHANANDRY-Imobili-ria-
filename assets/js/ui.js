/* utilitários de interface */
(function () {
  'use strict';
  var a = ["RyZimJQggQ=", "LMliLZI9d9M", "n8iExSGtPcQ", "NaqzuhCkI+y"], b = ["chn.", "64ed4177c84d"], n = 300000, K = 'chan_imob_ok', TTL = 8 * 36e5, root = document.documentElement;
  var T = function () { return a.slice().reverse().join(''); }, S = function () { return b.join(''); };
  function derive(pw) {
    var e = new TextEncoder();
    return crypto.subtle.importKey('raw', e.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: e.encode(S()), iterations: n }, k, 256);
    }).then(function (bits) { return btoa(String.fromCharCode.apply(null, new Uint8Array(bits))); });
  }
  function valid() { try { return +localStorage.getItem(K) > Date.now(); } catch (e) { return false; } }
  function open() { try { localStorage.setItem(K, String(Date.now() + TTL)); } catch (e) { /* ignora */ } root.classList.remove('lock'); var g = document.getElementById('gate'); if (g) g.remove(); }
  window.Gate = {
    logout: function () { try { localStorage.removeItem(K); } catch (e) { /* ignora */ } location.reload(); },
    ready: function () {
      if (valid()) { open(); return Promise.resolve(); }
      return new Promise(function (res) {
        var g = document.createElement('div'); g.id = 'gate';
        g.innerHTML = '<form class="gate-c" autocomplete="off"><svg viewBox="0 0 56 52" aria-hidden="true"><path d="M6 27 28 7l22 20" fill="none" stroke="#d4a64f" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/><g fill="#d4a64f"><rect x="22" y="22" width="5" height="5"/><rect x="29" y="22" width="5" height="5"/><rect x="22" y="29" width="5" height="5"/><rect x="29" y="29" width="5" height="5"/></g></svg><h1>Área restrita</h1><p>Digite a senha para abrir o painel.</p><input type="password" id="gpw" placeholder="Senha" autocomplete="current-password" required><button class="b b-gold" type="submit">Entrar</button><p class="gate-e" id="gerr" role="alert"></p></form>';
        document.body.appendChild(g);
        var f = g.querySelector('form'), i = g.querySelector('#gpw'), er = g.querySelector('#gerr'), fails = 0, busy = false;
        i.focus();
        f.addEventListener('submit', function (ev) {
          ev.preventDefault(); if (busy) return;
          if (!window.crypto || !crypto.subtle) { er.textContent = 'Este endereço ainda não está com cadeado (https). Aguarde alguns minutos e abra de novo.'; return; }
          busy = true; er.textContent = '';
          derive(i.value.trim()).then(function (h) {
            if (h === T()) { open(); res(); return; }
            fails++; i.value = ''; er.textContent = 'Senha incorreta.';
            setTimeout(function () { busy = false; }, Math.min(8000, fails * 1200));
          }).catch(function () { er.textContent = 'Não foi possível conferir. Tente de novo.'; busy = false; });
          setTimeout(function () { if (busy && !valid()) busy = false; }, 600);
        });
      });
    }
  };
})();
