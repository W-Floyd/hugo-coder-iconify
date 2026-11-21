HUGO_BIN=hugo

.PHONY: build demo release hls mermaid vendor

HLS_DIR=third_party/hls.js
HLS_OUT=assets/js/hls.minimal.min.js

build:
	$(HUGO_BIN) --source=exampleSite

demo:
	$(HUGO_BIN) server -D --source=exampleSite --bind 0.0.0.0

release: build
	rm -rf ./resources && cp -r ./exampleSite/resources ./resources

# hls.js for immich-video, built from the submodule's commit. The minimal preset
# (core, no logs, no ABR) fits: Immich serves fMP4 VOD without subtitles, alt
# audio, keys or DRM, and the shortcode picks levels itself.
hls:
	cd $(HLS_DIR) && npm ci --ignore-scripts && USE_LIVE=0 USE_ENCRYPTION=0 npx rollup --config --configType coreNoLogs
	node $(HLS_DIR)/scripts/bundle-features.js --format iife --out $(HLS_OUT).tmp minimal
	{ printf '/*! hls.js minimal %s | Apache-2.0 | https://github.com/W-Floyd/hls.js */\n' "$$(git -C $(HLS_DIR) rev-parse HEAD)"; cat $(HLS_OUT).tmp; } > $(HLS_OUT)
	rm $(HLS_OUT).tmp

# mermaid, vendored as its ESM build under static/js/mermaid (not assets: the
# chunks import each other by relative URL, so they can't be fingerprinted).
# Each diagram type is its own chunk, fetched only when a page uses it. `make
# vendor` bumps to the latest release and rewrites the default below; for a
# specific version run `make mermaid MERMAID_VERSION=x.y.z`.
MERMAID_VERSION ?= 11.17.2

mermaid:
	rm -rf static/js/mermaid && mkdir -p static/js/mermaid
	curl -fsSL https://registry.npmjs.org/mermaid/-/mermaid-$(MERMAID_VERSION).tgz | tar -xz -C static/js/mermaid --strip-components=2 --exclude='*.map' package/dist/mermaid.esm.min.mjs package/dist/chunks/mermaid.esm.min

vendor:
	v=$$(curl -fsSL https://registry.npmjs.org/mermaid/latest | sed -n 's/.*"version":"\([^"]*\)".*/\1/p'); \
	test -n "$$v" && perl -pi -e "s/^MERMAID_VERSION \?= .*/MERMAID_VERSION ?= $$v/" Makefile && \
	$(MAKE) mermaid MERMAID_VERSION=$$v
