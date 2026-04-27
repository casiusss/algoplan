package service

import (
	"fmt"
	"html"
	"os"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/resend/resend-go/v2"
)

// maxSubjectFieldRunes bounds how much user-controlled text (workspace name,
// inviter name) can land in an email Subject. Prevents attackers from stuffing
// a full phishing pitch into a workspace name that gets sent from our domain.
const maxSubjectFieldRunes = 60

type EmailService struct {
	client    *resend.Client
	fromEmail string
}

func NewEmailService() *EmailService {
	apiKey := os.Getenv("RESEND_API_KEY")
	from := os.Getenv("RESEND_FROM_EMAIL")
	if from == "" {
		from = "noreply@algoplan.ai"
	}

	var client *resend.Client
	if apiKey != "" {
		client = resend.NewClient(apiKey)
	}

	return &EmailService{
		client:    client,
		fromEmail: from,
	}
}

// SendVerificationCode sends a one-time login code. The code is server-generated
// (6-digit numeric) so no user-controlled text reaches the email body here.
// If that ever changes, escape the user-controlled fields the same way
// SendInvitationEmail does.
func (s *EmailService) SendVerificationCode(to, code string) error {
	if s.client == nil {
		fmt.Printf("[DEV] Verification code for %s: %s\n", to, code)
		return nil
	}

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: "Your Multica verification code",
		Html: fmt.Sprintf(
			`<div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
				<h2>Your verification code</h2>
				<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">%s</p>
				<p>This code expires in 10 minutes.</p>
				<p style="color: #666; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
			</div>`, code),
	}

	_, err := s.client.Emails.Send(params)
	return err
}

// SendInvitationEmail notifies the invitee that they have been invited to a workspace.
// invitationID is included in the URL so the email deep-links to /invite/{id}.
func (s *EmailService) SendInvitationEmail(to, inviterName, workspaceName, invitationID string) error {
	appURL := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if appURL == "" {
		appURL = "https://app.multica.ai"
	}
	inviteURL := fmt.Sprintf("%s/invite/%s", appURL, invitationID)

	if s.client == nil {
		fmt.Printf("[DEV] Invitation email to %s: %s invited you to %s — %s\n", to, inviterName, workspaceName, inviteURL)
		return nil
	}

	params := buildInvitationParams(s.fromEmail, to, inviterName, workspaceName, inviteURL)
	_, err := s.client.Emails.Send(params)
	return err
}

// buildInvitationParams assembles the Resend request for an invitation email.
// Separated from SendInvitationEmail so the sanitization behavior is unit-testable
// without needing to mock the Resend SDK.
func buildInvitationParams(from, to, inviterName, workspaceName, inviteURL string) *resend.SendEmailRequest {
	safeWorkspace := html.EscapeString(workspaceName)
	safeInviter := html.EscapeString(inviterName)
	subjectInviter := sanitizeSubjectField(inviterName)
	subjectWorkspace := sanitizeSubjectField(workspaceName)

	return &resend.SendEmailRequest{
		From:    from,
		To:      []string{to},
		Subject: fmt.Sprintf("%s invited you to %s on Multica", subjectInviter, subjectWorkspace),
		Html: fmt.Sprintf(
			`<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
				<h2>You're invited to join %s</h2>
				<p><strong>%s</strong> invited you to collaborate in the <strong>%s</strong> workspace on Multica.</p>
				<p style="margin: 24px 0;">
					<a href="%s" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept invitation</a>
				</p>
				<p style="color: #666; font-size: 14px;">You'll need to log in to accept or decline the invitation.</p>
			</div>`, safeWorkspace, safeInviter, safeWorkspace, inviteURL),
	}
}

// SendSignupVerification sends the email-verification link issued during
// password signup. Subject + body are English + "Multica" branding;
// Phase 7 (rebrand) will sweep them along with all other strings.
//
// In dev mode (no RESEND_API_KEY → s.client == nil) the verify URL is
// printed to stdout, mirroring SendVerificationCode. The handler treats
// any error from this method as best-effort: the user is created either
// way and may resend the verification email later.
func (s *EmailService) SendSignupVerification(to, verifyToken string) error {
	appURL := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if appURL == "" {
		appURL = "https://app.multica.ai"
	}
	verifyURL := fmt.Sprintf("%s/auth/verify-email?token=%s", appURL, verifyToken)

	if s.client == nil {
		fmt.Printf("[DEV] Signup verify email to %s: %s\n", to, verifyURL)
		return nil
	}

	params := buildSignupVerificationParams(s.fromEmail, to, verifyURL)
	_, err := s.client.Emails.Send(params)
	return err
}

// buildSignupVerificationParams assembles the Resend request for the
// signup-verification email. Separated for unit testability without
// mocking the Resend SDK. The verify URL is HTML-escaped before
// substitution as defense-in-depth — today the URL is server-built
// from base64url token bytes, but escaping keeps the helper safe if a
// future caller passes user-controlled URL fragments.
func buildSignupVerificationParams(from, to, verifyURL string) *resend.SendEmailRequest {
	safeURL := html.EscapeString(verifyURL)
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px;">
  <h1>Welcome to Multica</h1>
  <p>Please verify your email by clicking the link below. This link expires in 24 hours.</p>
  <p><a href="%s">Verify email</a></p>
  <p style="color: #666; font-size: 12px;">If the link doesn't work, copy this URL into your browser:<br/>%s</p>
</div>`, safeURL, safeURL)

	return &resend.SendEmailRequest{
		From:    from,
		To:      []string{to},
		Subject: "Verify your email for Multica",
		Html:    body,
	}
}

// SendPasswordResetEmail sends the time-bound password-reset link issued
// from POST /auth/password-reset/request. Subject + body are English +
// "Multica" branding (Phase 7 rebrand will sweep). Mirrors the structure
// of SendSignupVerification: in dev mode (no RESEND_API_KEY → s.client
// == nil) the reset URL is printed to stdout instead of being sent. The
// caller treats any error as best-effort — the reset row already exists
// in DB and the user can request another link via the cooldown.
func (s *EmailService) SendPasswordResetEmail(to, resetToken string) error {
	appURL := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if appURL == "" {
		appURL = "https://app.multica.ai"
	}
	resetURL := fmt.Sprintf("%s/auth/reset-password?token=%s", appURL, resetToken)

	if s.client == nil {
		fmt.Printf("[DEV] Password reset email to %s: %s\n", to, resetURL)
		return nil
	}

	params := buildPasswordResetParams(s.fromEmail, to, resetURL)
	_, err := s.client.Emails.Send(params)
	return err
}

// buildPasswordResetParams assembles the Resend request for the password-
// reset email. Separated for unit testability without mocking the Resend
// SDK. The reset URL is HTML-escaped before substitution as defense-in-
// depth — today the URL is server-built from base64url token bytes, but
// escaping keeps the helper safe if a future caller passes user-controlled
// URL fragments. The "did not request" safety note is required by
// password-reset UX best practice (informs the user that doing nothing
// preserves their existing password).
func buildPasswordResetParams(from, to, resetURL string) *resend.SendEmailRequest {
	safeURL := html.EscapeString(resetURL)
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px;">
  <h1>Reset your password</h1>
  <p>Click the link below to reset your Multica password. This link expires in 1 hour.</p>
  <p><a href="%s">Reset password</a></p>
  <p style="color: #666; font-size: 12px;">If you did not request this, ignore this email — your password remains unchanged.</p>
  <p style="color: #666; font-size: 12px;">If the link doesn't work, copy this URL into your browser:<br/>%s</p>
</div>`, safeURL, safeURL)

	return &resend.SendEmailRequest{
		From:    from,
		To:      []string{to},
		Subject: "Reset your Multica password",
		Html:    body,
	}
}

// SendEmailVerification sends a fresh email-verification link, used by the
// POST /auth/email-verify/resend endpoint. Subject + body are English +
// "Multica" branding (Phase 7 will rebrand). Mirrors SendSignupVerification:
// the only difference is the user-facing copy ("New verification email" vs
// "Welcome") because the resend flow is triggered by the user clicking
// "resend" rather than by initial signup.
//
// In dev mode (no RESEND_API_KEY → s.client == nil) the verify URL is
// printed to stdout. The caller treats any error here as best-effort.
func (s *EmailService) SendEmailVerification(to, verifyToken string) error {
	appURL := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if appURL == "" {
		appURL = "https://app.multica.ai"
	}
	verifyURL := fmt.Sprintf("%s/auth/verify-email?token=%s", appURL, verifyToken)

	if s.client == nil {
		fmt.Printf("[DEV] Resend verify email to %s: %s\n", to, verifyURL)
		return nil
	}

	params := buildEmailVerifyParams(s.fromEmail, to, verifyURL)
	_, err := s.client.Emails.Send(params)
	return err
}

// buildEmailVerifyParams assembles the Resend request for the resend-verify
// email. Separated for unit testability without mocking the Resend SDK. The
// verify URL is HTML-escaped before substitution as defense-in-depth — today
// the URL is server-built from base64url token bytes, but escaping keeps the
// helper safe if a future caller passes user-controlled URL fragments.
func buildEmailVerifyParams(from, to, verifyURL string) *resend.SendEmailRequest {
	safeURL := html.EscapeString(verifyURL)
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px;">
  <h1>Verify your email</h1>
  <p>You requested a new verification email. The link below expires in 24 hours.</p>
  <p><a href="%s">Verify email</a></p>
  <p style="color: #666; font-size: 12px;">If the link doesn't work, copy this URL into your browser:<br/>%s</p>
</div>`, safeURL, safeURL)

	return &resend.SendEmailRequest{
		From:    from,
		To:      []string{to},
		Subject: "New verification email for Multica",
		Html:    body,
	}
}

// sanitizeSubjectField prepares user-controlled text for the email Subject line.
// Subject is not HTML-rendered, so HTML-escaping would leak literal entities
// (e.g. &lt;script&gt;) into the recipient's inbox. Instead strip control
// characters (defense in depth against header-injection-adjacent abuse even
// though Resend also filters CR/LF) and cap length so attackers can't stuff
// a full phishing subject into a workspace name.
func sanitizeSubjectField(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if unicode.IsControl(r) {
			continue
		}
		b.WriteRune(r)
	}
	cleaned := b.String()
	if utf8.RuneCountInString(cleaned) <= maxSubjectFieldRunes {
		return cleaned
	}
	runes := []rune(cleaned)
	return string(runes[:maxSubjectFieldRunes-1]) + "…"
}
