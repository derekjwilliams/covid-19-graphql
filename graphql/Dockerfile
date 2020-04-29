FROM node:alpine
LABEL description="Instant high-performance GraphQL API for your PostgreSQL database https://github.com/graphile/postgraphile"

# Install PostGraphile and PostGraphile connection filter plugin
RUN npm install -g postgraphile@^4.7.0
RUN npm install -g postgraphile-plugin-connection-filter@^1.1.3
RUN npm install -g @graphile/postgis@^0.1.0
RUN npm install -g postgraphile-plugin-connection-filter-postgis@1.0.0-alpha.5

EXPOSE 5000
ENTRYPOINT ["postgraphile", "-n", "0.0.0.0"]