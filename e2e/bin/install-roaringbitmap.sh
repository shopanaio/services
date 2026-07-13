#!/usr/bin/env bash
set -euo pipefail

POSTGRES_MAJOR="${POSTGRES_MAJOR:-18}"
PG_ROARINGBITMAP_VERSION="${PG_ROARINGBITMAP_VERSION:-1.2.0}"
PG_ROARINGBITMAP_URL="${PG_ROARINGBITMAP_URL:-https://api.pgxn.org/dist/pg_roaringbitmap/${PG_ROARINGBITMAP_VERSION}/pg_roaringbitmap-${PG_ROARINGBITMAP_VERSION}.zip}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  gcc \
  make \
  "postgresql-server-dev-${POSTGRES_MAJOR}" \
  unzip

workdir="$(mktemp -d)"
cleanup() {
  rm -rf "${workdir}"
}
trap cleanup EXIT

curl -fsSL "${PG_ROARINGBITMAP_URL}" -o "${workdir}/pg_roaringbitmap.zip"
unzip -q "${workdir}/pg_roaringbitmap.zip" -d "${workdir}"

source_dir="$(find "${workdir}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ -z "${source_dir}" ]]; then
  echo "pg_roaringbitmap source directory was not found in archive" >&2
  exit 1
fi

make -C "${source_dir}"
make -C "${source_dir}" install

apt-get purge -y --auto-remove \
  curl \
  gcc \
  make \
  "postgresql-server-dev-${POSTGRES_MAJOR}" \
  unzip
rm -rf /var/lib/apt/lists/*
