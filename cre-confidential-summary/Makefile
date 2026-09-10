JAVY_PLUGIN := $(abspath ./node_modules/@chainlink/cre-sdk-javy-plugin)

.PHONY: build
build:
	mkdir -p wasm
	CRE_SDK_JAVY_PLUGIN_HOME="$(JAVY_PLUGIN)" bun cre-compile \
		--cre-exports ./tee-hybrid-crypto-plugin \
		./src/workflow.ts \
		./wasm/workflow.wasm
