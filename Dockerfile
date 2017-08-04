FROM couchbase/server:enterprise-4.6.2

ENV MEMORY_QUOTA 2048
ENV INDEX_MEMORY_QUOTA 2048
ENV FTS_MEMORY_QUOTA 2048

ENV SERVICES "kv,n1ql,index"

ENV USERNAME "Administrator"
ENV PASSWORD "password"

ENV INDEX_STORAGE_MODE "memory_optimized"

ENV CLUSTER_HOST ""
ENV CLUSTER_REBALANCE ""

ENV BUCKET_NAME "loopback-test"
ENV BUCKET_RAM_SIZE 512

COPY config-couchbase.sh /config-entrypoint.sh

ENTRYPOINT ["/config-entrypoint.sh"]
