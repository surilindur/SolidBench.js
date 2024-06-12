# syntax=docker/dockerfile:1

FROM node:22-slim

ADD https://github.com/surilindur/comunica.git#e9a8ec114a66679da51c1bf8a67309f4a10e4fd1 /opt/client

WORKDIR /opt/client

RUN corepack enable && yarn install --ignore-engines

WORKDIR /opt/client/engines/query-sparql-file

ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=8192

ENTRYPOINT [ "node" "./bin/http.js" ]
