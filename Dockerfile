FROM couchbase/server:enterprise-4.6.2

ENV MEMORY_QUOTA 512
ENV INDEX_MEMORY_QUOTA 512
ENV FTS_MEMORY_QUOTA 512

ENV SERVICES "kv,n1ql,index"

ENV USERNAME "Administrator"
ENV PASSWORD "password"

ENV INDEX_STORAGE_MODE "memory_optimized"

ENV CLUSTER_HOST ""
ENV CLUSTER_REBALANCE ""

ENV BUCKET_NAME "loopback-test"
ENV BUCKET_RAM_SIZE 256

COPY config-couchbase.sh /config-entrypoint.sh
COPY test/data/countries.zip /
COPY test/data/userprofiles.zip /

ENTRYPOINT ["/config-entrypoint.sh"]
