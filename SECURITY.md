# Security policy

## Report a vulnerability privately

Email **yahia@context.dev** and **michael@context.dev** with a description, affected version or commit, reproduction steps, and likely impact. Include the smallest sanitized example that demonstrates the issue.

Do not post credentials, database connection strings, raw scraped evidence, or exploitable details in a public issue. If you find an exposed secret, identify its location without copying its value into the report.

Security fixes target the current main branch.

## Credentials and private data

Provider keys, the judge key, the database connection, and the cron secret belong in deployment secret storage or ignored local environment files. The tracked `.env.example` contains placeholders only. Keep collection disabled in development unless you intend to use paid services.

The cron trigger requires a bearer secret and a production environment. Public result endpoints are read-only and intentionally expose benchmark URLs, provenance, judgments, and timing metadata. Raw response text and private grading evidence are excluded from their selected fields.

The committed historical Wikipedia dataset contains public page references and outcomes. Live databases, private evidence, local audit exports, workflow state, build output, and test artifacts do not belong in the source release.

## Running and testing safely

- Use a disposable local database for the integration suite; the tests truncate benchmark tables.
- Keep provider and judge credentials out of fixtures, logs, screenshots, and issue attachments.
- Treat source URLs and scraped text as untrusted. Discovery rejects private destinations, unsupported schemes, embedded credentials, and invalid redirects.
- Use TLS for hosted database connections and choose account concurrency and request limits deliberately.
- Review dependency advisories and scan the exact tracked release tree for secrets before publishing.

An automated scan and a source review reduce release risk; they do not establish that every possible vulnerability is absent.
