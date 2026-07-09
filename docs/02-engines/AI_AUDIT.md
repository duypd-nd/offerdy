# AI_AUDIT.md

# Offerdy AI Audit Specification

## Mission
Your mission is NOT to rebuild Offerdy.

Your mission is to understand the existing project completely and identify every opportunity to enhance it with AI and automation while preserving the current architecture.

## Rules

- Read the entire project before making any code changes.
- Do not refactor or rewrite modules during the audit.
- Preserve backward compatibility.
- Document findings before proposing implementations.
- Think like an Enterprise Software Architect.

## Audit Scope

Inspect and document:

### 1. Project Architecture
- Frameworks
- Folder structure
- Services
- Dependency injection
- Packages
- Build process

### 2. Database
- ER diagram
- Tables
- Relationships
- Indexes
- Performance risks
- Duplicate data

### 3. Core Modules
Review:
- Merchant
- Coupon
- Deal
- Category
- Search
- User
- Admin Panel
- Affiliate
- Analytics

For every module answer:
- What does it do?
- Current workflow
- Manual steps
- AI opportunities
- Automation opportunities
- SEO opportunities
- GEO opportunities
- Revenue opportunities
- Risks

### 4. APIs
Document:
- Internal APIs
- External APIs
- Authentication
- Rate limits
- Missing integrations

### 5. Scheduled Jobs
List:
- Cron jobs
- Queues
- Background workers
- Manual jobs that should become scheduled

### 6. SEO Audit
Check:
- Meta tags
- Canonical
- Robots
- Sitemap
- Structured Data
- Breadcrumb
- Internal links
- Image ALT
- Heading structure
- Duplicate content

### 7. GEO Audit
Check whether pages provide:
- Merchant context
- Brand knowledge
- FAQ
- Comparisons
- Pros & Cons
- Structured data
- Helpful summaries

### 8. Affiliate Audit
Review:
- Affiliate networks
- Tracking links
- Click tracking
- Commission flow
- Missing automation

### 9. AI Opportunity Audit
For every repetitive task determine:
- Can AI generate it?
- Can AI improve it?
- Can AI review it?
- Can AI automate it?

Priority:
Critical / High / Medium / Low

### 10. Automation Audit
Find every manual process and describe:
Current workflow
Future automated workflow
Expected time saved
Estimated implementation complexity

## Deliverables

Generate:

- docs/AI_AUDIT_REPORT.md
- docs/AI_OPPORTUNITIES.md
- docs/AUTOMATION_REPORT.md
- docs/TECHNICAL_DEBT.md
- docs/AI_ROADMAP.md

## Output Format

For every finding include:

Title
Current State
Problem
Business Impact
AI Solution
Automation Solution
Priority
Estimated Effort
Dependencies

## Success Criteria

The audit is complete only when:
- Every major module has been reviewed.
- Every manual workflow has been identified.
- AI opportunities are prioritized.
- Automation opportunities are prioritized.
- No production code has been modified during the audit.
