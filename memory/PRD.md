# ZAMOTOMOTO TV — Media Operations System
## PRD & Architecture Reference

---

## Original Problem Statement
Build a fully working, immersive, cinematic dark web application for ZAMOTOMOTO TV — an internal Media Operations Management System.

**Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Auth, DB, Realtime, Storage). DO NOT use FastAPI or MongoDB.

**Design System**: Cinematic broadcast control room.
- Colors: `#0A0A0A` (bg), `#CC1F1F` (primary), `#111111` (surface), `#2A2A2A` (border)
- Typography: Bebas Neue (headings) + IBM Plex Mono (body/data)
- 0px border-radius everywhere (no glassmorphism)

**4-Role Auth**: `super_admin`, `admin`, `worker_standard`, `worker_isolated`

---

## Architecture

```
/app/frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           — auth guard, Sidebar + Header
│   │   ├── page.tsx             — dashboard with KPIs, pipeline, activity
│   │   ├── tasks/page.tsx       — Kanban board + list view + realtime
│   │   ├── tasks/[id]/page.tsx  — task detail, stages, file attachments, activity
│   │   ├── tasks/new/page.tsx   — new task form
│   │   ├── analytics/page.tsx   — charts (stage, priority, status from task_stages)
│   │   ├── team/page.tsx        — team member list
│   │   ├── files/page.tsx       — media library
│   │   ├── departments/page.tsx — department cards with task_stages counts
│   │   ├── departments/[slug]/  — per-dept task list
│   │   ├── special-projects/    — executive projects
│   │   ├── social-copy/         — social copy tasks (sc_ref)
│   │   └── settings/page.tsx    — super_admin only
├── components/layout/
│   ├── Sidebar.tsx
│   └── Header.tsx
├── hooks/useUser.ts
├── lib/
│   ├── supabase/client.ts       — browser client
│   ├── supabase/server.ts       — server/admin client
│   ├── constants.ts             — STAGES, STATUS_COLORS, PRIORITY_COLORS, ROLE_LABELS
│   └── utils.ts
└── types/
    ├── index.ts                 — all DB interfaces
    └── css.d.ts                 — CSS module declaration
```

---

## Key DB Schema (DO NOT ALTER)

| Table | Key Columns |
|-------|-------------|
| `profiles` | `id`, `full_name`, `role`, `department`, `is_active`, `invited_by` — NO email column |
| `tasks` | `id`, `task_ref` (auto), `title`, `brief`, `current_stage`, `priority`, `assigned_to`, `created_by`, `is_overdue`, `publish_target[]` — NO status column |
| `task_stages` | `id`, `task_id`, `stage`, `status`, `assigned_to`, `revision_num`, `reject_reason`, `approved_by` |
| `task_files` | `id`, `task_id`, `stage_id`, `file_name`, `category`, `provider` (enum: google_drive...), `storage_key`, `mime_type`, `uploaded_by`, `is_deleted` |
| `activity_log` | `id`, `user_id`, `task_id`, `sp_id`, `action`, `metadata` |
| `special_projects` | `id`, `sp_ref`, `title`, `description`, `urgency` (NOT priority), `status`, `owner_id`, `progress_pct` |
| `social_tasks` | `id`, `sc_ref` (NOT task_ref), `task_type`, `title`, `brief`, `platform[]`, `status`, `priority` |
| `notifications` | `id`, `user_id`, `title`, `message`, `read`, `task_id` |

**Critical schema rules:**
- `profiles` has NO `email` column (email comes from auth.users only)
- `tasks` has NO `status` column (status lives per-stage in `task_stages`)
- `special_projects` uses `urgency` NOT `priority`
- `social_tasks` uses `sc_ref` NOT `task_ref`
- `task_files.file_name` NOT `original_filename`
- `profiles.full_name` NOT `display_name`
- Table is `activity_log` NOT `activity_logs`

---

## What's Been Implemented (as of 2026-04-01)

### Phase 0 — Scaffold
- [x] Next.js 14 App Router environment
- [x] Tailwind CSS with cinematic design tokens
- [x] Supabase server + client utilities
- [x] DB types in `/types/index.ts`
- [x] Auth (login/logout via Supabase Auth)
- [x] Protected dashboard layout

### Phase 1 — Core Pages
- [x] Dashboard KPIs + pipeline status + activity feed
- [x] Tasks Kanban board (drag-and-drop, stage transitions, realtime)
- [x] Tasks list view + filters
- [x] New task form (writes to tasks + activity_log)
- [x] Task detail page (stages tracker, file attachments, activity timeline, approval modal)
- [x] Analytics (stage + priority + status charts using task_stages for status)
- [x] Team page (member list with roles)
- [x] Files / Media Library
- [x] Departments overview + department detail
- [x] Special Projects list
- [x] Social Copy list
- [x] Settings (super_admin only)

### P0 Fixes Applied (2026-04-01)
- [x] analytics: removed `t.status`, now queries `task_stages` for status data
- [x] files: `original_filename` → `file_name`
- [x] settings: removed duplicate React import, `display_name` → `full_name`
- [x] social-copy: `task_ref` → `sc_ref`
- [x] special-projects: `priority` → `urgency`
- [x] tasks/new: ProfileOption/SPOption local types (partial query cast)
- [x] departments/[slug]: join query `email` removed (not a profiles column), `display_name` → `full_name`
- [x] departments/page: `task.status` removed, now queries `task_stages` for status counts
- [x] css.d.ts: CSS module declaration added

---

## Prioritized Backlog

### P1 — Next Up
- [ ] Invite Team Member flow (super_admin invites via Supabase Auth, writes to profiles)
- [ ] Special Projects creation form
- [ ] Social Copy creation form
- [ ] Settings — role management (super_admin change roles)
- [ ] Activity logging completeness audit

### P2 — Future
- [ ] Global search (header search bar filters tasks/files)
- [ ] Notification system (bell icon)
- [ ] Department analytics deep-dives
- [ ] More analytics: trend over time, per-user productivity

---

## Test Credentials
- Email: admin@zamoto.com
- Password: ZMM@admin2026
- Role: super_admin
- Name: Wiseman Robert
- App: https://media-ops-desk.preview.emergentagent.com
