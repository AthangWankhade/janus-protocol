FROM golang:1.24-alpine

WORKDIR /app

# Copy dependency locks
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN go build -o main cmd/server/main.go

# Expose the port
EXPOSE 8080

# Run the binary
CMD ["./main"]