package emailutil

import (
	"fmt"
	"net/smtp"
	"strings"

	"mahu-backend/internal/config"
)

const companySignature = `
  <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #777; font-family: sans-serif; line-height: 1.5;">
    <p><strong>MAHU DIGITAL SYSTEM</strong><br>
    Medina Rue 13 Angle 12, Dakar, Senegal<br>
    NINEA: 012834182 | RCCM: SN.DKR.2026.A.6465</p>
  </div>`

// Sender wraps the SMTP config the same way the previous sendEmail() in
// Code.gs wrapped GmailApp - always from CONFIG.SENDER_NAME, always with the
// company signature appended to the HTML body.
type Sender struct {
	env *config.Env
}

func NewSender(env *config.Env) *Sender {
	return &Sender{env: env}
}

func (s *Sender) fromAddress() string {
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

	from := s.fromAddress()
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
	fmt.Fprintf(&b, "%s%s\r\n\r\n", htmlBody, companySignature)

	fmt.Fprintf(&b, "--%s--\r\n", boundary)

	auth := smtp.PlainAuth("", s.env.SMTPUser, s.env.SMTPPassword, s.env.SMTPHost)
	addr := s.env.SMTPHost + ":" + s.env.SMTPPort

	return smtp.SendMail(addr, auth, from, []string{to}, []byte(b.String()))
}
