import os
from urllib.parse import quote

from flask import Flask, jsonify, redirect, request, send_from_directory, session

app = Flask(__name__, static_folder='.')
ROOT = os.path.dirname(os.path.abspath(__file__))

app.secret_key = os.environ.get('FLASK_SECRET_KEY') or os.urandom(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

CNRS26_USERNAME = os.environ.get('CNRS26_USERNAME', 'durghy')
CNRS26_PASSWORD = os.environ.get('CNRS26_PASSWORD', '1Team@w0rk')
CNRS26_SESSION_KEY = 'cnrs26_authenticated'

# Mirror of .htaccess RewriteRules.
# Add new clean-URL -> file-path entries here (relative to site root).
# Trailing slashes in URLs are stripped automatically (matches cnrs1/? style).
ROUTES = {
    # Main pages
    'about': 'index.html',
    'publications': 'projects/main/publications/publications.html',
    'experience': 'projects/main/experience/experience.html',
    'researchprojects': 'projects/main/projects/projects.html',
    'personal': 'projects/personal/personal.html',
    'blog': 'projects/personal/blog/blog.html',
    'hobbies': 'projects/personal/hobbies/hobbies.html',
    'travel': 'projects/personal/travel/travel.html',
    # CNRS 2026
    'selected_research': 'projects/cnrs/seven_chosen.html',
    'cnrs26': 'projects/cnrs26/index.html',
    'cnrs_teleprompter': 'projects/cnrs26/cnrs_teleprompter.html',
    'cnrs_presentation': 'projects/cnrs26/CNRS26_Salunkhe_short.pdf',
    'cnrs_speech_annotated': 'projects/cnrs26/cnrs_presentation_speech_annotated.txt',
    'cnrs1': 'projects/cnrs/cnrs_resources/rcim19_dutta.pdf',
    'cnrs2': 'projects/cnrs/cnrs_resources/mmt22_opt_salunkhe.pdf',
    'cnrs3': 'projects/cnrs/cnrs_resources/mmt22_salunkhe.pdf',
    'cnrs4': 'projects/cnrs/cnrs_resources/ijrr24_salunkhe.pdf',
    'cnrs5': 'projects/cnrs/cnrs_resources/science25_salunkhe.pdf',
    'cnrs6': 'projects/cnrs/cnrs_resources/ral25_salunkhe.pdf',
    'cnrs7': 'projects/cnrs/cnrs_resources/ima25_salunkhe.pdf',
    # Research paper pages
    'ral25': 'projects/journal_webpages/2025/ral25_salunkhe/index.html',
}

PROTECTED_SLUGS = {
    'cnrs_teleprompter',
    'cnrs_presentation',
    'cnrs_speech_annotated',
}

PROTECTED_PATHS = {
    'projects/cnrs26/cnrs_teleprompter.html',
    'projects/cnrs26/CNRS26_Salunkhe_short.pdf',
    'projects/cnrs26/cnrs_performance_script.md',
    'projects/cnrs26/cnrs_presentation_speech_annotated.txt',
}


def is_cnrs_authenticated():
    return session.get(CNRS26_SESSION_KEY) is True


def normalize_cnrs_next_path(candidate):
    candidate = str(candidate or '').strip()
    if not candidate.startswith('/'):
        return ''
    if candidate.startswith('//'):
        return ''
    if '/../' in candidate or candidate.endswith('/..'):
        return ''
    return candidate


def cnrs_portal_redirect(next_path=''):
    next_path = normalize_cnrs_next_path(next_path)
    if next_path:
        return redirect(f'/cnrs26?next={quote(next_path, safe="/")}')
    return redirect('/cnrs26')


def serve_site_file(filepath):
    directory = os.path.join(ROOT, os.path.dirname(filepath))
    filename = os.path.basename(filepath)
    return send_from_directory(directory, filename)


@app.route('/')
def root():
    return send_from_directory(ROOT, 'index.html')


@app.post('/cnrs26/login')
def cnrs26_login():
    payload = request.get_json(silent=True) or request.form
    username = str(payload.get('username', '')).strip()
    password = str(payload.get('password', ''))
    next_path = normalize_cnrs_next_path(payload.get('next'))

    if username == CNRS26_USERNAME and password == CNRS26_PASSWORD:
        session[CNRS26_SESSION_KEY] = True
        return jsonify({'ok': True, 'redirect': next_path or '/cnrs26'})

    session.pop(CNRS26_SESSION_KEY, None)
    return jsonify({
        'ok': False,
        'message': 'Access denied. Please check the username and password.',
    }), 401


@app.post('/cnrs26/logout')
def cnrs26_logout():
    session.pop(CNRS26_SESSION_KEY, None)
    return jsonify({'ok': True})


@app.get('/cnrs26/session')
def cnrs26_session_status():
    return jsonify({'authenticated': is_cnrs_authenticated()})


@app.route('/<path:slug>')
def clean_url(slug):
    slug = slug.rstrip('/')

    if slug in PROTECTED_PATHS and not is_cnrs_authenticated():
        return cnrs_portal_redirect(request.path)

    if slug in ROUTES:
        if slug in PROTECTED_SLUGS and not is_cnrs_authenticated():
            return cnrs_portal_redirect(f'/{slug}')
        return serve_site_file(ROUTES[slug])

    return send_from_directory(ROOT, slug)


if __name__ == '__main__':
    app.run(port=8000, debug=True)

