/* Two-dimensional study board. The original game tree is never replaced by an analysis line. */
window.ChessStudio = (() => {
  'use strict';
  const R = Rules,
    files = 'abcdefgh',
    ink = ['#15781B', '#882020', '#003088', '#e68f00'],
    esc = (s) =>
      String(s ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );
  let host,
    root,
    node,
    hist,
    headers = {},
    line = [],
    idx = 0,
    bag = [],
    flip = false,
    unlocked = false,
    analyse = false,
    marks = new WeakMap(),
    sel = -1,
    ghost = null,
    hidden = false,
    evToken = 0,
    abort = null,
    timer,
    evalService,
    branchChosen = new WeakMap(),
    boardFocus = 0,
    bestMove = null;
  const $ = (s) => host.querySelector(s);
  const fullnames = {
    Anand: 'Viswanathan Anand',
    Carlsen: 'Magnus Carlsen',
    Kramnik: 'Vladimir Kramnik',
    Aronian: 'Levon Aronian',
    Gelfand: 'Boris Gelfand',
    Karjakin: 'Sergey Karjakin',
    Fischer: 'Bobby Fischer',
    Byrne: 'Donald Byrne',
    Polgár: 'Judit Polgár',
    Kasparov: 'Garry Kasparov',
    Karpov: 'Anatoly Karpov',
    Spassky: 'Boris Spassky',
    Tal: 'Mikhail Tal',
    Larsen: 'Bent Larsen',
    Smyslov: 'Vasily Smyslov',
    Botvinnik: 'Mikhail Botvinnik',
    Hecht: 'Hans-Joachim Hecht',
    Ivanchuk: 'Vassily Ivanchuk',
    Shirov: 'Alexei Shirov',
    Topalov: 'Veselin Topalov',
    Ernst: 'Sipke Ernst',
  };
  function html() {
    return /* HTML */ `<div class="chessmain">
        <div class="boardcol">
          <div class="boardwrap">
            <div class="boardgrid" role="group" aria-label="Chessboard"></div>
            <svg
              class="arrows"
              viewBox="0 0 8 8"
              preserveAspectRatio="none"
              aria-hidden="true"
            ></svg>
          </div>
          <div class="boardtools">
            <div class="move-nav">
              <button
                class="mini"
                data-key="prev"
                aria-label="Previous move"
                aria-keyshortcuts="ArrowLeft"
              >
                ←</button
              ><output class="ply" aria-label="Current move"></output
              ><button
                class="mini"
                data-key="next"
                aria-label="Next move"
                aria-keyshortcuts="ArrowRight"
              >
                →
              </button>
            </div>
            <button class="mini" data-key="flip">Flip</button
            ><button class="mini" data-key="clear" aria-label="Clear arrows and circles">
              Clear
            </button>
          </div>
        </div>
        <div class="chessdesk">
          <div class="kicker">CHESS / POSITION STUDY</div>
          <h3 class="ctitle">Guess the players</h3>
          <div class="turn"></div>
          <div class="quiz">
            <label
              >White<input
                class="guessW"
                list="playerslist"
                autocomplete="off"
                placeholder="Player name" /></label
            ><label
              >Black<input
                class="guessB"
                list="playerslist"
                autocomplete="off"
                placeholder="Player name" /></label
            ><datalist id="playerslist"></datalist>
            <div class="chips">
              <button class="btn dark" data-key="check">Check</button
              ><button class="btn" data-key="reveal">Reveal</button>
            </div>
          </div>
          <div class="gameinfo"></div>
          <div class="gamecredit"></div>
          <p class="cmsg" role="status"></p>
          <label class="switch"
            ><input type="checkbox" class="analysis" /> Analysis &amp; evaluation</label
          >
          <div class="engine" hidden>
            <div class="evalnum" role="status" aria-live="polite"></div>
            <div class="evalbar"><i></i></div>
            <div class="evalpv"></div>
            <small
              >Positive scores favour White · depth ≥8.
              <a href="notices/chess-engines.html" target="_blank" rel="noopener">Engine credits</a
              >.</small
            >
          </div>
          <div class="choices"></div>
          <details class="scoresheet">
            <summary>Moves</summary>
            <div class="scores"></div>
          </details>
          <details class="notation">
            <summary>Position &amp; PGN</summary>
            <label
              >FEN<textarea
                rows="2"
                class="fenbox"
                spellcheck="false"
                aria-label="Position in FEN notation"
              ></textarea>
            </label>
            <div class="chips">
              <button class="mini" data-key="fen">Load position</button
              ><button class="mini" data-key="export">Save PGN</button>
            </div>
          </details>
          <div class="chips chesslinks">
            <button class="btn" type="button" data-key="players">Favourite players</button
            ><a class="btn" href="https://lichess.org/" target="_blank" rel="noopener noreferrer"
              >Challenge me on Lichess ↗</a
            >
          </div>
          <div class="promote" hidden></div>
        </div>
      </div>
      <div class="playerdeck" hidden>
        <div class="playerdeck-bar">
          <div>
            <div class="kicker">CHESS / INSPIRATION</div>
            <h3 class="ctitle">Favourite players</h3>
          </div>
          <div class="chips">
            <a class="btn" href="https://lichess.org/" target="_blank" rel="noopener noreferrer"
              >Challenge me on Lichess ↗</a
            ><button class="btn dark" type="button" data-key="board">← Back to chess board</button>
          </div>
        </div>
        <div class="playergrid"></div>
      </div>`;
  }
  function init(h) {
    if (host) return;
    host = h;
    host.innerHTML = html();
    $('#playerslist').innerHTML = Object.values(fullnames)
      .sort()
      .map((x) => /* HTML */ `<option value="${x}"></option>`)
      .join('');
    host.querySelectorAll('[data-key]').forEach((b) => (b.onclick = () => act(b.dataset.key)));
    let panel = $('.playergrid');
    if (panel) {
      panel.innerHTML = CATALOG.players
        .map(
          (p) =>
            /* HTML */ `<article>
              <a class="portrait-link" href="${esc(p.file)}" target="_blank" rel="noopener"
                ><img
                  loading="lazy"
                  alt="${esc(p.name)}"
                  referrerpolicy="no-referrer"
                  src="${esc(p.image)}"
              /></a>
              <div class="player-meta">
                <h4>${esc(p.name)}</h4>
                <a class="player-peak" href="${esc(p.stat)}" target="_blank" rel="noopener"
                  >Peak ${p.peak}</a
                >
                <p>${esc(p.title)}${p.years ? ' · ' + esc(p.years) : ''}</p>
                <small>Photo: ${esc(p.credit)} · ${esc(p.license)}</small>
              </div>
            </article>`,
        )
        .join('');
      panel.querySelectorAll('img').forEach(
        (img) =>
          (img.onerror = () => {
            if (img.dataset.tried) {
              img.replaceWith(
                Object.assign(document.createElement('span'), {
                  className: 'portrait-fallback',
                  textContent: img.alt
                    .split(' ')
                    .map((w) => w[0])
                    .join(''),
                }),
              );
            } else {
              img.dataset.tried = 1;
              img.src = CATALOG.players.find((p) => p.name === img.alt).original;
            }
          }),
      );
    }
    $('.analysis').onchange = (e) => {
      analyse = e.target.checked;
      sel = -1;
      render();
    };
    $('.guessW').onkeydown = $('.guessB').onkeydown = (e) => {
      if (e.key === 'Enter') act('check');
    };
    let w = $('.boardwrap'),
      gesture = null;
    const point = (e) => {
      const b = w.getBoundingClientRect();
      return [((e.clientX - b.left) * 8) / b.width, ((e.clientY - b.top) * 8) / b.height];
    };
    const cell = (e) => {
      const [x, y] = point(e),
        c = Math.floor(x),
        r = Math.floor(y);
      return c < 0 || r < 0 || c > 7 || r > 7 ? -1 : (flip ? 7 - c : c) + (flip ? r : 7 - r) * 8;
    };
    const snapped = (g, e) => {
      const k = cell(e);
      if (k < 0) {
        g.snap = false;
        return -1;
      }
      if (!g.snap) return k;
      const [x, y] = point(e),
        [ox, oy] = center(g.a);
      let best = g.a,
        bd = 1e9;
      for (let i = 0; i < 64; i++) {
        const [cx, cy] = center(i),
          dx = Math.abs(cx - ox),
          dy = Math.abs(cy - oy);
        if (!(dx === 0 || dy === 0 || dx === dy || dx * dy === 2)) continue;
        const d = Math.hypot(cx - x, cy - y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return best;
    };
    const isRight = (e) => e.button === 2 || (e.buttons & 2) === 2;
    const brushOf = (e) => {
      const right = isRight(e);
      if (!right && !e.shiftKey) return 0;
      const A = (e.shiftKey || e.ctrlKey) && right,
        B = e.altKey || e.metaKey || e.getModifierState?.('AltGraph');
      return (A ? 1 : 0) + (B ? 2 : 0);
    };
    const settle = () => {
      w.querySelector('.sq.over')?.classList.remove('over');
      w.querySelector('.sq.lifting')?.classList.remove('lifting');
      w.querySelector('.ghost-piece')?.remove();
      if (gesture?.drag) {
        gesture.drag.style.transform = '';
        gesture.drag.classList.remove('dragging');
      }
    };
    w.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    w.addEventListener('pointerdown', (e) => {
      if (e.button === 1) return;
      if (gesture) {
        settle();
        gesture = ghost = null;
        paintMarks();
      }
      const a = cell(e);
      if (a < 0) return;
      const ann = isRight(e) || (e.button === 0 && e.shiftKey);
      if (!ann && e.button !== 0) return;
      e.preventDefault();
      if (ann) {
        gesture = { a, b: a, ann: true, snap: true, col: brushOf(e), pid: e.pointerId };
        ghost = gesture;
        paintMarks();
        return;
      }
      if (sel < 0 && marksOn(node).length) {
        marks.set(node, []);
        paintMarks();
      }
      const prev = sel,
        p = node.s.b[a];
      if (prev >= 0 && prev !== a && canPlay(prev, a)) {
        moveOrSelect(a);
        return;
      }
      const movable = p !== '.' && R.side(p) === node.s.t;
      gesture = {
        a,
        ann: false,
        x: e.clientX,
        y: e.clientY,
        picked: movable,
        wasSelected: prev === a,
        keyChanged: false,
        pid: e.pointerId,
      };
      if (movable) {
        if (sel !== a) {
          sel = a;
          renderBoard();
        }
        const sqEl = w.querySelector(`[data-sq="${a}"]`),
          svg = sqEl?.querySelector('svg');
        if (svg) {
          const gp = svg.cloneNode(true);
          gp.classList.add('ghost-piece');
          sqEl.append(gp);
          sqEl.classList.add('lifting');
          gesture.drag = svg;
        }
      } else if (sel >= 0) {
        sel = -1;
        renderBoard();
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (!gesture || e.pointerId !== gesture.pid) return;
      if (gesture.ann) {
        const b = snapped(gesture, e);
        if (b !== gesture.b) {
          gesture.b = b;
          ghost = b < 0 ? null : gesture;
          paintMarks();
        }
        return;
      }
      if (!gesture.drag) return;
      const dx = e.clientX - gesture.x,
        dy = e.clientY - gesture.y;
      if (!gesture.moving && Math.hypot(dx, dy) < 3) return;
      gesture.moving = true;
      gesture.drag.classList.add('dragging');
      gesture.drag.style.transform = `translate(${dx}px,${dy}px)`;
      const b = cell(e);
      if (b !== gesture.a) gesture.keyChanged = true;
      if (b !== gesture.over) {
        w.querySelector('.sq.over')?.classList.remove('over');
        if (b >= 0) w.querySelector(`[data-sq="${b}"]`)?.classList.add('over');
        gesture.over = b;
      }
    });
    window.addEventListener('pointercancel', (e) => {
      if (!gesture || e.pointerId !== gesture.pid) return;
      settle();
      gesture = ghost = null;
      paintMarks();
    });
    window.addEventListener('pointerup', (e) => {
      if (!gesture || e.pointerId !== gesture.pid) return;
      const g = gesture;
      settle();
      gesture = null;
      if (g.ann) {
        ghost = null;
        const b = snapped(g, e);
        if (b >= 0) toggleMark({ a: g.a, b, col: g.col });
        paintMarks();
        return;
      }
      if (!g.picked) return;
      const b = cell(e);
      if (b >= 0 && b !== g.a && g.moving) {
        if (canPlay(g.a, b)) {
          moveOrSelect(b);
          return;
        }
        sel = -1;
        renderBoard();
        return;
      }
      if ((g.wasSelected || g.keyChanged) && (b === g.a || b < 0)) {
        sel = -1;
        renderBoard();
      }
    });
    w.onkeydown = (e) => {
      if (e.target.dataset.sq === undefined || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
        return;
      const a = +e.target.dataset.sq;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        moveOrSelect(a);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const change = (e.key === 'ArrowUp' ? 8 : -8) * (flip ? -1 : 1);
        boardFocus = Math.max(0, Math.min(63, a + change));
        w.querySelector(`[data-sq="${boardFocus}"]`)?.focus();
      }
    };
    document.addEventListener('keydown', (e) => {
      if (
        hidden ||
        host.hidden ||
        $('.chessmain').hidden ||
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      )
        return;
      if (
        e.target.closest?.(
          'input:not([type="checkbox"]),textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"]',
        )
      )
        return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const square = e.target.closest?.('.sq');
        if (square) boardFocus = +square.dataset.sq;
        step(e.key === 'ArrowRight' ? 1 : -1);
        if (square) w.querySelector(`[data-sq="${boardFocus}"]`)?.focus({ preventScroll: true });
      }
    });
    random();
  }
  function say(s) {
    $('.cmsg').textContent = s;
  }
  function random() {
    if (!bag.length) {
      bag = Array.from({ length: 20 }, (_, i) => i);
      for (let i = 19; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    hist = ARCHIVE[bag.pop()];
    const g = R.pgn(hist.moves.join(' '));
    root = g.root;
    headers = { White: hist.white, Black: hist.black };
    line = [root];
    let n = root;
    while (n.kids[0]) {
      n = n.kids[0];
      line.push(n);
    }
    node = line[hist.at];
    Object.entries(hist.annotations || {}).forEach(([i, v]) => {
      if (line[i]) line[i].comment = v;
    });
    unlocked = false;
    $('.guessW').value = $('.guessB').value = '';
    marks = new WeakMap();
    sel = -1;
    say('');
    render();
  }
  function normalized(t) {
    return t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z ]/g, ' ')
      .trim()
      .split(/\s+/);
  }
  function guess(text, key) {
    return normalized(text).includes(normalized(key).at(-1));
  }
  function marksOn(n) {
    if (marks.has(n)) return marks.get(n);
    const result = [];
    for (const match of (n.comment || '').matchAll(/\[%(cal|csl)\s+([^\]]+)\]/gi)) {
      for (const t of match[2].split(',')) {
        const fields = /^([GRBY])([a-h][1-8])([a-h][1-8])?$/.exec(t.trim());
        if (fields)
          result.push({
            col: 'GRBY'.indexOf(fields[1]),
            a: R.sq(fields[2]),
            b: R.sq(fields[3] || fields[2]),
          });
      }
    }
    marks.set(n, result);
    return result;
  }
  function plainComment(n) {
    return (n.comment || '').replace(/\[%(?:cal|csl)\s+[^\]]*\]/gi, '').trim();
  }
  function exportGame() {
    let H = { ...headers },
      initial = R.fen(root.s);
    if (hist && unlocked) {
      H.Event = hist.event;
      H.Date = hist.year + '.??.??';
      H.Result = hist.result;
    }
    if (hist && !unlocked) {
      delete H.White;
      delete H.Black;
    }
    if (initial !== R.START) {
      H.SetUp = '1';
      H.FEN = initial;
    }
    const res = /^(1-0|0-1|1\/2-1\/2|\*)$/.test(H.Result) ? H.Result : '*';
    H.Result = res;
    const annotation = (n) => {
      const mt = marksOn(n);
      let inside = plainComment(n).replace(/[{}]/g, '');
      for (const [key, pred] of [
        ['cal', (a) => a.a !== a.b],
        ['csl', (a) => a.a === a.b],
      ]) {
        let group = mt.filter(pred);
        if (group.length)
          inside += ` [%${key} ${group.map((a) => 'GRBY'[a.col] + R.name(a.a) + (key === 'cal' ? R.name(a.b) : '')).join(',')}]`;
      }
      return inside.trim() ? ' {' + inside.trim() + '}' : '';
    };
    const textMove = (n) =>
      `${n.parent.s.n}${n.parent.s.t === 'w' ? '.' : '...'} ${n.san}${(n.nags || []).map((v) => ' ' + v).join('')}${annotation(n)}`;
    function sequence(parent, first = parent.kids[0], siblings = true) {
      let parts = [];
      while (first) {
        parts.push(textMove(first));
        if (siblings)
          for (const other of parent.kids)
            if (other !== first) parts.push('(' + sequence(parent, other, false) + ')');
        parent = first;
        first = parent.kids[0];
        siblings = true;
      }
      return parts.join(' ');
    }
    const raw = Object.entries(H).map(
      ([k, v]) =>
        '[' +
        k +
        ' "' +
        String(v)
          .replace(/[\\"]/g, '\\$&')
          .replace(/[\r\n]/g, ' ') +
        '"]',
    );
    const blob = new Blob(
        [raw.join('\n') + '\n\n' + annotation(root) + ' ' + sequence(root) + ' ' + res + '\n'],
        { type: 'application/x-chess-pgn' },
      ),
      u = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = u;
    a.download = 'position-study.pgn';
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  function act(k) {
    if (k === 'players') {
      $('.chessmain').hidden = true;
      $('.playerdeck').hidden = false;
      return;
    }
    if (k === 'board') {
      $('.playerdeck').hidden = true;
      $('.chessmain').hidden = false;
      return;
    }
    if (k === 'export') {
      exportGame();
      return;
    }
    if (k === 'fen') {
      try {
        const f = $('.fenbox').value;
        let s = R.read(f);
        root = node = { s, kids: [], comment: '' };
        hist = null;
        headers = {};
        unlocked = analyse = true;
        sel = -1;
        $('.analysis').checked = true;
        render();
        say('Position loaded.');
      } catch (e) {
        say(e.message);
      }
      return;
    }
    if (k === 'check') {
      if (guess($('.guessW').value, hist.white) && guess($('.guessB').value, hist.black)) {
        unlocked = true;
        say('Correct.');
        render();
      } else say('Not this combination. Check White and Black.');
    }
    if (k === 'reveal') {
      unlocked = true;
      say('');
      render();
    }
    if (k === 'prev' || k === 'next') step(k === 'next' ? 1 : -1);
    if (k === 'flip') {
      flip = !flip;
      renderBoard();
    }
    if (k === 'clear') {
      marks.set(node, []);
      paintMarks();
    }
  }
  function set(n) {
    if (!n) return;
    node = n;
    sel = -1;
    bestMove = null;
    $('.promote').hidden = true;
    say('');
    render();
  }
  function step(dir) {
    set(dir < 0 ? node.parent : branchChosen.get(node) || node.kids[0]);
  }
  function resolveDest(a, b, ls) {
    if (ls.some((m) => m.a === a && m.b === b)) return b;
    if (node.s.b[a].toUpperCase() === 'K' && a >> 3 === b >> 3) {
      const c = b > a ? a + 2 : a - 2;
      if ((b % 8 === 7 || b % 8 === 0) && ls.some((m) => m.a === a && m.b === c)) return c;
    }
    return b;
  }
  function canPlay(a, b) {
    const ls = R.legal(node.s),
      d = resolveDest(a, b, ls);
    return ls.some((m) => m.a === a && m.b === d);
  }
  function moveOrSelect(b) {
    const p = node.s.b[b],
      ls = R.legal(node.s);
    if (sel >= 0) {
      const d = resolveDest(sel, b, ls);
      let ok = ls.filter((m) => m.a === sel && m.b === d);
      if (ok.length) {
        const play = (m) => {
          let n = R.child(node, m);
          branchChosen.set(node, n);
          set(n);
        };
        if (ok.length > 1) {
          let h = $('.promote');
          h.hidden = false;
          h.textContent = 'Promote to ';
          ok.forEach((m) => {
            let bt = document.createElement('button');
            bt.className = 'mini';
            bt.textContent = m.p.toUpperCase();
            bt.onclick = () => play(m);
            h.append(bt);
          });
        } else play(ok[0]);
        return;
      }
    }
    sel = p !== '.' && R.side(p) === node.s.t && sel !== b ? b : -1;
    renderBoard();
  }
  function center(i) {
    let x = i % 8,
      y = i >> 3;
    return [flip ? 7.5 - x : x + 0.5, flip ? y + 0.5 : 7.5 - y];
  }
  function toggleMark(s) {
    const list = marksOn(node).slice(),
      i = list.findIndex((x) => x.a === s.a && x.b === s.b),
      same = i >= 0 && list[i].col === s.col;
    if (i >= 0) list.splice(i, 1);
    if (!same) list.push(s);
    marks.set(node, list);
  }
  function svgEl(t, a) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', t);
    for (const k in a) e.setAttribute(k, a[k]);
    return e;
  }
  function paintMarks() {
    const svg = $('.arrows');
    if (!svg) return;
    const list = marksOn(node),
      cur = ghost && ghost.b >= 0 ? ghost : null,
      erase = cur ? list.findIndex((x) => x.a === cur.a && x.b === cur.b && x.col === cur.col) : -1,
      all = [];
    if (analyse && bestMove && bestMove.a !== bestMove.b)
      all.push({
        s: { a: bestMove.a, b: bestMove.b, col: 2 },
        cur: false,
        erase: false,
        auto: true,
      });
    for (let i = 0; i < list.length; i++)
      all.push({ s: list[i], cur: false, erase: i === erase, auto: false });
    if (cur && erase < 0) all.push({ s: cur, cur: true, erase: false, auto: false });
    const slots = new Map();
    for (const { s } of all)
      if (s.a !== s.b) {
        const [x, y] = center(s.a),
          [X, Y] = center(s.b),
          k = ((Math.round((Math.atan2(Y - y, X - x) * 8) / Math.PI) % 16) + 16) % 16;
        if (!slots.has(s.b)) slots.set(s.b, new Set());
        slots.get(s.b).add(k);
      }
    const short = (b) => {
      const z = slots.get(b);
      return !!z && [...z].some((k) => [1, 2, 3].some((i) => z.has((k + i) % 16)));
    };
    const defs = svgEl('defs', {});
    ink.forEach((c, i) => {
      const mk = svgEl('marker', {
        id: 'chess-ah-' + i,
        orient: 'auto',
        overflow: 'visible',
        markerWidth: 4,
        markerHeight: 4,
        refX: 2.05,
        refY: 2,
      });
      mk.appendChild(svgEl('path', { d: 'M0,0 V4 L3,2 Z', fill: c }));
      defs.appendChild(mk);
    });
    const grp = svgEl('g', {});
    for (const { s, cur, erase, auto } of all) {
      const col = ink[s.col],
        op = (auto ? 0.4 : 1) * (erase ? 0.6 : cur ? 0.9 : 1),
        [x, y] = center(s.a);
      if (s.a === s.b) {
        grp.appendChild(
          svgEl('circle', {
            cx: x,
            cy: y,
            r: 0.5 - 2 / 64,
            fill: 'none',
            stroke: col,
            'stroke-width': (cur ? 3 : 4) / 64,
            opacity: op,
          }),
        );
        continue;
      }
      const [X, Y] = center(s.b),
        m = (short(s.b) && !cur ? 20 : 10) / 64,
        ang = Math.atan2(Y - y, X - x),
        sw = ((auto ? 15 : 10) / 64) * (cur ? 0.85 : 1);
      grp.appendChild(
        svgEl('line', {
          x1: x,
          y1: y,
          x2: X - Math.cos(ang) * m,
          y2: Y - Math.sin(ang) * m,
          stroke: col,
          'stroke-width': sw,
          'stroke-linecap': 'round',
          'marker-end': `url(#chess-ah-${s.col})`,
          opacity: op,
        }),
      );
    }
    svg.replaceChildren(defs, grp);
  }
  const CBURNETT = {
    P: '<svg aria-hidden="true" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>',
    B: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g></svg>',
    N: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/></g></svg>',
    R: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" stroke-linejoin="miter"/></g></svg>',
    Q: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g></svg>',
    K: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
    p: '<svg aria-hidden="true" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>',
    b: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#ececec" stroke-linejoin="miter"/></g></svg>',
    n: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#000"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#ececec" stroke="#ececec"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#ececec" stroke="none"/></g></svg>',
    r: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/><path d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23" fill="none" stroke="#ececec" stroke-width="1" stroke-linejoin="miter"/></g></svg>',
    q: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke-linecap="butt"/><path d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0" fill="none" stroke="#ececec"/></g></svg>',
    k: '<svg aria-hidden="true" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#000"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9" stroke="#ececec"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#ececec"/></g></svg>',
  };
  function glyph(p) {
    return CBURNETT[p] || '';
  }
  function renderBoard() {
    let last = node.m,
      st = node.s,
      ms = sel >= 0 ? R.legal(st).filter((m) => m.a === sel) : [],
      legal = ms.map((m) => m.b),
      ep = sel >= 0 && st.b[sel].toUpperCase() === 'P' ? st.e : -1,
      king = st.b.indexOf(st.t === 'w' ? 'K' : 'k'),
      check = king >= 0 && R.hit(st, king, R.opp(st.t)) ? king : -1,
      html = '';
    for (let j = 0; j < 64; j++) {
      let x = j % 8,
        y = j >> 3,
        i = (flip ? 7 - x : x) + (flip ? y : 7 - y) * 8,
        p = node.s.b[i];
      html += /* HTML */ `<button
        type="button"
        tabindex="${boardFocus === i ? 0 : -1}"
        class="sq ${(x + y) % 2 ? 'darkSq' : 'lightSq'} ${sel === i ? 'from' : ''} ${last && (last.a === i || last.b === i) ? 'last' : ''} ${legal.includes(i) ? (p === '.' && i !== ep ? 'dot' : 'cap') : ''} ${check === i ? 'check' : ''}"
        data-sq="${i}"
        aria-label="${R.name(i)} ${p === '.' ? 'empty' : (R.side(p) === 'w' ? 'white ' : 'black ') + { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' }[p.toUpperCase()]}"
      >
        ${glyph(p)}${x === 7 ? /* HTML */ `<small>${(i >> 3) + 1}</small>` : ''}${y === 7 ? /* HTML */ `<em>${files[i % 8]}</em>` : ''}
      </button>`;
    }
    $('.boardgrid').innerHTML = html;
    paintMarks();
  }
  function render() {
    if (!node) return;
    renderBoard();
    let s = node.s;
    $('.ctitle').textContent = unlocked
      ? (fullnames[headers.White] || headers.White || 'White') +
        ' – ' +
        (fullnames[headers.Black] || headers.Black || 'Black')
      : 'Guess the players';
    $('.turn').textContent =
      `${s.t === 'w' ? 'White' : 'Black'} to move · ${s.n}${s.t === 'b' ? '…' : '.'}`;
    $('.quiz').hidden = unlocked;
    $('.gameinfo').textContent = unlocked
      ? [
          hist
            ? [hist.event, hist.year, hist.result].join(' · ')
            : [headers.Event, headers.Date, headers.Result].filter(Boolean).join(' · '),
          plainComment(node) || (hist ? hist.note : ''),
        ]
          .filter(Boolean)
          .join(' — ')
      : '';
    $('.gamecredit').innerHTML =
      hist && unlocked && hist.source
        ? /* HTML */ `<a href="${esc(hist.source)}" target="_blank" rel="noopener">Game source</a>`
        : '';
    $('.fenbox').value = R.fen(s);
    $('.ply').textContent = node.m
      ? node.parent.s.n + (node.parent.s.t === 'w' ? '. ' : '… ') + node.san
      : 'Start';
    $('[data-key=prev]').disabled = !node.parent;
    $('[data-key=next]').disabled = !node.kids.length;
    const vs = $('.choices');
    vs.replaceChildren();
    if (node.kids.length > 1) {
      vs.append('Variations: ');
      node.kids.forEach((c) => {
        let b = document.createElement('button');
        b.className = 'mini';
        b.textContent = c.san;
        b.onclick = () => {
          branchChosen.set(node, c);
          set(c);
        };
        vs.append(b);
      });
    }
    let list = $('.scores');
    list.replaceChildren();
    let a = root,
      walk = 0;
    while (a.kids.length && walk++ < 1000) {
      let k = branchChosen.get(a) || a.kids[0];
      const btn = document.createElement('button');
      btn.textContent = (a.s.t === 'w' ? a.s.n + '. ' : '') + k.san;
      btn.className = k === node ? 'current' : '';
      btn.onclick = () => set(k);
      list.append(btn);
      a = k;
    }
    $('.engine').hidden = !analyse;
    if (analyse && !hidden) scheduleEval();
    else cancelEval();
  }
  function cancelEval() {
    evToken++;
    clearTimeout(timer);
    abort?.abort();
    abort = null;
    if (bestMove) {
      bestMove = null;
      if (host) paintMarks();
    }
  }
  function score(cp, mate) {
    return mate !== undefined ? '#' + mate : (cp >= 0 ? '+' : '') + (cp / 100).toFixed(2);
  }
  function showEv(v, where) {
    $('.evalbar').hidden = false;
    $('.evalnum').textContent =
      `${score(v.cp || 0, v.mate)} · ${where}${v.depth ? ' · depth ' + v.depth : ''}`;
    let sc = v.mate !== undefined ? Math.sign(v.mate) * 1800 : v.cp || 0;
    $('.evalbar i').style.width = 50 + 47 * Math.tanh(sc / 420) + '%';
    let p = node.s,
      line = [],
      first = null;
    for (const u of (v.moves || '').split(/\s+/).slice(0, 8)) {
      if (!u) continue;
      let m = R.parse(p, u);
      if (!m) break;
      if (!first) first = { a: m.a, b: m.b };
      line.push((p.t === 'w' ? p.n + '. ' : '') + R.san(p, m));
      p = R.next(p, m);
    }
    bestMove = first;
    paintMarks();
    $('.evalpv').textContent = line.join(' ');
  }
  // Preserve the played branch so live engines can recognise repetition.
  function analysisPosition() {
    let current = node,
      moves = [];
    while (current.parent) {
      const m = current.m;
      moves.push(R.name(m.a) + R.name(m.b) + (m.p || ''));
      current = current.parent;
    }
    return (
      'position fen ' +
      R.fen(current.s) +
      (moves.length ? ' moves ' + moves.reverse().join(' ') : '')
    );
  }
  function scheduleEval() {
    cancelEval();
    const token = evToken,
      fen = R.fen(node.s);
    $('.evalpv').textContent = '';
    $('.evalbar').hidden = true;
    if (!R.legal(node.s).length) {
      const checked = R.hit(
        node.s,
        node.s.b.indexOf(node.s.t === 'w' ? 'K' : 'k'),
        R.opp(node.s.t),
      );
      $('.evalnum').textContent = checked
        ? 'Checkmate · ' + (node.s.t === 'w' ? 'Black' : 'White') + ' wins'
        : 'Stalemate · draw';
      return;
    }
    $('.evalnum').textContent = 'Checking Lichess…';
    const controller = (abort = new AbortController());
    const position = analysisPosition();
    timer = setTimeout(async () => {
      try {
        evalService ??= ChessAnalysis.create();
        const value = await evalService.analyse(fen, {
          signal: controller.signal,
          position,
          onStatus: (status) => {
            if (token === evToken) $('.evalnum').textContent = status;
          },
        });
        if (token === evToken) showEv(value, value.provider);
      } catch (error) {
        if (token === evToken && error.name !== 'AbortError')
          $('.evalnum').textContent = error.message;
      } finally {
        if (abort === controller) abort = null;
      }
    }, 420);
  }
  function show(v) {
    hidden = !v;
    if (!v) cancelEval();
    else if (host && analyse) render();
  }
  return { init, show };
})();
