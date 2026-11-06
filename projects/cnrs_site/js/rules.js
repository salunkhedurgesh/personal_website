/* Standard chess, a1 = 0. A board is immutable after a move. The same legality
   check is used for PGN, click-to-move and validating engine analysis lines. */
(function (g) {
  'use strict';
  const FILE = 'abcdefgh',
    START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sq = (s) => FILE.indexOf(s[0]) + 8 * (+s[1] - 1),
    name = (i) => FILE[i % 8] + (1 + (i >> 3)),
    side = (p) => (p === p.toUpperCase() ? 'w' : 'b'),
    opp = (c) => (c === 'w' ? 'b' : 'w');
  function read(f = START) {
    const [placement, t, c, e, h, m] = f.trim().split(/\s+/),
      rows = placement.split('/').reverse();
    if (
      rows.length !== 8 ||
      !['w', 'b'].includes(t) ||
      !/^(-|[KQkq]+)$/.test(c || '') ||
      !(e === '-' || /^[a-h][36]$/.test(e || '')) ||
      (h !== undefined && !/^\d+$/.test(h)) ||
      (m !== undefined && !/^[1-9]\d*$/.test(m))
    )
      throw Error('Invalid starting FEN');
    let b = [];
    for (let r of rows) {
      let s = r.replace(/[1-8]/g, (n) => '.'.repeat(+n));
      if (s.length !== 8 || /[^PNBRQKpnbrqk.]/.test(s)) throw Error('Invalid starting position');
      b.push(...s);
    }
    if (b.filter((p) => p === 'K').length !== 1 || b.filter((p) => p === 'k').length !== 1)
      throw Error('The position must contain one king of each colour');
    return { b, t, c: c === '-' ? '' : c, e: e === '-' ? -1 : sq(e), h: +h || 0, n: +m || 1 };
  }
  function fen(s) {
    let rr = [];
    for (let r = 7; r >= 0; r--)
      rr.push(
        s.b
          .slice(r * 8, r * 8 + 8)
          .join('')
          .replace(/\.+/g, (m) => m.length),
      );
    return [rr.join('/'), s.t, s.c || '-', s.e < 0 ? '-' : name(s.e), s.h, s.n].join(' ');
  }
  const N = [
      [1, 2],
      [2, 1],
      [2, -1],
      [1, -2],
      [-1, -2],
      [-2, -1],
      [-2, 1],
      [-1, 2],
    ],
    D = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ],
    O = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ],
    A = [...D, ...O],
    inside = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;
  function hit(s, i, by) {
    if (i < 0) return true;
    let x = i % 8,
      y = i >> 3,
      white = by === 'w',
      of = (p) => (white ? p.toUpperCase() : p);
    for (let dx of [-1, 1]) {
      let r = y + (white ? -1 : 1);
      if (inside(x + dx, r) && s.b[r * 8 + x + dx] === of('p')) return true;
    }
    for (let [dx, dy] of N)
      if (inside(x + dx, y + dy) && s.b[(y + dy) * 8 + x + dx] === of('n')) return true;
    for (let [dx, dy] of A) {
      for (let d = 1; inside(x + dx * d, y + dy * d); d++) {
        let p = s.b[(y + dy * d) * 8 + x + dx * d];
        if (p === '.') continue;
        if (p === of('q') || p === of(dx && dy ? 'b' : 'r') || (d === 1 && p === of('k')))
          return true;
        break;
      }
    }
    return false;
  }
  function next(s, m) {
    let b = s.b.slice(),
      p = b[m.a],
      victim = b[m.b],
      w = s.t === 'w',
      k = p.toLowerCase(),
      c = s.c,
      e = -1;
    b[m.a] = '.';
    b[m.b] = m.p ? (w ? m.p.toUpperCase() : m.p) : p;
    if (k === 'p') {
      if (m.b === s.e && victim === '.' && m.a % 8 !== m.b % 8) b[m.b + (w ? -8 : 8)] = '.';
      if (Math.abs(m.b - m.a) === 16) e = (m.a + m.b) / 2;
    }
    if (k === 'k') {
      c = c.replace(w ? /[KQ]/g : /[kq]/g, '');
      if (Math.abs(m.a - m.b) === 2) {
        let dir = m.b > m.a ? 1 : -1,
          r = m.a + (dir === 1 ? 3 : -4);
        b[m.a + dir] = b[r];
        b[r] = '.';
      }
    }
    for (let [i, l] of [
      [0, 'Q'],
      [7, 'K'],
      [56, 'q'],
      [63, 'k'],
    ])
      if (m.a === i || m.b === i) c = c.replace(l, '');
    return {
      b,
      t: opp(s.t),
      c,
      e,
      h: k === 'p' || victim !== '.' ? 0 : s.h + 1,
      n: s.n + (w ? 0 : 1),
    };
  }
  function legal(s) {
    let ms = [],
      w = s.t === 'w',
      enemy = opp(s.t);
    for (let a = 0; a < 64; a++) {
      let p = s.b[a];
      if (p === '.' || side(p) !== s.t) continue;
      let k = p.toLowerCase(),
        x = a % 8,
        y = a >> 3;
      const add = (b, pr = '') => {
        if (s.b[b].toLowerCase() !== 'k') ms.push({ a, b, p: pr });
      };
      if (k === 'p') {
        let dir = w ? 1 : -1,
          r = y + dir;
        if (r < 0 || r > 7) continue;
        const push = (b) => {
          if (r === 0 || r === 7) 'qrbn'.split('').forEach((v) => add(b, v));
          else add(b);
        };
        if (s.b[r * 8 + x] === '.') {
          push(r * 8 + x);
          if (y === (w ? 1 : 6) && s.b[(r + dir) * 8 + x] === '.') add((r + dir) * 8 + x);
        }
        for (let dx of [-1, 1])
          if (inside(x + dx, r)) {
            let b = r * 8 + x + dx;
            if (
              (s.b[b] !== '.' && side(s.b[b]) === enemy) ||
              (b === s.e && s.b[b + (w ? -8 : 8)] === (w ? 'p' : 'P'))
            )
              push(b);
          }
        continue;
      }
      let ds = k === 'n' ? N : k === 'b' ? D : k === 'r' ? O : A;
      for (let [dx, dy] of ds) {
        for (let d = 1; inside(x + d * dx, y + d * dy); d++) {
          let b = (y + d * dy) * 8 + x + d * dx,
            v = s.b[b];
          if (v === '.' || side(v) === enemy) add(b);
          if (v !== '.' || k === 'k' || k === 'n') break;
        }
      }
      if (k === 'k' && a === (w ? 4 : 60) && !hit(s, a, enemy)) {
        for (let [l, dir, off] of [
          [w ? 'K' : 'k', 1, 3],
          [w ? 'Q' : 'q', -1, -4],
        ])
          if (
            s.c.includes(l) &&
            s.b[a + off] === (w ? 'R' : 'r') &&
            s.b[a + dir] === '.' &&
            s.b[a + 2 * dir] === '.' &&
            (dir > 0 || s.b[a - 3] === '.') &&
            !hit(s, a + dir, enemy)
          )
            add(a + 2 * dir);
      }
    }
    return ms.filter((m) => {
      let r = next(s, m);
      return !hit(r, r.b.indexOf(w ? 'K' : 'k'), enemy);
    });
  }
  function san(s, m, ls = legal(s)) {
    let k = s.b[m.a].toUpperCase(),
      cap = s.b[m.b] !== '.' || (k === 'P' && m.a % 8 !== m.b % 8),
      t = '';
    if (k === 'K' && Math.abs(m.b - m.a) === 2) t = m.b > m.a ? 'O-O' : 'O-O-O';
    else {
      if (k !== 'P') {
        t = k;
        let alts = ls.filter((z) => z.a !== m.a && z.b === m.b && s.b[z.a] === s.b[m.a]);
        if (alts.length)
          t += !alts.some((z) => z.a % 8 === m.a % 8)
            ? FILE[m.a % 8]
            : !alts.some((z) => z.a >> 3 === m.a >> 3)
              ? 1 + (m.a >> 3)
              : name(m.a);
      } else if (cap) t = FILE[m.a % 8];
      t += (cap ? 'x' : '') + name(m.b) + (m.p ? '=' + m.p.toUpperCase() : '');
    }
    let r = next(s, m);
    if (hit(r, r.b.indexOf(r.t === 'w' ? 'K' : 'k'), s.t)) t += legal(r).length ? '+' : '#';
    return t;
  }
  const clean = (t) =>
    t
      .replace(/0/g, 'O')
      .replace(/[!?+#]/g, '')
      .replace(/=/g, '')
      .trim();
  function parse(s, t) {
    let ls = legal(s),
      n = clean(t);
    let u = ls.find((m) => name(m.a) + name(m.b) + m.p === n);
    if (u) return u;
    const dest = /([a-h][1-8])(?:[QRBN])?$/.exec(n);
    return ls.filter((m) => !dest || name(m.b) === dest[1]).find((m) => clean(san(s, m, ls)) === n);
  }
  // Tree-preserving PGN reader, including FEN starts, comments, NAGs and RAVs.
  function pgn(text) {
    const headers = {};
    text = text
      .replace(/^\s*\[(\w+)\s+"((?:\\.|[^"])*)"\s*\]\s*$/gm, (_, k, v) => {
        headers[k] = v.replace(/\\(["\\])/g, '$1');
        return '';
      })
      .replace(/^%.*$/gm, '')
      .replace(/;[^\n]*/g, '');
    let root = { s: read(headers.FEN || START), kids: [], comment: '' },
      here = root,
      stack = [];
    for (let tok of text.match(/\{[^}]*\}|\(|\)|\$\d+|[^\s(){}]+/g) || []) {
      if (tok[0] === '{') {
        here.comment += (here.comment ? ' ' : '') + tok.slice(1, -1).trim();
        continue;
      }
      if (tok === '(') {
        stack.push(here);
        here = here.parent || root;
        continue;
      }
      if (tok === ')') {
        if (!stack.length) throw Error('Unmatched PGN variation');
        here = stack.pop();
        continue;
      }
      if (/^\$\d+$/.test(tok)) {
        (here.nags ||= []).push(tok);
        continue;
      }
      const appended = tok.match(/\$\d+$/)?.[0];
      tok = tok.replace(/^\d+\.+/, '').replace(/\$\d+$/, '');
      if (!tok || /^\$|^\.*$|^(1-0|0-1|1\/2-1\/2|\*|e\.p\.|[?!]+)$/.test(tok)) continue;
      let m = parse(here.s, tok);
      if (!m) throw Error('Illegal or unrecognised move: ' + tok);
      here = child(here, m);
      if (appended) (here.nags ||= []).push(appended);
    }
    if (stack.length) throw Error('Unclosed variation');
    return { root, headers };
  }
  function child(n, m) {
    let exist = n.kids.find((k) => k.m.a === m.a && k.m.b === m.b && k.m.p === m.p);
    if (exist) return exist;
    let z = { s: next(n.s, m), san: san(n.s, m), m, parent: n, kids: [], comment: '' };
    n.kids.push(z);
    return z;
  }
  g.Rules = { read, fen, legal, next, san, parse, hit, side, opp, name, sq, START, pgn, child };
})(globalThis);
