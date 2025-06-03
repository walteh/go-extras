module github.com/walteh/go-extras

go 1.24.3

require (
	github.com/lmittmann/tint v1.1.1
	github.com/stretchr/testify v1.10.0
	github.com/veqryn/slog-context v0.8.0
	gitlab.com/tozd/go/errors v0.10.0
)

// adding this here because its part of this project
tool (
	github.com/walteh/go-extras/cmd/codesign
	github.com/walteh/go-extras/cmd/goshim
)

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/go-logr/logr v1.4.2 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
