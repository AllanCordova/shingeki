package evidence

import "strings"

func isClassicSQL(category string) bool {
	upper := strings.ToUpper(category)
	if strings.Contains(upper, "NOSQL") {
		return false
	}
	return strings.Contains(upper, "SQL")
}
