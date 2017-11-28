FROM couchbase/server:enterprise-5.0.0

ENV MEMORY_QUOTA 1024
ENV INDEX_MEMORY_QUOTA 512
ENV FTS_MEMORY_QUOTA 512

ENV SERVICES "kv,n1ql,index"

ENV WEB_USERNAME "Administrator"
ENV WEB_PASSWORD "password"

ENV INDEX_STORAGE_MODE "memory_optimized"

ENV CLUSTER_HOST ""
ENV CLUSTER_REBALANCE ""

ENV BUCKET_NAME "loopback-test"
ENV BUCKET_RAM_SIZE 256

ENV RBAC_USERNAME "username"
ENV RBAC_PASSWORD "password"
ENV RBAC_NAME "Username"

COPY config-couchbase.sh /config-entrypoint.sh

ENTRYPOINT ["/config-entrypoint.sh"]
