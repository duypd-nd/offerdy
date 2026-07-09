# AI_IMPORT_ENGINE.md

# Offerdy AI Import Engine

## Mission

Automatically import, clean, validate, enrich, and publish data into the existing Offerdy platform.

The AI Import Engine should minimize manual work while maintaining data quality.

Never overwrite valid production data without validation.

---

# Objectives

- Automate merchant imports
- Automate coupon imports
- Automate deal imports
- Improve data quality
- Prevent duplicate content
- Prepare data for AI Content, SEO and GEO

---

# Import Sources

Supported sources include:

- Affiliate APIs
- Affiliate CSV
- Merchant CSV
- Merchant API
- Internal APIs
- Approved Data Feeds
- Manual Upload

Never use unauthorized data sources.

---

# Import Workflow

Data Source

↓

Download Data

↓

Validate File

↓

Normalize Fields

↓

Clean Data

↓

Duplicate Detection

↓

Merchant Matching

↓

Category Matching

↓

AI Enrichment

↓

SEO Generation

↓

GEO Generation

↓

Quality Review

↓

Queue Publish

↓

Done

---

# Merchant Import

For every merchant

Import

- Merchant Name
- Website
- Logo
- Categories
- Country
- Affiliate Information
- Description (if available)

AI generates

- Description
- FAQ
- Buying Guide
- Meta Title
- Meta Description
- Schema
- Internal Links

---

# Coupon Import

Import

- Coupon Code
- Title
- Expiration Date
- Merchant
- Terms
- Affiliate Link
- Category

AI generates

- Description
- Usage Tips
- FAQ
- SEO Metadata

AI validates

- Duplicate Coupons
- Expired Coupons
- Invalid Dates
- Broken Links

---

# Deal Import

Import

- Deal Title
- Price
- Original Price
- Merchant
- Category
- Affiliate Link

AI generates

- Summary
- Highlights
- Pros
- Cons
- Alternative Deals

---

# Duplicate Detection

Check

- Merchant Name
- Merchant Website
- Coupon Code
- Deal Title
- Affiliate Link

If duplicate

↓

Merge

or

Flag for Review

---

# Data Cleaning

Normalize

- Merchant Names
- Categories
- URLs
- Currency
- Country
- Date Format
- Coupon Codes

Remove

- HTML
- Invalid Characters
- Duplicate Spaces
- Broken URLs

---

# AI Validation

Verify

- Required Fields
- Valid URLs
- Valid Dates
- Merchant Exists
- Category Exists
- Affiliate Link Format

Confidence Score

High

↓

Auto Queue

Medium

↓

Review Queue

Low

↓

Manual Review

---

# AI Enrichment

Generate

- Missing Description
- Missing Images (if enabled)
- FAQ
- Buying Guide
- Internal Links
- Schema
- SEO Metadata
- GEO Context

---

# Queue Jobs

- Import Merchant
- Import Coupon
- Import Deal
- Duplicate Scan
- AI Content
- SEO
- GEO
- Image Generation
- Publish Queue

---

# Scheduler

Hourly

- Affiliate Feed Sync

Daily

- Merchant Sync
- Coupon Sync
- Deal Sync

Weekly

- Full Validation
- Duplicate Scan
- Broken Link Scan

Monthly

- Data Cleanup
- Archive Old Data

---

# Error Handling

If import fails

↓

Retry

↓

Log Error

↓

Notify Admin

↓

Move to Failed Queue

Never silently discard data.

---

# Human Review Required

Require approval when

- New Merchant
- Duplicate Conflict
- Missing Affiliate Link
- Invalid Category
- Low AI Confidence
- Suspicious Data

---

# Logging

Record

- Import Time
- Source
- Records Imported
- Records Updated
- Records Failed
- Processing Time

Keep audit logs for troubleshooting.

---

# KPIs

- Import Success Rate
- Duplicate Detection Rate
- AI Enrichment Rate
- Average Processing Time
- Failed Import Rate
- Manual Review Rate

---

# Success Criteria

The AI Import Engine is successful when

- Imports are reliable
- Duplicate data is minimized
- Data quality continuously improves
- AI enrichment is applied automatically
- Publishing requires minimal manual effort
- Import failures are detected and recoverable