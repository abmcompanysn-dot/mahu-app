package db

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

var Redis *redis.Client

func ConnectRedis(url string) error {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return err
	}
	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return err
	}

	Redis = client
	return nil
}

func RedisReady() bool {
	if Redis == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return Redis.Ping(ctx).Err() == nil
}

func GetCache[T any](ctx context.Context, key string) (*T, error) {
	raw, err := Redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var value T
	if err := json.Unmarshal([]byte(raw), &value); err != nil {
		return nil, err
	}
	return &value, nil
}

func SetCache(ctx context.Context, key string, value any, ttlSeconds int) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return Redis.Set(ctx, key, raw, time.Duration(ttlSeconds)*time.Second).Err()
}

func InvalidateCache(ctx context.Context, key string) error {
	return Redis.Del(ctx, key).Err()
}
