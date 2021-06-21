#! /usr/bin/env python

from setuptools import setup, find_packages
from os import path
import sys

here = path.abspath(path.dirname(__file__))

long_description = """"
map-api server
see README.rst for further information.
"""

with open(path.join(here, 'requirements.txt')) as f:
    requirements = f.read().splitlines()

setup(
    name='mapapi',
    version='0.0.1',
    description="mapapi server",
    long_description=long_description,
    author='TODO: Correct Attribution',
    author_email='TODO: Correct Maintainer Email',
    license='TODO: Resolve',
    url='https://github.com/vathes/map-WebGUI',
    keywords='datajoint mysql map',
    packages=find_packages(exclude=['contrib', 'docs', 'tests*']),
    scripts=['run-map-api.dev.sh', 'run-map-api.prod.sh'],
    install_requires=requirements,
)
