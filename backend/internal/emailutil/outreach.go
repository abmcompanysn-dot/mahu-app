package emailutil

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/smtp"
	"strings"
	"time"

	"mahu-backend/internal/config"
)

// OutreachMessage is one client email sent from a person's mailbox.
type OutreachMessage struct {
	To             string
	Subject        string
	HTML           string
	Text           string
	UnsubscribeURL string
}

// SendAs delivers msg through the mail server, authenticated as sender, so
// it is DKIM-signed for mahu.cards and replies land in that mailbox.
func SendAs(env *config.Env, sender config.OutreachSender, msg OutreachMessage) error {
	raw, err := buildOutreachMessage(sender, msg)
	if err != nil {
		return err
	}

	host := env.OutreachSMTPHost
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, env.OutreachSMTPPort), 20*time.Second)
	if err != nil {
		return err
	}
	_ = conn.SetDeadline(time.Now().Add(60 * time.Second))
	c, err := smtp.NewClient(conn, host)
	if err != nil {
		conn.Close()
		return err
	}
	defer c.Close()

	if err := c.Hello("mahu-backend"); err != nil {
		return err
	}
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: host}); err != nil {
			return err
		}
	}
	if err := c.Auth(smtp.PlainAuth("", sender.Email, sender.Password, host)); err != nil {
		return err
	}
	if err := c.Mail(sender.Email); err != nil {
		return err
	}
	if err := c.Rcpt(msg.To); err != nil {
		return err
	}
	wc, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := wc.Write(raw); err != nil {
		wc.Close()
		return err
	}
	if err := wc.Close(); err != nil {
		return err
	}
	return c.Quit()
}

func buildOutreachMessage(sender config.OutreachSender, msg OutreachMessage) ([]byte, error) {
	id := make([]byte, 12)
	if _, err := rand.Read(id); err != nil {
		return nil, err
	}
	boundary := "mahu-" + hex.EncodeToString(id)
	domain := sender.Email[strings.LastIndex(sender.Email, "@")+1:]

	var b bytes.Buffer
	fmt.Fprintf(&b, "From: %s <%s>\r\n", mime.QEncoding.Encode("UTF-8", sender.Name), sender.Email)
	fmt.Fprintf(&b, "To: <%s>\r\n", msg.To)
	fmt.Fprintf(&b, "Subject: %s\r\n", mime.QEncoding.Encode("UTF-8", msg.Subject))
	fmt.Fprintf(&b, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(&b, "Message-ID: <%s@%s>\r\n", hex.EncodeToString(id), domain)
	if msg.UnsubscribeURL != "" {
		fmt.Fprintf(&b, "List-Unsubscribe: <%s>, <mailto:%s?subject=desinscription>\r\n", msg.UnsubscribeURL, sender.Email)
	}
	b.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", boundary)

	for _, part := range []struct{ kind, body string }{{"text/plain", msg.Text}, {"text/html", msg.HTML}} {
		fmt.Fprintf(&b, "--%s\r\n", boundary)
		fmt.Fprintf(&b, "Content-Type: %s; charset=UTF-8\r\n", part.kind)
		b.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")
		qp := quotedprintable.NewWriter(&b)
		if _, err := qp.Write([]byte(strings.ReplaceAll(strings.ReplaceAll(part.body, "\r\n", "\n"), "\n", "\r\n"))); err != nil {
			return nil, err
		}
		if err := qp.Close(); err != nil {
			return nil, err
		}
		b.WriteString("\r\n")
	}
	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	return b.Bytes(), nil
}
