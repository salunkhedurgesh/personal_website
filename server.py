from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='.')

# Root route (index.html)
@app.route('/')
@app.route('/about')
def about():
    return send_from_directory('.', 'index.html')

# Matches /publications → projects/main/publications/publications.html
@app.route('/publications')
def publications():
    return send_from_directory('projects/main/publications', 'publications.html')

@app.route('/experience')
def experience():
    return send_from_directory('projects/main/experience', 'experience.html')

@app.route('/researchprojects')
def research_projects():
    return send_from_directory('projects/main/projects', 'projects.html')

@app.route('/personal')
def personal():
    return send_from_directory('projects/personal', 'personal.html')

@app.route('/blog')
def blog():
    return send_from_directory('projects/personal/blog', 'blog.html')

@app.route('/hobbies')
def hobbies():
    return send_from_directory('projects/personal/hobbies', 'hobbies.html')

@app.route('/travel')
def travel():
    return send_from_directory('projects/personal/travel', 'travel.html')

# Fallback to serve static files (CSS, JS, images, etc.)
@app.route('/<path:filename>')
def base_static(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(port=8000, debug=True)
