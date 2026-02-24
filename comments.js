(function(){
'use strict';

var cfg = window.FIREBASE_CONFIG;
if(!cfg || !cfg.projectId || cfg.projectId === 'PLACEHOLDER'){
  document.addEventListener('DOMContentLoaded', function(){
    var mainEl = document.querySelector('main');
    if(!mainEl) return;
    var banner = document.createElement('div');
    banner.style.cssText = 'max-width:960px;margin:2rem auto;padding:1rem 1.5rem;background:#fffbeb;border:1px solid #fbbf24;border-radius:10px;font-size:.85rem;color:#92400e;font-family:Inter,system-ui,sans-serif';
    banner.innerHTML = '<strong>Sistema de comentarios:</strong> Firebase a\u00fan no est\u00e1 configurado. Configur\u00e1 <code>FIREBASE_CONFIG</code> para habilitar los comentarios.';
    mainEl.parentNode.insertBefore(banner, mainEl);
  });
  return;
}

var css = document.createElement('style');
css.textContent = [
'.cmt-trigger{display:inline-flex;align-items:center;gap:.5rem;margin-top:1.5rem;padding:.5rem 1rem;background:var(--surface,#fff);border:1px solid var(--border,rgba(0,0,0,.08));border-radius:8px;cursor:pointer;font-family:inherit;font-size:.8rem;color:var(--muted,#64748b);transition:all .25s;user-select:none}',
'.cmt-trigger:hover{border-color:rgba(99,102,241,.35);color:#6366f1;background:rgba(99,102,241,.04)}',
'.cmt-trigger svg{flex-shrink:0}',
'.cmt-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;background:rgba(99,102,241,.1);color:#6366f1;font-weight:700;font-size:.7rem;border-radius:10px;transition:all .2s}',
'.cmt-badge.has{background:#6366f1;color:#fff}',
'.cmt-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease;margin-top:.5rem}',
'.cmt-panel.open{grid-template-rows:1fr}',
'.cmt-panel-wrap{overflow:hidden}',
'.cmt-box{padding:1rem 1.25rem;background:var(--surface,#fff);border:1px solid var(--border,rgba(0,0,0,.08));border-radius:12px}',
'.cmt-list{list-style:none;padding:0;margin:0}',
'.cmt-item{padding:.65rem 0;border-bottom:1px solid rgba(0,0,0,.05)}',
'.cmt-item:last-child{border-bottom:none}',
'.cmt-meta{display:flex;align-items:baseline;gap:.5rem;margin-bottom:.15rem}',
'.cmt-author{font-weight:700;font-size:.82rem;color:var(--text,#1e293b)}',
'.cmt-time{font-size:.68rem;color:var(--muted,#64748b)}',
'.cmt-body{font-size:.84rem;color:var(--text,#1e293b);line-height:1.6;white-space:pre-wrap;word-break:break-word}',
'.cmt-empty{font-size:.82rem;color:var(--muted,#64748b);text-align:center;padding:.75rem 0;font-style:italic}',
'.cmt-sep{height:1px;background:var(--border,rgba(0,0,0,.08));margin:.75rem 0}',
'.cmt-form{display:flex;flex-direction:column;gap:.5rem}',
'.cmt-row{display:flex;gap:.5rem}',
'.cmt-input,.cmt-textarea{font-family:inherit;font-size:.84rem;padding:.5rem .75rem;border:1px solid var(--border,rgba(0,0,0,.08));border-radius:8px;background:var(--bg,#f8fafc);color:var(--text,#1e293b);outline:none;transition:border-color .2s,box-shadow .2s}',
'.cmt-input:focus,.cmt-textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.08)}',
'.cmt-input{flex:1}',
'.cmt-textarea{resize:vertical;min-height:52px;width:100%}',
'.cmt-submit{padding:.45rem 1.1rem;background:#6366f1;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}',
'.cmt-submit:hover{background:#4f46e5;transform:translateY(-1px)}',
'.cmt-submit:disabled{opacity:.4;cursor:not-allowed;transform:none}',
'@media(max-width:600px){.cmt-row{flex-direction:column}}'
].join('\n');
document.head.appendChild(css);

firebase.initializeApp(cfg);
var db = firebase.firestore();
var PAGE = location.pathname.split('/').pop().replace('.html','') || 'index';
var panels = {};
var savedAuthor = localStorage.getItem('cmt-author') || '';

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

function boot(){
  var mainEl = document.querySelector('main');
  if(!mainEl) return;
  var secs = mainEl.querySelectorAll(':scope > section');
  if(!secs.length) return;

  secs.forEach(function(sec, i){
    var numEl = sec.querySelector('.section-num');
    var raw = numEl ? numEl.textContent.trim() : '';
    var sid = raw ? raw.split('\u2014')[0].trim() : 'sec-' + i;
    panels[sid] = buildPanel(sec, sid);
  });

  db.collection('comments').where('page','==',PAGE).onSnapshot(function(snap){
    var grouped = {};
    snap.forEach(function(doc){
      var d = doc.data();
      if(!d.sectionId) return;
      if(!grouped[d.sectionId]) grouped[d.sectionId] = [];
      grouped[d.sectionId].push({author:d.author||'An\u00f3nimo',text:d.text||'',ts:d.createdAt});
    });
    Object.keys(grouped).forEach(function(k){
      grouped[k].sort(function(a,b){
        var ta = a.ts ? a.ts.seconds : 0;
        var tb = b.ts ? b.ts.seconds : 0;
        return ta - tb;
      });
    });
    Object.keys(panels).forEach(function(sid){
      render(panels[sid], grouped[sid] || []);
    });
  }, function(err){
    console.error('[Comments] Firestore error:', err);
  });
}

function buildPanel(section, sectionId){
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cmt-trigger';
  trigger.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Comentarios <span class="cmt-badge">0</span>';

  var panel = document.createElement('div');
  panel.className = 'cmt-panel';
  panel.innerHTML = '<div class="cmt-panel-wrap"><div class="cmt-box">'
    + '<ul class="cmt-list"></ul>'
    + '<p class="cmt-empty">No hay comentarios a\u00fan. Dej\u00e1 tu feedback sobre esta secci\u00f3n.</p>'
    + '<div class="cmt-sep"></div>'
    + '<form class="cmt-form">'
    + '<div class="cmt-row"><input class="cmt-input" type="text" placeholder="Tu nombre" value="' + esc(savedAuthor) + '" required></div>'
    + '<textarea class="cmt-textarea" placeholder="Escrib\u00ed tu comentario o feedback sobre esta secci\u00f3n\u2026" required></textarea>'
    + '<div class="cmt-row" style="justify-content:flex-end"><button type="submit" class="cmt-submit">Enviar</button></div>'
    + '</form></div></div>';

  trigger.addEventListener('click', function(){
    panel.classList.toggle('open');
  });

  var form = panel.querySelector('.cmt-form');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var ni = form.querySelector('.cmt-input');
    var ti = form.querySelector('.cmt-textarea');
    var btn = form.querySelector('.cmt-submit');
    var name = ni.value.trim();
    var text = ti.value.trim();
    if(!name || !text) return;

    btn.disabled = true;
    btn.textContent = 'Enviando\u2026';

    db.collection('comments').add({
      page: PAGE,
      sectionId: sectionId,
      author: name,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      localStorage.setItem('cmt-author', name);
      savedAuthor = name;
      ti.value = '';
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }).catch(function(err){
      console.error('[Comments]', err);
      alert('Error al enviar el comentario. Intent\u00e1 de nuevo.');
      btn.disabled = false;
      btn.textContent = 'Enviar';
    });
  });

  section.appendChild(trigger);
  section.appendChild(panel);

  return {
    badge: trigger.querySelector('.cmt-badge'),
    list: panel.querySelector('.cmt-list'),
    empty: panel.querySelector('.cmt-empty')
  };
}

function render(p, comments){
  p.badge.textContent = comments.length;
  if(comments.length > 0){
    p.badge.classList.add('has');
  } else {
    p.badge.classList.remove('has');
  }
  p.empty.style.display = comments.length ? 'none' : '';
  p.list.innerHTML = '';
  comments.forEach(function(c){
    var li = document.createElement('li');
    li.className = 'cmt-item';
    var when = 'Ahora';
    if(c.ts && c.ts.seconds){
      when = new Date(c.ts.seconds * 1000).toLocaleDateString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    }
    li.innerHTML = '<div class="cmt-meta"><span class="cmt-author">' + esc(c.author) + '</span><span class="cmt-time">' + when + '</span></div><div class="cmt-body">' + esc(c.text) + '</div>';
    p.list.appendChild(li);
  });
}

function esc(s){
  if(!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

})();
