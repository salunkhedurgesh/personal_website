/* Static hash routes. The tour iframe stays mounted while a separate playground view is open. */
(() => {
  'use strict';
  const $ = (x) => document.querySelector(x),
    E = (s) =>
      String(s ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );
  const asset = (window.siteAsset = (p) => window.IMG_ASSETS?.[p] || SiteAssets.url(p));
  const data = CATALOG,
    course = 'https://epfl-lasa.github.io/eng-654/',
    nantes =
      'https://www.ec-nantes.fr/engineering-programme-diplome-dingenieur/course-specialisations-yrs-23/robotics',
    sch = 'https://scholar.google.com/citations?user=ko4KPeEAAAAJ&hl=en';
  const names = {
      cnrs: 'CNRS / Research atlas',
      kin: 'Kinematics / Mechanism studio',
      chess: 'Chess / Analysis board',
      teach: 'Teaching / Blackboard',
    },
    chap = ['Logo', 'Monitor', 'Office', 'IHU', 'Strasbourg', 'France', 'Earth'];
  let officeVisible = false;
  let role = 'cnrs',
    page = 'home',
    chapter = 0,
    officeFrame = null,
    portal = null,
    srcPromise,
    expanded = false,
    kinReady = false,
    teachReady = false,
    playedFrom = null,
    opener = null,
    sceneToken = 0,
    teachTimer,
    activeTheme = -1;
  const courses = [
    {
      title: 'Kinematics grounded motion planning for robots',
      year: '2026',
      place: 'EPFL',
      theme: 'Motion planning',
      topics: ['Motion planning', 'Singularities', 'Cuspidal robots', 'Inverse kinematics'],
      desc: 'From forward and inverse kinematics to singularities and constraint-aware motion planning. Students implement models and planners, then test them in a final project.',
      url: course,
      siteLabel: 'Course website',
      image: 'images/chalk.svg',
      cap: 'Workspace, joint space and a nonsingular change of solution · ENG-654, lecture 07.',
      meta: 'ENG-654 · Durgesh Salunkhe, Aude Billard and Arda Yigit',
    },
    {
      title: 'Introduction to Robotics',
      year: '',
      place: 'École Centrale de Nantes',
      theme: 'Global kinematics',
      topics: ['Introduction', 'Kinematics'],
      desc: 'Introductory robotics teaching at École Centrale de Nantes.',
      url: nantes,
      siteLabel: 'Centrale Nantes robotics programme',
      image: 'images/intro-frames.svg',
      cap: 'A planar two-link chain and its joint frames.',
      meta: 'École Centrale de Nantes',
    },
  ];
  const themes = [
    {
      name: 'Robot design & optimization',
      t: 'Mechanism design',
      badge: '2UPS-1U · Fig. 3.15',
      img: 'images/thesis-fig3-15.webp',
      alt: 'Figure 3.15: 2UPS-1U and parallelogram surgical endoscope mechanism in the operating room',
      desc: 'Task-driven design and optimization of parallel surgical robots.',
      id: 'mmt22_opt_salunkhe',
    },
    {
      name: 'Cuspidality & motion planning',
      t: 'Global kinematics',
      badge: 'GoFa · CRX · UR5',
      img: 'images/robots-real.webp',
      alt: 'Real-life collaborative 6R manipulators: ABB GoFa CRB 15000, FANUC CRX-10iA/L, and Universal Robots UR5',
      desc: 'Classifying cuspidal robots and planning motions without singularities.',
      id: 'ijrr24_salunkhe',
    },
    {
      name: 'Kinematic intelligence & skill transfer',
      t: 'Skill transfer',
      badge: 'Science Robotics · Fig. 1',
      img: 'images/science-fig1-top.webp',
      alt: 'Figure 1 of Science Robotics paper: Demonstrate once, Execute on All across commercial 7-DoF robots',
      desc: 'Kinematics-aware learning and skill transfer across robot morphologies.',
      id: 'science25_gupta',
    },
  ];
  let stateFilter = { q: '', theme: '', kind: '', fund: '', role: '', topic: '', sort: 'new' };
  const allP = [...data.papers, ...data.books, ...data.theses, ...data.talks];
  const href = (r) =>
    r.publicationLink ||
    (r.doi && r.doi.startsWith('10.') ? 'https://doi.org/' + r.doi : r.pdfLink || r.webLink || '');
  function anchor(text, url, cls = '') {
    if (!url) return /* HTML */ `<span class="${cls}">${E(text)}</span>`;
    return /* HTML */ `<a
      class="${cls}"
      href="${E(url)}"
      ${url.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}
      >${E(text)}</a
    >`;
  }
  const tag = (s) => (s ? /* HTML */ `<span class="tag">${E(s)}</span>` : '');
  function publicationUrl(i) {
    const record = allP.find((p) => p.id === themes[i].id);
    return record?.publicationLink || '#publications?theme=' + encodeURIComponent(themes[i].t);
  }
  function popupTemplate(i) {
    const x = themes[i],
      header = /* HTML */ `<div class="popup-bar">
        <div class="popup-bar-left">
          <span class="kicker">RESEARCH THEME · ${E(x.t.toUpperCase())}</span>
        </div>
        <div class="popup-bar-right">
          <div class="popup-tabs" role="tablist" aria-label="Switch research theme">
            ${themes.map((t, idx) => /* HTML */ `<button type="button" class="popup-tab ${idx === i ? 'active' : ''}" data-switch-theme="${idx}">${E(t.name.split('&')[0].trim())}</button>`).join('')}
          </div>
          <button
            type="button"
            class="popup-close"
            data-close-theme
            aria-label="Close research theme panel"
          >
            ✕ Close
          </button>
        </div>
      </div>`;
    if (i === 0)
      return /* HTML */ `${header}
        <div class="popup-body">
          <div class="popup-copy">
            <h3>Designing parallel mechanisms for surgery</h3>
            <div class="popup-section">
              <h4>Motivation</h4>
              <p>
                A compact scope holder can free the surgeon’s hands while maintaining a remote
                center of motion at the entry port.
              </p>
            </div>
            <div class="popup-section">
              <h4>Approach</h4>
              <p>
                We design parallel wrists with a passive universal joint and a distal parallelogram.
                Task symmetry reduces the optimization from 13 parameters to four.
              </p>
            </div>
          </div>
          <figure class="popup-fig">
            <img
              src="${asset('images/thesis-fig3-2.webp')}"
              alt="Candidate parallel wrist architectures for surgical manipulation"
              loading="lazy"
            />
            <figcaption>Fig. 3.2 · Master’s thesis: parallel wrist architectures.</figcaption>
          </figure>
        </div>
        <div class="popup-footer">
          <div class="popup-actions">
            <a
              class="btn dark"
              href="projects/main/resources/papers/thesis20_salunkhe.pdf"
              target="_blank"
              rel="noopener"
              >Master’s thesis ↗</a
            ><a class="btn" href="${publicationUrl(i)}">Publications →</a>
          </div>
        </div>`;
    if (i === 1)
      return /* HTML */ `${header}
        <div class="popup-body">
          <div class="popup-copy">
            <h3>Cuspidality and motion planning in 6R robots</h3>
            <div class="popup-section">
              <h4>Motivation</h4>
              <p>
                Cuspidal robots can switch between inverse kinematic solutions without crossing a
                singularity. This creates challenges for path feasibility and repeatability.
              </p>
            </div>
            <div class="popup-section">
              <h4>Approach</h4>
              <p>
                We analyse commercial 6R manipulators, identify cuspidality, and develop planning
                methods that preserve continuous, repeatable motion.
              </p>
            </div>
          </div>
          <figure class="popup-fig">
            <img
              src="${asset('images/fig-kin.webp')}"
              alt="Nonsingular posture change and cuspidal topology"
              loading="lazy"
            />
            <figcaption>Nonsingular posture change and cuspidal topology.</figcaption>
          </figure>
        </div>
        <div class="popup-footer">
          <div class="popup-actions">
            <button type="button" class="btn dark" data-open-gofa-play>ABB GoFa playground →</button
            >${anchor('IJRR publication ↗', publicationUrl(i), 'btn')}
          </div>
        </div>`;
    return /* HTML */ `${header}
      <div class="popup-body">
        <div class="popup-copy">
          <h3>Kinematic intelligence for skill transfer</h3>
          <div class="popup-section">
            <h4>Motivation</h4>
            <p>
              A demonstrated motion may fail on another robot because its geometry, joint limits,
              and singularities differ.
            </p>
          </div>
          <div class="popup-section">
            <h4>Approach</h4>
            <p>
              We embed analytical kinematics into learned dynamical-system policies, checking
              connectivity and guiding motion around joint-limit and singularity boundaries.
            </p>
          </div>
        </div>
        <figure class="popup-fig popup-fig-dark">
          <svg
            class="science-figure"
            viewBox="10 10 820 1295"
            role="img"
            aria-label="Figure 1 of Science Robotics: kinematic intelligence for cross-robot skill transfer"
          >
            <defs>
              <clipPath id="science-detail-crop">
                <rect x="10" y="10" width="820" height="1295" />
              </clipPath>
            </defs>
            <image
              href="${asset('images/science-fig1.webp')}"
              width="840"
              height="1315"
              clip-path="url(#science-detail-crop)"
            />
          </svg>
          <figcaption>Fig. 1 · Science Robotics: cross-robot skill transfer.</figcaption>
        </figure>
      </div>
      <div class="popup-footer">
        <div class="popup-actions">
          ${anchor('Science Robotics publication ↗', publicationUrl(i), 'btn dark')}
        </div>
      </div>`;
  }
  function syncThemeHeight() {
    const grid = $('#themegrid');
    if (!grid || grid.classList.contains('is-expanded')) return;
    const c = grid.querySelector('.theme:not([hidden])');
    if (c && c.offsetHeight > 0) grid.style.setProperty('--theme-panel-h', c.offsetHeight + 'px');
  }
  function openTheme(idx) {
    const grid = $('#themegrid'),
      popup = $('#themepopup');
    if (!grid || !popup) return;
    syncThemeHeight();
    activeTheme = idx;
    grid.classList.add('is-expanded');
    grid.querySelectorAll('.theme').forEach((card, i) => {
      const active = i === idx;
      card.hidden = !active;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-expanded', String(active));
      const cta = card.querySelector('[data-theme-cta]');
      if (cta) cta.textContent = active ? '← All themes' : 'Research overview →';
    });
    popup.hidden = false;
    popup.innerHTML = popupTemplate(idx);
    popup.querySelector('[data-close-theme]').onclick = (e) => {
      e.stopPropagation();
      closeTheme();
    };
    popup.querySelectorAll('[data-switch-theme]').forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          openTheme(+b.dataset.switchTheme);
        }),
    );
    const gofaPlay = popup.querySelector('[data-open-gofa-play]');
    if (gofaPlay)
      gofaPlay.onclick = (e) => {
        e.stopPropagation();
        openPlay('theme');
      };
  }
  function closeTheme() {
    activeTheme = -1;
    const grid = $('#themegrid'),
      popup = $('#themepopup');
    if (!grid || !popup) return;
    grid.classList.remove('is-expanded');
    grid.querySelectorAll('.theme').forEach((card) => {
      card.hidden = false;
      card.classList.remove('is-active');
      card.setAttribute('aria-expanded', 'false');
      const cta = card.querySelector('[data-theme-cta]');
      if (cta) cta.textContent = 'Research overview →';
    });
    popup.hidden = true;
    popup.innerHTML = '';
    syncThemeHeight();
  }
  function watchImages() {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const image = entry.target;
            if (image.dataset.src) image.src = image.dataset.src;
            else image.setAttribute('href', image.dataset.imageHref);
            observer.unobserve(image);
          }
      },
      { rootMargin: '180px' },
    );
    document
      .querySelectorAll('[data-src],[data-image-href]')
      .forEach((image) => observer.observe(image));
  }
  function home() {
    document.querySelectorAll('[data-asset]').forEach((n) => (n.src = asset(n.dataset.asset)));
    let div = document.createElement('div');
    div.innerHTML = data.about;
    let pieces = div
      .querySelector('p')
      .innerHTML.split(/<br\s*\/?>\s*<br\s*\/?>/i)
      .map((p) => p.trim())
      .filter(Boolean);
    $('#aboutcopy').innerHTML = /* HTML */ `<div class="abouttext">
      ${pieces.map((v) => /* HTML */ `<p>${v}</p>`).join('')}
    </div>`;
    $('#aboutcopy')
      .querySelectorAll('a')
      .forEach((a) => (a.rel = 'noopener noreferrer'));
    $('#themegrid').innerHTML =
      themes
        .map(
          (x, i) =>
            /* HTML */ `<article
              class="theme"
              data-theme-card="${i}"
              tabindex="0"
              role="button"
              aria-expanded="false"
            >
              <div class="theme-stage ${i === 2 ? 'theme-stage-dark' : ''}">
                ${
                  i === 2
                    ? /* HTML */ `<svg
                        class="theme-img science-figure"
                        viewBox="10 10 820 326"
                        role="img"
                        aria-label="${E(x.alt)}"
                      >
                        <defs>
                          <clipPath id="science-card-crop">
                            <rect x="10" y="10" width="820" height="326" />
                          </clipPath>
                        </defs>
                        <image
                          data-image-href="${asset(x.img)}"
                          width="840"
                          height="336"
                          clip-path="url(#science-card-crop)"
                        />
                      </svg>`
                    : /* HTML */ `<img
                        class="theme-img"
                        data-src="${asset(x.img)}"
                        alt="${E(x.alt)}"
                        loading="lazy"
                      />`
                }<span class="theme-badge">${E(x.badge)}</span>
              </div>
              <div class="cap">
                <h3>${E(x.name)}</h3>
                <p class="theme-desc">${E(x.desc)}</p>
                <div class="theme-card-foot">
                  <span class="theme-cta" data-theme-cta>Research overview →</span
                  ><a
                    class="theme-pub-link"
                    href="${publicationUrl(i)}"
                    ${i > 0 ? 'target="_blank" rel="noopener"' : ''}
                    >${i === 1 ? 'IJRR' : i === 2 ? 'Science Robotics' : 'Publications'} ↗</a
                  >
                </div>
              </div>
            </article>`,
        )
        .join('') + '<div class="theme-popup" id="themepopup" hidden></div>';
    $('#themegrid')
      .querySelectorAll('.theme')
      .forEach((card, i) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('a,button')) return;
          if (activeTheme === i) closeTheme();
          else openTheme(i);
        });
        card.addEventListener('keydown', (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a,button')) {
            e.preventDefault();
            if (activeTheme === i) closeTheme();
            else openTheme(i);
          }
        });
      });
    addEventListener('resize', syncThemeHeight);
    const pg = $('#projectgrid');
    if (pg)
      pg.innerHTML = data.projects
        .slice(0, 3)
        .map((p, i) => {
          const [img, cap] = p.gallery[0],
            short = p.description
              .split(/(?<=[.?!])\s+/)
              .slice(0, 2)
              .join(' '),
            meta = [p.fund, p.year].filter(Boolean).join(' · ');
          return /* HTML */ `<article class="project-card">
            <a class="project-image" href="#projects?theme=${encodeURIComponent(p.theme)}"
              ><img data-src="${asset('images/' + img)}" alt="${E(cap || p.title)}" loading="lazy"
            /></a>
            <div class="project-content">
              <div class="project-meta">
                <span>${E(p.theme)}</span><span class="venue">${E(meta)}</span>
              </div>
              <h3><a href="#projects?theme=${encodeURIComponent(p.theme)}">${E(p.title)}</a></h3>
              <p>${E(short)}</p>
              <div class="project-bottom">
                <span>${E(p.role || p.theme)}</span
                ><a class="project-link" href="#projects?theme=${encodeURIComponent(p.theme)}"
                  >Explore project →</a
                >
              </div>
            </div>
          </article>`;
        })
        .join('');
    $('#selected').innerHTML = themes
      .map((t) => {
        const r = allP.find((x) => x.id === t.id);
        return /* HTML */ `<article>
          <span class="kicker">${E(r.short)} / ${E(r.year)}</span>
          <h3>${anchor(r.title, href(r), 'rec-title')}</h3>
          <small>${E(r.authors)}</small>
        </article>`;
      })
      .join('');
    $('#roles').onclick = (e) => {
      if (e.target.dataset.role) choose(e.target.dataset.role);
    };
    $('#closeplay').onclick = closePlay;
    $('#playdialog').addEventListener('cancel', (e) => {
      e.preventDefault();
      closePlay();
    });
    watchImages();
  }
  function expand() {
    expanded = !expanded;
    $('#environment').classList.toggle('expanded', expanded);
    document.body.style.overflow = expanded ? 'hidden' : '';
    Studio3D.redraw();
  }
  async function getSource() {
    return (srcPromise ??= (async () => {
      let bytes = Uint8Array.from(atob(window.TOUR_B64), (x) => x.charCodeAt(0));
      return new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).text();
    })());
  }
  function embedded(host, hash, label) {
    const f = document.createElement('iframe');
    f.title = label;
    f.allow = 'fullscreen';
    if (host.id === 'atlasHost') host.append(f);
    else host.replaceChildren(f);
    if (window.TOUR_B64) {
      getSource()
        .then((s) => {
          if (f.isConnected) f.srcdoc = s.replace('"__NOTEBOOK_FRAGMENT__"', JSON.stringify(hash));
        })
        .catch(() => (host.textContent = 'Open the hosted ZIP version in a modern browser.'));
    } else f.src = 'projects/main/tour/index.html?v=' + SiteAssets.version + hash;
    return f;
  }
  function send(o) {
    officeFrame?.contentWindow?.postMessage(o, '*');
  }
  function go(i) {
    chapter = i;
    send({ atlasNotebook: 'go', value: i });
  }
  function openPlay(origin) {
    if (portal) return;
    playedFrom = origin;
    send({ studioPause: true });
    opener = document.activeElement;
    const d = $('#playdialog');
    d.showModal();
    portal = embedded($('#playhost'), '#playground', 'ABB GoFa inverse kinematics playground');
    $('#closeplay').textContent =
      origin === 'office' ? '← Office' : origin === 'theme' ? '← Research theme' : '← Both robots';
    $('#closeplay').focus({ preventScroll: true });
  }
  function closePlay() {
    if (!portal) return;
    $('#playdialog').close();
    portal.remove();
    portal = null;
    if (playedFrom === 'office') {
      officeFrame?.focus({ preventScroll: true });
    } else {
      const b = $('[data-rig=gofa]');
      (b || opener)?.focus({ preventScroll: true });
    }
    playedFrom = null;
    send({ studioPause: page !== 'home' || role !== 'cnrs' });
    Studio3D.redraw();
  }
  addEventListener('message', (e) => {
    if (e.source === officeFrame?.contentWindow) {
      if (e.data?.atlasNotebook === 'visual-ready') {
        const host = $('#atlasHost');
        host.dataset.live = 'true';
        host.dataset.renderMode = e.data.mode || '3d';
        const image = $('#atlas-preview');
        if (image) image.hidden = true;
      }
      if (e.data?.atlasNotebook === 'chapter') {
        chapter = e.data.value;
      }
      if (e.data?.studioPlay === 'office') openPlay('office');
    }
    if (portal && e.source === portal.contentWindow && e.data?.studioExit) closePlay();
  });
  function maybeOffice() {
    if (officeFrame || !officeVisible || page !== 'home' || role !== 'cnrs') return;
    officeFrame = embedded($('#atlasHost'), '#mini', 'CNRS office, Strasbourg and Earth');
  }
  function choose(k) {
    if (!(k in names)) k = 'cnrs';
    role = k;
    send({ studioPause: k !== 'cnrs' });
    document
      .querySelectorAll('[data-role]')
      .forEach((b) => b.setAttribute('aria-pressed', b.dataset.role === k));
    for (const a of Object.keys(names)) $('#' + a + 'Scene').hidden = a !== k;
    if (k === 'cnrs') maybeOffice();
    if (k === 'kin' && !kinReady) {
      kinReady = true;
      Studio3D.setupKin($('#kinScene'), () => openPlay('kin')).catch((error) => {
        kinReady = false;
        console.warn('Mechanism view:', error.message);
      });
    }
    if (k === 'teach' && !teachReady) {
      buildTeach();
      teachReady = true;
    }
    if (k === 'chess')
      SiteAssets.chess()
        .then(() => {
          if (role === 'chess' && page === 'home') {
            ChessStudio.init($('#chessScene'));
            ChessStudio.show(true);
          }
        })
        .catch((error) => {
          $('#chessScene').textContent =
            'Chess could not be loaded. Select the chess view to retry.';
        });
    window.ChessStudio?.show(k === 'chess');
    Studio3D.showKin(k === 'kin');
    Studio3D.redraw();
  }
  function buildTeach() {
    const h = $('#teachScene');
    h.innerHTML = /* HTML */ `<div class="teachenvironment">
      <div class="slate">
        <h3 class="boardtitle">Kinematically grounded motion planning</h3>
        <div class="lesson">
          <img
            alt="Slide 18 in full view: closed workspace loop, non-closing joint trajectory and the two corresponding 3R postures"
            src="${asset('images/chalk.svg')}"
          /><small class="chalkhint">Tap the board for courses</small>
        </div>
        <button class="boardbutton" aria-label="Erase the chalkboard and show courses"></button>
        <div class="wipe"></div>
      </div>
    </div>`;
    let board = h.querySelector('.slate');
    board.querySelector('.boardbutton').onclick = () => {
      let b = board.querySelector('.boardbutton');
      b.disabled = true;
      let w = board.querySelector('.wipe');
      w.classList.add('go');
      clearTimeout(teachTimer);
      teachTimer = setTimeout(
        () => {
          board.querySelector('.boardtitle').textContent = 'Courses';
          board.querySelector('.lesson').innerHTML = /* HTML */ `<div class="coursechalk">
              <a href="${course}" target="_blank" rel="noopener"
                >Kinematics grounded motion planning for robots <small>EPFL / ENG-654</small></a
              ><a href="#teaching?course=nantes"
                >Introduction to Robotics <small>École Centrale de Nantes</small></a
              >
            </div>
            <button class="backchalk">Restore the figure</button>`;
          b.hidden = true;
          w.classList.remove('go');
          board.querySelector('.backchalk').onclick = buildTeach;
        },
        matchMedia('(prefers-reduced-motion: reduce)').matches ? 5 : 550,
      );
    };
  }
  function filters(config) {
    const wrap = $('.filters');
    wrap.innerHTML =
      '<input type="search" id="find" aria-label="Search records" placeholder="Search…">' +
      config
        .map(
          ([key, title, vals]) =>
            /* HTML */ `<select aria-label="${E(title)}" data-filter="${key}">
              <option value="">${E(title)}</option>
              ${vals
                .filter(Boolean)
                .map((x) => /* HTML */ `<option value="${E(x)}">${E(x)}</option>`)
                .join('')}
            </select>`,
        )
        .join('') +
      '<select aria-label="Sort by date" data-filter="sort"><option value="new">Newest first</option><option value="old">Oldest first</option></select><output id="count" aria-live="polite"></output>';
    $('#find').value = stateFilter.q;
    $('#find').oninput = (e) => {
      stateFilter.q = e.target.value;
      renderList();
    };
    wrap.querySelectorAll('select').forEach((s) => {
      s.value = stateFilter[s.dataset.filter];
      s.onchange = () => {
        stateFilter[s.dataset.filter] = s.value;
        renderList();
      };
    });
  }
  const unique = (a, k) => [...new Set(a.map((i) => i[k]).filter(Boolean))].sort();
  function directory(name, params) {
    const d = $('#directory');
    let publication = name === 'publications',
      projects = name === 'projects';
    stateFilter = {
      q: '',
      theme: params.get('theme') || '',
      kind: '',
      fund: '',
      role: '',
      topic: '',
      sort: 'new',
    };
    if (params.get('course') === 'nantes') stateFilter.q = 'Introduction';
    const title = publication ? 'Publications' : projects ? 'Projects' : 'Teaching';
    d.innerHTML = /* HTML */ `<header class="dirhead">
        <div class="dir-title">
          <span class="page-title-model"
            ><img src="${asset('images/nav-' + name + '.png')}" alt="" aria-hidden="true" /><canvas
              aria-hidden="true"
            ></canvas
          ></span>
          <h1>${title}</h1>
        </div>
        ${
          publication
            ? /* HTML */ `<div class="chips">${anchor('Google Scholar', sch)}</div>`
            : projects
              ? ''
              : /* HTML */ `<h2 class="philosophy-title">My teaching philosophy</h2>
                  <div class="phil abouttext">
                    <p>
                      My teaching philosophy begins with a strong foundation in kinematics,
                      geometry, and dynamics. I aim to build on this foundation with learning
                      algorithms that help robots adapt. I plan to introduce students to Screw
                      Theory, cuspidal robots, advanced trajectory planning, and Conformal
                      Geometric Algebra for kinematic analysis. With human–robot collaboration
                      central to the future of robotics, I also plan to introduce Learning from
                      Demonstration (LfD), exploring how kinematic properties can support safe path
                      planning and policy transfer in human-centered applications.
                    </p>
                    <p>
                      How we teach matters as much as what we teach. Having studied and taught
                      across multiple countries and institutions, I value an approach that combines
                      mathematical rigor with interactive sessions, meaningful feedback, and
                      holistic evaluation. I aspire to create an inclusive environment where
                      students develop both technical depth and the confidence to explore open
                      research problems. My goal is to prepare students for academic excellence
                      and practical work in the robotics industry, equipping them to contribute to
                      research, industrial innovation, and the advancement of robotics for society.
                    </p>
                  </div>`
        }
      </header>
      <div class="filters"></div>
      <div id="records"></div>`;
    Studio3D.titleModel(d.querySelector('.page-title-model canvas'), name);
    filters(
      publication
        ? [
            ['kind', 'Publication type', unique(allP, 'kind')],
            ['theme', 'Research theme', unique(allP, 'theme')],
          ]
        : projects
          ? [
              ['theme', 'Research theme', unique(data.projects, 'theme')],
              ['fund', 'Funding', unique(data.projects, 'fund')],
              ['role', 'Role', unique(data.projects, 'role')],
            ]
          : [
              ['topic', 'Course topic', [...new Set(courses.flatMap((x) => x.topics))]],
              ['theme', 'Research theme', unique(courses, 'theme')],
            ],
    );
    renderList();
  }
  function record(r) {
    const url = href(r),
      links = [
        !r.publicationLink && r.pdfLink && r.pdfLink !== url ? anchor('PDF', r.pdfLink) : '',
        r.bibLink ? anchor('BibTeX', r.bibLink) : '',
        r.webLink && r.webLink !== url ? anchor('Related resource', r.webLink) : '',
      ].filter(Boolean);
    return /* HTML */ `<article class="record" id="rec-${E(r.id)}">
      <div class="year">${E(r.year)}</div>
      <div>
        <span class="kicker">${E(r.kind)} / ${E(r.short || r.theme)}</span>
        <h3>${anchor(r.title, url, 'rec-title')}</h3>
        <p>${E(r.authors)}</p>
        <p class="desc">${E(r.journal)}</p>
        <div class="links">${links.join(' ')}</div>
        ${
          r.abstract || r.note
            ? /* HTML */ `<details>
                <summary>${r.abstract ? 'Abstract' : 'Notes'}</summary>
                <p>${E(r.abstract)}</p>
                <small>${E(r.note)}</small>
              </details>`
            : ''
        }
      </div>
    </article>`;
  }
  function project(x, teaching) {
    let ix = teaching ? courses.indexOf(x) : data.projects.indexOf(x);
    const [img, cap] = teaching ? [x.image, x.cap] : ['images/' + x.gallery[0][0], x.gallery[0][1]];
    const text = teaching ? x.desc : x.description,
      short = text
        .split(/(?<=[.?!])\s+/)
        .slice(0, 2)
        .join(' '),
      more = text.slice(short.length).trim();
    let fig = /* HTML */ `<figure>
      <img
        src="${asset(img)}"
        alt="${E(cap)}"
        ${teaching && ix === 0 ? 'style="background:#27443b"' : ''}
      />
      <figcaption>
        <span>${E(cap)}</span
        >${!teaching && x.gallery.length > 1 ? /* HTML */ `<button data-gallery="-1" aria-label="Previous project image">‹</button><button data-gallery="1" aria-label="Next project image">›</button>` : ''}
      </figcaption>
    </figure>`;
    return /* HTML */ `<article class="proj" data-project="${ix}">
      ${fig}
      <div>
        <span class="kicker">${E(teaching ? x.place : x.theme)}</span>
        <h3>${teaching ? anchor(x.title, ix === 0 ? course : nantes, 'rec-title') : E(x.title)}</h3>
        <p>${E(short)}</p>
        ${
          more
            ? /* HTML */ `<details>
                <summary>Project details</summary>
                <p>${E(more)}</p>
              </details>`
            : ''
        }${
          teaching
            ? /* HTML */ `<p><small>${E(x.meta)}</small></p>
                <p>${anchor(x.siteLabel, x.url)}</p>`
            : ''
        }
        <div class="chips">
          ${[x.year, x.fund, x.role, x.theme, ...(x.topics || [])]
            .filter((v, i, a) => v && a.indexOf(v) === i)
            .map(tag)
            .join('')}
        </div>
      </div>
    </article>`;
  }
  function renderList() {
    let pub = page === 'publications',
      pr = page === 'projects',
      list = pub ? allP : pr ? data.projects : courses;
    const q = stateFilter.q.trim().toLocaleLowerCase();
    const selected = list
      .filter(
        (x) =>
          (!q ||
            [
              x.title,
              x.authors,
              x.journal,
              x.desc,
              x.description,
              x.meta,
              x.year,
              x.theme,
              x.place,
              ...(x.topics || []),
            ]
              .join(' ')
              .toLowerCase()
              .includes(q)) &&
          ['kind', 'theme', 'fund', 'role'].every(
            (k) => !stateFilter[k] || stateFilter[k] === x[k],
          ) &&
          (!stateFilter.topic || x.topics?.includes(stateFilter.topic)),
      )
      .sort((a, b) => {
        const ay = parseInt(a.year) || 0,
          by = parseInt(b.year) || 0;
        return stateFilter.sort === 'old' ? ay - by : by - ay;
      });
    $('#count').textContent = `${selected.length} ${pub ? 'records' : pr ? 'projects' : 'courses'}`;
    $('#records').innerHTML =
      selected.map((x) => (pub ? record(x) : project(x, !pr))).join('') ||
      '<p class="empty">No matching records.</p>';
    if (pr)
      $('#records')
        .querySelectorAll('.proj')
        .forEach((article) => {
          let idx = 0,
            z = data.projects[+article.dataset.project];
          article.querySelectorAll('[data-gallery]').forEach(
            (b) =>
              (b.onclick = () => {
                idx = (idx + Number(b.dataset.gallery) + z.gallery.length) % z.gallery.length;
                let [n, c] = z.gallery[idx];
                article.querySelector('img').src = asset('images/' + n);
                article.querySelector('img').alt = c;
                article.querySelector('figcaption span').textContent = c;
              }),
          );
        });
  }
  function route(initial = false) {
    let [route = '', query = ''] = location.hash.slice(1).split('?');
    let nextPage = ['projects', 'publications', 'teaching'].includes(route) ? route : 'home',
      returningHome = !initial && nextPage === 'home' && page !== 'home';
    page = nextPage;
    $('#home').hidden = page !== 'home';
    $('#directory').hidden = page === 'home';
    if (expanded) expand();
    if (portal) closePlay();
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (page === 'home') {
      Studio3D.titleModel(null);
      if (returningHome) Studio3D.advance?.();
      choose(new URLSearchParams(query).get('role') || role);
    } else {
      directory(page, new URLSearchParams(query));
      send({ studioPause: true });
      window.ChessStudio?.show(false);
      Studio3D.showKin(false);
    }
    document.title =
      page === 'home'
        ? 'Durgesh Salunkhe | Robotics'
        : page[0].toUpperCase() + page.slice(1) + ' | Durgesh Salunkhe';
    scrollTo({ top: 0, behavior: 'instant' });
    Studio3D.redraw();
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !portal) {
      if (activeTheme !== -1) closeTheme();
      else if (expanded) expand();
    }
  });
  addEventListener('hashchange', () => route());
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  addEventListener('load', () =>
    requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'instant' })),
  );
  home();
  Studio3D.init();
  new IntersectionObserver(
    ([entry]) => {
      officeVisible = entry.isIntersecting;
      send({ studioPause: !officeVisible || page !== 'home' || role !== 'cnrs' });
      if (officeVisible) maybeOffice();
    },
    { rootMargin: '0px' },
  ).observe($('#cnrsScene'));
  route(true);
  window.StudioSite = {
    choose,
    go,
    openPlay,
    closePlay,
    openTheme,
    closeTheme,
    role: () => role,
    chapter: () => chapter,
  };
})();
