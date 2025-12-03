# =============================================================================
# Dockerfile - Nginx Reverse Proxy
# Production-ready with optimizations
# =============================================================================

FROM nginx:1.25-alpine as production

LABEL maintainer="Ollama Manager Team"
LABEL description="Nginx Reverse Proxy for Ollama Manager"
LABEL version="1.0.0"

RUN apk add --no-cache \
    curl \
    tzdata \
    openssl \
    && rm -rf /var/cache/apk/*

RUN rm -rf /etc/nginx/conf.d/* \
    && rm -rf /etc/nginx/sites-enabled/* \
    && rm -rf /usr/share/nginx/html/*

COPY docker-nginx.conf /etc/nginx/nginx.conf

COPY docker-default.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /var/cache/nginx \
    && mkdir -p /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chmod -R 755 /var/cache/nginx

RUN touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
