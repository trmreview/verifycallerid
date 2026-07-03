(function(){
  if (window.__annotBooted) return;
  window.__annotBooted = true;
  var firebaseConfig = {
    apiKey: "AIzaSyBIa-E5ycAio5lpke16E6b6MslRIRcIF-Y",
    authDomain: "comment-504d5.firebaseapp.com",
    projectId: "comment-504d5",
    storageBucket: "comment-504d5.firebasestorage.app",
    messagingSenderId: "324916761555",
    appId: "1:324916761555:web:ca88d150fd22b57b72d526",
    measurementId: "G-X3MMBVJW0M"
  };

  var LS_COMMENTS = 'annot_comments_v1', LS_AUTHOR = 'annot_author';
  var useFB = false, store;
  var COL = 'comments';
  function lsRead(){ try { return JSON.parse(localStorage.getItem(LS_COMMENTS)||'[]'); } catch(e){ return []; } }
  function lsWrite(a){ localStorage.setItem(LS_COMMENTS, JSON.stringify(a)); }

  function buildLocalStore(){ return {
    _cb:null,
    subscribe: function(cb){ this._cb=cb; cb(lsRead()); var self=this; window.addEventListener('storage', function(e){ if(e.key===LS_COMMENTS && self._cb) self._cb(lsRead()); }); },
    _notify: function(){ if(this._cb) this._cb(lsRead()); },
    add: function(o){ var a=lsRead(); o.id='c'+Date.now()+Math.floor(Math.random()*1000); a.push(o); lsWrite(a); this._notify(); return Promise.resolve(); },
    update: function(id,p){ var a=lsRead().map(function(c){ return c.id===id?Object.assign(c,p):c; }); lsWrite(a); this._notify(); return Promise.resolve(); },
    remove: function(id){ lsWrite(lsRead().filter(function(c){ return c.id!==id; })); this._notify(); return Promise.resolve(); }
  }; }

  var comments = [], filter = 'all', commentMode = false, overlay, toolbar, modeBtn;

  function getAuthor(){ return localStorage.getItem(LS_AUTHOR) || ''; }
  function setAuthor(n){ localStorage.setItem(LS_AUTHOR, n); }
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtTime(ms){ if(!ms) return ''; var d=new Date(ms); return d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }

  function closePopups(){ document.querySelectorAll('.annot-popup').forEach(function(p){ p.remove(); }); }

  function openConfirmModal(opts){
    opts = opts || {};
    var ov = document.createElement('div');
    ov.className = 'annot-ui annot-confirmmodal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:rgba(22,35,58,.45);display:grid;place-items:center;font-family:Plus Jakarta Sans,system-ui,sans-serif;animation:annotpop .15s ease;';
    var card = document.createElement('div');
    card.style.cssText = 'width:320px;max-width:calc(100vw - 32px);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(22,35,58,.3);padding:22px;animation:annotpop .2s cubic-bezier(.2,.8,.2,1);';
    card.innerHTML =
      '<div style="font:700 17px/1.2 Poppins,sans-serif;color:#16233a;margin-bottom:8px;">'+(opts.title||'Delete?')+'</div>'+
      '<div style="font-size:13px;color:#6d7d90;line-height:1.55;margin-bottom:18px;">'+(opts.desc||'This action cannot be undone.')+'</div>'+
      '<div style="display:flex;justify-content:flex-end;gap:10px;">'+
        '<button class="annot-btn cf-cancel">Cancel</button>'+
        '<button class="annot-btn danger cf-ok" style="background:#e0463b;border-color:#e0463b;color:#fff;">'+(opts.okLabel||'Delete')+'</button>'+
      '</div>';
    ov.appendChild(card); document.body.appendChild(ov);
    function close(){ ov.remove(); }
    ov.addEventListener('mousedown', function(e){ if(e.target===ov) close(); });
    card.querySelector('.cf-cancel').onclick = close;
    card.querySelector('.cf-ok').onclick = function(){ close(); if(opts.onConfirm) opts.onConfirm(); };
    document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', esc); } });
    card.querySelector('.cf-ok').focus();
  }

  function openNameModal(opts){
    opts = opts || {};
    var ov = document.createElement('div');
    ov.className = 'annot-ui annot-namemodal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483640;background:rgba(22,35,58,.45);display:grid;place-items:center;font-family:Plus Jakarta Sans,system-ui,sans-serif;animation:annotpop .15s ease;';
    var card = document.createElement('div');
    card.style.cssText = 'width:340px;max-width:calc(100vw - 32px);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(22,35,58,.3);padding:22px;animation:annotpop .2s cubic-bezier(.2,.8,.2,1);';
    card.innerHTML =
      '<div style="font:700 17px/1.2 Poppins,sans-serif;color:#16233a;margin-bottom:6px;">'+(opts.title||'Enter your name')+'</div>'+
      '<div style="font-size:13px;color:#6d7d90;line-height:1.5;margin-bottom:14px;">'+(opts.desc||'This name will be shown on your comments.')+'</div>'+
      '<input class="nm-input" placeholder="Your name" value="'+esc(opts.value||'US Team')+'" style="width:100%;height:42px;padding:0 13px;border:1px solid #d6dde6;border-radius:8px;font-size:14px;color:#16233a;outline:none;font-family:inherit;">'+
      '<div class="nm-err" style="display:none;font-size:12px;color:#b3271c;margin-top:8px;"></div>'+
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">'+
        '<button class="annot-btn nm-cancel">Cancel</button>'+
        '<button class="annot-btn pri nm-save">Save</button>'+
      '</div>';
    ov.appendChild(card); document.body.appendChild(ov);
    var inp = card.querySelector('.nm-input'), err = card.querySelector('.nm-err');
    inp.focus(); inp.select();
    function close(){ ov.remove(); }
    function save(){
      var v = inp.value.trim();
      if(!v){ inp.style.borderColor='#e0463b'; err.textContent='Please enter your name.'; err.style.display='block'; inp.focus(); return; }
      setAuthor(v); close();
      if(opts.onSave) opts.onSave(v);
    }
    ov.addEventListener('mousedown', function(e){ if(e.target===ov){ close(); if(opts.onCancel) opts.onCancel(); } });
    card.querySelector('.nm-cancel').onclick = function(){ close(); if(opts.onCancel) opts.onCancel(); };
    card.querySelector('.nm-save').onclick = save;
    inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); save(); } else if(e.key==='Escape'){ close(); if(opts.onCancel) opts.onCancel(); } });
  }

  function makePopup(clientX, clientY){
    closePopups();
    var p = document.createElement('div');
    p.className = 'annot-ui annot-popup';
    p.style.cssText = 'position:fixed;z-index:2147483600;width:300px;background:#fff;border:1px solid #e4e9ef;border-radius:12px;box-shadow:0 18px 50px rgba(22,35,58,.28);padding:16px;font-family:Plus Jakarta Sans,system-ui,sans-serif;animation:annotpop .18s cubic-bezier(.2,.8,.2,1);';
    document.body.appendChild(p);
    var w=300, h=220;
    var left = Math.min(Math.max(12, clientX+14), window.innerWidth - w - 12);
    var top = Math.min(Math.max(12, clientY-10), window.innerHeight - h - 12);
    p.style.left = left+'px'; p.style.top = top+'px';
    p.addEventListener('click', function(e){ e.stopPropagation(); });
    p.addEventListener('mousedown', function(e){
      if (e.target.closest('input,textarea,button,select,a')) return;
      var sx=e.clientX, sy=e.clientY, r=p.getBoundingClientRect(), ox=r.left, oy=r.top;
      p.style.cursor='grabbing'; document.body.style.userSelect='none';
      function mv(ev){
        p.style.left = Math.min(Math.max(6, ox+(ev.clientX-sx)), window.innerWidth - p.offsetWidth - 6)+'px';
        p.style.top  = Math.min(Math.max(6, oy+(ev.clientY-sy)), window.innerHeight - p.offsetHeight - 6)+'px';
      }
      function up(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); p.style.cursor=''; document.body.style.userSelect=''; }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
      e.preventDefault();
    });
    return p;
  }

  function openComposer(x, y, clientX, clientY, ctx){
    ctx = ctx || { scope:'page' };
    setMode(false);
    var p = makePopup(clientX, clientY);
    var author = getAuthor();
    p.innerHTML =
      '<div style="font:700 15px/1.2 Poppins,sans-serif;color:#16233a;margin-bottom:12px;">New comment</div>'+
      '<input class="ac-name" placeholder="Your name" value="'+esc(author||'US Team')+'" style="width:100%;height:38px;padding:0 11px;border:1px solid #d6dde6;border-radius:7px;font-size:13px;color:#16233a;outline:none;margin-bottom:8px;">'+
      '<textarea class="ac-text" placeholder="Write a comment…" style="width:100%;height:78px;padding:9px 11px;border:1px solid #d6dde6;border-radius:7px;font-size:13px;color:#16233a;outline:none;resize:vertical;font-family:inherit;"></textarea>'+
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">'+
        '<button class="annot-btn ac-cancel">Cancel</button>'+
        '<button class="annot-btn pri ac-save">Comment</button>'+
      '</div>';
    var ta = p.querySelector('.ac-text'), nm = p.querySelector('.ac-name');
    (author?ta:nm).focus();
    p.querySelector('.ac-cancel').onclick = closePopups;
    p.querySelector('.ac-save').onclick = function(){
      var name = nm.value.trim(), text = ta.value.trim();
      if(!name){ nm.focus(); nm.style.borderColor='#e0463b'; return; }
      if(!text){ ta.focus(); ta.style.borderColor='#e0463b'; return; }
      setAuthor(name);
      var now = Date.now();
      var doc = { x:x, y:y, text:text, author:name, status:'open', createdMs:now, updatedMs:now, scope: ctx.scope };
      if(ctx.scope==='modal'){ doc.modalKey = ctx.modalKey; doc.cx = ctx.cx; doc.cy = ctx.cy; }
      store.add(doc);
      closePopups();
    };
  }

  function openThread(c, pin){
    var r = pin.getBoundingClientRect();
    var p = makePopup(r.right, r.top);
    renderThreadView(p, c);
  }

  function applyLocal(c, patch){
    Object.assign(c, patch);
    var lc = getComment(c.id);
    if(lc && lc!==c) Object.assign(lc, patch);
  }

  function getComment(id){ for(var i=0;i<comments.length;i++){ if(comments[i].id===id) return comments[i]; } return null; }

  function renderThreadView(p, c){
    c = getComment(c.id) || c;
    var resolved = c.status==='resolved';
    var replies = Array.isArray(c.replies) ? c.replies : [];
    var repliesHtml = replies.map(function(r){
      return '<div class="ac-reply" data-rid="'+r.id+'" style="border-top:1px solid #eef1f5;padding-top:10px;margin-top:10px;">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'+
          '<span style="width:24px;height:24px;border-radius:50%;background:#6d7d90;color:#fff;display:grid;place-items:center;font:700 11px/1 Plus Jakarta Sans;">'+esc((r.author||'?').charAt(0).toUpperCase())+'</span>'+
          '<div style="min-width:0;flex:1;"><div style="font-size:12px;font-weight:700;color:#16233a;">'+esc(r.author||'Anonymous')+'</div><div style="font-size:10px;color:#94a2b3;">'+fmtTime(r.createdMs)+(r.updatedMs>r.createdMs?' · edited':'')+'</div></div>'+
          '<span class="ac-ractions" style="display:inline-flex;gap:6px;opacity:0;transition:opacity .12s;">'+
            '<button class="annot-btn ac-redit" data-rid="'+r.id+'" style="padding:3px 7px;font-size:11px;">Edit</button>'+
            '<button class="annot-btn danger ac-rdel" data-rid="'+r.id+'" style="padding:3px 7px;font-size:11px;">Delete</button>'+
          '</span>'+
        '</div>'+
        '<div style="font-size:13px;color:#2b3c54;line-height:1.5;white-space:pre-wrap;word-break:break-word;padding-left:32px;">'+esc(r.text)+'</div>'+
      '</div>';
    }).join('');
    p.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">'+
        '<span style="display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:700;background:'+(resolved?'#eef7e5':'#fdecea')+';color:'+(resolved?'#4e8a2f':'#b3271c')+';">'+(resolved?'Resolved':'Open')+'</span>'+
        '<button class="annot-btn ac-close" style="padding:5px 9px;">✕</button>'+
      '</div>'+
      '<div class="ac-main">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'+
        '<span style="width:28px;height:28px;border-radius:50%;background:#1668E3;color:#fff;display:grid;place-items:center;font:700 12px/1 Plus Jakarta Sans;">'+esc((c.author||'?').charAt(0).toUpperCase())+'</span>'+
        '<div style="min-width:0;"><div style="font-size:13px;font-weight:700;color:#16233a;">'+esc(c.author||'Anonymous')+'</div><div style="font-size:11px;color:#94a2b3;">'+fmtTime(c.createdMs)+(c.updatedMs>c.createdMs?' · edited':'')+'</div></div>'+
      '</div>'+
      '<div class="ac-body" style="font-size:14px;color:#2b3c54;line-height:1.55;white-space:pre-wrap;word-break:break-word;">'+esc(c.text)+'</div>'+
      '<div class="ac-mactions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;opacity:0;transition:opacity .12s;">'+
        '<button class="annot-btn pri ac-resolve" style="flex:1;">'+(resolved?'Reopen':'Resolve')+'</button>'+
        '<button class="annot-btn ac-edit">Edit</button>'+
        '<button class="annot-btn danger ac-del">Delete</button>'+
      '</div>'+
      '</div>'+
      '<div class="ac-replies" style="max-height:200px;overflow-y:auto;">'+repliesHtml+'</div>'+
      '<div style="border-top:1px solid #eef1f5;margin-top:12px;padding-top:12px;">'+
        '<textarea class="ac-reply-text" placeholder="Reply…" style="width:100%;height:52px;padding:8px 10px;border:1px solid #d6dde6;border-radius:7px;font-size:13px;color:#16233a;outline:none;resize:vertical;font-family:inherit;"></textarea>'+
        '<div style="display:flex;justify-content:flex-end;margin-top:8px;"><button class="annot-btn pri ac-reply-send">Reply</button></div>'+
      '</div>';
    p.querySelector('.ac-close').onclick = closePopups;
    p.querySelector('.ac-resolve').onclick = function(){ store.update(c.id, { status: resolved?'open':'resolved', updatedMs:Date.now() }); closePopups(); };
    p.querySelector('.ac-del').onclick = function(){ openConfirmModal({ title:'Delete comment?', desc:'This comment and all its replies will be permanently deleted.', okLabel:'Delete', onConfirm:function(){ store.remove(c.id); closePopups(); } }); };
    p.querySelector('.ac-edit').onclick = function(){ renderEditView(p, c); };
    // add reply
    p.querySelector('.ac-reply-send').onclick = function(){
      var ta = p.querySelector('.ac-reply-text'); var t = ta.value.trim();
      if(!t){ ta.focus(); return; }
      function doAdd(author){
        var now = Date.now();
        var newReplies = replies.concat([{ id:'r'+now+Math.floor(Math.random()*1000), author:author, text:t, createdMs:now, updatedMs:now }]);
        applyLocal(c, { replies:newReplies, updatedMs:now });
        Promise.resolve(store.update(c.id, { replies:newReplies, updatedMs:now })).then(function(){ renderThreadView(p, c); });
      }
      var author = getAuthor();
      if(!author){ openNameModal({ title:'Enter your name', desc:'This name will be shown on your reply.', onSave:doAdd }); return; }
      doAdd(author);
    };
    // edit / delete replies
    p.querySelectorAll('.ac-redit').forEach(function(btn){
      btn.onclick = function(){ renderReplyEditView(p, c, btn.getAttribute('data-rid')); };
    });
    p.querySelectorAll('.ac-reply').forEach(function(row){
      var act = row.querySelector('.ac-ractions');
      if(!act) return;
      row.addEventListener('mouseenter', function(){ act.style.opacity='1'; });
      row.addEventListener('mouseleave', function(){ act.style.opacity='0'; });
    });
    var main = p.querySelector('.ac-main'), mact = p.querySelector('.ac-mactions');
    if(main && mact){
      main.addEventListener('mouseenter', function(){ mact.style.opacity='1'; });
      main.addEventListener('mouseleave', function(){ mact.style.opacity='0'; });
    }
    p.querySelectorAll('.ac-rdel').forEach(function(btn){
      btn.onclick = function(){
        var rid = btn.getAttribute('data-rid');
        openConfirmModal({ title:'Delete reply?', desc:'This reply will be permanently deleted.', okLabel:'Delete', onConfirm:function(){
          var newReplies = replies.filter(function(r){ return r.id!==rid; });
          applyLocal(c, { replies:newReplies, updatedMs:Date.now() });
          Promise.resolve(store.update(c.id, { replies:newReplies, updatedMs:Date.now() })).then(function(){ renderThreadView(p, c); });
        }});
      };
    });
  }

  function renderReplyEditView(p, c, rid){
    var replies = Array.isArray(c.replies) ? c.replies : [];
    var r = replies.filter(function(x){ return x.id===rid; })[0];
    if(!r){ renderThreadView(p, c); return; }
    p.innerHTML =
      '<div style="font:700 15px/1.2 Poppins,sans-serif;color:#16233a;margin-bottom:12px;">Edit reply</div>'+
      '<textarea class="ac-text" style="width:100%;height:88px;padding:9px 11px;border:1px solid #d6dde6;border-radius:7px;font-size:13px;color:#16233a;outline:none;resize:vertical;font-family:inherit;">'+esc(r.text)+'</textarea>'+
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">'+
        '<button class="annot-btn ac-cancel">Cancel</button>'+
        '<button class="annot-btn pri ac-save">Save</button>'+
      '</div>';
    var ta = p.querySelector('.ac-text'); ta.focus();
    p.querySelector('.ac-cancel').onclick = function(){ renderThreadView(p, c); };
    p.querySelector('.ac-save').onclick = function(){
      var t = ta.value.trim(); if(!t){ ta.focus(); return; }
      var now = Date.now();
      var newReplies = replies.map(function(x){ return x.id===rid ? Object.assign({}, x, { text:t, updatedMs:now }) : x; });
      applyLocal(c, { replies:newReplies, updatedMs:now });
      Promise.resolve(store.update(c.id, { replies:newReplies, updatedMs:now })).then(function(){ renderThreadView(p, c); });
    };
  }

  function renderEditView(p, c){
    p.innerHTML =
      '<div style="font:700 15px/1.2 Poppins,sans-serif;color:#16233a;margin-bottom:12px;">Edit comment</div>'+
      '<textarea class="ac-text" style="width:100%;height:96px;padding:9px 11px;border:1px solid #d6dde6;border-radius:7px;font-size:13px;color:#16233a;outline:none;resize:vertical;font-family:inherit;">'+esc(c.text)+'</textarea>'+
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">'+
        '<button class="annot-btn ac-cancel">Cancel</button>'+
        '<button class="annot-btn pri ac-save">Save</button>'+
      '</div>';
    var ta = p.querySelector('.ac-text'); ta.focus();
    p.querySelector('.ac-cancel').onclick = function(){ renderThreadView(p, c); };
    p.querySelector('.ac-save').onclick = function(){ var t=ta.value.trim(); if(!t){ ta.focus(); return; } store.update(c.id, { text:t, updatedMs:Date.now() }); closePopups(); };
  }

  function modalKeyOf(el){
    var h = el.querySelector('h1,h2,h3');
    var t = h ? h.textContent.trim() : (el.textContent||'').trim();
    return t ? t.slice(0,60) : null;
  }
  // an app modal/drawer = a large, visible, fixed-position overlay that isn't our own UI
  function findModal(el){
    while(el && el!==document.body){
      if(el.classList && el.classList.contains('annot-ui')) return null;
      var cs = getComputedStyle(el);
      if(cs.position==='fixed'){
        var r = el.getBoundingClientRect();
        if(r.width>=200 && r.height>=200) return el;
      }
      el = el.parentElement;
    }
    return null;
  }
  function scanOpenModals(){
    var map = {};
    var divs = document.querySelectorAll('body div');
    for(var i=0;i<divs.length;i++){
      var el = divs[i];
      if(el.classList && el.classList.contains('annot-ui')) continue;
      var cs = getComputedStyle(el);
      if(cs.position!=='fixed') continue;
      if(cs.display==='none' || cs.visibility==='hidden' || parseFloat(cs.opacity)===0) continue;
      var r = el.getBoundingClientRect();
      if(r.width<200 || r.height<200) continue;
      var key = modalKeyOf(el);
      if(key && !(key in map)) map[key] = el;
    }
    return map;
  }

  function attachPinDrag(pin, c, isFixed){
    pin.addEventListener('mousedown', function(e){
      e.preventDefault(); e.stopPropagation();
      var startX=e.clientX, startY=e.clientY, moved=false;
      function mv(ev){
        if(!moved && Math.abs(ev.clientX-startX)+Math.abs(ev.clientY-startY) < 4) return;
        moved = true;
        if(isFixed){
          pin.style.left = ev.clientX+'px'; pin.style.top = ev.clientY+'px';
        } else {
          pin.style.left = ev.pageX+'px'; pin.style.top = ev.pageY+'px';
        }
      }
      function up(ev){
        document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
        if(!moved){ openThread(c, pin); return; }
        if(isFixed){ applyLocal(c,{cx:ev.clientX,cy:ev.clientY}); store.update(c.id,{cx:ev.clientX,cy:ev.clientY}); }
        else { applyLocal(c,{x:ev.pageX,y:ev.pageY}); store.update(c.id,{x:ev.pageX,y:ev.pageY}); }
      }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
  }

  function render(){
    if(!overlay) return;
    overlay.style.width = document.documentElement.scrollWidth+'px';
    overlay.style.height = document.documentElement.scrollHeight+'px';
    overlay.innerHTML = '';
    // remove any previous fixed (modal-scoped) pins
    document.querySelectorAll('.annot-fixed-pin').forEach(function(el){ el.remove(); });
    var openModals = scanOpenModals();
    var list = comments.slice().sort(function(a,b){ return (a.createdMs||0)-(b.createdMs||0); });
    var shown = list.filter(function(c){ return filter==='all' ? true : c.status===filter; });
    shown.forEach(function(c, i){
      var color = c.status==='resolved' ? '#6cb33f' : '#e0463b';
      var badge = '<div style="width:30px;height:30px;border-radius:50% 50% 50% 3px;background:'+color+';box-shadow:0 3px 10px rgba(0,0,0,.32);display:grid;place-items:center;color:#fff;font:700 13px/1 Plus Jakarta Sans,sans-serif;border:2px solid #fff;">'+(i+1)+'</div>';
      if(c.scope==='modal'){
        // only show when the same modal is currently open
        if(!(c.modalKey in openModals)) return;
        var fp = document.createElement('div');
        fp.className = 'annot-pin annot-fixed-pin annot-ui';
        fp.style.cssText = 'position:fixed;z-index:2147483200;transform:translate(-50%,-100%);cursor:pointer;pointer-events:auto;left:'+c.cx+'px;top:'+c.cy+'px;';
        fp.innerHTML = badge;
        fp.title = 'Drag to move · click to open';
        attachPinDrag(fp, c, true);
        document.body.appendChild(fp);
      } else {
        var pin = document.createElement('div');
        pin.className = 'annot-pin annot-ui';
        pin.style.left = c.x+'px'; pin.style.top = c.y+'px';
        pin.innerHTML = badge;
        pin.title = 'Drag to move · click to open';
        attachPinDrag(pin, c, false);
        overlay.appendChild(pin);
      }
    });
    updateToolbar();
  }

  function setMode(on){
    commentMode = on;
    document.body.style.cursor = on ? 'crosshair' : '';
    if(modeBtn){
      modeBtn.style.background = on ? '#1668E3' : '#fff';
      modeBtn.style.borderColor = on ? '#1668E3' : '#fff';
      modeBtn.style.color = on ? '#fff' : '#16233a';
      if(on) modeBtn.classList.add('active'); else modeBtn.classList.remove('active');
      modeBtn.title = on ? 'Click anywhere to drop a comment (Esc to cancel)' : 'Add comment';
    }
  }

  function updateToolbar(){
    if(!toolbar) return;
    var open = comments.filter(function(c){ return c.status!=='resolved'; }).length;
    var res = comments.length - open;
    var cnt = toolbar.querySelector('.ac-count');
    if(cnt) cnt.textContent = open+' open · '+res+' resolved';
  }

  function buildToolbar(){
    toolbar = document.createElement('div');
    toolbar.className = 'annot-ui';
    toolbar.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483500;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e4e9ef;border-radius:999px;box-shadow:0 10px 34px rgba(22,35,58,.22);padding:8px 10px 8px 16px;font-family:Plus Jakarta Sans,system-ui,sans-serif;';
    toolbar.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#16233a;cursor:grab;"><span style="width:8px;height:8px;border-radius:50%;background:#b97608;"></span>Comments</span>'+
      '<span class="ac-collapsible" style="display:flex;align-items:center;gap:10px;">'+
        '<span class="ac-count" style="font-size:12px;color:#6d7d90;white-space:nowrap;"></span>'+
        '<span style="width:1px;height:20px;background:#e4e9ef;"></span>'+
        '<select class="ac-filter" style="height:34px;border:1px solid #d6dde6;border-radius:8px;padding:0 8px;font-family:inherit;font-size:13px;color:#16233a;background:#fff;cursor:pointer;outline:none;"><option value="all">All</option><option value="open">Open</option><option value="resolved">Resolved</option></select>'+
        '<button class="annot-btn ac-name-btn" title="Set your name">Name</button>'+
      '</span>'+
      '<button class="ac-mode" title="Add comment" style="width:40px;height:40px;border:1px solid #fff;border-radius:50%;background:#fff;color:#16233a;cursor:pointer;display:grid;place-items:center;transition:all .12s;flex:0 0 auto;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>'+
      '<button class="ac-toggle" title="Hide" style="width:26px;height:30px;border:none;background:none;color:#6d7d90;cursor:pointer;display:grid;place-items:center;flex:0 0 auto;padding:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>';
    document.body.appendChild(toolbar);
    toolbar.addEventListener('mousedown', function(e){
      if (e.target.closest('input,textarea,button,select,a,option')) return;
      var r=toolbar.getBoundingClientRect();
      toolbar.style.transform='none'; toolbar.style.left=r.left+'px'; toolbar.style.top=r.top+'px';
      var sx=e.clientX, sy=e.clientY, ox=r.left, oy=r.top;
      toolbar.style.cursor='grabbing'; document.body.style.userSelect='none';
      function mv(ev){
        toolbar.style.left = Math.min(Math.max(6, ox+(ev.clientX-sx)), window.innerWidth - toolbar.offsetWidth - 6)+'px';
        toolbar.style.top  = Math.min(Math.max(6, oy+(ev.clientY-sy)), window.innerHeight - toolbar.offsetHeight - 6)+'px';
      }
      function up(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); toolbar.style.cursor=''; document.body.style.userSelect=''; }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
      e.preventDefault();
    });
    modeBtn = toolbar.querySelector('.ac-mode');
    modeBtn.onclick = function(){ setMode(!commentMode); };
    toolbar.querySelector('.ac-filter').onchange = function(e){ filter = e.target.value; render(); };
    var nameBtn = toolbar.querySelector('.ac-name-btn');
    function refreshName(){ var a=getAuthor(); nameBtn.textContent = a || 'US Team'; }
    refreshName();
    nameBtn.onclick = function(){ openNameModal({ title:'Enter your name', desc:'This name will be shown on your comments.', value:getAuthor()||'US Team', onSave:refreshName }); };
    var collapsible = toolbar.querySelector('.ac-collapsible');
    var toggleBtn = toolbar.querySelector('.ac-toggle');
    var collapsed = false;
    toggleBtn.onclick = function(){
      collapsed = !collapsed;
      collapsible.style.display = collapsed ? 'none' : 'flex';
      toggleBtn.title = collapsed ? 'Show' : 'Hide';
      toggleBtn.innerHTML = collapsed
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    };
  }

  function init(){
    overlay = document.createElement('div');
    overlay.className = 'annot-ui';
    overlay.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:2147482000;';
    document.body.appendChild(overlay);
    var s = document.createElement('style'); s.textContent = '.annot-pin{pointer-events:auto;}'; document.head.appendChild(s);
    buildToolbar();

    document.addEventListener('click', function(e){
      if(!commentMode) return;
      if(e.target.closest('.annot-ui')) return;
      e.preventDefault(); e.stopPropagation();
      var modalEl = findModal(e.target);
      var ctx = modalEl ? { scope:'modal', modalKey: modalKeyOf(modalEl), cx:e.clientX, cy:e.clientY } : { scope:'page' };
      openComposer(e.pageX, e.pageY, e.clientX, e.clientY, ctx);
    }, true);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ setMode(false); closePopups(); } });
    window.addEventListener('resize', render);
    // re-render pins when an app modal/drawer opens or closes
    var lastModalSig = '';
    setInterval(function(){
      var sig = Object.keys(scanOpenModals()).sort().join('|');
      if(sig !== lastModalSig){ lastModalSig = sig; render(); }
    }, 300);

    startStore();
  }

  function startStore(){
    var base='https://www.gstatic.com/firebasejs/10.12.2/';
    Promise.all([ import(base+'firebase-app.js'), import(base+'firebase-firestore.js') ])
      .then(function(mods){
        var appMod=mods[0], fs=mods[1];
        var app = appMod.initializeApp(firebaseConfig);
        var dbi = fs.getFirestore(app);
        useFB = true;
        store = {
          subscribe: function(cb){ var q=fs.query(fs.collection(dbi, COL), fs.orderBy('createdMs')); fs.onSnapshot(q, function(s){ cb(s.docs.map(function(d){ var o=d.data(); o.id=d.id; return o; })); }, function(e){ console.warn('[comments] snapshot error', e); }); },
          add: function(o){ return fs.addDoc(fs.collection(dbi, COL), o); },
          update: function(id,p){ return fs.updateDoc(fs.doc(dbi, COL, id), p); },
          remove: function(id){ return fs.deleteDoc(fs.doc(dbi, COL, id)); }
        };
        begin();
      })
      .catch(function(e){ console.warn('[comments] Firebase load failed, using localStorage:', e); useFB=false; store=buildLocalStore(); begin(); });
  }
  function begin(){
    var dot = toolbar && toolbar.querySelector('span span');
    if (dot) dot.style.background = useFB ? '#0f7a37' : '#b97608';
    window.__annot = { useFB: useFB };
    try { store.subscribe(function(data){ comments = data; render(); }); }
    catch(e){ console.warn('[comments] subscribe failed:', e); }
  }

  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded', init);
  else init();
})();
