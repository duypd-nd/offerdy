# WORKFLOW_PUBLISH.md

# Offerdy Publishing Workflow

Version: 1.0

---

# Mission

Safely publish high-quality content to the Offerdy platform.

Every published item must pass quality validation, SEO, GEO, affiliate verification, and review before becoming publicly accessible.

Never publish incomplete or low-confidence content automatically.

---

# Supported Content Types

- Merchant
- Coupon
- Deal
- Category
- Blog
- Buying Guide
- Comparison Page
- Landing Page

---

# Publishing Lifecycle

Ready for Publish

↓

Validation

↓

Quality Review

↓

SEO Validation

↓

GEO Validation

↓

Affiliate Validation

↓

Image Validation

↓

Technical Validation

↓

Queue Publish

↓

Publish

↓

Search Index Update

↓

Analytics

↓

Monitoring

---

# Phase 1

Publishing Eligibility

Verify

Content Exists

Required Fields Complete

AI Confidence

Status

Review Passed

Approval Status

Decision

Eligible

↓

Continue

Not Eligible

↓

Return to Review Queue

---

# Phase 2

Content Validation

Check

Title

Description

Summary

FAQ

Internal Links

Grammar

Duplicate Content

Readability

Call To Action

Generate

Content Quality Score

---

# Phase 3

SEO Validation

Verify

Meta Title

Meta Description

Canonical

Heading Structure

Schema

Breadcrumb

Image ALT

Internal Links

Sitemap Status

Generate

SEO Score

---

# Phase 4

GEO Validation

Verify

Entity Coverage

Merchant Context

Comparison

FAQ

Pros

Cons

Helpful Summary

AI Readability

Structured Content

Generate

GEO Score

---

# Phase 5

Affiliate Validation

Verify

Affiliate Link

Merchant Mapping

Tracking Parameters

Commission Settings

API Status

Broken Link Check

Never publish broken affiliate links.

---

# Phase 6

Image Validation

Verify

Hero Image

Open Graph Image

Social Images

Responsive Sizes

Compression

WebP

ALT Text

Brand Consistency

Generate

Image Quality Score

---

# Phase 7

Technical Validation

Verify

URL

Slug

Canonical

HTTP Status

Structured Data

Database Integrity

Queue Status

API Status

Cache Readiness

---

# Phase 8

Review Engine

Collect

Content Score

SEO Score

GEO Score

Affiliate Score

Image Score

Technical Score

Overall Quality Score

Confidence Score

Recommendations

---

# Phase 9

Publishing Queue

Queue

Merchant

Coupon

Deal

Category

Blog

Priority Levels

Critical

High

Normal

Low

Workers should publish in priority order.

---

# Phase 10

Publishing

Publish

Content

Schema

Metadata

Images

Internal Links

Sitemap

Search Index

Cache

Notify

Analytics Engine

Daily Report Engine

---

# Phase 11

Post-Publish Monitoring

Immediately Check

Page Availability

HTTP Status

Affiliate Link

Images

Schema

Internal Links

Metadata

Queue Health

Retry failed post-publish checks automatically.

---

# Phase 12

Analytics

Track

Views

Clicks

CTR

Conversions

Revenue

Index Status

Search Performance

AI Citation Opportunities

Generate optimization recommendations.

---

# Rollback Strategy

If critical issues are detected

↓

Unpublish (if configured)

or

Rollback to Previous Version

↓

Notify Administrator

↓

Create Incident Report

Never leave broken content in production without alerting.

---

# Event Triggers

Merchant Ready

↓

Publish Workflow

Coupon Ready

↓

Publish Workflow

Deal Ready

↓

Publish Workflow

Manual Publish Request

↓

Publish Workflow

Scheduled Publish

↓

Publish Workflow

---

# Queue Jobs

Publish Validation

SEO Validation

GEO Validation

Affiliate Validation

Image Validation

Technical Validation

Publishing

Post-Publish Audit

Analytics Update

Notification

---

# Scheduler

Every 5 Minutes

Process Publish Queue

Hourly

Post-Publish Health Check

Daily

Publishing Audit

Weekly

Broken Content Scan

Monthly

Publishing Performance Report

---

# Human Approval Required

Approval required for

Homepage Changes

Landing Pages

Bulk Publishing

Bulk Unpublishing

Affiliate Link Replacement

Critical Content

Low AI Confidence

---

# Notifications

Notify when

Publishing succeeds

Publishing fails

Rollback occurs

Affiliate validation fails

Schema validation fails

Critical SEO issues detected

Critical GEO issues detected

---

# Logging

Record

Publish Time

Published By

AI Confidence

Version

Queue Duration

Processing Time

Validation Results

Rollback Status

---

# KPIs

Publish Success Rate

Rollback Rate

Validation Success Rate

Average Publish Time

SEO Compliance

GEO Compliance

Affiliate Integrity

Automation Coverage

---

# Success Criteria

Publishing is successful when

✓ All validations pass

✓ Quality score meets threshold

✓ SEO is complete

✓ GEO is complete

✓ Affiliate links are verified

✓ Images are optimized

✓ Technical checks pass

✓ Analytics is enabled

✓ Monitoring begins immediately

The publishing pipeline should ensure that every public page is reliable, optimized, and production-ready while minimizing manual intervention.