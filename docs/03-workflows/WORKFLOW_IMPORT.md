# WORKFLOW_IMPORT.md

# Offerdy Import Workflow

Version: 1.0

---

# Mission

Create a fully automated, reliable, and scalable import pipeline.

Every imported record should be:

- Valid
- Clean
- Normalized
- AI Enhanced
- SEO Ready
- GEO Ready
- Affiliate Ready

Never publish raw imported data directly.

---

# Import Sources

Supported Sources

- Affiliate APIs
- Merchant APIs
- Product Feeds
- CSV Files
- XML Feeds
- JSON Feeds
- Internal APIs
- Manual Upload

Only use approved and authorized data sources.

---

# Import Lifecycle

Receive Source

↓

Validate Source

↓

Download

↓

Parse

↓

Normalize

↓

Validate Data

↓

Duplicate Detection

↓

AI Enrichment

↓

SEO

↓

GEO

↓

Images

↓

Affiliate

↓

Review

↓

Queue Publish

↓

Analytics

↓

Health Check

---

# Phase 1

Source Validation

Verify

- Source Type
- Authentication
- API Availability
- CSV Structure
- XML Format
- JSON Schema
- File Size
- Encoding

Reject unsupported or malformed sources.

---

# Phase 2

Download

Supported

API

CSV

XML

JSON

Manual Upload

Record

Download Time

Source

Version

Checksum (if available)

---

# Phase 3

Parsing

Extract

Merchant

Coupon

Deal

Category

Affiliate Data

Images

Metadata

Unknown fields should be logged, not discarded silently.

---

# Phase 4

Normalization

Normalize

Merchant Names

Categories

Currencies

Countries

Languages

URLs

Coupon Codes

Dates

Prices

Remove

HTML

Tracking Noise

Duplicate Spaces

Invalid Characters

Broken URLs

---

# Phase 5

Validation

Check

Required Fields

Valid URLs

Merchant Exists

Category Exists

Date Format

Currency

Affiliate Link Format

Confidence Levels

High

↓

Continue

Medium

↓

Review Queue

Low

↓

Manual Review

---

# Phase 6

Duplicate Detection

Compare

Merchant

Coupon

Deal

Affiliate Link

Product

Website

Decision

Duplicate

↓

Merge

Possible Duplicate

↓

Review Queue

Unique

↓

Continue

---

# Phase 7

AI Enrichment

Generate

Descriptions

FAQ

Buying Guide

Summary

Pros

Cons

SEO Metadata

Schema

Internal Links

Helpful Summaries

---

# Phase 8

SEO Engine

Generate

Meta Title

Meta Description

Schema

Canonical

Heading Suggestions

Internal Links

Breadcrumb

Run SEO Audit

---

# Phase 9

GEO Engine

Generate

Merchant Context

Entity Relationships

FAQ

Comparison

Pros & Cons

Helpful Summary

AI Readability

---

# Phase 10

Image Engine

Generate

Hero Images

OG Images

Social Images

Responsive Images

ALT Text

Optimize

Compression

WebP

---

# Phase 11

Affiliate Engine

Validate

Affiliate Link

Merchant Mapping

Network

Tracking Parameters

Commission Data

Never replace affiliate links automatically.

---

# Phase 12

Review Engine

Review

Import Quality

Content Quality

SEO

GEO

Affiliate

Images

Data Integrity

Generate

Quality Score

Confidence Score

Recommendations

---

# Phase 13

Publishing

Queue

Merchant

Coupon

Deal

Category

Publishing

Update

Search Index

Sitemap

Notify Analytics

---

# Phase 14

Analytics

Track

Imported Records

Failed Imports

Duplicate Rate

Processing Time

Queue Time

Publish Success

Generate recommendations for optimization.

---

# Error Handling

If any step fails

↓

Retry

↓

Log Error

↓

Retry Policy

↓

Move to Failed Queue

↓

Notify Admin

↓

Resume Processing

Never discard records silently.

---

# Queue Jobs

Source Download

Parser

Validation

Duplicate Detection

AI Content

SEO

GEO

Images

Affiliate Validation

Publishing

Analytics

Health Check

---

# Scheduler

Hourly

API Sync

Feed Sync

Daily

Merchant Sync

Coupon Sync

Deal Sync

Broken Link Scan

Weekly

Duplicate Detection

Content Refresh

Image Optimization

Monthly

Database Cleanup

Archive Old Records

Import Performance Report

---

# Human Approval Required

Required for

New Data Source

Schema Changes

Bulk Publishing

Affiliate Link Replacement

Low AI Confidence

Manual Overrides

---

# Logging

Record

Source

Import Time

Duration

Records Imported

Records Updated

Records Rejected

Errors

Warnings

Queue Status

AI Confidence

---

# KPIs

Import Success Rate

Validation Accuracy

Duplicate Detection Rate

AI Enrichment Rate

Average Processing Time

Publish Success Rate

Manual Review Rate

Automation Coverage

---

# Success Criteria

An import is considered successful when

✓ Source is validated

✓ Data is normalized

✓ Duplicates are handled

✓ AI enrichment is complete

✓ SEO is generated

✓ GEO is generated

✓ Affiliate data is verified

✓ Images are processed

✓ Review passes

✓ Records are published safely

✓ Analytics tracking is enabled

The import pipeline should be reliable, recoverable, observable, and require minimal manual intervention.