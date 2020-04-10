FROM node:alpine
LABEL description="Instant high-performance GraphQL API for your PostgreSQL database https://github.com/graphile/postgraphile"

# Install PostGraphile and PostGraphile connection filter plugin
RUN npm install -g postgraphile
RUN npm install -g postgraphile-plugin-connection-filter
RUN npm install -g @graphile/postgis
RUN npm install -g postgraphile-plugin-connection-filter-postgis
EXPOSE 5000
ENTRYPOINT ["postgraphile", "-n", "0.0.0.0"]