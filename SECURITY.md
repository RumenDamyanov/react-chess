# Security Policy

## Supported Versions

Until multiple release lines exist, only the latest `main` (and most recent tagged version) receives fixes. After branching, a table will document supported maintenance lines.

## Reporting a Vulnerability

Please use the following responsible disclosure process:

1. Do **not** open a public issue.
2. Email **[security@rumenx.com](mailto:security@rumenx.com)** with subject: `Security: React Chess`.
3. Include:

   - Affected version/commit (or `main` date)
   - Environment (browser, OS)
   - Vulnerability type (e.g., XSS, logic flaw, DoS)
   - Reproduction steps (minimal, deterministic)
   - Expected vs actual impact
   - Proof of concept (benign if possible)
4. (Optional) Mitigation suggestions.

### Report Template

```text
**Summary**: <concise description>
**Type**: <XSS / DoS / Logic / Info disclosure / Other>
**Affected Version**: v1.0.0 (or commit hash)
**Environment**: Browser + OS
**Steps to Reproduce**:
1. ...
2. ...
**Impact**: <what an attacker gains>
**PoC**:
<code / payload>
**Suggested Fix**: <optional>
**Reporter Credit**: <name / anonymous>
```

## Response Timeline (Target SLAs)

| Phase              | Target Window          |
|--------------------|------------------------|
| Acknowledgment     | <= 3 business days     |
| Initial Assessment | <= 5 business days     |
| Fix Development    | Severity-based (see below) |
| Advisory / Release | With fix or mitigation |

## Severity Classification

| Severity  | Examples (indicative, not exhaustive)                          | Target Fix Window |
|-----------|----------------------------------------------------------------|------------------|
| Critical  | Remote code execution, arbitrary file access (if future server) | 1–5 days         |
| High      | Privilege escalation, forced moves altering outcome            | 5–10 days        |
| Medium    | Information disclosure (positions, local settings)             | 10–20 days       |
| Low       | Minor UI leak, non-sensitive timing issue                      | 20–30 days       |

*Note:* Currently the app is client‑only; many server‑class vectors are not applicable yet.

## Disclosure Process

1. Private triage & reproduction.
2. Risk classification & mitigation planning.
3. Development + internal validation.
4. Coordinated release (changelog + optional advisory).
5. Public acknowledgment (unless anonymity requested).

## Non‑Qualifying / Out of Scope

- Self‑XSS requiring manual console pasting.
- Hypothetical issues without realistic exploit path.
- Dependency advisory with no reachable attack surface.
- Denial of service via deliberate extreme user misuse (e.g., editing localStorage to invalid sizes) without broader impact.

## Secure Usage Recommendations

For users embedding or extending React Chess:

- Serve over HTTPS.
- Avoid injecting unsanitized user HTML (the app does not require it).
- Keep dependencies updated (Dependabot configured already).
- Clear localStorage if corruption is suspected.

## Researcher Testing Best Practices

- Use a local clone (no production endpoints).
- Limit automated fuzzing to local environment.
- Avoid exfiltrating unrelated localStorage keys.
- Coordinate before publishing write‑ups.

## Coordinated Disclosure

If you need an embargo for a cross‑project issue, state the requested timeframe (typically 30–90 days is acceptable).

## Credit

We credit reporters by default in the changelog/advisory (handle or name). Request anonymity explicitly to opt out.

---

Thank you for helping keep the project safe.
