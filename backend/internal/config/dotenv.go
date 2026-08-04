package config

import (
	"bufio"
	"os"
	"strings"
)

// loadDotEnv mimics the subset of Node's dotenv/config behaviour this project
// relies on: read KEY=VALUE lines from a .env file and populate the process
// environment, without overwriting variables that are already set (so real
// environment variables — e.g. those injected by Docker Compose's env_file —
// always win over the file).
func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		idx := strings.Index(line, "=")
		if idx < 0 {
			continue
		}

		key := strings.TrimSpace(line[:idx])
		value := strings.TrimSpace(line[idx+1:])
		value = strings.Trim(value, `"'`)

		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		os.Setenv(key, value)
	}
}
