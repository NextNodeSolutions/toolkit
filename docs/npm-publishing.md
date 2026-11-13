# Configure npm publishing

The npm scope owner performs these steps. They authorize future CI releases, not a publish from this machine.

## Before changing trust

Wait for a successful infrastructure canary publish that proves npm accepts the infrastructure workflow with the consumer repository identity. Confirm the result with the pipeline owner. A green build or an npm dry run does not prove publishing permission.

Keep the versions already published on npm in the migration manifests. Authorize no new package version until its toolkit trust is configured. Ask the person to coordinate the old core release path before changing trust.

Use `npm trust --help` to check the installed CLI requirements. Sign in interactively as a package maintainer with account-level 2FA. Never put a password, token or one-time code in a script or chat.

## Inspect existing trust

```sh
npm trust list @nextnode-solutions/standards
npm trust list @nextnode-solutions/logger
npm trust list @nextnode-solutions/email-manager
npm trust list @nextnode-solutions/brand-assets
```

npm permits one trusted publisher per package. Creating a new one fails if one already exists. To replace one, record its ID and configuration, then revoke that specific entry before creating toolkit's trust:

```sh
npm trust revoke PACKAGE --id=EXISTING_TRUST_ID
```

Revoking an entry removes that entry's OIDC publishing permission. It does not revoke an npm token held by core. Core's release workflow uses a token, so changing trust alone does not stop that release path. Retiring its releases is a separate, explicitly authorized operation. This migration changes neither core nor its credentials.

## Authorize toolkit per package

```sh
npm trust github @nextnode-solutions/standards --file deploy.yml --repo NextNodeSolutions/toolkit --allow-publish -y
npm trust github @nextnode-solutions/logger --file deploy.yml --repo NextNodeSolutions/toolkit --allow-publish -y
npm trust github @nextnode-solutions/email-manager --file deploy.yml --repo NextNodeSolutions/toolkit --allow-publish -y
npm trust github @nextnode-solutions/brand-assets --file deploy.yml --repo NextNodeSolutions/toolkit --allow-publish -y
```

Use the workflow filename, not its full path. These commands match the infrastructure pipeline owner's proposed trust configuration. The canary must establish that npm accepts that cross-repository workflow identity before this becomes a proven release path.

Run the trust-list commands again and verify the repository, workflow and publish permission. Report success per package to the migration coordinator. Do not configure worker-types here, since it stays with core's old pipeline until its consumers migrate.

## First authorized release

Follow the version and deployment flow in the [README](../README.md#release-a-package). Verify the exact published version on npm and install it in an isolated consumer before recording a release as complete. Inspect its provenance attestation as part of that approval. A failed deployment may have published some packages already, so check each registry version before retrying.

If npm rejects the identity, stop and report the failed operation. Adding a token or another publishing workflow requires a separate human decision.
