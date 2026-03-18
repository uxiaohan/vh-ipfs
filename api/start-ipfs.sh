#!/bin/sh
set -e

if [ ! -f "${IPFS_PATH}/config" ]; then
  ipfs init --profile=server
fi

# Ensure API/Gateway listen on all interfaces (persisted in repo config)
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# Add more bootstrap nodes for better connectivity
ipfs bootstrap rm --all
ipfs bootstrap add /ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3Zw8yRP14AQo6QaLQMFS
ipfs bootstrap add /ip4/104.131.131.82/udp/4001/quic-v1/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3Zw8yRP14AQo6QaLQMFS
ipfs bootstrap add /ip4/128.199.219.111/tcp/4001/p2p/QmSoLer265NRgSp2NE3yVkD1GHUk2RDv9y29TbSN5xuB2
ipfs bootstrap add /ip4/128.199.219.111/udp/4001/quic-v1/p2p/QmSoLer265NRgSp2NE3yVkD1GHUk2RDv9y29TbSN5xuB2

# Enable DHT for better content discovery
ipfs config DHT.Client.Enabled true
ipfs config DHT.Server.Enabled true

# Enable experimental features for faster propagation
ipfs config --json Experimental.AcceleratedDHTClient true
ipfs config --json Swarm.EnableRelayHop true

# Increase connection limits for better connectivity
ipfs config Swarm.ConnMgr.HighWater 200
ipfs config Swarm.ConnMgr.LowWater 100

exec ipfs daemon --migrate=true --enable-pubsub-experiment --enable-namesys-pubsub
