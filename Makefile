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

# mermaid, vendored: the mermaid shortcode loads it from assets/js. `make vendor`
# bumps to the latest release and rewrites the default below; for a specific
# version run `make mermaid MERMAID_VERSION=x.y.z`.
MERMAID_VERSION ?= 11.17.2
MERMAID_OUT=assets/js/mermaid.min.js

mermaid:
	curl -fsSL https://cdn.jsdelivr.net/npm/mermaid@$(MERMAID_VERSION)/dist/mermaid.min.js -o $(MERMAID_OUT).tmp
	mv $(MERMAID_OUT).tmp $(MERMAID_OUT)

vendor:
	v=$$(curl -fsSL https://registry.npmjs.org/mermaid/latest | sed -n 's/.*"version":"\([^"]*\)".*/\1/p'); \
	test -n "$$v" && perl -pi -e "s/^MERMAID_VERSION \?= .*/MERMAID_VERSION ?= $$v/" Makefile && \
	$(MAKE) mermaid MERMAID_VERSION=$$v
