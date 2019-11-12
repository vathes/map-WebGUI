
======
mapapi
======

REST Data API for MAP Web UI
Python/Datajoint/Flask

usage - flask internal dev server::

  FLASK_APP=./mapapi.py flask run
  or
  ./run-map-api.dev.sh  # shell script of above
  or
  ./run-map-api.dev.sh development  # prints extra debug information

usage - gunicorn multiprocess server::

  $ gunicorn -w 4 -b 0.0.0.0:5000 mapapi-gunicorn
  or
  $ ./run-map-api.prod.sh
  devel logs:
  $ gunicorn -w 4 -b 0.0.0.0:5000 mapapi-gunicorn --log-level=debug
  or
  $ ./run-map-api.prod.sh development

api specification
=================

All API endpoints documented here are under a version prefix; currently '/v0',
so, if an endpoint is documented as '/stuff', the real URL would be '/v0/stuff'.

Special facilities are provided via the following special arguments:

  *'__json'*

  If the `__json` attribute is present, the result of decoding its
  value via `json.loads()` will be used in addition to other query arguments.

  This facillitates use of list values (dj.AndList), multiple restrictions,
  and query-by-string.

  *'__limit'*

  If the `__limit` attribute is present, its decoded integer value `N` will
  be passed into the DatajointQuery as a `limit=N` argument.

  *'__order'*

  If the `__order` attribute is present, its string value `S` will
  be passed into the DatajointQuery as a `order_by=S` argument.

  *'__proj'*

  If the `__proj` attribute is present, the result of decoding its value via
  `json.loads()` into `args` will be used to project out the query results as
  `.proj(*args)` before they are returned to the client.

WIP draft v0.1 api spec::

  Requests
  currently support 'POST' methods; documented here as GET urlparams

  base tables::


  special queries (under '_q' prefix)::


  
currently, API is read-only.

A Note On UUID's
================

Currently, DataJoint does not support transparaent handling of UUID string
representation. This means that UUID fields must be converted to uuid.UUID
instances querying/fetching/inserting to/from DataJoint.

Rather than manually keeping a list of all fields where this conversion
is required, we currently attempt to automatically convert all attributes
with the string 'uuid' in their name, and ignore the remaining arguments.

This conversion currently only happens for queries issued with 'direct'
arguments and not for queries where the `__json` special query mechanism
is used.
