#!/bin/bash

# Monitor mode (used to attach into couchbase entrypoint)
set -m
# Send it to background
/entrypoint.sh couchbase-server &

# Check if couchbase server is up
check_db() {
  curl --silent http://127.0.0.1:8091/pools > /dev/null
  echo $?
}

# Variable used in echo
i=1
# Echo with
numbered_echo() {
  echo "[$i] $@"
  i=`expr $i + 1`
}

# Parse JSON and get nodes from the cluster
read_nodes() {
  cmd="import sys,json;"
  cmd="${cmd} print(','.join([node['otpNode']"
  cmd="${cmd} for node in json.load(sys.stdin)['nodes']"
  cmd="${cmd} ]))"
  python -c "${cmd}"
}

# Wait until it's ready
until [[ $(check_db) = 0 ]]; do
  >&2 numbered_echo "Waiting for Couchbase Server to be available"
  sleep 1
done

echo "# Couchbase Server Online"
echo "# Starting setup process"

#HOSTNAME=`hostname -f`
HOSTNAME="127.0.0.1"

# Reset steps
i=1
# Configure
numbered_echo "Initialize the node"
curl --silent "http://${HOSTNAME}:8091/nodes/self/controller/settings" \
  -d path="/opt/couchbase/var/lib/couchbase/data" \
  -d index_path="/opt/couchbase/var/lib/couchbase/data"

numbered_echo "Setting hostname"
curl --silent "http://${HOSTNAME}:8091/node/controller/rename" \
  -d hostname=${HOSTNAME}

numbered_echo "Setting up memory"
curl --silent "http://${HOSTNAME}:8091/pools/default" \
  -d memoryQuota=${MEMORY_QUOTA} \
  -d indexMemoryQuota=${INDEX_MEMORY_QUOTA} \
  -d ftsMemoryQuota=${FTS_MEMORY_QUOTA}

numbered_echo "Setting up services"
curl --silent "http://${HOSTNAME}:8091/node/controller/setupServices" \
  -d services="${SERVICES}"

numbered_echo "Setting up user credentials"
curl --silent "http://${HOSTNAME}:8091/settings/web" \
  -d port=8091 \
  -d username=${WEB_USERNAME} \
  -d password=${WEB_PASSWORD} > /dev/null

numbered_echo "Setting indexer storage method"
curl --silent -X POST "http://${HOSTNAME}:8091/settings/indexes" \
  -u ${WEB_USERNAME}:${WEB_PASSWORD} \
  -d "storageMode=${INDEX_STORAGE_MODE}"

numbered_echo "Remove the bucket"
couchbase-cli bucket-delete -c ${HOSTNAME}:8091 \
  --bucket=${BUCKET_NAME} \
  -u ${WEB_USERNAME} -p ${WEB_PASSWORD}

numbered_echo "Create the bucket: ${BUCKET_NAME}"
couchbase-cli bucket-create -c ${HOSTNAME}:8091 \
  --bucket=${BUCKET_NAME} \
  --bucket-type=couchbase \
  --bucket-ramsize=${BUCKET_RAM_SIZE} \
  --bucket-replica=0 \
  --bucket-priority=high \
  --bucket-eviction-policy=valueOnly \
  --enable-flush=1 \
  -u ${WEB_USERNAME} -p ${WEB_PASSWORD}

numbered_echo "Create RBAC user for ${BUCKET_NAME}"
couchbase-cli user-manage -c ${HOSTNAME}:8091 -u ${WEB_USERNAME} -p ${WEB_PASSWORD} \
  --set --rbac-username ${RBAC_USERNAME} --rbac-password ${RBAC_PASSWORD} \
  --rbac-name ${RBAC_USERNAME} --roles bucket_admin[${BUCKET_NAME}] \
  --auth-domain local

sleep 10

numbered_echo "Create n1ql index for ${BUCKET_NAME}"
echo "CREATE PRIMARY INDEX ON \`${BUCKET_NAME}\` USING GSI;" | cbq -u ${WEB_USERNAME} -p ${WEB_PASSWORD}

# Attach to couchbase entrypoint
numbered_echo "Attaching to couchbase-server entrypoint"
fg 1
