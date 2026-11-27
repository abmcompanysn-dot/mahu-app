# Go 1.26 (le 1.23 n'est plus maintenu : 27 failles connues dans net/http, crypto/tls...)
FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
# go.sum is committed now, so this only fetches exactly what's imported -
# unlike `go mod tidy`, it never walks dependencies' own test-only imports
# (which pulled in unrelated grpc test packages and made this build fragile
# on this VPS's flaky network).
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server
RUN CGO_ENABLED=0 go build -o /out/seedadmin ./cmd/seedadmin
RUN CGO_ENABLED=0 go build -o /out/seedtestuser ./cmd/seedtestuser
RUN CGO_ENABLED=0 go build -o /out/migrateappscript ./cmd/migrateappscript

FROM alpine:3.22 AS runtime
WORKDIR /app
RUN apk add --no-cache ca-certificates && adduser -D -H -u 10001 mahu
COPY --from=build /out/server ./server
COPY --from=build /out/seedadmin ./seedadmin
COPY --from=build /out/seedtestuser ./seedtestuser
COPY --from=build /out/migrateappscript ./migrateappscript

# le serveur n'ecrit rien sur le disque : il tourne sans les droits root
USER mahu
EXPOSE 4000
CMD ["./server"]
