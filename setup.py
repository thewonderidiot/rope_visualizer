#!/usr/bin/env python

from distutils.core import setup

setup(
    name='rope_visualizer',
    version='1.0',
    description='AGC Core Rope Visualizer',
    author='Mike Stewart',
    author_email='mastewar1@gmail.com',
    url='',
    packages=['rope_visualizer'],
    include_package_data=True,
    zip_safe=False,
    install_requires=['Flask'],
)
