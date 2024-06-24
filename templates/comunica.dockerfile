# syntax=docker/dockerfile:1

FROM node:22-slim

ADD https://github.com/surilindur/comunica.git#038b10d51e9d84302bc0a33555339f080e986579 /opt/client

WORKDIR /opt/client

RUN corepack enable && yarn install --ignore-engines

WORKDIR /opt/client/engines/query-sparql-file

ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=8192

ENTRYPOINT [ "node" "./bin/http.js" ]
