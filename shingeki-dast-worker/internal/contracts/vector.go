package contracts

type AttackVector struct {
	Route          string
	Method         string
	TargetLocation string
	Params         map[string]string
	Headers        map[string]string
	Body           string
}

func NewAttackVector(route, method, targetLocation string) AttackVector {
	return AttackVector{
		Route:          route,
		Method:         method,
		TargetLocation: targetLocation,
		Params:         make(map[string]string),
		Headers:        make(map[string]string),
	}
}
