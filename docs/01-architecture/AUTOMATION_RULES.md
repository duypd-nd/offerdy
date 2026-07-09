# AUTOMATION_RULES.md

# Offerdy Automation Rules

## Mission
Continuously reduce manual work by introducing safe, maintainable automation.

## Core Principles
- Preserve existing behavior.
- Prefer extending over rewriting.
- Automate repetitive tasks.
- Human approval for destructive/high-risk actions.
- Respect affiliate program APIs and terms.

## Automation Decision Checklist
For every feature ask:
1. Is it repetitive?
2. Can it run on a schedule?
3. Can it be triggered by an event?
4. Can AI assist?
5. Does it improve revenue, SEO, GEO, or data quality?

If YES, design automation before implementation.

## Priorities
High:
- Coupon import
- Coupon expiration checks
- AI content generation
- SEO metadata
- Schema generation
- Internal linking

Medium:
- Social posts
- Email digests
- Image generation
- Analytics summaries

Low:
- Cosmetic updates

## Standard Workflow
Trigger
→ Validate
→ Queue Job
→ Execute
→ Log
→ Retry on failure
→ Notify if needed

## Queue Candidates
- Merchant sync
- Coupon sync
- AI descriptions
- FAQ generation
- GEO optimization
- Image generation
- Analytics reports

## Scheduler Candidates
Hourly:
- Import feeds
- Check expired coupons

Daily:
- SEO audit
- AI analytics
- Affiliate performance

Weekly:
- Broken link scan
- Content refresh

## Human Approval Required
- Deleting records
- Changing affiliate links
- Bulk publishing
- Database migrations
- External API credential changes

## Success Metrics
- Less manual work
- Faster publishing
- Higher content quality
- Stable background jobs
- Better affiliate conversion
