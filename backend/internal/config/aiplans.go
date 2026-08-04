package config

type AiPlanID = string

const (
	PlanGratuit AiPlanID = "gratuit"
	PlanPremium AiPlanID = "premium"
	PlanPro     AiPlanID = "pro"
)

type AiPlanDefinition struct {
	Models        []string
	DailyCredits  int
}

// Models reference the model_name values defined in litellm/config.yaml.
// Credits are refilled to DailyCredits once per 24h (see services/subscription.go).
var AIPlans = map[AiPlanID]AiPlanDefinition{
	PlanGratuit: {
		Models:       []string{"llama3-70b"},
		DailyCredits: 20,
	},
	PlanPremium: {
		Models:       []string{"llama3-70b", "gpt-4o-mini", "claude-haiku", "qwen-plus", "qwen-vl-ocr"},
		DailyCredits: 300,
	},
	PlanPro: {
		Models: []string{
			"llama3-70b", "gpt-4o-mini", "claude-haiku", "qwen-plus", "qwen-vl-ocr",
			"gpt-4o", "claude-sonnet", "claude-opus", "qwen-max", "qwen3-max", "qwen3.7-plus",
			"qwen3.5-122b-a10b", "qwen-mt-flash", "qwen3-vl-235b-thinking",
		},
		DailyCredits: 2000,
	},
}

const (
	DefaultAiPlan AiPlanID = PlanGratuit
	FreeModel              = "llama3-70b"
)

func IsModelAllowedForPlan(plan AiPlanID, model string) bool {
	def, ok := AIPlans[plan]
	if !ok {
		return false
	}
	for _, m := range def.Models {
		if m == model {
			return true
		}
	}
	return false
}
