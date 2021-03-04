FROM datajoint/jupyter:python3.6

# for production builds
ADD . /src/mapapi

RUN pip install --upgrade datajoint

RUN \
    pip install -e /src/mapapi && \
    chmod +x /src/mapapi/run-map-api.prod.sh && \
    chmod +x /src/mapapi/run-map-api.dev.sh

HEALTHCHECK       \
    --timeout=3s \
    --retries=20  \
    CMD           \
        curl --fail http://localhost:5000/v0/subject || exit 1

ENTRYPOINT ["/src/mapapi/run-map-api.prod.sh"]
