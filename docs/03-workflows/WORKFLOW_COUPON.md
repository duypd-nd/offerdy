# WORKFLOW_COUPON.md

# Offerdy Coupon Workflow

Version: 1.0

---

# Mission

Manage the complete lifecycle of a Coupon.

Every Coupon should be:

- Accurate
- Up-to-date
- SEO optimized
- GEO optimized
- Affiliate ready
- Easy to discover
- Easy to maintain

Minimize manual work while preserving data quality.

---

# Coupon Lifecycle

Discover Coupon

↓

Import

↓

Validate

↓

Normalize

↓

Duplicate Detection

↓

AI Enhancement

↓

SEO

↓

GEO

↓

Review

↓

Publish

↓

Analytics

↓

Continuous Monitoring

---

# Phase 1

Coupon Discovery

Sources

- Approved Affiliate APIs
- Affiliate CSV
- Merchant APIs
- Internal Import Tools
- Manual Entry

AI Tasks

- Detect Merchant
- Detect Category
- Detect Coupon Type
- Detect Country
- Detect Language

Output

Coupon Candidate

---

# Phase 2

Validation

Verify

Coupon Code

Merchant

Title

Expiration Date

Affiliate Link

Category

Status

Decision

High Confidence

↓

Continue

Medium Confidence

↓

Review Queue

Low Confidence

↓

Manual Review

---

# Phase 3

Normalization

Normalize

Merchant Name

Coupon Code

Date Format

Currency

Country

Category

Coupon Type

Remove

HTML

Duplicate Spaces

Invalid Characters

Tracking Noise

---

# Phase 4

Duplicate Detection

Compare

Coupon Code

Merchant

Title

Affiliate Link

Expiration Date

Decision

Exact Duplicate

↓

Merge

Possible Duplicate

↓

Review Queue

Unique

↓

Continue

---

# Phase 5

AI Content Engine

Generate

Coupon Description

Usage Tips

Terms Summary

FAQ

Benefits

Call To Action

Short Summary

AI Quality Score

---

# Phase 6

SEO Engine

Generate

SEO Title

SEO Description

Schema

Canonical

Internal Links

Breadcrumb

Heading Suggestions

ALT Text (if images exist)

Run SEO Audit

---

# Phase 7

GEO Engine

Generate

Coupon Context

Merchant Context

FAQ

Eligibility Notes

Helpful Summary

Pros

Cons

Related Coupons

Comparison (when appropriate)

---

# Phase 8

Affiliate Engine

Verify

Affiliate Link

Tracking Parameters

Merchant Mapping

Network

Link Status

Conversion Tracking

Never replace affiliate links automatically.

---

# Phase 9

Review Engine

Review

Content

SEO

GEO

Affiliate

Data Quality

Generate

Quality Score

Confidence Score

Recommendations

---

# Phase 10

Publishing

Publish

Coupon Page

Merchant Association

Internal Links

Schema

Search Index

Sitemap

Notify Analytics Engine

---

# Phase 11

Analytics

Track

Views

Clicks

CTR

Conversions

Revenue

Expiration Trends

Top Performing Coupons

Low Performing Coupons

Generate recommendations.

---

# Phase 12

Continuous Monitoring

Daily

Check

Expired Coupons

Broken Affiliate Links

Missing Merchant

Duplicate Coupons

Missing SEO

Missing GEO

Outdated Content

Generate Refresh Queue.

---

# Event Triggers

Coupon Imported

↓

Run Complete Workflow

Coupon Updated

↓

Refresh SEO

↓

Refresh GEO

↓

Refresh Analytics

Merchant Updated

↓

Refresh Associated Coupons

Affiliate Updated

↓

Validate Links

---

# Queue Jobs

Coupon Import

Coupon Validation

Coupon Normalization

Duplicate Detection

AI Content

SEO

GEO

Affiliate Validation

Review

Publish

Analytics

Refresh

---

# Scheduler

Hourly

Affiliate Link Validation

Expiration Check

Daily

SEO Audit

GEO Audit

Coupon Health Scan

Weekly

Duplicate Detection

Content Refresh

Broken Link Scan

Monthly

Archive Expired Coupons

Optimization Report

---

# Error Handling

If a step fails

↓

Retry

↓

Log Error

↓

Notify Admin

↓

Move to Failed Queue

↓

Resume from Failed Step

Never silently discard coupon data.

---

# Human Approval Required

Approval required for

Deleting Coupons

Bulk Publishing

Replacing Affiliate Links

Manual Override

Low AI Confidence

Conflict Resolution

---

# Coupon Health Score

Evaluate

Content

SEO

GEO

Affiliate

Freshness

Performance

Data Quality

Overall Score

0–100

---

# KPIs

Import Success Rate

Duplicate Detection Rate

Expired Coupon Detection Rate

Affiliate Link Accuracy

SEO Score

GEO Score

CTR

Conversion Rate

Revenue

Automation Coverage

Manual Time Saved

---

# Success Criteria

A Coupon is considered complete when

✓ Coupon is validated

✓ Merchant is linked

✓ Affiliate link is verified

✓ AI content is generated

✓ SEO is optimized

✓ GEO is optimized

✓ Schema is valid

✓ Internal links exist

✓ Analytics tracking is enabled

✓ Continuous monitoring is active

The Coupon should remain accurate, discoverable, and optimized throughout its lifecycle with minimal manual intervention.