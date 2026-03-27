"""
notification_service.py
-----------------------
Centralised email notification service for the IT Ticketing System.
Uses Resend (https://resend.com) — free tier: 3,000 emails/month.

Install:  pip install resend

Environment variables required (.env):
    RESEND_API_KEY=re_xxxxxxxxxxxx
    NOTIFY_FROM_EMAIL=noreply@yourdomain.com   # must be a verified domain in Resend
    FRONTEND_URL=https://your-frontend.com      # used for "View Ticket" buttons
"""

import os
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY")

FROM_EMAIL   = os.getenv("NOTIFY_FROM_EMAIL", "noreply@yourdomain.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://your-frontend.com")

# ─────────────────────────────────────────────────────────────
# Shared HTML helpers
# ─────────────────────────────────────────────────────────────

PRIORITY_COLOR = {
    "high":   "#E53E3E",
    "medium": "#DD6B20",
    "low":    "#38A169",
}

STATUS_COLOR = {
    "Pending":     "#718096",
    "Assigned":    "#3182CE",
    "In Progress": "#D69E2E",
    "Resolved":    "#38A169",
    "Closed":      "#553C9A",
}


def _base_template(title: str, headline: str, body_html: str, ticket_id: int = None) -> str:
    """Wraps content in a consistent, professional HTML email shell."""

    view_button = ""
    if ticket_id:
        url = f"{FRONTEND_URL}/tickets/{ticket_id}"
        view_button = f"""
        <div style="text-align:center; margin:32px 0;">
          <a href="{url}"
             style="background:#4F46E5; color:#ffffff; text-decoration:none;
                    padding:12px 28px; border-radius:6px; font-size:14px;
                    font-weight:600; display:inline-block;">
            View Ticket #{ticket_id}
          </a>
        </div>"""

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0; padding:0; background:#F7FAFC; font-family: 'Segoe UI', Arial, sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC; padding:40px 0;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff; border-radius:10px;
                    box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden;">

        <!-- Header bar -->
        <tr>
          <td style="background:#4F46E5; padding:24px 36px;">
            <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;
                        letter-spacing:-0.3px;">
              SACK Support System
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <h2 style="margin:0 0 20px; color:#1A202C; font-size:22px; font-weight:700;">
              {headline}
            </h2>
            {body_html}
            {view_button}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F7FAFC; padding:20px 36px;
                     border-top:1px solid #E2E8F0; text-align:center;">
            <p style="margin:0; color:#A0AEC0; font-size:12px;">
              This is an automated notification from SACK Support.<br/>
              Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def _info_row(label: str, value: str, value_color: str = "#2D3748") -> str:
    return f"""
    <tr>
      <td style="padding:8px 12px; color:#718096; font-size:13px;
                 font-weight:600; width:140px; vertical-align:top;">
        {label}
      </td>
      <td style="padding:8px 12px; color:{value_color}; font-size:13px;
                 font-weight:500; vertical-align:top;">
        {value}
      </td>
    </tr>"""


def _ticket_info_table(rows_html: str) -> str:
    return f"""
    <table cellpadding="0" cellspacing="0" width="100%"
           style="background:#F7FAFC; border-radius:8px;
                  border:1px solid #E2E8F0; margin-bottom:24px;">
      <tbody>
        {rows_html}
      </tbody>
    </table>"""


def _send(to: str, subject: str, html: str) -> bool:
    """
    Dispatches an email via Resend.
    Returns True on success, False on failure (never raises — email is non-critical).
    """
    try:
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [to],
            "subject": subject,
            "html":    html,
        })
        logger.info("Email sent successfully | to=%s | subject=%s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email | to=%s | subject=%s | error=%s", to, subject, exc)
        return False


# ─────────────────────────────────────────────────────────────
# 1. Ticket Created  →  sent to the reporter (user)
# ─────────────────────────────────────────────────────────────

def notify_ticket_created(
    to_email: str,
    reporter_name: str,
    ticket_id: int,
    subject: str,
    category: str,
    priority: str,
):
    logger.info("Sending ticket_created email | ticket_id=%s | to=%s", ticket_id, to_email)

    priority_color = PRIORITY_COLOR.get(priority.lower(), "#718096")

    rows = (
        _info_row("Ticket ID",  f"#{ticket_id}")
        + _info_row("Subject",    subject)
        + _info_row("Category",   category or "To be determined")
        + _info_row("Priority",
                    f'<span style="background:{priority_color}; color:#fff; '
                    f'padding:2px 10px; border-radius:12px; font-size:12px;">'
                    f'{priority.upper()}</span>')
        + _info_row("Status",
                    '<span style="background:#718096; color:#fff; '
                    'padding:2px 10px; border-radius:12px; font-size:12px;">PENDING</span>')
    )

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{reporter_name or 'there'}</strong>,<br/><br/>
      Your support request has been received and a ticket has been created.
      Our team will review it shortly.
    </p>
    {_ticket_info_table(rows)}
    <p style="color:#718096; font-size:13px; margin:0;">
      You will receive updates as your ticket progresses through our support pipeline.
    </p>
    """

    html = _base_template(
        title=f"Ticket #{ticket_id} Created",
        headline="Your ticket has been created",
        body_html=body,
        ticket_id=ticket_id,
    )

    return _send(
        to=to_email,
        subject=f"[Ticket #{ticket_id}] Support Request Received – {subject[:60]}",
        html=html,
    )


# ─────────────────────────────────────────────────────────────
# 2. Ticket Assigned to Member  →  sent to the team member
# ─────────────────────────────────────────────────────────────

def notify_member_assigned(
    to_email: str,
    member_name: str,
    ticket_id: int,
    subject: str,
    category: str,
    priority: str,
    assigned_by: str,
):
    logger.info("Sending member_assigned email | ticket_id=%s | to=%s", ticket_id, to_email)

    priority_color = PRIORITY_COLOR.get(priority.lower(), "#718096")

    rows = (
        _info_row("Ticket ID",   f"#{ticket_id}")
        + _info_row("Subject",     subject)
        + _info_row("Category",    category or "N/A")
        + _info_row("Priority",
                    f'<span style="background:{priority_color}; color:#fff; '
                    f'padding:2px 10px; border-radius:12px; font-size:12px;">'
                    f'{priority.upper()}</span>')
        + _info_row("Assigned by", assigned_by)
    )

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{member_name}</strong>,<br/><br/>
      A new support ticket has been assigned to you by <strong>{assigned_by}</strong>.
      Please review the details below and begin working on it as soon as possible.
    </p>
    {_ticket_info_table(rows)}
    <p style="color:#E53E3E; font-size:13px; font-weight:600; margin:0;">
      ⏱ Please check your SLA deadline and prioritise accordingly.
    </p>
    """

    html = _base_template(
        title=f"New Ticket Assigned – #{ticket_id}",
        headline="A ticket has been assigned to you",
        body_html=body,
        ticket_id=ticket_id,
    )

    return _send(
        to=to_email,
        subject=f"[Action Required] Ticket #{ticket_id} Assigned to You – {subject[:50]}",
        html=html,
    )


# ─────────────────────────────────────────────────────────────
# 3. Ticket Assigned (status update)  →  sent to the reporter
# ─────────────────────────────────────────────────────────────

def notify_user_ticket_assigned(
    to_email: str,
    reporter_name: str,
    ticket_id: int,
    subject: str,
    priority: str,
):
    logger.info("Sending user_ticket_assigned email | ticket_id=%s | to=%s", ticket_id, to_email)

    priority_color = PRIORITY_COLOR.get(priority.lower(), "#718096")

    rows = (
        _info_row("Ticket ID", f"#{ticket_id}")
        + _info_row("Subject",   subject)
        + _info_row("Priority",
                    f'<span style="background:{priority_color}; color:#fff; '
                    f'padding:2px 10px; border-radius:12px; font-size:12px;">'
                    f'{priority.upper()}</span>')
        + _info_row("Status",
                    '<span style="background:#3182CE; color:#fff; '
                    'padding:2px 10px; border-radius:12px; font-size:12px;">ASSIGNED</span>')
    )

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{reporter_name or 'there'}</strong>,<br/><br/>
      Good news! Your support ticket has been assigned to a team member
      who will be working on it. We will keep you updated on the progress.
    </p>
    {_ticket_info_table(rows)}
    """

    html = _base_template(
        title=f"Ticket #{ticket_id} Assigned",
        headline="Your ticket has been assigned",
        body_html=body,
        ticket_id=ticket_id,
    )

    return _send(
        to=to_email,
        subject=f"[Ticket #{ticket_id}] Your Request is Being Handled",
        html=html,
    )


# ─────────────────────────────────────────────────────────────
# 4. Ticket Resolved  →  sent to the reporter
# ─────────────────────────────────────────────────────────────

def notify_ticket_resolved(
    to_email: str,
    reporter_name: str,
    ticket_id: int,
    subject: str,
    resolution_text: str,
):
    logger.info("Sending ticket_resolved email | ticket_id=%s | to=%s", ticket_id, to_email)

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{reporter_name or 'there'}</strong>,<br/><br/>
      Your support ticket has been resolved by our team. Please find the
      resolution details below.
    </p>

    {_ticket_info_table(
        _info_row("Ticket ID", f"#{ticket_id}")
        + _info_row("Subject",   subject)
        + _info_row("Status",
                    '<span style="background:#38A169; color:#fff; '
                    'padding:2px 10px; border-radius:12px; font-size:12px;">RESOLVED</span>')
    )}

    <!-- Resolution box -->
    <div style="background:#F0FFF4; border-left:4px solid #38A169;
                border-radius:6px; padding:16px 20px; margin-bottom:24px;">
      <p style="margin:0 0 8px; color:#276749; font-size:13px; font-weight:700;
                text-transform:uppercase; letter-spacing:0.5px;">
        Resolution
      </p>
      <p style="margin:0; color:#2D3748; font-size:14px; line-height:1.7;">
        {resolution_text}
      </p>
    </div>

    <p style="color:#718096; font-size:13px; margin:0;">
      This ticket is now pending final review and will be officially closed shortly.
      If your issue persists, please submit a new support request.
    </p>
    """

    html = _base_template(
        title=f"Ticket #{ticket_id} Resolved",
        headline="Your ticket has been resolved ✓",
        body_html=body,
        ticket_id=ticket_id,
    )

    return _send(
        to=to_email,
        subject=f"[Ticket #{ticket_id}] Your Issue Has Been Resolved",
        html=html,
    )


# ─────────────────────────────────────────────────────────────
# 5. Ticket Closed  →  sent to the reporter
# ─────────────────────────────────────────────────────────────

def notify_ticket_closed(
    to_email: str,
    reporter_name: str,
    ticket_id: int,
    subject: str,
):
    logger.info("Sending ticket_closed email | ticket_id=%s | to=%s", ticket_id, to_email)

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{reporter_name or 'there'}</strong>,<br/><br/>
      Your support ticket has been reviewed and officially closed by our team lead.
      We hope your issue has been fully resolved.
    </p>

    {_ticket_info_table(
        _info_row("Ticket ID", f"#{ticket_id}")
        + _info_row("Subject",   subject)
        + _info_row("Status",
                    '<span style="background:#553C9A; color:#fff; '
                    'padding:2px 10px; border-radius:12px; font-size:12px;">CLOSED</span>')
    )}

    <div style="background:#FAF5FF; border-left:4px solid #553C9A;
                border-radius:6px; padding:16px 20px; margin-bottom:24px;">
      <p style="margin:0; color:#44337A; font-size:14px; line-height:1.7;">
        Thank you for reaching out to SACK Support. If you encounter any further
        issues, please don't hesitate to submit a new request.
      </p>
    </div>
    """

    html = _base_template(
        title=f"Ticket #{ticket_id} Closed",
        headline="Your ticket has been closed",
        body_html=body,
        ticket_id=ticket_id,
    )

    return _send(
        to=to_email,
        subject=f"[Ticket #{ticket_id}] Support Request Closed",
        html=html,
    )


# ─────────────────────────────────────────────────────────────
# 6. Auto-Resolved  →  sent to the reporter (no ticket created)
# ─────────────────────────────────────────────────────────────

def notify_auto_resolved(
    to_email: str,
    reporter_name: str,
    original_subject: str,
    resolution_text: str,
):
    logger.info("Sending auto_resolved email | to=%s | subject=%s", to_email, original_subject)

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{reporter_name or 'there'}</strong>,<br/><br/>
      We found an existing solution in our knowledge base that directly addresses
      your request. Your issue has been auto-resolved — no ticket was necessary!
    </p>

    {_ticket_info_table(
        _info_row("Your Request", original_subject)
        + _info_row("Status",
                    '<span style="background:#38A169; color:#fff; '
                    'padding:2px 10px; border-radius:12px; font-size:12px;">AUTO-RESOLVED</span>')
    )}

    <div style="background:#F0FFF4; border-left:4px solid #38A169;
                border-radius:6px; padding:16px 20px; margin-bottom:24px;">
      <p style="margin:0 0 8px; color:#276749; font-size:13px; font-weight:700;
                text-transform:uppercase; letter-spacing:0.5px;">
        Solution
      </p>
      <p style="margin:0; color:#2D3748; font-size:14px; line-height:1.7;">
        {resolution_text.replace(chr(10), '<br/>')}
      </p>
    </div>

    <p style="color:#718096; font-size:13px; margin:0;">
      If this does not solve your issue, please submit a new request with more details.
    </p>
    """

    html = _base_template(
        title="Your Request Has Been Auto-Resolved",
        headline="Your request was auto-resolved ✓",
        body_html=body,
    )

    return _send(
        to=to_email,
        subject=f"[SACK Support] Your Request Has Been Auto-Resolved – {original_subject[:50]}",
        html=html,
    )


# ─────────────────────────────────────────────────────────────
# 7. Resolution Rejected  →  sent to the team member
# ─────────────────────────────────────────────────────────────

def notify_member_resolution_rejected(
    to_email: str,
    member_name: str,
    ticket_id: int,
    subject: str,
    rejection_reason: str = None,
):
    logger.info("Sending resolution_rejected email | ticket_id=%s | to=%s", ticket_id, to_email)

    reason_block = ""
    if rejection_reason:
        reason_block = f"""
        <div style="background:#FFF5F5; border-left:4px solid #E53E3E;
                    border-radius:6px; padding:16px 20px; margin-bottom:24px;">
          <p style="margin:0 0 8px; color:#C53030; font-size:13px; font-weight:700;
                    text-transform:uppercase; letter-spacing:0.5px;">
            Rejection Reason
          </p>
          <p style="margin:0; color:#2D3748; font-size:14px; line-height:1.7;">
            {rejection_reason}
          </p>
        </div>"""

    body = f"""
    <p style="color:#4A5568; font-size:15px; line-height:1.7; margin:0 0 20px;">
      Hi <strong>{member_name}</strong>,<br/><br/>
      The resolution you submitted for ticket <strong>#{ticket_id}</strong> has been
      reviewed and rejected by the team lead. The ticket has been reassigned to you
      for further work.
    </p>

    {_ticket_info_table(
        _info_row("Ticket ID", f"#{ticket_id}")
        + _info_row("Subject",   subject)
        + _info_row("Status",
                    '<span style="background:#3182CE; color:#fff; '
                    'padding:2px 10px; border-radius:12px; font-size:12px;">ASSIGNED</span>')
    )}

    {reason_block}

    <p style="color:#E53E3E; font-size:13px; font-weight:600; margin:0;">
      Please revisit this ticket and submit a revised resolution.
    </p>
    """

    html = _base_template(
        title=f"Resolution Rejected – Ticket #{ticket_id}",
        headline="Your resolution was rejected",
        body_html=body,
        ticket_id=ticket_id,
    )

    return _send(
        to=to_email,
        subject=f"[Action Required] Resolution Rejected – Ticket #{ticket_id}",
        html=html,
    )