#!/bin/bash

echo "🔐 Authorizing Aptos Relayer..."

aptos move run \
--function-id "0xe206191aa9fe73c28a3c559112354dc5f043440b0be3e3283ca470be2557bcd4::cross_chain_bridge::add_relayer" \
--args "address:0xff1d8911bc098e1b16bcdfa85fe59a6e212c2ba275af2979cb7c44bc938e331f" \
--assume-yes

echo "✅ Authorization command completed"