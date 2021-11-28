from flask import render_template, g
import json

from rope_visualizer import app

@app.route('/')
def index():
    return render_template('rope_visualizer.html')

@app.route('/core_selection.html')
def core_selection():
    return render_template('core_selection.html')
