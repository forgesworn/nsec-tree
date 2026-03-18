# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in nsec-tree, please report it responsibly.

**Email:** security@forgesworn.dev

Please include:
- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Any suggested fix

We will acknowledge receipt within 48 hours and aim to release a fix within 7 days of confirmation.

## Scope

nsec-tree is a cryptographic key derivation library. Security-relevant issues include:

- Key material leakage (secrets accessible outside intended API)
- Derivation collisions (different inputs producing the same key)
- Linkage attacks (deriving the master identity from child identities)
- Zeroisation failures (secret material persisting in memory after destroy/zeroise)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Responsible Disclosure

We follow coordinated disclosure. Please do not open public issues for security vulnerabilities.
