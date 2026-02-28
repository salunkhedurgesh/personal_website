import os
from flask import Flask, send_from_directory

app  = Flask(__name__, static_folder='.')
ROOT = os.path.dirname(os.path.abspath(__file__))

# ── Mirror of .htaccess RewriteRules ────────────────────────────────────────
# Add new clean-URL → file-path entries here (relative to site root).
# Trailing slashes in URLs are stripped automatically (matches cnrs1/? style).
ROUTES = {
    # Main pages
    'about':            'index.html',
    'publications':     'projects/main/publications/publications.html',
    'experience':       'projects/main/experience/experience.html',
    'researchprojects': 'projects/main/projects/projects.html',
    'personal':         'projects/personal/personal.html',
    'blog':             'projects/personal/blog/blog.html',
    'hobbies':          'projects/personal/hobbies/hobbies.html',
    'travel':           'projects/personal/travel/travel.html',
    # CNRS 2026
    'selected_research': 'projects/cnrs/seven_chosen.html',
    'cnrs1':            'projects/cnrs/cnrs_resources/rcim19_dutta.pdf',
    'cnrs2':            'projects/cnrs/cnrs_resources/mmt22_opt_salunkhe.pdf',
    'cnrs3':            'projects/cnrs/cnrs_resources/mmt22_salunkhe.pdf',
    'cnrs4':            'projects/cnrs/cnrs_resources/ijrr24_salunkhe.pdf',
    'cnrs5':            'projects/cnrs/cnrs_resources/science25_salunkhe.pdf',
    'cnrs6':            'projects/cnrs/cnrs_resources/ral25_salunkhe.pdf',
    'cnrs7':            'projects/cnrs/cnrs_resources/ima25_salunkhe.pdf',
    # Research paper pages
    'ral25':            'projects/journal_webpages/2025/ral25_salunkhe/index.html',
}
# ────────────────────────────────────────────────────────────────────────────


@app.route('/')
def root():
    return send_from_directory(ROOT, 'index.html')


@app.route('/<path:slug>')
def clean_url(slug):
    slug = slug.rstrip('/')          # handle optional trailing slash
    if slug in ROUTES:
        filepath  = ROUTES[slug]
        directory = os.path.join(ROOT, os.path.dirname(filepath))
        filename  = os.path.basename(filepath)
        return send_from_directory(directory, filename)
    # Fallback: serve static files (CSS, JS, images, …)
    return send_from_directory(ROOT, slug)


if __name__ == '__main__':
    app.run(port=8000, debug=True)
