#!/bin/sh
set -e

IPFS_LOG_FILE="${IPFS_PATH}/ipfs.log"
IPFS_LOG_MAX_SIZE=$((5 * 1024 * 1024))
IPFS_LOG_CHECK_INTERVAL=300

rotate_ipfs_log() {
  if [ -f "${IPFS_LOG_FILE}" ]; then
    LOG_SIZE=$(stat -c %s "${IPFS_LOG_FILE}" 2>/dev/null || echo 0)
    if [ "${LOG_SIZE}" -gt "${IPFS_LOG_MAX_SIZE}" ]; then
      tail -c "${IPFS_LOG_MAX_SIZE}" "${IPFS_LOG_FILE}" > "${IPFS_LOG_FILE}.tmp"
      mv "${IPFS_LOG_FILE}.tmp" "${IPFS_LOG_FILE}"
    fi
  fi
}

if [ ! -f "${IPFS_PATH}/config" ]; then
  ipfs init --profile=server
fi

ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/16662

ipfs bootstrap rm --all
ipfs bootstrap add /ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3Zw8yRP14AQo6QaLQMFS
ipfs bootstrap add /ip4/104.131.131.82/udp/4001/quic-v1/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3Zw8yRP14AQo6QaLQMFS
ipfs bootstrap add /ip4/128.199.219.111/tcp/4001/p2p/QmSoLer265NRgSp2NE3yVkD1GHUk2RDv9y29TbSN5xuB2
ipfs bootstrap add /ip4/128.199.219.111/udp/4001/quic-v1/p2p/QmSoLer265NRgSp2NE3yVkD1GHUk2RDv9y29TbSN5xuB2

ipfs config DHT.Client.Enabled true
ipfs config DHT.Server.Enabled true
ipfs config --json Experimental.AcceleratedDHTClient true
ipfs config --json Swarm.EnableRelayHop true
ipfs config Swarm.ConnMgr.HighWater 200
ipfs config Swarm.ConnMgr.LowWater 100

rotate_ipfs_log

(
  while true; do
    sleep "${IPFS_LOG_CHECK_INTERVAL}"
    rotate_ipfs_log
  done
) &

echo "🚀 IPFS Daemon starting..."
echo "📝 API: http://0.0.0.0:5001"
echo "🌐 Gateway: http://0.0.0.0:16662"
echo "📁 Data: ${IPFS_PATH}"
echo "📊 Log: ${IPFS_LOG_FILE} (max ${IPFS_LOG_MAX_SIZE} bytes)"

exec ipfs daemon --migrate=true --enable-pubsub-experiment --enable-namesys-pubsub
