# ZAMOTOMOTO TV — Media Operations System
## PRD & Architecture Reference

---

## Original Problem Statement
Build a fully working, immersive, cinematic dark web application for ZAMOTOMOTO TV — an internal Media Operations Management System.

**Tech Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (Auth, DB, Realtime, Storage). DO NOT use FastAPI or MongoDB.

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
│   │   ├── page.tsx             — dashboard with KPIs, pipeline, activity + BreakingAlert + DashboardRealtime
│   │   ├── tasks/page.tsx       — Kanban board + list view
│   │   ├── tasks/[id]/page.tsx  — task detail, stages, file attachments, activity
│   │   ├── tasks/new/page.tsx   — new task form
│   │   ├── tasks/actions.ts     — server actions (service role bypass for RLS)
│   │   ├── notifications/actions.ts — fetchRecentActivity server action
│   │   ├── analytics/page.tsx
│   │   ├── team/page.tsx
│   │   ├── files/page.tsx
│   │   ├── departments/page.tsx
│   │   ├── special-projects/page.tsx + actions.ts
│   │   ├── social-copy/page.tsx + actions.ts
│   │   └── admin/settings/page.tsx
├── components/layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx              — injects NotificationBell
│   └── NotificationBell.tsx   — live bell, reads activity_log
├── components/dashboard/
│   ├── BreakingAlert.tsx       — red banner for breaking/critical special projects
│   └── DashboardRealtime.tsx  — invisible client component for router.refresh() on changes
├── components/special-projects/SpecialProjectsClient.tsx — realtime integrated
├── components/social-copy/SocialCopyClient.tsx — realtime integrated
├── hooks/
│   ├── useUser.ts
│   ├── useRealtimeSubscription.ts  — core realtime hook (Supabase postgres_changes)
│   ├── useTasksRealtime.ts
│   ├── useSpecialProjectsRealtime.ts
│   ├── useSocialTasksRealtime.ts
│   ├── useActivityLogRealtime.ts
│   └── useNotifications.ts         — activity_log reader + realtime badge
├── lib/
│   ├── supabase/client.ts       — browser client
│   ├── supabase/server.ts       — server/admin client
│   ├── constants.ts
│   └── utils.ts
└── types/index.ts
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

## What's Been Implemented

### Phase 0 — Scaffold ✅
- Next.js 14 App Router environment
- Tailwind CSS with cinematic design tokens
- Supabase server + client utilities
- DB types in `/types/index.ts`
- Auth (login/logout via Supabase Auth)
- Protected dashboard layout

### Phase 1 — Core Pages + Invite Flow ✅
- Dashboard KPIs + pipeline status + activity feed
- Tasks Kanban board (drag-and-drop, stage transitions)
- Tasks list view + filters
- New task form (writes to tasks + activity_log)
- Task detail page (stages tracker, file attachments, activity timeline, approval modal)
- Analytics (stage + priority + status charts using task_stages for status)
- Team page (member list with roles)
- Invite Team Member (super_admin only)
- Files / Media Library
- Departments overview + department detail
- Settings (super_admin only)

### Phase 2 — Core Content System ✅ (2026-04-02)
- Special Projects page (`/special-projects`) — full CRUD with modals, sort/filter
- Social Copy page (`/social-copy`) — full CRUD + submit workflow, worker_isolated isolation
- Admin Panel Social Copy Tab — 5th read-only monitoring tab in `/admin/settings`
- Bug fix: Next.js Server Actions `allowedOrigins` config
- Bug fix: `createSpecialProject` + `createSocialTask` return `id` alongside refs

### Phase 3 — Realtime System ✅ (2026-04-02)
- `useRealtimeSubscription` core hook — subscribes to postgres_changes on any table
- Table-specific wrappers: `useTasksRealtime`, `useSpecialProjectsRealtime`, `useSocialTasksRealtime`, `useActivityLogRealtime`
- `DashboardRealtime` — invisible client component, calls `router.refresh()` when tasks/activity change
- `BreakingAlert` — red banner for urgency IN ('breaking', 'critical') + status='active' special projects (admins only, dismissable, realtime)
- `NotificationBell` + `useNotifications` — SVG bell in header, reads `activity_log` via server action, realtime INSERT subscription, unread badge, mark-all-read
- Realtime integrated into `SpecialProjectsClient` + `SocialCopyClient` via `router.refresh()`

### Phase 0.5 — Drag Fix + System Verification ✅ (2026-04-02)
- Fixed drag-and-drop null reference: removed `setTimeout` in `handleDragStart`, now captures `e.currentTarget` synchronously before any async/dataTransfer calls
- Full regression: 100% pass — all pages load, kanban drag works, notifications load real data, zero console errors

### Accounting Module ✅ (2026-04-02)
- New tables: `accounting_categories`, `accounting_entries`, `accounting_documents` + RLS
- New role: `accountant` (added to `Role` type + profiles constraint + ROLE_LABELS)
- Server actions: `getAccountingEntries`, `getAccountingSummary`, `createAccountingEntry`, `recordAccountingDocument`, `reviewAccountingEntry`, `getAccountingDocuments`, `getSignedDocumentUrl`, `getAccountingCategories`
- Admin view (`/accounting`): 4 summary cards + EntryTable with filters + EntryDetailModal with approve/reject
- Accountant workspace (`/accounting/workspace`): EntryForm (left, sticky) + EntryTable (right)
- Components: SummaryCard, EntryTable, EntryDetailModal, EntryForm, DocumentUploader, DocumentList, AdminAccountingClient, AccountantWorkspaceClient
- Sidebar: Accounting nav item (∑) in Admin section for super_admin/admin; minimal nav for accountant role
- Route guards: workers → /, accountant on /accounting → /accounting/workspace, admin on /accounting/workspace → /accounting
- SQL migration: `/app/frontend/supabase/migrations/20260402_accounting_module.sql` (needs manual execution in Supabase Studio)
- File upload: client-side browser Supabase upload to `accounting-docs` private bucket + `recordAccountingDocument` server action for metadata
- Testing: 100% pass (10/10 with empty DB state)

### Payroll Phase 1 Deployment ✅ (2026-04-04)
**18 files created/updated (all build green, TypeScript 0 errors):**

Phase A (Status-gated totals):
- `actions.ts` replaced — `getPayrollSummary()` now returns `PayrollSummaryResult` with `approved_total`, `paid_total`, `rejected_total` separate; rejected NEVER included in financial totals
- `AdminPayrollClient.tsx` replaced — 4 status-gated summary cards + REJECTED AUDIT ONLY red card; 3-tab nav (Overview / Salary Records / Legacy)

Phase B (Salary Records):
- `salary-actions.ts` created — `getSalaryRecords()`, `getSalaryCompletionStatus()`, `setSalaryRecord()`, `getEmployeeSalaryHistory()`
- `SalaryRecordsClient.tsx` created — inline salary edit per employee, completion status gate

Phase D (Accountant Batch Workflow):
- `workspace/payroll/payroll-actions.ts` created — `openPayrollMonth()` (gated on salary completion), `buildPayrollBatch()`, `addAdjustment()`, `removeAdjustment()`, `submitBatch()`, `resubmitLineItem()`, `getPayrollMonth()`, `getPayrollMonthList()`
- `AccountantPayrollWorkspaceClient.tsx` replaced — month list with open-month modal (year/month selector, salary gate error)
- `PayrollBatchPreparationClient.tsx` created — line items table, inline adj form, submit button
- `CorrectionsQueueClient.tsx` created — per-rejected-item correction form + resubmit
- Pages: `/accounting/workspace/payroll/[month_id]`, `/accounting/workspace/payroll/[month_id]/corrections`, `/accounting/workspace/salary-records`

Phase E (Admin Review):
- `admin-payroll-actions.ts` created — `approveLineItems()`, `rejectLineItems()`, `excludeLineItem()`, `markBatchPaid()`, `closePayrollMonth()`, `getActiveBatchForAdmin()`, `getPayrollHistory()`
- `AdminPayrollReviewClient.tsx` created — checkbox bulk approve/reject, individual exclude, mark paid, close month
- `PayrollHistoryClient.tsx` created — history table with paid/closed months
- Pages: `/accounting/payroll/[month_id]`, `/accounting/payroll/history`

Testing: 80% pass (admin fully verified, accountant blocked by missing Supabase Auth user)

⚠️ ACTION REQUIRED from user:
1. Create accountant@zamototomotv.com in Supabase Studio > Authentication > Users
2. Create test employees with roles worker_standard or worker_isolated to test salary records


- New table: `payroll_entries` + 5 RLS policies (admin_all, accountant_insert, accountant_select, accountant_update, accountant_delete) + trigger
- SQL migration: `/app/frontend/supabase/migrations/20260402_payroll_module.sql` (5 policies, idempotent)
- Server actions: `getPayrollEntries`, `getMyPayrollEntries`, `createPayrollEntry`, `approvePayrollEntry`, `markPayrollPaid`, `getPayrollSummary`, `deletePayrollEntry`
- Admin view (`/accounting/payroll`): 3 summary cards (gross/deductions/net) + dept breakdown + PayrollTable with filters + inline PayrollReviewModal (approve/reject/mark-paid)
- Accountant workspace (`/accounting/workspace/payroll`): sticky form (left) + records table with delete capability (right)
- Components: PayrollSummaryCard, PayrollTable, PayrollForm, AdminPayrollClient, AccountantPayrollWorkspaceClient
- Sidebar: Admin section has "Payroll" → /accounting/payroll; Accountant nav has "Payroll" → /accounting/workspace/payroll
- Route guards: workers → /, accountant on /accounting/payroll → /accounting/workspace/payroll, admin on workspace → /accounting/payroll
- Infrastructure fix: `allowedDevOrigins` added to `next.config.ts` for preview URL cross-origin JS chunk access
- Testing: 85% pass (admin side fully verified; accountant side blocked until SQL migration run)

### Known Issues / Pending
- Phase 0 RLS fix: `tasks` table has recursive SELECT policy — `fix_tasks_rls.sql` ready for manual execution in Supabase Studio. Once applied, remove service-role bypass in `tasks/actions.ts`
- `activity_log` RLS: browser client SELECT returns 500; fixed via server action (`notifications/actions.ts`)
- Payroll DB tables do not exist until user manually runs `20260402_payroll_module.sql` in Supabase Studio

---

## Prioritized Backlog

### P0 — Done
- [x] Payroll Module (all components, pages, layouts, sidebar, SQL migration with 5 RLS policies)

### P2 — Phase 3 Remaining (Upcoming)
- [ ] File attachments for social tasks (chunked upload to Supabase Storage)
- [ ] Scheduling/auto-publish for social tasks (publish_at field)

### P3 — Phase 4 (Future/Backlog)
- [ ] Global task search (header bar filters tasks/files/projects)
- [ ] Department analytics deep-dives
- [ ] More analytics: trend over time, per-user productivity

---

## Test Credentials
- Email: admin@zamoto.com
- Password: 12345678
- Role: super_admin
- Full Name: Admin User
- App: https://media-ops-desk.preview.emergentagent.com
