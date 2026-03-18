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

# 快速传播优化配置（基于官方文档验证）
ipfs config --json Swarm.ConnMgr.HighWater 500
ipfs config --json Swarm.ConnMgr.LowWater 200
ipfs config --json Swarm.RelayClient.Enabled true
ipfs config --json Swarm.EnableHolePunching true
ipfs config --json Provide.Enabled true
ipfs config --json Routing.Type '"dht"'
ipfs config --json Pubsub.Enabled true
ipfs config --json Ipns.UsePubsub true

# 禁用遥测（使用环境变量）
export IPFS_TELEMETRY=off

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

exec ipfs daemon --migrate=true
