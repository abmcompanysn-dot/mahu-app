FROM golang:1.23-alpine AS build
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

FROM alpine:3.20 AS runtime
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=build /out/server ./server
COPY --from=build /out/seedadmin ./seedadmin
COPY --from=build /out/seedtestuser ./seedtestuser
COPY --from=build /out/migrateappscript ./migrateappscript

EXPOSE 4000
CMD ["./server"]
