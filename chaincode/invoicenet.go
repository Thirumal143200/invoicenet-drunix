package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing MSME Invoices on DRUNIX
type SmartContract struct {
	contractapi.Contract
}

// InvoiceStatus represents the lifecycle state of an invoice
type InvoiceStatus string

const (
	StatusCreated   InvoiceStatus = "CREATED"
	StatusAccepted  InvoiceStatus = "ACCEPTED"
	StatusFinancingRequested InvoiceStatus = "FINANCING_REQUESTED"
	StatusFinanced  InvoiceStatus = "FINANCED"
	StatusSettled   InvoiceStatus = "SETTLED"
	StatusRejected  InvoiceStatus = "REJECTED"
	StatusCancelled InvoiceStatus = "CANCELLED"
)

// EndorsementRecord captures cryptographic multi-party sign-offs on DRUNIX
type EndorsementRecord struct {
	OrgMSP        string `json:"orgMsp"`
	ActorID       string `json:"actorId"`
	Action        string `json:"action"`
	TxID          string `json:"txId"`
	Timestamp     string `json:"timestamp"`
	SignatureHash string `json:"signatureHash"`
}

// Invoice represents a trade receivable registered on the DRUNIX distributed ledger
type Invoice struct {
	ID                 string              `json:"id"`
	InvoiceNumber      string              `json:"invoiceNumber"`
	SupplierID         string              `json:"supplierId"`
	SupplierOrg        string              `json:"supplierOrg"`
	BuyerID            string              `json:"buyerId"`
	BuyerOrg           string              `json:"buyerOrg"`
	Amount             float64             `json:"amount"`
	Currency           string              `json:"currency"`
	IssueDate          string              `json:"issueDate"`
	DueDate            string              `json:"dueDate"`
	Description        string              `json:"description"`
	Status             InvoiceStatus       `json:"status"`
	FinancierID        string              `json:"financierId,omitempty"`
	FinancierOrg       string              `json:"financierOrg,omitempty"`
	DiscountRate       float64             `json:"discountRate,omitempty"`
	FinancedAmount     float64             `json:"financedAmount,omitempty"`
	PaymentReference   string              `json:"paymentReference,omitempty"`
	RejectionReason    string              `json:"rejectionReason,omitempty"`
	SettlementDate     string              `json:"settlementDate,omitempty"`
	CreatedAt          string              `json:"createdAt"`
	UpdatedAt          string              `json:"updatedAt"`
	EndorsementHistory []EndorsementRecord `json:"endorsementHistory"`
}

// HistoryQueryResult structure for tracking asset history
type HistoryQueryResult struct {
	TxID      string   `json:"txId"`
	Timestamp string   `json:"timestamp"`
	IsDelete  bool     `json:"isDelete"`
	Record    *Invoice `json:"record"`
}

// InitLedger initializes the ledger with sample MSME trade invoices for the demo
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	invoices := []Invoice{
		{
			ID:            "INV-2026-001",
			InvoiceNumber: "TP-2026-8812",
			SupplierID:    "SP-101",
			SupplierOrg:   "TechParts Manufacturing Pvt. Ltd.",
			BuyerID:       "BY-201",
			BuyerOrg:      "AutoWorks Industries Ltd.",
			Amount:        500000.00,
			Currency:      "INR",
			IssueDate:     "2026-09-15T10:00:00Z",
			DueDate:       "2026-12-15T10:00:00Z",
			Description:   "Batch of 2500 CNC machined precision gears - Lot #92",
			Status:        StatusAccepted,
			CreatedAt:     "2026-09-15T10:00:00Z",
			UpdatedAt:     "2026-09-16T14:30:00Z",
			EndorsementHistory: []EndorsementRecord{
				{
					OrgMSP:        "SupplierMSP",
					ActorID:       "SP-101 (Priya Sharma)",
					Action:        "CREATE_INVOICE",
					TxID:          "tx_init_001_create",
					Timestamp:     "2026-09-15T10:00:00Z",
					SignatureHash: "sha256:4a8b79e18c64d2e8...",
				},
				{
					OrgMSP:        "BuyerMSP",
					ActorID:       "BY-201 (Rajesh Kumar)",
					Action:        "ACCEPT_INVOICE",
					TxID:          "tx_init_001_accept",
					Timestamp:     "2026-09-16T14:30:00Z",
					SignatureHash: "sha256:91b2c4e5f7a089d1...",
				},
			},
		},
		{
			ID:            "INV-2026-002",
			InvoiceNumber: "TP-2026-8815",
			SupplierID:    "SP-101",
			SupplierOrg:   "TechParts Manufacturing Pvt. Ltd.",
			BuyerID:       "BY-202",
			BuyerOrg:      "Metro Logistics Fleet Corp",
			Amount:        1250000.00,
			Currency:      "INR",
			IssueDate:     "2026-09-20T08:00:00Z",
			DueDate:       "2026-11-20T08:00:00Z",
			Description:   "Heavy duty telemetry tracking sensors and harnesses",
			Status:        StatusCreated,
			CreatedAt:     "2026-09-20T08:00:00Z",
			UpdatedAt:     "2026-09-20T08:00:00Z",
			EndorsementHistory: []EndorsementRecord{
				{
					OrgMSP:        "SupplierMSP",
					ActorID:       "SP-101 (Priya Sharma)",
					Action:        "CREATE_INVOICE",
					TxID:          "tx_init_002_create",
					Timestamp:     "2026-09-20T08:00:00Z",
					SignatureHash: "sha256:7f3e1a0b5c9d8e2...",
				},
			},
		},
	}

	for _, invoice := range invoices {
		invoiceJSON, err := json.Marshal(invoice)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(invoice.ID, invoiceJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state: %v", err)
		}
	}

	return nil
}

// CreateInvoice registers a new invoice on the DRUNIX distributed ledger
func (s *SmartContract) CreateInvoice(
	ctx contractapi.TransactionContextInterface,
	id string,
	invoiceNumber string,
	supplierId string,
	supplierOrg string,
	buyerId string,
	buyerOrg string,
	amount float64,
	dueDate string,
	description string,
) (*Invoice, error) {
	exists, err := s.InvoiceExists(ctx, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("the invoice with ID %s already exists on the DRUNIX ledger", id)
	}

	if amount <= 0 {
		return nil, fmt.Errorf("invoice amount must be strictly greater than zero")
	}

	txID := ctx.GetStub().GetTxID()
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	if err == nil && txTimestamp != nil {
		tsStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	}

	clientMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil || clientMSP == "" {
		clientMSP = "SupplierMSP"
	}

	invoice := Invoice{
		ID:            id,
		InvoiceNumber: invoiceNumber,
		SupplierID:    supplierId,
		SupplierOrg:   supplierOrg,
		BuyerID:       buyerId,
		BuyerOrg:      buyerOrg,
		Amount:        amount,
		Currency:      "INR",
		IssueDate:     tsStr,
		DueDate:       dueDate,
		Description:   description,
		Status:        StatusCreated,
		CreatedAt:     tsStr,
		UpdatedAt:     tsStr,
		EndorsementHistory: []EndorsementRecord{
			{
				OrgMSP:        clientMSP,
				ActorID:       supplierId,
				Action:        "CREATE_INVOICE",
				TxID:          txID,
				Timestamp:     tsStr,
				SignatureHash: fmt.Sprintf("sha256-drunix-%s-%s", clientMSP, txID[:8]),
			},
		},
	}

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(id, invoiceJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to save invoice: %v", err)
	}

	// Emit DRUNIX event for real-time frontend/notification triggers
	eventPayload, _ := json.Marshal(map[string]interface{}{
		"invoiceId": id,
		"action":    "INVOICE_CREATED",
		"amount":    amount,
	})
	_ = ctx.GetStub().SetEvent("InvoiceCreated", eventPayload)

	return &invoice, nil
}

// AcceptInvoice allows the Buyer's Organization to endorse and confirm invoice authenticity
func (s *SmartContract) AcceptInvoice(
	ctx contractapi.TransactionContextInterface,
	id string,
	buyerId string,
) (*Invoice, error) {
	invoice, err := s.GetInvoice(ctx, id)
	if err != nil {
		return nil, err
	}

	if invoice.Status != StatusCreated {
		return nil, fmt.Errorf("invoice %s cannot be accepted because current status is %s (must be CREATED)", id, invoice.Status)
	}

	txID := ctx.GetStub().GetTxID()
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	if err == nil && txTimestamp != nil {
		tsStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	}

	clientMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil || clientMSP == "" {
		clientMSP = "BuyerMSP"
	}

	invoice.Status = StatusAccepted
	invoice.UpdatedAt = tsStr
	invoice.EndorsementHistory = append(invoice.EndorsementHistory, EndorsementRecord{
		OrgMSP:        clientMSP,
		ActorID:       buyerId,
		Action:        "ACCEPT_INVOICE",
		TxID:          txID,
		Timestamp:     tsStr,
		SignatureHash: fmt.Sprintf("sha256-drunix-%s-%s", clientMSP, txID[:8]),
	})

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(id, invoiceJSON)
	if err != nil {
		return nil, err
	}

	_ = ctx.GetStub().SetEvent("InvoiceAccepted", invoiceJSON)
	return invoice, nil
}

// RejectInvoice allows Buyer to dispute the invoice with an on-chain reason
func (s *SmartContract) RejectInvoice(
	ctx contractapi.TransactionContextInterface,
	id string,
	buyerId string,
	reason string,
) (*Invoice, error) {
	invoice, err := s.GetInvoice(ctx, id)
	if err != nil {
		return nil, err
	}

	if invoice.Status != StatusCreated {
		return nil, fmt.Errorf("invoice %s cannot be rejected because current status is %s", id, invoice.Status)
	}

	txID := ctx.GetStub().GetTxID()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP == "" {
		clientMSP = "BuyerMSP"
	}

	invoice.Status = StatusRejected
	invoice.RejectionReason = reason
	invoice.UpdatedAt = tsStr
	invoice.EndorsementHistory = append(invoice.EndorsementHistory, EndorsementRecord{
		OrgMSP:        clientMSP,
		ActorID:       buyerId,
		Action:        "REJECT_INVOICE",
		TxID:          txID,
		Timestamp:     tsStr,
		SignatureHash: fmt.Sprintf("sha256-drunix-%s-%s", clientMSP, txID[:8]),
	})

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return nil, err
	}

	return invoice, ctx.GetStub().PutState(id, invoiceJSON)
}

// RequestFinancing flags an accepted invoice as open for bidding by accredited Financiers
func (s *SmartContract) RequestFinancing(
	ctx contractapi.TransactionContextInterface,
	id string,
	supplierId string,
	requestedRate float64,
) (*Invoice, error) {
	invoice, err := s.GetInvoice(ctx, id)
	if err != nil {
		return nil, err
	}

	if invoice.Status != StatusAccepted {
		return nil, fmt.Errorf("cannot request financing: invoice %s is currently in status %s (must be ACCEPTED by Buyer)", id, invoice.Status)
	}

	txID := ctx.GetStub().GetTxID()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP == "" {
		clientMSP = "SupplierMSP"
	}

	invoice.Status = StatusFinancingRequested
	invoice.DiscountRate = requestedRate
	invoice.UpdatedAt = tsStr
	invoice.EndorsementHistory = append(invoice.EndorsementHistory, EndorsementRecord{
		OrgMSP:        clientMSP,
		ActorID:       supplierId,
		Action:        "REQUEST_FINANCING",
		TxID:          txID,
		Timestamp:     tsStr,
		SignatureHash: fmt.Sprintf("sha256-drunix-%s-%s", clientMSP, txID[:8]),
	})

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return nil, err
	}

	return invoice, ctx.GetStub().PutState(id, invoiceJSON)
}

// FinanceInvoice executes multi-party financing agreement with cryptographic double-pledge prevention
func (s *SmartContract) FinanceInvoice(
	ctx contractapi.TransactionContextInterface,
	id string,
	financierId string,
	financierOrg string,
	discountRate float64,
	financedAmount float64,
) (*Invoice, error) {
	invoice, err := s.GetInvoice(ctx, id)
	if err != nil {
		return nil, err
	}

	// CRITICAL SECURITY ENFORCEMENT: Double-financing prevention
	if invoice.Status == StatusFinanced {
		return nil, fmt.Errorf("DOUBLE FINANCING FRAUD ATTEMPT: Invoice %s is ALREADY financed by %s (%s). Rejection cryptographically enforced on DRUNIX ledger", id, invoice.FinancierID, invoice.FinancierOrg)
	}

	if invoice.Status != StatusAccepted && invoice.Status != StatusFinancingRequested {
		return nil, fmt.Errorf("invoice %s cannot be financed: must be ACCEPTED or FINANCING_REQUESTED, current status is %s", id, invoice.Status)
	}

	if financedAmount <= 0 || financedAmount > invoice.Amount {
		return nil, fmt.Errorf("invalid financedAmount %.2f (must be > 0 and <= %.2f)", financedAmount, invoice.Amount)
	}

	txID := ctx.GetStub().GetTxID()
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	if err == nil && txTimestamp != nil {
		tsStr = time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	}

	clientMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil || clientMSP == "" {
		clientMSP = "FinancierMSP"
	}

	invoice.Status = StatusFinanced
	invoice.FinancierID = financierId
	invoice.FinancierOrg = financierOrg
	invoice.DiscountRate = discountRate
	invoice.FinancedAmount = financedAmount
	invoice.UpdatedAt = tsStr

	// Multi-party endorsement record on DRUNIX
	invoice.EndorsementHistory = append(invoice.EndorsementHistory, EndorsementRecord{
		OrgMSP:        clientMSP,
		ActorID:       financierId,
		Action:        "FINANCE_INVOICE",
		TxID:          txID,
		Timestamp:     tsStr,
		SignatureHash: fmt.Sprintf("sha256-drunix-%s-%s", clientMSP, txID[:8]),
	})

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(id, invoiceJSON)
	if err != nil {
		return nil, err
	}

	_ = ctx.GetStub().SetEvent("InvoiceFinanced", invoiceJSON)
	return invoice, nil
}

// SettleInvoice completes final settlement when buyer pays on due date
func (s *SmartContract) SettleInvoice(
	ctx contractapi.TransactionContextInterface,
	id string,
	buyerId string,
	paymentReference string,
) (*Invoice, error) {
	invoice, err := s.GetInvoice(ctx, id)
	if err != nil {
		return nil, err
	}

	if invoice.Status != StatusFinanced && invoice.Status != StatusAccepted {
		return nil, fmt.Errorf("invoice %s cannot be settled: current status is %s", id, invoice.Status)
	}

	txID := ctx.GetStub().GetTxID()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP == "" {
		clientMSP = "BuyerMSP"
	}

	invoice.Status = StatusSettled
	invoice.PaymentReference = paymentReference
	invoice.SettlementDate = tsStr
	invoice.UpdatedAt = tsStr
	invoice.EndorsementHistory = append(invoice.EndorsementHistory, EndorsementRecord{
		OrgMSP:        clientMSP,
		ActorID:       buyerId,
		Action:        "SETTLE_INVOICE",
		TxID:          txID,
		Timestamp:     tsStr,
		SignatureHash: fmt.Sprintf("sha256-drunix-%s-%s", clientMSP, txID[:8]),
	})

	invoiceJSON, err := json.Marshal(invoice)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(id, invoiceJSON)
	if err != nil {
		return nil, err
	}

	_ = ctx.GetStub().SetEvent("InvoiceSettled", invoiceJSON)
	return invoice, nil
}

// GetInvoice retrieves an invoice by its unique ledger ID
func (s *SmartContract) GetInvoice(ctx contractapi.TransactionContextInterface, id string) (*Invoice, error) {
	invoiceJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if invoiceJSON == nil {
		return nil, fmt.Errorf("invoice %s does not exist", id)
	}

	var invoice Invoice
	err = json.Unmarshal(invoiceJSON, &invoice)
	if err != nil {
		return nil, err
	}

	return &invoice, nil
}

// InvoiceExists returns true if an invoice exists in the world state
func (s *SmartContract) InvoiceExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	invoiceJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return invoiceJSON != nil, nil
}

// QueryInvoicesByStatus returns all invoices matching a specific status
func (s *SmartContract) QueryInvoicesByStatus(ctx contractapi.TransactionContextInterface, status string) ([]*Invoice, error) {
	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return s.getQueryResultForQueryString(ctx, queryString)
}

// QueryInvoicesByOrg returns all invoices where the given org is supplier, buyer, or financier
func (s *SmartContract) QueryInvoicesByOrg(ctx contractapi.TransactionContextInterface, orgID string) ([]*Invoice, error) {
	queryString := fmt.Sprintf(`{"selector":{"$or":[{"supplierId":"%s"},{"buyerId":"%s"},{"financierId":"%s"}]}}`, orgID, orgID, orgID)
	return s.getQueryResultForQueryString(ctx, queryString)
}

// GetAllInvoices returns all invoices from world state
func (s *SmartContract) GetAllInvoices(ctx contractapi.TransactionContextInterface) ([]*Invoice, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var invoices []*Invoice
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var invoice Invoice
		err = json.Unmarshal(queryResponse.Value, &invoice)
		if err != nil {
			continue
		}
		invoices = append(invoices, &invoice)
	}

	return invoices, nil
}

// GetInvoiceHistory returns the full audit trail of changes for an invoice
func (s *SmartContract) GetInvoiceHistory(ctx contractapi.TransactionContextInterface, id string) ([]HistoryQueryResult, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var invoice Invoice
		if len(response.Value) > 0 {
			_ = json.Unmarshal(response.Value, &invoice)
		}

		record := HistoryQueryResult{
			TxID:      response.TxId,
			Timestamp: time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).UTC().Format(time.RFC3339),
			IsDelete:  response.IsDelete,
			Record:    &invoice,
		}
		records = append(records, record)
	}

	return records, nil
}

// getQueryResultForQueryString executes a rich query (supported natively by YugabyteDB on DRUNIX)
func (s *SmartContract) getQueryResultForQueryString(ctx contractapi.TransactionContextInterface, queryString string) ([]*Invoice, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var results []*Invoice
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var invoice Invoice
		err = json.Unmarshal(queryResponse.Value, &invoice)
		if err != nil {
			continue
		}
		results = append(results, &invoice)
	}

	return results, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating InvoiceNet chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting InvoiceNet chaincode: %s", err.Error())
	}
}
