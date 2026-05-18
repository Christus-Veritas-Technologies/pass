#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ZIMSEC Past Papers Downloader
# Scrapes zambuko.vercel.app for all papers and downloads them into:
#   papers/
#     Grade-7/<subject>/<year>/paper_N.pdf
#     O-Level/<subject>/<year>/paper_N.pdf
#     A-Level/<subject>/<year>/paper_N.pdf
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE="https://zambuko.vercel.app"
OUT="$(cd "$(dirname "$0")/papers" && pwd)"
TOTAL_PAGES=52
DELAY=0.4          # seconds between requests (be polite)
PARALLEL=4         # simultaneous downloads

log()  { echo "[$(date +%H:%M:%S)] $*"; }
warn() { echo "[WARN] $*" >&2; }

# ── 1. Collect all resource slugs ────────────────────────────────────────────

SLUGS_FILE="$(mktemp /tmp/zimsec_slugs.XXXXXX)"
log "Scraping $TOTAL_PAGES pages for resource slugs…"

for page in $(seq 1 $TOTAL_PAGES); do
  url="$BASE/zimsec/page/$page"
  [[ $page -eq 1 ]] && url="$BASE/zimsec"
  html=$(curl -sL --max-time 15 "$url" 2>/dev/null || true)
  # extract paths like /zimsec/resource/chemistry-vG6Yn
  echo "$html" | grep -oP '/zimsec/resource/[a-zA-Z0-9_-]+' | sort -u >> "$SLUGS_FILE"
  log "  page $page/$TOTAL_PAGES — $(wc -l < "$SLUGS_FILE") slugs so far"
  sleep "$DELAY"
done

mapfile -t SLUGS < <(sort -u "$SLUGS_FILE")
rm -f "$SLUGS_FILE"
log "Total unique resources: ${#SLUGS[@]}"

# ── 2. Helpers ────────────────────────────────────────────────────────────────

# Normalise a string to a filesystem-safe slug
slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' \
             | sed 's/[^a-z0-9]/-/g' \
             | sed 's/-\+/-/g' \
             | sed 's/^-//;s/-$//'
}

# Determine the grade folder from page text
level_folder() {
  local text="$1"
  if echo "$text" | grep -qi "a.level\|a level"; then echo "A-Level"
  elif echo "$text" | grep -qi "o.level\|o level"; then echo "O-Level"
  elif echo "$text" | grep -qi "grade.7\|grade 7"; then echo "Grade-7"
  else echo "O-Level"          # sensible default for ZIMSEC
  fi
}

# ── 3. Download one resource ──────────────────────────────────────────────────

download_resource() {
  local slug="$1"
  local page_url="$BASE$slug"

  local html
  html=$(curl -sL --max-time 20 "$page_url" 2>/dev/null) || { warn "fetch failed: $page_url"; return; }

  # Extract Firebase Storage URL
  local pdf_url
  pdf_url=$(echo "$html" | grep -oP 'https://firebasestorage\.googleapis\.com/[^"]+' | head -1)
  [[ -z "$pdf_url" ]] && { warn "no PDF URL on $page_url"; return; }

  # Extract metadata from page <title> or description
  local title
  title=$(echo "$html" | grep -oP '(?<=<title>)[^<]+' | head -1)
  [[ -z "$title" ]] && title=$(echo "$html" | grep -oP '(?<=<h1>)[^<]+' | head -1)
  title=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/zimsec //g')

  # Level
  local folder
  folder=$(level_folder "$title")

  # Subject — first word-group before level/year keywords
  local subject
  subject=$(echo "$title" | grep -oP '^[a-z][a-z ]*(?= (o.level|a.level|grade|november|june|paper|\d{4}))' | head -1 | sed 's/ *$//')
  [[ -z "$subject" ]] && subject=$(echo "$slug" | grep -oP '/zimsec/resource/([a-z]+)' | grep -oP '[a-z]+$')
  subject=$(slugify "$subject")

  # Year
  local year
  year=$(echo "$title" | grep -oP '\b(19|20)\d{2}\b' | head -1)
  [[ -z "$year" ]] && year="unknown"

  # Paper number
  local paper_num
  paper_num=$(echo "$title" | grep -oiP 'paper\s*([12])' | grep -oP '[12]' | head -1)
  [[ -z "$paper_num" ]] && paper_num="1"

  # Destination
  local dest_dir="$OUT/$folder/$subject/$year"
  local dest_file="$dest_dir/paper_${paper_num}.pdf"

  # Skip if already downloaded
  if [[ -f "$dest_file" ]]; then
    # If there's already a paper_1 and this is also paper_1, shift to paper_3, 4…
    local n=2
    while [[ -f "$OUT/$folder/$subject/$year/paper_${n}.pdf" ]]; do
      n=$((n+1))
    done
    dest_file="$OUT/$folder/$subject/$year/paper_${n}.pdf"
  fi

  mkdir -p "$dest_dir"
  log "  ↓ $folder/$subject/$year/paper_${paper_num}.pdf"
  curl -sL --max-time 120 -o "$dest_file" "$pdf_url" || { warn "download failed: $pdf_url"; rm -f "$dest_file"; return; }

  local size
  size=$(wc -c < "$dest_file" 2>/dev/null || echo 0)
  if [[ "$size" -lt 1000 ]]; then
    warn "suspiciously small file ($size bytes), removing: $dest_file"
    rm -f "$dest_file"
  fi
}

export -f download_resource log warn slugify level_folder
export BASE OUT

# ── 4. Run downloads (with parallelism) ───────────────────────────────────────

log "Starting downloads (parallel=$PARALLEL)…"
printf '%s\n' "${SLUGS[@]}" | xargs -P "$PARALLEL" -I{} bash -c 'download_resource "$@"' _ {}

log "All done. Papers saved to: $OUT"
