package emailutil

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"mahu-backend/internal/config"
)

const companySignature = `
  <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #777; font-family: sans-serif; line-height: 1.5;">
    <p><strong>MAHU DIGITAL SYSTEM</strong><br>
    Medina Rue 13 Angle 12, Dakar, Senegal<br>
    NINEA: 012834182 | RCCM: SN.DKR.2026.A.6465</p>
  </div>`

const resendEndpoint = "https://api.resend.com/emails"

// Sender delivers transactional emails, always from SMTPFromName and with
// the company signature appended to the HTML body. Route: each Resend key in
// order (RESEND_API_KEYS), then SMTP as a last resort - so one revoked key or
// an expired Gmail app password no longer stops every email.
type Sender struct {
	env    *config.Env
	client *http.Client
}

func NewSender(env *config.Env) *Sender {
	return &Sender{env: env, client: &http.Client{Timeout: 15 * time.Second}}
}

func (s *Sender) smtpFromAddress() string {
	if s.env.SMTPFromEmail != "" {
		return s.env.SMTPFromEmail
	}
	return s.env.SMTPUser
}

// Send delivers an HTML email, matching the previous sendEmail(recipient,
// subject, htmlBody, textBody) signature. textBody is optional - a generic
// fallback is used when omitted, since the message is HTML-first.
func (s *Sender) Send(to, subject, htmlBody string, textBody ...string) error {
	plain := "Veuillez activer l'affichage HTML pour voir ce message."
	if len(textBody) > 0 && textBody[0] != "" {
		plain = textBody[0]
	}
	html := htmlBody + companySignature

	var errs []string
	for i, key := range s.env.ResendAPIKeys {
		err := s.sendResend(key, to, subject, html, plain)
		if err == nil {
			return nil
		}
		errs = append(errs, fmt.Sprintf("resend[%d]: %v", i, err))
		log.Printf("[email] resend key #%d failed for %q: %v", i, subject, err)
	}

	if s.env.SMTPUser != "" && s.env.SMTPPassword != "" {
		err := s.sendSMTP(to, subject, html, plain)
		if err == nil {
			return nil
		}
		errs = append(errs, "smtp: "+err.Error())
	}

	if len(errs) == 0 {
		return errors.New("aucun moyen d'envoi configure (RESEND_API_KEYS ou SMTP)")
	}
	return errors.New(strings.Join(errs, " | "))
}

func (s *Sender) sendResend(key, to, subject, html, plain string) error {
	payload := map[string]any{
		"from":    fmt.Sprintf("%s <%s>", s.env.SMTPFromName, s.env.ResendFromEmail),
		"to":      []string{to},
		"subject": subject,
		"html":    html,
		"text":    plain,
	}
	if s.env.EmailReplyTo != "" {
		payload["reply_to"] = s.env.EmailReplyTo
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, resendEndpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	detail, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
	return fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(detail)))
}

func (s *Sender) sendSMTP(to, subject, html, plain string) error {
	from := s.smtpFromAddress()
	boundary := "mahu-boundary-42"

	var b strings.Builder
	fmt.Fprintf(&b, "From: %s <%s>\r\n", s.env.SMTPFromName, from)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: %s\r\n", subject)
	fmt.Fprintf(&b, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", boundary)

	fmt.Fprintf(&b, "--%s\r\n", boundary)
	fmt.Fprintf(&b, "Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	fmt.Fprintf(&b, "%s\r\n\r\n", plain)

	fmt.Fprintf(&b, "--%s\r\n", boundary)
	fmt.Fprintf(&b, "Content-Type: text/html; charset=UTF-8\r\n\r\n")
	fmt.Fprintf(&b, "%s\r\n\r\n", html)

	fmt.Fprintf(&b, "--%s--\r\n", boundary)

	auth := smtp.PlainAuth("", s.env.SMTPUser, s.env.SMTPPassword, s.env.SMTPHost)
	addr := s.env.SMTPHost + ":" + s.env.SMTPPort

	return smtp.SendMail(addr, auth, from, []string{to}, []byte(b.String()))
}
