/* All city variants use the same meshes. Only finish, illumination and seasonal props vary. */
(() => {
  'use strict';
  const A = ATLAS_ASSETS,
    $ = (id) => document.getElementById(id),
    season = $('city-season'),
    light = $('city-light');
  const monthFmt = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Paris', month: 'numeric' });
  let cacheKey = '',
    cache,
    lastLabel = '';
  const wetCodes = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]),
    snowCodes = new Set([71, 73, 75, 77, 85, 86]);
  const cfg = A.cityPresets,
    paths = A.boats.map((path) => {
      let d = [0];
      for (let i = 1; i < path.length; i++)
        d.push(d[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
      return { path, d, length: d.at(-1) };
    });
  function get(e = AtlasEnvironment.state()) {
    let mo = Number(monthFmt.format(Date.now())),
      wx = e.weather,
      sel = season.value,
      s =
        sel === 'live' || sel === 'rainy'
          ? mo < 3 || mo === 12
            ? 'winter'
            : mo < 6
              ? 'spring'
              : mo < 9
                ? 'summer'
                : 'autumn'
          : sel,
      wet = sel === 'rainy' || (sel === 'live' && !!wx && (wx.rain > 0 || wetCodes.has(wx.code))),
      snow = sel === 'live' && !!wx && (wx.snow > 0 || snowCodes.has(wx.code)),
      festive = sel === 'live' || sel === 'rainy' ? mo >= 11 : s === 'winter';
    let key = [sel, s, mo, wet, snow, light.value, festive].join(':');
    if (key === cacheKey) return cache;
    const palette = cfg[wet ? 'rainy' : s].palette;
    let colors = {};
    Object.entries(palette).forEach(
      ([k, c]) => (colors[k] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)),
    );
    cacheKey = key;
    return (cache = { season: s, wet: !!wet, snow, festive, colors, lighting: light.value });
  }
  function status(e) {
    let s = get(e),
      live = season.value === 'live',
      msg = live
        ? e.weather
          ? (s.snow
              ? 'Snow'
              : s.wet
                ? 'Rain'
                : e.weather.cloud >= 70
                  ? 'Cloudy'
                  : 'No precipitation') + ' · Open-Meteo'
          : 'Local season · weather unavailable'
        : s.wet
          ? 'Rain preview'
          : s.festive
            ? 'December preview'
            : 'Season preview';
    if (lastLabel !== msg) {
      $('city-weather').textContent = msg;
      lastLabel = msg;
    }
  }
  const redraw = () => {
    cacheKey = '';
    window.AtlasTour?.request();
  };
  function lightChanged() {
    if (light.value === 'day') AtlasEnvironment.preview(720);
    else if (light.value === 'night') AtlasEnvironment.preview(0);
    else AtlasEnvironment.setMode('live');
    redraw();
  }
  season.onchange = redraw;
  light.onchange = lightChanged;
  function resetLight() {
    light.value = 'live';
    redraw();
  }
  function route(hash) {
    const [, name, time] = hash.split('/');
    if (name && ['spring', 'summer', 'autumn', 'fall', 'winter', 'rainy', 'live'].includes(name))
      season.value = name === 'fall' ? 'autumn' : name;
    if (['day', 'night', 'live'].includes(time)) light.value = time;
    lightChanged();
  }
  function boat(i, sec) {
    const { d, length, path } = paths[i],
      speed = [1.9, 1.1, 1.32][i],
      v = (sec * speed + length * [0.31, 0.55, 1.73][i]) % (2 * length),
      forward = v <= length,
      t = forward ? v : 2 * length - v;
    let l = 0,
      r = d.length - 1;
    while (r - l > 1) {
      const m = (l + r) >> 1;
      if (d[m] > t) r = m;
      else l = m;
    }
    const a = path[l],
      b = path[r],
      k = (t - d[l]) / (d[r] - d[l] || 1);
    return [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      Math.atan2(b[1] - a[1], b[0] - a[0]) + (forward ? 0 : Math.PI),
      1,
    ];
  }
  window.AtlasCity = { get, status, route, resetLight, boat };
})();
