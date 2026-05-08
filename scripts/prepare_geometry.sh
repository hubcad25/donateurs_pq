#!/bin/bash
set -e

# Configuration
URL="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limit/files-fichiers/lfsa000a21a_e.zip"
RAW_ZIP="data/raw/lfsa000a21a_e.zip"
RAW_DIR="data/raw/rta_2021"
OUTPUT_FILE="data/processed/rta_geometries.json"

# Create directories
mkdir -p data/raw data/processed

# Download if not exists
if [ ! -f "$RAW_ZIP" ]; then
    echo "Downloading StatCan boundary files..."
    wget -O "$RAW_ZIP" "$URL"
fi

# Unzip if not exists
# Check if the directory exists and contains files
if [ ! -d "$RAW_DIR" ] || [ -z "$(ls -A "$RAW_DIR" 2>/dev/null)" ]; then
    echo "Unzipping boundary files..."
    mkdir -p "$RAW_DIR"
    unzip -o "$RAW_ZIP" -d "$RAW_DIR"
fi

# Find the .shp file (might be nested)
SHP_FILE=$(find "$RAW_DIR" -name "*.shp" | head -n 1)

if [ -z "$SHP_FILE" ]; then
    echo "Error: Could not find .shp file in $RAW_DIR"
    exit 1
fi

# Process with mapshaper
# 1. Filter for Quebec (PRUID = 24)
# 2. Simplify geometry (10% weighted area)
# 3. Output as TopoJSON
echo "Processing geometry with mapshaper..."
npx mapshaper "$SHP_FILE" \
    -filter "PRUID == '24'" \
    -simplify 10% \
    -o format=topojson "$OUTPUT_FILE"

echo "Done! Geometry saved to $OUTPUT_FILE"
