@AGENTS.md
# CLAUDE.md

# ============================================================
# OFFERDY AI BOOTSTRAP
# ============================================================

Version: 4.0

Priority: HIGHEST

Purpose

This file is the bootstrap entry point for Claude Code.

Its responsibility is to initialize the project, load the required context, coordinate AI agents, execute tasks, and keep the project documentation synchronized.

Do not duplicate detailed documentation here.
Detailed rules belong in the documents under the `/docs` directory.

============================================================
# PROJECT
============================================================

Project Name

Offerdy

Mission

Build a world-class AI Commerce Platform.

Core Strategy

- AI First
- Affiliate First
- Automation First
- SEO First
- GEO First
- Enterprise Architecture

Objectives

- Maximize Affiliate Revenue
- Reduce Manual Work
- Build Reliable Automation
- Improve SEO
- Improve GEO
- Improve User Experience
- Maintain Clean Architecture
- Build a Long-Term Scalable Platform

============================================================
# STARTUP PROCEDURE
============================================================

Whenever Claude Code starts a new session, execute the following startup sequence.

STEP 1

Read

AGENTS.md

Understand

- Available AI Agents
- Agent Responsibilities
- Collaboration Model

------------------------------------------------------------

STEP 2

Read

docs/00-governance/AI_CHARTER.md

Understand

- Project Vision
- Mission
- AI Responsibilities
- AI Limitations

------------------------------------------------------------

STEP 3

Read

docs/00-governance/AI_OPERATING_SYSTEM.md

Understand

- Operating Principles
- Decision Process
- Review Process
- Automation Philosophy

------------------------------------------------------------

STEP 4

Read

docs/00-governance/PROJECT_RULES.md

Understand

- Development Rules
- Security Rules
- Architecture Rules
- Automation Rules

------------------------------------------------------------

STEP 5

Read

PROJECT_CONTEXT.md

Understand

- Current Architecture
- Tech Stack
- Completed Features
- Current Sprint
- Current Focus
- Known Issues

------------------------------------------------------------

STEP 6

Read

docs/04-project-management/TODO_SYSTEM.md

Understand

- Task Lifecycle
- Priority Rules
- Status Definitions

------------------------------------------------------------

STEP 7

Read

TODO.md

Identify

- Highest Priority Task
- Current Sprint Tasks
- Pending Work

------------------------------------------------------------

STEP 8

Read

docs/04-project-management/PROGRESS_SYSTEM.md

Understand

- Overall Progress
- Current Milestone
- Completed Systems
- Remaining Systems

------------------------------------------------------------

STEP 9

Load only the required documents.

Architecture

docs/01-architecture/

Workflow

docs/03-workflows/

Engine

docs/02-engines/

Prompt Library

docs/00-governance/PROMPT_LIBRARY.md

Avoid loading unrelated documentation.

============================================================
# WORKING PRINCIPLES
============================================================

Always

- Think before coding.
- Understand the existing implementation first.
- Reuse existing code whenever possible.
- Prefer modular architecture.
- Prefer reusable services.
- Prefer automation.
- Keep documentation synchronized.
- Explain important architectural decisions.
- Protect production stability.

Never

- Invent coupon data.
- Invent affiliate information.
- Invent merchant information.
- Delete production data without approval.
- Break production intentionally.
- Bypass review.
- Ignore documentation updates.

============================================================
# CONTEXT LOADING POLICY
============================================================

Always Load

- CLAUDE.md

Load When Needed

- AGENTS.md
- AI_CHARTER.md
- AI_OPERATING_SYSTEM.md
- PROJECT_RULES.md
- SYSTEM_ARCHITECTURE_AI.md
- Relevant WORKFLOW_*.md
- Relevant AI_*_ENGINE.md
- PROMPT_LIBRARY.md
- PROJECT_CONTEXT.md
- TODO.md
- PROGRESS_SYSTEM.md

Load only what is necessary for the current task.

============================================================
# TASK EXECUTION LIFECYCLE
============================================================

Receive Request

↓

Project Manager analyzes the task

↓

Assign appropriate AI Agents

↓

Load Context

↓

Analyze Existing Code

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

Update Documentation

↓

Update TODO.md

↓

Update PROJECT_CONTEXT.md

↓

Update PROGRESS_SYSTEM.md

↓

Recommend Next Task

============================================================
# DECISION RULES
============================================================

Before writing code ask

- Does similar functionality already exist?
- Can it reuse an existing module?
- Can it become a reusable Service?
- Can it become an AI Engine?
- Can it become a Workflow?
- Can it become an automated process?
- Can it become a Queue?
- Can it become a Background Worker?

Prefer reusable solutions.

============================================================
# AUTOMATION POLICY
============================================================

Whenever manual work is detected ask

- Can AI automate this?
- Can a Queue automate this?
- Can a Scheduler automate this?
- Can a Background Worker automate this?
- Can an Event automate this?

Always prefer automation over repetitive manual work.

============================================================
# DOCUMENTATION RULES
============================================================

Whenever implementation changes

Update

- Relevant Workflow
- Relevant Engine
- Architecture Documentation
- PROJECT_CONTEXT.md
- TODO.md
- PROGRESS_SYSTEM.md

Implementation and documentation must always remain synchronized.

============================================================
# REVIEW POLICY
============================================================

Every completed task must be reviewed for

- Architecture
- Maintainability
- Performance
- Security
- SEO
- GEO
- Affiliate
- Accessibility
- Documentation
- Automation

============================================================
# COMPLETION CHECKLIST
============================================================

A task is complete only when

✓ Implementation completed

✓ Code reviewed

✓ Documentation updated

✓ Related Workflow updated

✓ Related Engine updated

✓ TODO.md updated

✓ PROJECT_CONTEXT.md updated

✓ PROGRESS_SYSTEM.md updated

✓ Future improvements documented

============================================================
# ERROR HANDLING
============================================================

If an error occurs

Retry

↓

Log

↓

Recover

↓

Resume

↓

Document Root Cause

↓

Recommend Improvements

Never silently ignore failures.

============================================================
# CONTINUOUS IMPROVEMENT
============================================================

After every completed task ask

- Can architecture improve?
- Can automation improve?
- Can SEO improve?
- Can GEO improve?
- Can affiliate revenue improve?
- Can user experience improve?
- Can maintainability improve?
- Can technical debt be reduced?

Generate recommendations whenever improvements are identified.

============================================================
# END GOAL
============================================================

Transform Offerdy into a fully automated AI Commerce Platform.

Every completed task should

- Reduce manual work
- Increase automation
- Improve SEO
- Improve GEO
- Improve affiliate revenue
- Improve maintainability
- Improve scalability
- Improve code quality
- Improve documentation quality

Always leave the project in a better state than before.

============================================================

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

Chọn local markdown thay vì GitHub Issues vì: dự án một người, việc đang theo dõi ở
`TODO.md`, repo chưa từng mở issue nào, và `gh` chưa đăng nhập (mọi lệnh `gh` sẽ dừng
ngay). Muốn đổi sang GitHub sau này thì chạy `gh auth login` rồi thay file trên bằng bản
mẫu `issue-tracker-github.md` trong skill `setup-matt-pocock-skills`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Khi hai quy trình mâu thuẫn — cái nào thắng

Tài liệu này mô tả một quy trình (Project Manager → giao vai → cập nhật `TODO.md` /
`PROJECT_CONTEXT.md` / `PROGRESS_SYSTEM.md`). Bộ skill của Matt Pocock mang theo quy
trình riêng (spec → ticket → triage → implement). Chúng chồng lên nhau, nên chốt rõ:

1. **Nguồn sự thật về TIẾN ĐỘ vẫn là `TODO.md` và `PROJECT_CONTEXT.md`.** Việc gì hoàn
   thành thì ghi vào đó, kể cả khi việc đó bắt đầu từ một skill của Matt. Không tách
   nhật ký ra hai nơi — một dự án một người mà hai sổ là chắc chắn lệch.

2. **`PROJECT_CONTEXT.md` giữ nguyên vai trò**: kiến trúc thật, quyết định đã chốt, cạm
   bẫy đã gặp. `CONTEXT.md` (nếu sau này được tạo) **chỉ chứa từ vựng nghiệp vụ** —
   định nghĩa "offer" khác "deal" khác "coupon" thế nào. Hai file, hai việc, đừng gộp.

3. **Skill của Matt là công cụ, không phải nghĩa vụ.** Dùng `/diagnosing-bugs` khi có
   lỗi khó, `/handoff` khi kết phiên, `/tdd` khi viết logic thuần. Không bắt mọi việc
   phải đi qua spec → ticket → triage; dự án này một người làm, chi phí thủ tục đó lớn
   hơn lợi ích.

4. **`/code-review` có HAI bản** (bản dựng sẵn của Claude Code và bản của Matt). Bản của
   Matt chấm theo hai trục (chuẩn code + đúng spec) và cần một mốc so sánh; bản dựng sẵn
   soi diff đang làm dở. Nêu rõ đang gọi bản nào khi dùng.

5. **Trước khi commit vẫn phải `npm test`** (72 assertion) — điều này không skill nào
   thay thế được.