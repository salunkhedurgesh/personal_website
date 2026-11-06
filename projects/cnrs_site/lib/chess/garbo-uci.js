/* UCI adapter for Gary Linscott's unmodified BSD Garbochess-JS engine.
   The upstream engine and its license are distributed alongside this adapter. */
'use strict';
importScripts('garbochess.js');

function principalVariation(move) {
  const played = [],
    moves = [];
  while (move && moves.length < 16 && GenerateValidMoves().includes(move)) {
    moves.push(FormatMove(move));
    MakeMove(move);
    played.push(move);
    const entry = g_hashTable[g_hashKeyLow & g_hashMask];
    move = entry && entry.lock === g_hashKeyHigh ? entry.bestMove : 0;
  }
  while (played.length) UnmakeMove(played.pop());
  return moves.join(' ');
}

ResetGame();
self.onmessage = ({ data }) => {
  const command = String(data).trim();
  if (command === 'uci') {
    postMessage('id name Garbochess-JS');
    postMessage('id author Gary Linscott');
    postMessage('uciok');
  } else if (command === 'isready') postMessage('readyok');
  else if (command === 'ucinewgame') ResetGame();
  else if (command.startsWith('position fen ')) {
    const [fen, moves] = command.slice(13).split(' moves ');
    const error = InitializeFromFen(fen);
    if (error) throw Error(error);
    for (const uci of (moves || '').split(/\s+/).filter(Boolean)) {
      const move = GenerateValidMoves().find((m) => FormatMove(m) === uci);
      if (!move) throw Error('Illegal history move');
      MakeMove(move);
    }
  } else if (command.startsWith('go depth ')) {
    const depth = Number(command.slice(9));
    if (!Number.isInteger(depth) || depth < 1 || depth > 32) throw Error('Invalid search depth');
    // No timed, shallow result: the parent worker watchdog handles cancellation.
    g_timeout = Infinity;
    let best = '0000';
    Search(null, depth, (move, value, elapsed, completed) => {
      if (!move) return;
      best = FormatMove(move);
      // Garbochess values a pawn at 800 internal units; convert to centipawns.
      const evaluation =
        Math.abs(value) > maxMateBuffer
          ? 'mate ' + Math.sign(value) * Math.ceil((maxEval - Math.abs(value)) / 2)
          : 'cp ' + Math.round(value / 8);
      postMessage(
        `info depth ${completed} score ${evaluation} time ${elapsed} pv ${principalVariation(move)}`,
      );
    });
    postMessage('bestmove ' + best);
  }
};
