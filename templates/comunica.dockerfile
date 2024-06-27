# syntax=docker/dockerfile:1

FROM node:22-slim

ADD https://github.com/surilindur/comunica.git#3c86bdada82329f0fc7fb1ed803ba6dcb6a386b9 /opt/client

WORKDIR /opt/client

RUN corepack enable && yarn install --ignore-engines --frozen-lockfile

WORKDIR /opt/client/engines/query-sparql-file

ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=8192

ENTRYPOINT [ "node" "./bin/http.js" ]
