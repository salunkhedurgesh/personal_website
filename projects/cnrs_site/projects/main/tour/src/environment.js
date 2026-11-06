/* All times use Strasbourg, not the visitor’s timezone. Solar height is an approximation;
   clouds come from Open-Meteo current conditions, never from visitor geolocation. */
(() => {
  'use strict';
  const lat = 48.57532,
    lon = 7.74305,
    rad = Math.PI / 180,
    clamp = (x) => Math.max(0, Math.min(1, x)),
    sm = (a, b, x) => {
      let z = clamp((x - a) / (b - a));
      return z * z * (3 - 2 * z);
    },
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    key = 'strasbourg.atlas.weather.v3';
  let sample = null,
    mode = 'live',
    offline = false,
    lastTry = 0,
    busy = false;
  // Sun vector is in the same east/up/south system as the city model.
  function position(date) {
    const d = date.valueOf() / 86400000 - 10957.5,
      M = (357.5291 + 0.98560028 * d) * rad,
      C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * rad,
      L = M + C + Math.PI + 102.9372 * rad,
      e = 23.4397 * rad,
      ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L)),
      dec = Math.asin(Math.sin(L) * Math.sin(e)),
      h = (280.16 + 360.9856235 * d + lon) * rad - ra,
      cd = Math.cos(dec),
      sd = Math.sin(dec),
      cl = Math.cos(lat * rad),
      sl = Math.sin(lat * rad),
      v = [-cd * Math.sin(h), sl * sd + cl * cd * Math.cos(h), sl * cd * Math.cos(h) - cl * sd];
    return { a: Math.asin(Math.max(-1, Math.min(1, v[1]))) / rad, dir: v, rising: v[0] > 0 };
  }
  function height(d) {
    return position(d).a;
  }
  const zone = 'Europe/Paris',
    civilFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  const civil = (d) =>
    Object.fromEntries(
      civilFmt
        .formatToParts(d)
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, Number(p.value)]),
    );
  const utc = (p) => Date.UTC(p.year, p.month - 1, p.day, p.hour || 0, p.minute || 0),
    minuteMs = 60000;
  const hhmm = (m) =>
    String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  let dayCache = null,
    lastSecond = -1,
    lastDay;
  function today(d) {
    const sec = Math.floor(+d / 1000);
    if (sec === lastSecond) return lastDay;
    lastSecond = sec;
    const p = civil(d),
      base = Date.UTC(p.year, p.month - 1, p.day);
    if (!dayCache || base !== dayCache.base) {
      const offsets = [
        ...new Set(
          [-12, 36].map((h) => {
            const ms = base + h * 3600000;
            return utc(civil(new Date(ms))) - ms;
          }),
        ),
      ];
      dayCache = { base, offsets, memo: new Map() };
    }
    return (lastDay = dayCache);
  }
  // Repeated fall-back times use their first occurrence. In the spring gap move to
  // the first valid sample one hour later and expose the effective civil time in the UI.
  function wall(day, m) {
    if (day.memo.has(m)) return day.memo.get(m);
    const nominal = day.base + m * minuteMs;
    const choices = day.offsets.map((o) => {
      const ms = nominal - o;
      return { ms, wall: utc(civil(new Date(ms))) };
    });
    const best =
      choices.filter((x) => x.wall === nominal).sort((a, b) => a.ms - b.ms)[0] ||
      choices.filter((x) => x.wall > nominal).sort((a, b) => a.wall - b.wall)[0] ||
      choices[0];
    const value = {
      ...position(new Date(best.ms)),
      minutes: Math.round((best.wall - day.base) / minuteMs),
      at: best.ms,
    };
    day.memo.set(m, value);
    return value;
  }
  let chosen = 720,
    rev = 0,
    cache = null;
  function signal() {
    rev++;
    cache = null;
    window.dispatchEvent(new Event('atlas-environment'));
  }
  function valid(s) {
    return (
      s &&
      Number.isFinite(s.at) &&
      Number.isFinite(s.cloud) &&
      s.cloud >= 0 &&
      s.cloud <= 100 &&
      Number.isFinite(s.code) &&
      Math.abs(Date.now() - s.at) < 3 * 3600000
    );
  }
  try {
    let pre = JSON.parse(localStorage.getItem(key));
    if (valid(pre)) sample = pre;
  } catch {}
  async function update() {
    if (busy || Date.now() - lastTry < 15 * 60000) return;
    lastTry = Date.now();
    busy = true;
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 6500);
    try {
      let u =
        'https://api.open-meteo.com/v1/forecast?latitude=' +
        lat +
        '&longitude=' +
        lon +
        '&current=cloud_cover,weather_code,precipitation,rain,showers,snowfall&timeformat=unixtime&timezone=Europe%2FParis';
      let r = await fetch(u, {
        signal: abort.signal,
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      });
      if (!r.ok) throw Error(r.status);
      let c = (await r.json()).current;
      let s = {
        at: c.time * 1000,
        cloud: c.cloud_cover,
        code: c.weather_code,
        mm: c.precipitation || 0,
        rain: (c.rain || 0) + (c.showers || 0),
        snow: c.snowfall || 0,
      };
      if (!valid(s)) throw Error('Stale forecast');
      sample = s;
      offline = false;
      try {
        localStorage.setItem(key, JSON.stringify(s));
      } catch {}
    } catch {
      offline = true;
    } finally {
      busy = false;
      clearTimeout(timer);
      signal();
    }
  }
  const manual = {
    sunny: ['Sunny daylight', [1, 1, 0, 0]],
    overcast: ['Overcast daylight', [0.9, 0.06, 0, 0.1]],
    sunset: ['Sunset', [0.55, 0.84, 1, 0.72]],
    night: ['Night · desk lamp', [0, 0.28, 0, 1]],
  };
  // The slider's coloured band follows the same local-day calculation as the scene.
  function ramp(day) {
    if (day.ramp) return day.ramp;
    const stops = Array.from({ length: 49 }, (_, i) => {
      let m = Math.min(1435, i * 30),
        a = wall(day, m).a;
      let palette = [
        [-12, [48, 66, 82]],
        [-6, [82, 82, 104]],
        [0, [176, 113, 86]],
        [7, [216, 167, 110]],
        [22, [222, 199, 143]],
        [45, [236, 213, 147]],
      ];
      let j = 0;
      while (j < palette.length - 2 && a > palette[j + 1][0]) j++;
      const [v, c] = palette[j],
        [w, e] = palette[j + 1],
        k = clamp((a - v) / (w - v));
      return (
        'rgb(' +
        c.map((x, i) => Math.round(x + (e[i] - x) * k)).join(',') +
        ') ' +
        ((i * 100) / 48).toFixed(2) +
        '%'
      );
    });
    return (day.ramp = 'linear-gradient(90deg,' + stops.join(',') + ')');
  }
  function state(d = new Date()) {
    const sec = Math.floor(+d / 1000);
    if (cache && cache.sec === sec && cache.rev === rev) return cache.value;
    const time = fmt.format(d),
      [h, m, s] = time.split(':').map(Number),
      nowMinutes = h * 60 + m,
      hands = [
        (((h % 12) + m / 60 + s / 3600) * Math.PI) / 6,
        ((m + s / 60) * Math.PI) / 30,
        (s * Math.PI) / 30,
      ];
    const manualPreset = Object.hasOwn(manual, mode),
      dayKey = today(d),
      solar = mode === 'time' ? wall(dayKey, chosen) : position(d),
      a = solar.a;
    const wx = valid(sample) ? sample : null,
      cloud = wx ? Math.max(wx.cloud, wx.code >= 45 ? 80 : 0) / 100 : null;
    let source = wx
      ? (offline ? 'Cached cloud data' : 'Open-Meteo') + ' · ' + Math.round(wx.cloud) + '% cloud'
      : busy
        ? 'Checking cloud cover…'
        : 'Sun angle only · no cloud data';
    let sun = mode === 'time' ? 1 : cloud === null ? 0.54 : clamp(1 - 0.93 * cloud),
      day = sm(-7, 10, a),
      warm = sm(-7, -1, a) * (1 - sm(3, 18, a)),
      lamp = 1 - sm(-0.6, 8, a);
    let label =
      a < -6
        ? 'Night · desk lamp'
        : a < 1.5
          ? solar.rising
            ? 'Dawn'
            : 'Dusk'
          : a < 8
            ? solar.rising
              ? 'Morning light'
              : 'Evening light'
            : mode === 'time'
              ? 'Daylight'
              : wx
                ? cloud < 0.35
                  ? 'Sunny daylight'
                  : cloud > 0.75
                    ? 'Overcast daylight'
                    : 'Broken cloud'
                : 'Daylight';
    let light = [day, sun, warm, lamp],
      direction = solar.dir,
      minutes = nowMinutes;
    if (mode === 'time') {
      source = 'Clear-sky preview · not a forecast';
      minutes = solar.minutes;
    }
    if (manualPreset) {
      [label, light] = manual[mode];
      source = 'Lighting preset · clock remains live';
      minutes =
        mode === 'night'
          ? 0
          : mode === 'sunset'
            ? (dayKey.sunset ??= Array.from({ length: 145 }, (_, i) => 720 + 5 * i).reduce(
                (best, x) =>
                  Math.abs(wall(dayKey, x).a) < Math.abs(wall(dayKey, best).a) ? x : best,
                1080,
              ))
            : 720;
      direction = wall(dayKey, minutes).dir;
    }
    let value = {
      weather: wx,
      time,
      hands,
      light,
      label,
      source,
      mode,
      a,
      direction,
      minutes,
      selected: hhmm(minutes),
      nowMinutes,
      rising: solar.rising,
      requested: chosen,
      gradient: ramp(dayKey),
    };
    cache = { sec, rev, value };
    return value;
  }
  function preview(m) {
    m = Number(m);
    if (!Number.isFinite(m)) return;
    const newM = Math.max(0, Math.min(1435, Math.round(m / 5) * 5));
    if (mode === 'time' && chosen === newM) return;
    chosen = newM;
    mode = 'time';
    signal();
  }
  window.AtlasEnvironment = {
    state,
    update,
    preview,
    setMode(m) {
      mode = Object.hasOwn(manual, m) ? m : 'live';
      signal();
    },
    height,
  };
})();
