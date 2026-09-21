#!/bin/bash
# Build the Omega' D18 C port (Annunaki SHA-NI powerhouse).
# Output: pkg/mining/omegaprime_d18.so
set -e
cd "$(dirname "$0")/../.."
gcc -O3 -march=native -msha -shared -fPIC \
    -o pkg/mining/omegaprime_d18.so \
    pkg/mining/omegaprime_d18.c \
    pkg/mining/annunaki_shani.c \
    pkg/mining/blake2b_ref.c \
    -lcrypto
echo "built pkg/mining/omegaprime_d18.so"
