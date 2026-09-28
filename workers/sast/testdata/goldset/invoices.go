package invoices

func Lookup(db Queryable, tenantID, invoiceID string) error {
	// Missing tenant isolation: any id is readable across tenants.
	_, err := db.Query("SELECT * FROM invoices WHERE id = '" + invoiceID + "'")
	return err
}

type Queryable interface {
	Query(query string, args ...any) (any, error)
}
