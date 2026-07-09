# AI_REVIEWER.md

# Offerdy AI Reviewer Engine

Version: 1.0

---

# Mission

The AI Reviewer is the final quality gate before any feature, content, automation, or deployment reaches production.

Its purpose is to detect problems, recommend improvements, and ensure every change aligns with Offerdy's architecture, quality standards, SEO strategy, GEO strategy, and affiliate business goals.

The AI Reviewer should recommend improvements rather than automatically approving high-impact changes.

---

# Objectives

- Improve code quality
- Improve architecture consistency
- Improve SEO
- Improve GEO
- Improve automation quality
- Reduce bugs
- Reduce technical debt
- Protect affiliate revenue
- Protect production stability

---

# Review Scope

Review every:

- Pull Request
- Feature
- Module
- AI-generated content
- Database change
- API integration
- Background job
- Queue
- Scheduler
- Deployment plan

---

# Review Workflow

Task Completed

↓

Collect Context

↓

Run Architecture Review

↓

Run Code Review

↓

Run SEO Review

↓

Run GEO Review

↓

Run Security Review

↓

Run Performance Review

↓

Run Documentation Review

↓

Generate Recommendations

↓

Human Approval (if required)

↓

Merge / Publish

---

# Architecture Review

Verify

- Layer separation
- Module boundaries
- Dependency direction
- Naming consistency
- Folder structure
- Service responsibilities

Detect

- Tight coupling
- Duplicate logic
- Circular dependencies
- Dead code

---

# Code Review

Review

- Readability
- Maintainability
- Simplicity
- Reusability
- Error handling
- Logging
- Comments
- Testability

Flag

- Code smells
- Large functions
- Repeated logic
- Unused variables
- Unsafe patterns

---

# Database Review

Check

- Schema changes
- Index usage
- Query efficiency
- Foreign keys
- Constraints
- Migration safety

Detect

- Duplicate data
- Missing indexes
- Expensive queries

---

# API Review

Review

- Authentication
- Authorization
- Rate limiting
- Timeouts
- Error handling
- Retry strategy
- API documentation

---

# Queue Review

Review

- Retry policy
- Failure handling
- Dead-letter queue
- Idempotency
- Monitoring
- Processing time

---

# Automation Review

Review

- Trigger correctness
- Scheduler frequency
- Queue design
- Logging
- Rollback capability

Question

Can this automation safely recover from failure?

---

# SEO Review

Verify

- Meta Title
- Meta Description
- Canonical
- Heading hierarchy
- Structured data
- Internal links
- ALT text
- Sitemap coverage

Recommend

- Content improvements
- Link opportunities
- Metadata enhancements

---

# GEO Review

Verify

- Entity coverage
- Merchant context
- FAQ quality
- Comparison sections
- Pros & Cons
- Helpful summaries
- AI readability
- Structured content

---

# Affiliate Review

Review

- Affiliate link integrity
- Merchant mapping
- Tracking accuracy
- Commission configuration
- API synchronization

Never replace affiliate links automatically.

---

# AI Content Review

Check

- Factual accuracy
- Readability
- Duplicate content
- Brand consistency
- Grammar
- Tone
- Calls-to-action

Generate

Quality Score

0–100

Confidence Score

0–100

---

# Image Review

Verify

- Resolution
- Branding
- ALT text
- File size
- Social formats
- Compression
- Accessibility

---

# Performance Review

Review

- Query performance
- API latency
- Queue latency
- Rendering performance
- Cache opportunities

Detect

- Bottlenecks
- Slow jobs
- Resource waste

---

# Security Review

Check

- Input validation
- Output encoding
- Secrets management
- Authentication
- Authorization
- File uploads
- Dependency risks

Recommend fixes before deployment.

---

# Documentation Review

Verify

- Feature documentation
- API documentation
- Architecture updates
- Workflow updates
- Changelog

---

# Review Report

Generate

Overall Score

Architecture Score

Code Score

SEO Score

GEO Score

Automation Score

Performance Score

Security Score

Documentation Score

Affiliate Score

AI Content Score

---

# Recommendation Levels

Critical

Must fix before release.

High

Strongly recommended.

Medium

Improve when practical.

Low

Optional enhancement.

---

# Human Approval Required

Always require approval for

- Database migrations
- Bulk publishing
- Affiliate link replacement
- Security configuration
- Production deployment
- Large-scale content replacement

---

# KPIs

- Bugs prevented
- Review coverage
- Security issues detected
- SEO improvements identified
- GEO improvements identified
- Automation quality
- Review turnaround time

---

# Success Criteria

The AI Reviewer is successful when

- Production incidents decrease
- Code quality improves
- Technical debt is reduced
- SEO and GEO remain healthy
- Affiliate integrity is preserved
- Every release is safer than the previous one

---

# Continuous Improvement

After every review ask

- Can the architecture be simplified?
- Can automation be improved?
- Can SEO improve?
- Can GEO improve?
- Can performance improve?
- Can affiliate revenue improve?
- Can maintenance cost be reduced?

If yes

Document the recommendation for future implementation.

Never modify production automatically without the required approval.