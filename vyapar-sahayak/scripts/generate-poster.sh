#!/bin/bash
# Generate a VyaparSahayak promotional poster using Nano Banana Pro via GeminiGen.AI
#
# Usage: ./scripts/generate-poster.sh [output_filename]

API_KEY="geminiai-bef4a746e6fe72c4adb6175d5ffb3b10"
API_URL="https://api.geminigen.ai/uapi/v1/generate_image"
OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/posters"
OUTPUT_FILE="${1:-nano-banana-poster.png}"

mkdir -p "$OUTPUT_DIR"

PROMPT="Professional Indian FMCG kirana store clearance sale promotional poster. Vibrant saffron orange and deep blue color scheme. A well-organized kirana shop shelf displaying colorful packaged grocery products like spices, oils, snacks, and beverages. A large bold circular badge showing 20% OFF in bright yellow. Clean modern flat design layout optimized for WhatsApp sharing. Green call-to-action banner at the bottom. Festive South Indian retail aesthetic with kolam border decorations. Simple composition, bright and inviting, no text, no human faces."

echo "[*] Generating poster with Nano Banana Pro..."
echo "[*] Prompt: ${PROMPT:0:80}..."

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: multipart/form-data" \
  -H "x-api-key: $API_KEY" \
  --form "prompt=$PROMPT" \
  --form "model=nano-banana-pro" \
  --form "aspect_ratio=1:1" \
  --form "style=Graphic Design 3D" \
  --form "output_format=png" \
  --form "resolution=1K")

echo "[*] API Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Extract status and image URL
STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',0))" 2>/dev/null)
IMAGE_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('generate_result',''))" 2>/dev/null)
UUID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uuid',''))" 2>/dev/null)

if [ "$STATUS" = "2" ] && [ -n "$IMAGE_URL" ] && [ "$IMAGE_URL" != "None" ] && [ "$IMAGE_URL" != "" ]; then
  echo "[*] Image ready! Downloading..."
  curl -s -o "$OUTPUT_DIR/$OUTPUT_FILE" "$IMAGE_URL"
  echo "[OK] Saved to $OUTPUT_DIR/$OUTPUT_FILE"
elif [ "$STATUS" = "1" ]; then
  echo "[*] Image is processing (status=1). Polling..."
  # Poll using the history API -- try up to 30 times (60 seconds)
  for i in $(seq 1 30); do
    sleep 2
    echo "[*] Poll attempt $i/30..."
    POLL=$(curl -s "https://api.geminigen.ai/uapi/v1/history/$UUID" \
      -H "x-api-key: $API_KEY" 2>/dev/null)
    POLL_STATUS=$(echo "$POLL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',0))" 2>/dev/null)
    POLL_URL=$(echo "$POLL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('generate_result',''))" 2>/dev/null)

    if [ "$POLL_STATUS" = "2" ] && [ -n "$POLL_URL" ] && [ "$POLL_URL" != "None" ] && [ "$POLL_URL" != "" ]; then
      echo "[*] Image ready! Downloading..."
      curl -s -o "$OUTPUT_DIR/$OUTPUT_FILE" "$POLL_URL"
      echo "[OK] Saved to $OUTPUT_DIR/$OUTPUT_FILE"
      exit 0
    elif [ "$POLL_STATUS" = "3" ]; then
      echo "[FAIL] Generation failed."
      echo "$POLL" | python3 -m json.tool 2>/dev/null
      exit 1
    fi
  done
  echo "[FAIL] Timed out waiting for image generation."
  exit 1
else
  echo "[FAIL] Unexpected response. Status: $STATUS"
  exit 1
fi
