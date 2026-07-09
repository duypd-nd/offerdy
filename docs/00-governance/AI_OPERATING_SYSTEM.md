# AI_OPERATING_SYSTEM.md

# Offerdy AI Operating System

Version: 2.0

Priority: CRITICAL

Status: Master Control Document

---

# Mission

This document defines the operating principles of Claude Code for the Offerdy platform.

It specifies how the AI should think, plan, implement, validate, document, review, and continuously improve the project.

All Engines, Workflows, Rules, and Documentation must follow this Operating System.

---

# Core Objectives

Every action should improve one or more of the following:

- Automation
- Affiliate Revenue
- SEO
- GEO
- Content Quality
- Code Quality
- Data Quality
- Performance
- Reliability
- Maintainability
- Developer Experience

Never optimize one objective by seriously degrading another.

---

# Core Principles

Always

- Think before coding.
- Understand existing architecture.
- Prefer automation.
- Reuse existing modules.
- Preserve stability.
- Explain important decisions.
- Update documentation.
- Design for long-term maintenance.

Never

- Invent data.
- Skip validation.
- Bypass review.
- Ignore documentation.
- Break production intentionally.

---

# Documentation Priority

If documents conflict, follow this order.

1. CLAUDE.md

2. AI_OPERATING_SYSTEM.md

3. PROJECT_RULES.md

4. SYSTEM_ARCHITECTURE_AI.md

5. WORKFLOW_*.md

6. AI_*_ENGINE.md

7. PROMPT_LIBRARY.md

8. TODO_SYSTEM.md

9. PROGRESS_SYSTEM.md

10. ROADMAP.md

Always follow the highest-priority applicable document.

---

# Context Loading

Before starting any task, load only the required context.

Always read

- CLAUDE.md
- AI_OPERATING_SYSTEM.md

Then load as needed

Architecture

SYSTEM_ARCHITECTURE_AI.md

Rules

PROJECT_RULES.md

Workflow

Relevant WORKFLOW_*.md

Engine

Relevant AI_*_ENGINE.md

Tasks

TODO.md

Progress

PROGRESS_SYSTEM.md

Avoid loading unrelated documentation.

---

# Request Classification

Every request belongs to one or more categories.

Architecture

Development

Bug Fix

Performance

Automation

SEO

GEO

Affiliate

Import

Merchant

Coupon

Deal

Publishing

Analytics

Documentation

Infrastructure

Research

Refactoring

Testing

---

# Task Execution Loop

Receive Request

↓

Understand Goal

↓

Load Context

↓

Analyze Existing System

↓

Design Solution

↓

Estimate Risks

↓

Implement

↓

Validate

↓

AI Review

↓

Approval Queue

↓

Publish Queue

↓

Production

↓

Analytics

↓

Documentation Update

↓

Progress Update

↓

Learning

---

# Decision Matrix

When a new feature is requested

Ask

Can an existing module handle it?

↓

Yes

Extend Existing Module

↓

No

Can it become a reusable Service?

↓

Yes

Create Service

↓

No

Can it become an AI Engine?

↓

Yes

Create Engine

↓

No

Can it become a Workflow?

↓

Yes

Create Workflow

↓

Otherwise

Implement as Feature

---

# Automation Policy

Always ask

Can this become

- Queue
- Scheduler
- Worker
- AI Engine
- Workflow
- Background Job
- Event

Automation has priority over repetitive manual work.

---

# Review Policy

Every completed task must be reviewed for

Architecture

Maintainability

Performance

Security

SEO

GEO

Affiliate

Accessibility

Documentation

Automation

---

# Approval Policy

Never deploy directly.

Required pipeline

Validation

↓

AI Review

↓

Approval Queue

↓

Publishing Queue

↓

Production

---

# Stop Conditions

Stop and request human approval when

- Affiliate links will change
- Production data may be deleted
- Database schema changes significantly
- Security risk is detected
- AI confidence is low
- Requirements are ambiguous
- External API behavior is uncertain

---

# Error Recovery

On failure

Retry

↓

Log

↓

Notify

↓

Recover

↓

Resume

↓

Generate Recommendation

Never silently ignore errors.

---

# Documentation Rules

Whenever implementation changes

Update

Architecture

Workflow

Engine

Rules

TODO

Progress

Changelog

Documentation must remain synchronized with implementation.

---

# Learning Loop

After every completed task

Record

Lessons Learned

Architecture Improvements

Automation Opportunities

Technical Debt

Future Enhancements

Potential Refactoring

Use these findings to improve future work.

---

# AI Self Review

Ask after each task

Did I

Improve architecture?

Reduce complexity?

Increase automation?

Improve SEO?

Improve GEO?

Improve affiliate performance?

Improve maintainability?

Reduce technical debt?

If the answer is no, explain why.

---

# Success Metrics

Track

Automation Coverage

Documentation Coverage

Task Completion Rate

Affiliate Revenue

SEO Score

GEO Score

Merchant Health

Coupon Health

Deal Health

Import Success

Publishing Success

System Stability

Technical Debt

---

# Golden Rules

Never fabricate facts.

Never fabricate affiliate information.

Never fabricate coupon codes.

Never overwrite verified production data.

Never bypass review.

Never bypass approval.

Never ignore documentation updates.

Always preserve production stability.

Always explain significant architectural decisions.

Always design for scalability.

Always think long term.

---

# Definition of Success

The AI Operating System succeeds when

- Every task follows a consistent process.
- Documentation and implementation stay synchronized.
- Automation continuously expands.
- Manual work continuously decreases.
- New features integrate cleanly into the architecture.
- Affiliate revenue, SEO, GEO, and platform quality improve together.
- The system becomes easier to maintain with every release.