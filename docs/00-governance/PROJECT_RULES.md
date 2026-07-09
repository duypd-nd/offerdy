# PROJECT_RULES.md

# Offerdy Project Rules

Version: 1.0

---

# Mission

These rules define how Claude Code should work on the Offerdy project.

Every implementation should improve the platform while preserving stability, maintainability, and automation.

These rules apply to all AI modules, workflows, and future development.

---

# Core Principles

Always prioritize

- Stability
- Simplicity
- Maintainability
- Automation
- Scalability
- Reusability
- Security
- Observability

Never optimize one area by significantly degrading another.

---

# Project Goals

The platform should become

- AI First
- Affiliate First
- Automation First
- SEO First
- GEO First
- Enterprise Ready

Every completed task should support at least one of these goals.

---

# General Rules

Claude Code must

- Understand existing code before modifying it.
- Preserve working functionality.
- Prefer extending existing modules over rewriting them.
- Keep changes small and reviewable.
- Document significant architectural decisions.
- Avoid introducing unnecessary dependencies.

---

# Development Rules

Before writing code

- Understand the request.
- Search for existing implementations.
- Reuse existing services when appropriate.
- Identify possible side effects.
- Estimate implementation impact.

After writing code

- Review the implementation.
- Check for duplicated logic.
- Check for performance issues.
- Update relevant documentation.
- Suggest future improvements when useful.

---

# Architecture Rules

Prefer

- Modular architecture
- Service-oriented design
- Event-driven workflows
- Queue-based processing
- Background jobs
- Loose coupling
- High cohesion

Avoid

- Circular dependencies
- Large utility files
- Business logic in controllers
- Duplicate business rules

---

# AI Rules

AI should

- Explain important decisions.
- Avoid making unsupported assumptions.
- Never invent affiliate data.
- Never invent coupon codes.
- Never invent merchant information.
- Prefer deterministic outputs when possible.
- Use confidence scores for uncertain results.

---

# Automation Rules

Before recommending manual work ask

Can this process be automated?

If yes

Design the automation first.

If not

Document why automation is not appropriate.

---

# SEO Rules

Every public page should include

- Optimized title
- Optimized description
- Structured headings
- Internal links
- Valid schema
- Image ALT text
- Canonical URL

Avoid keyword stuffing.

---

# GEO Rules

Every public page should provide

- Clear entity context
- Helpful summaries
- FAQ
- Pros & Cons
- Comparison content (when appropriate)
- Structured information
- AI-readable formatting

---

# Affiliate Rules

Never

- Replace working affiliate links automatically.
- Invent commissions.
- Assume affiliate availability.

Always

- Validate links.
- Preserve tracking parameters.
- Monitor link health.

---

# Data Rules

Always

- Validate imported data.
- Normalize formats.
- Detect duplicates.
- Keep audit logs.

Never discard imported records silently.

---

# Publishing Rules

Every publishing request must pass

Validation

↓

AI Review

↓

Approval Queue

↓

Publishing Queue

↓

Production

Never bypass the publishing workflow without explicit approval.

---

# Error Handling Rules

If an error occurs

Retry

↓

Log

↓

Notify

↓

Recover

↓

Resume

Do not silently ignore failures.

---

# Performance Rules

Prefer

- Background processing
- Caching
- Incremental updates
- Efficient queries
- Batch operations when appropriate

Avoid unnecessary processing.

---

# Security Rules

Protect

- API credentials
- Secrets
- Tokens
- User data

Validate

- Inputs
- Permissions
- File uploads

Never expose sensitive information in logs.

---

# Documentation Rules

Whenever architecture changes

Update

- SYSTEM_ARCHITECTURE_AI.md
- Relevant Workflow
- Relevant Engine
- Changelog (if maintained)

Documentation should evolve with the code.

---

# Code Quality Rules

Code should be

- Readable
- Testable
- Reusable
- Consistent
- Well documented

Remove duplicate logic whenever practical.

---

# Decision Rules

When multiple solutions exist

Compare

- Complexity
- Maintainability
- Performance
- Scalability
- Risk

Recommend the option with the best long-term value.

---

# Completion Checklist

Before marking a task complete verify

✓ Functionality works

✓ Existing features remain stable

✓ Documentation updated

✓ SEO impact reviewed

✓ GEO impact reviewed

✓ Affiliate impact reviewed

✓ Automation opportunities considered

✓ Logging added where appropriate

✓ Error handling implemented

---

# Continuous Improvement

After every completed task ask

- Can this be automated?
- Can the architecture be simplified?
- Can performance improve?
- Can SEO improve?
- Can GEO improve?
- Can affiliate revenue increase?
- Can maintenance effort decrease?

Document worthwhile recommendations.

---

# Success Criteria

The project is successful when

- Manual work continuously decreases.
- Automation continuously increases.
- Affiliate revenue grows sustainably.
- SEO and GEO quality improve.
- The architecture remains maintainable.
- New contributors can understand the system quickly.
- Production stability is preserved.