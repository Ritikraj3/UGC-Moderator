# §16 Security

> Source: HLD §16.

**Internal host only.** `checkInternalHost` — the request must arrive on `ai-api.internal.learnyst.com`. Same guard
as ai-ingest. No token; network origin is the control.

**The callback is authenticated too.** ai-server posts to its configured `RAILS_INTERNAL_URL` carrying a shared
service token, the same shape as the ai-ingest worker webhooks. Rails verifies the token and checks `request_id`
against a row it created. An unknown `request_id` is dropped.

There is no caller-supplied callback address, so there is no URL for an attacker to point elsewhere.

**Word matching runs server-side, never in the client.** Three learner apps would mean three implementations, and
the list would be readable in devtools.

**ai-server stores no learner content.** A queued check's payload lives in Redis inside the VPC for seconds;
Firestore holds numbers only.

Academy scoping is Rails' job.

Content goes to Vertex AI in Learnyst's own GCP project.
