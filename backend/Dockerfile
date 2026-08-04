FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
# No go.sum is committed (this repo has no local Go toolchain to generate one) -
# go mod tidy resolves and locks versions during the build itself.
RUN go mod tidy
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
