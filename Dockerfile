FROM couchbase/server:community

ENV MEMORY_QUOTA 256
ENV INDEX_MEMORY_QUOTA 256
ENV FTS_MEMORY_QUOTA 256

ENV SERVICES "kv,n1ql,index,fts"

ENV USERNAME "Administrator"
ENV PASSWORD "password"

ENV CLUSTER_HOST ""
ENV CLUSTER_REBALANCE ""

ENV BUCKET_NAME "loopback-connector"

COPY config-couchbase.sh /config-entrypoint.sh

ADD test/data /

ENTRYPOINT ["/config-entrypoint.sh"]