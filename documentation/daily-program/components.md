# Daily Program — Components

## Component Tree

```text
DailyProgram.tsx (page — state owner via useDailyTasks hook)
├── Card header with title + date selector
│   └── Popover → Calendar (mode="single", controls selectedDate)
├── "Add New Task" Button (full-width)
├── Loading state (Loader2 spinner, shown while fetching)
├── 3-column grid (md:grid-cols-3, items-start):
│   ├── DailyProgramSection "Drop-Offs" (tasks where type === 'return')
│   ├── DailyProgramSection "Pick-Ups" (tasks where type === 'delivery')
│   └── DailyProgramSection "Other Tasks" (tasks where type === 'other')
└── AddTaskDialog (modal, controlled by isAddDialogOpen)
```

---

## DailyProgram.tsx (Page Component)

**Role**: Top-level state owner and layout orchestrator.

**Responsibilities**:
- Owns `selectedDate` state (controls which day's tasks are shown)
- Instantiates `useDailyTasks(selectedDate)` hook for data fetching
- Filters tasks into three arrays by `task.type`: `return`, `delivery`, `other`
- Passes CRUD handlers (`handleAddTask`, `handleUpdateTask`, `handleDeleteTask`) to children
- Renders date picker in card header with `formatDateShortEuropean()` display

**Data flow**:
```
selectedDate → useDailyTasks(selectedDate) → { tasks, loading, vehicles }
                                                    │
tasks.filter(type === 'return')    → DailyProgramSection "Drop-Offs"
tasks.filter(type === 'delivery')  → DailyProgramSection "Pick-Ups"
tasks.filter(type === 'other')     → DailyProgramSection "Other Tasks"
```

**Props passed to children**:
- `DailyProgramSection`: `title`, `tasks` (filtered), `onUpdateTask`, `onDeleteTask`
- `AddTaskDialog`: `isOpen`, `onClose`, `onAddTask`, `vehicles`, `selectedDate`, `onDateChange`

---

## DailyProgramSection.tsx (Column Container)

**Role**: Renders a single task category column with overflow handling.

**Responsibilities**:
- Sorts tasks: incomplete first (`completed ? 1 : -1`), then by `scheduledTime` ascending
- Shows first 4 tasks inline (`VISIBLE_TASKS_COUNT = 4`)
- "View All" button opens a Dialog with paginated list when more than 4 tasks exist
- Pagination: 10 tasks per page (`TASKS_PER_PAGE = 10`) with prev/next navigation

**Props**:
| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Section heading (translated) |
| `tasks` | `DailyTask[]` | Pre-filtered by type |
| `onUpdateTask` | `(task: DailyTask) => void` | Update handler |
| `onDeleteTask` | `(taskId: string) => void` | Delete handler |

**Internal state**:
- `isViewAllOpen: boolean` — controls paginated dialog
- `currentPage: number` — current page in paginated view

**Empty state**: Shows `"No scheduled [title]"` message when `tasks.length === 0`.

---

## TaskItem.tsx (Individual Task Card)

**Role**: Renders a single task with all its details and action buttons.

**Responsibilities**:
- Displays type badge (color-coded: blue=return, green=delivery, gray=other)
- Shows title: user-defined for `other`, vehicle name for `delivery`/`return`
- Renders time, location, notes when present
- For delivery/return with booking data: shows fuel level and payment status badges
- Displays additional info rows (from `booking_additional_info` enrichment)
- Contract photo viewer via `FilePreviewModal` + contract delete button
- Complete/Reopen toggle: changes task status between `pending` and `completed`
- Edit button → opens `EditTaskDialog`
- Delete button → confirmation → deletes task (+ contract from storage if present)

**Data displayed**:
| Field | Source | Shown for |
|-------|--------|-----------|
| Type badge | `task.type` | All |
| Title | `task.title` or `task.vehicleName` | All |
| Time | `task.scheduledTime` | When present |
| Location | `task.location` | When present |
| Notes | `task.notes` | When present |
| Customer name | `task.customerName` (from booking) | delivery/return |
| Fuel level | `task.fuelLevel` (from booking) | delivery/return |
| Payment status | `task.paymentStatus` (from booking) | delivery/return |
| Balance due | `task.balanceDueAmount` (from booking) | When payment not fully paid |
| Additional info | `task.additionalInfo[]` (from booking) | When present |
| Contract | `task.contractPath` (storage URL) | When present |

**Internal state**:
- `isEditDialogOpen: boolean`
- `isUpdating: boolean` (loading state for complete/reopen toggle)
- `isContractOpen: boolean` (FilePreviewModal visibility)
- `contractUrl: string | null` (signed URL for contract viewer)

---

## EditTaskDialog.tsx (Edit Modal)

**Role**: Allows editing limited fields of an existing task.

**Editable fields**:
- `title` — only for `other` type tasks
- `due_time` — native HTML time input
- `location` — text input
- `description` (notes) — textarea
- `completed` — toggle switch (maps to status: pending ↔ completed)

**Read-only fields** (shown in muted boxes):
- Task type (delivery/return/other)
- Vehicle name (if assigned)

**Constraints**: Cannot change `task_type` or `vehicle_id` after creation.

---

## AddTaskDialog.tsx (Create Modal)

**Role**: Form for creating new tasks.

**Form fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Calendar popover | Yes | Syncs with page `selectedDate`, can be changed |
| Type | Select (return/delivery/other) | Yes | Controls which fields are visible |
| Title | Text input | Only for `other` | Mandatory, user-defined |
| Vehicle | Select dropdown | delivery/return: yes; other: optional | Excludes sold vehicles (`is_sold = false`) |
| Time | Vertical 24h selector | No | Hourly increments: 00:00, 01:00, ..., 23:00 |
| Location | Text input | No | Only shown for delivery/return types |
| Notes | Textarea | No | Maps to `description` field |

**Vehicle selector behavior**:
- Fetches all vehicles where `is_sold = false`
- Shows "No vehicles found" when fleet is empty
- For `other` type: shows "None" option as first choice
- For `delivery`/`return`: vehicle selection is mandatory

**Date sync**: When user changes date in AddTaskDialog, it also updates the page's `selectedDate` via `onDateChange` callback, ensuring the newly created task is visible after creation.

---

## Interaction Summary

```
User selects date → tasks fetched for that date → 3 columns render
  │
  ├── Click "Add New Task" → AddTaskDialog → create task → refetch
  │
  ├── Click task's Edit → EditTaskDialog → update task → refetch
  │
  ├── Click task's Complete → status toggle → refetch
  │
  ├── Click task's Delete → confirmation → delete (+ storage cleanup) → refetch
  │
  └── Click "View All" → paginated dialog for overflow tasks
```
