# AI_CONTENT_ENGINE.md

# Offerdy AI Content Engine

## Mission

Automatically generate, improve, and maintain high-quality content for the existing Offerdy platform.

Do not overwrite quality human-written content without review.

---

# Objectives

- Reduce manual writing
- Improve SEO
- Improve GEO
- Improve affiliate conversions
- Maintain consistent content quality

---

# Supported Content Types

## Merchant
Generate or improve:
- Description
- Overview
- Key Features
- Pros & Cons
- Buying Guide
- FAQ
- Meta Title
- Meta Description
- Schema Summary

## Coupon
Generate:
- Description
- Terms Summary
- Usage Tips
- FAQ
- SEO Metadata

## Deal
Generate:
- Summary
- Highlights
- Pros & Cons
- Comparison
- Alternative Suggestions

## Category
Generate:
- Introduction
- Buying Tips
- FAQ
- Internal Links

---

# Workflow

Input
    ↓
Validate Existing Content
    ↓
Collect Merchant/Coupon Data
    ↓
Generate Draft
    ↓
SEO Optimization
    ↓
GEO Optimization
    ↓
Quality Review
    ↓
Publish or Request Human Review

---

# AI Quality Checklist

Before publishing verify:

- Accurate information
- No duplicate content
- Natural language
- Clear call-to-action
- SEO-friendly headings
- Relevant internal links
- Helpful FAQ
- Structured content

---

# Triggers

Generate content when:
- New merchant is added
- New coupon is imported
- New deal is created
- Existing content is outdated
- SEO audit detects weaknesses

---

# Queue Jobs

- Merchant content generation
- Coupon content generation
- Deal summaries
- FAQ generation
- Buying guide generation
- Content refresh

---

# Human Review Required

Require approval if:
- AI confidence is low
- Sensitive claims are included
- Existing high-quality content would be replaced

## As implemented (stricter than the rule above)

Nothing is ever published without approval, and existing content is never a candidate in the first place: a record is picked only when its content field is **empty** and `aiReviewStatus == "none"`. Drafts are held in a separate `aiDraft` field and copied into the live fields only on approval, which also puts the record permanently out of scope.

The operator therefore has two ways to stop AI writing for a record — give it content, or move it out of the `"none"` state — and both are reachable from the Excel import. See `PROJECT_CONTEXT.md` → "AI review queue" for the selection rule, the bulk-approval path, and the traps (`store_description` is not the field being checked; schema `initialValue` does not apply to API-created documents).

---

# KPIs

- Time saved
- Content completeness
- SEO score
- GEO readiness
- Organic traffic growth
- Affiliate conversion improvement

---

# Success Criteria

- Consistent content quality
- Minimal manual writing
- SEO and GEO improvements
- Faster publishing workflow
