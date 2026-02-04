# StoreTool - Complete App Reproduction & Development Specification

**Document Version:** 1.0
**Generated:** 2026-02-04
**Purpose:** Complete technical specification for reproducing the StoreTool inventory management application

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Core Features & Functionality](#3-core-features--functionality)
4. [Technical Architecture](#4-technical-architecture)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Complete Screen-by-Screen Breakdown](#8-complete-screen-by-screen-breakdown)
9. [Business Logic & Workflows](#9-business-logic--workflows)
10. [UI/UX Specifications](#10-uiux-specifications)
11. [Data Export & Reporting](#11-data-export--reporting)
12. [Internationalization](#12-internationalization)
13. [Edge Cases & Error Handling](#13-edge-cases--error-handling)
14. [Offline Behavior & Network](#14-offline-behavior--network)
15. [Subscription & Trial Management](#15-subscription--trial-management)
16. [Clarification Questions](#16-clarification-questions)

---

## 1. EXECUTIVE SUMMARY

**StoreTool** is a multi-tenant, collaborative inventory management system designed for small to medium businesses. It enables teams to organize physical inventory across multiple warehouses, storage units, and precise grid-based locations. The app supports barcode scanning, real-time stock tracking, restock alerts, financial tracking, team collaboration, and comprehensive audit trails.

### Key Characteristics:
- **Multi-tenant architecture** with workgroup isolation
- **Real-time collaborative inventory management**
- **Barcode scanning** for quick item lookup/entry
- **Visual grid layout** for warehouse/storage mapping
- **Role-based access control** (Admin/Member)
- **Complete audit trail** of all inventory movements
- **Export capabilities** (CSV/PDF) for reporting
- **Free trial + subscription model** (7-day trial)
- **Internationalized** (English/Finnish)
- **Cross-platform** (iOS/Android via React Native/Expo)

---

## 2. PRODUCT OVERVIEW

### 2.1 Problem Statement

Businesses struggle with:
- Losing track of inventory locations
- Manual stock counting errors
- Lack of visibility into who moved what items
- No restock alerts leading to stockouts
- Inability to collaborate across teams
- Missing financial tracking for inventory valuation

### 2.2 Solution

StoreTool provides:
1. **Hierarchical Organization**: Workgroup → Warehouses → Storage Units → Defined Locations → Items
2. **Visual Stock Grid**: Interactive grid layout for precise location mapping
3. **Barcode Integration**: Scan items to add/find/update inventory instantly
4. **Team Collaboration**: Shared workgroups with role-based permissions
5. **Smart Alerts**: Automatic restock notifications when items fall below threshold
6. **Audit Trail**: Complete history of who did what, when
7. **Financial Tracking**: Cost tracking with tax management for valuation reports

### 2.3 Target Users

- Small warehouse operators
- Retail shop owners
- Manufacturing facilities
- Restaurant/cafe inventory managers
- Hobbyists with large collections
- Any business needing precise location tracking

---

## 3. CORE FEATURES & FUNCTIONALITY

### 3.1 Feature Matrix

| Feature | Description | User Role Required |
|---------|-------------|-------------------|
| **Workgroup Management** | Create/join workgroups, invite team members | Any authenticated user |
| **Warehouse Creation** | Create multiple warehouses with descriptions | Member+ |
| **Storage Unit Management** | Define storage areas within warehouses | Member+ |
| **Location Grid Definition** | Create precise shelf/row/column locations | Member+ |
| **Item Management** | Add/edit/delete inventory items | Member+ |
| **Barcode Scanning** | Scan barcodes to find or add items | Member+ |
| **Stock Adjustment** | Increase/decrease quantities | Member+ |
| **Restock Workflow** | Bulk restock low-stock items | Member+ |
| **Stock Grid (Admin Mode)** | Visual grid for location management | Admin only |
| **Financial Tracking** | Track purchase/sale prices with tax | Member+ |
| **Activity History** | View complete audit trail | Member+ (own workgroup) |
| **Export Reports** | Export inventory/history to CSV/PDF | Member+ |
| **Multi-Language** | Switch between languages | All users |
| **Theme Customization** | Choose color themes + dark mode | All users |
| **Admin Passcode** | Set passcode for sensitive operations | Admin only |
| **Member Management** | Promote/demote/remove members | Admin only |

### 3.2 Feature Dependencies

```
Authentication
  └── Workgroup Selection
      ├── Warehouse Creation
      │   └── Storage Unit Creation
      │       ├── Location Definition
      │       │   └── Item Assignment
      │       └── Stock Grid (Admin)
      ├── Item Management
      │   ├── Barcode Scanning
      │   ├── Stock Adjustment
      │   └── Restock Workflow
      ├── Activity History
      └── Export Reports
```

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React Native (Expo SDK 54+) | Cross-platform mobile app |
| **Navigation** | expo-router (v5+) | File-based routing |
| **Database** | Supabase (PostgreSQL) | Backend database with RLS |
| **Authentication** | Supabase Auth | Email/password auth with sessions |
| **Real-time** | Supabase Realtime (optional) | Live updates [CLARIFICATION NEEDED] |
| **State Management** | React Context API | Auth, Theme, Modal state |
| **Camera** | expo-camera | Barcode scanning |
| **File Export** | expo-file-system, expo-sharing, expo-print | CSV/PDF generation |
| **Internationalization** | react-i18next | Multi-language support |
| **UI Components** | React Native core + custom | No external UI library |
| **Icons** | @expo/vector-icons (FontAwesome) | Icon system |

### 4.2 Architecture Patterns

**Multi-Tenant Isolation:**
- Every table includes `workgroup_id` for row-level security
- All queries filtered by authenticated user's workgroup
- Database RLS policies enforce tenant boundaries

**Client-Server Model:**
- React Native client for UI/UX
- Supabase backend for data persistence
- App-side activity logging (not DB triggers)
- Client-side business logic with server validation via RLS

**State Management Strategy:**
```
Global State (Context):
  - AuthProvider: session, profile, workgroup, trial status
  - ThemeProvider: mode (light/dark), theme (6 variants), colors
  - ModalProvider: confirmation, passcode, quantity modals
  - OnboardingProvider: onboarding flow state

Local State (Component):
  - Form inputs
  - Loading states
  - UI interactions (selected items, expanded sections)
```

### 4.3 Navigation Structure

```
Root Layout (_layout.tsx)
├── Auth Flow (public)
│   ├── /login
│   ├── /sign-up
│   ├── /workgroup-gate (after signup)
│   ├── /create-workgroup
│   └── /join-workgroup
├── Onboarding Flow (first-time users)
│   ├── /onboarding/welcome
│   ├── /onboarding/demo
│   ├── /onboarding/demo-warehouse
│   ├── /onboarding/demo-inventory
│   ├── /onboarding/demo-scanning
│   ├── /onboarding/completion
│   └── /onboarding/paywall (trial expired)
└── Main App (authenticated + workgroup)
    ├── (tabs) - Bottom Tab Navigator
    │   ├── /index (Dashboard/Home)
    │   ├── /warehouse
    │   │   └── /warehouse/index (Warehouse List)
    │   └── /settings
    ├── Item Operations (modals/screens)
    │   ├── /add-item
    │   ├── /edit-item/[id]
    │   ├── /find (search)
    │   ├── /scan (barcode)
    │   └── /restock
    ├── Warehouse Management
    │   ├── /create-warehouse
    │   ├── /warehouse/[id] (Manage Warehouse → Storage List)
    │   ├── /create-storage
    │   └── /storage/[id] (Locations List)
    ├── Location Management
    │   ├── /create-location
    │   ├── /edit-location/[id]
    │   ├── /select-location-modal
    │   └── /stock-grid/[storageId] (Admin Grid View)
    ├── Settings & Admin
    │   ├── /profile
    │   ├── /history (Activity Logs)
    │   └── /manage-members (Admin)
    └── Onboarding Setup (initial warehouse creation)
        └── /onboarding/setup-grid
```

---

## 5. DATABASE SCHEMA

### 5.1 Complete Entity-Relationship Diagram

```
┌─────────────────┐
│  Supabase Auth  │
│   auth.users    │
└────────┬────────┘
         │ (1:1)
         ▼
┌─────────────────────────────────┐
│       profiles                  │
├─────────────────────────────────┤
│ id (uuid, PK, FK→auth.users)   │
│ username (text)                 │
│ workgroup_id (uuid, FK)         │◄────────┐
│ role (text: admin/member/null)  │         │
│ trial_ends_at (timestamptz)     │         │ (N:1)
│ full_name (text)                │         │
│ email (text, from auth)         │         │
└─────────────────────────────────┘         │
                                             │
┌─────────────────────────────────┐         │
│       workgroups                │◄────────┘
├─────────────────────────────────┤
│ id (uuid, PK)                   │
│ name (text, NOT NULL)           │
│ owner_id (uuid, FK→profiles)    │
│ join_code (text, UNIQUE)        │
│ admin_passcode (text, nullable) │
│ created_at (timestamptz)        │
└────────┬────────────────────────┘
         │ (1:N)
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌──────────────────────┐    ┌──────────────────────┐
│    warehouses        │    │   activity_logs      │
├──────────────────────┤    ├──────────────────────┤
│ id (uuid, PK)        │    │ id (uuid, PK)        │
│ name (text, NOT NULL)│    │ workgroup_id (uuid)  │
│ description (text)   │    │ user_id (uuid, FK)   │
│ address (text)       │    │ item_id (uuid, FK)   │
│ icon (text)          │    │ item_name (text)     │
│ workgroup_id (uuid)  │    │ action (text)        │
│ created_at (ts)      │    │ change_amount (int)  │
└────────┬─────────────┘    │ final_quantity (int) │
         │ (1:N)            │ created_at (ts)      │
         ▼                  └──────────────────────┘
┌──────────────────────┐
│     storages         │
├──────────────────────┤
│ id (uuid, PK)        │
│ name (text, NOT NULL)│
│ warehouse_id (uuid)  │◄─────┐
│ workgroup_id (uuid)  │      │ (N:1)
│ created_at (ts)      │      │
└────────┬─────────────┘      │
         │ (1:N)              │
         ├────────────────────┘
         ▼
┌──────────────────────────────┐
│    defined_locations         │
├──────────────────────────────┤
│ id (uuid, PK)                │
│ storage_id (uuid, FK)        │
│ shelf (text)                 │
│ row (text, nullable)         │
│ column (text, nullable)      │
│ container (text, nullable)   │
│ width_span (int, default 1)  │
│ height_span (int, default 1) │
│ master_id (uuid, FK→self)    │◄─┐ (Self-join for merging)
│ created_at (ts)              │  │
└────────┬─────────────────────┘  │
         │ (1:N)                  │
         ▼                        │
┌──────────────────────────────────────┐
│             items                    │
├──────────────────────────────────────┤
│ id (uuid, PK)                        │
│ name (text, NOT NULL)                │
│ quantity (int, NOT NULL)             │
│ restock_threshold (int)              │
│ barcode (text, nullable, UNIQUE/wg)  │
│ storage_id (uuid, FK)                │
│ warehouse_id (uuid, FK)              │
│ workgroup_id (uuid, FK)              │
│ location_id (uuid, FK, nullable)     │──┘
│ usage_type (text: production/resale) │
│ cost_per_unit (numeric, deprecated)  │
│ purchase_price (numeric)             │
│ purchase_vat_percent (numeric)       │
│ sale_price (numeric, nullable)       │
│ sale_vat_percent (numeric, nullable) │
│ updated_at (timestamptz)             │
│ created_at (timestamptz)             │
└──────────────────────────────────────┘
```

### 5.2 Table Specifications

#### 5.2.1 profiles

**Purpose:** User profile data linked to Supabase authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, FK→auth.users.id | User ID from auth system |
| username | text | NOT NULL | Display name |
| workgroup_id | uuid | FK→workgroups.id, NULLABLE | Current workgroup membership |
| role | text | NULLABLE | 'admin', 'member', or null |
| trial_ends_at | timestamptz | NULLABLE | Trial expiration timestamp |
| full_name | text | NULLABLE | Full name for exports |
| email | text | COMPUTED from auth.users | Email address |

**RLS Policy:**
- Users can read/update their own profile
- Users can read profiles in their workgroup
- Admins can modify roles within their workgroup

**Relationships:**
- N:1 with workgroups (many users → one workgroup)
- 1:N with activity_logs (one user → many log entries)

---

#### 5.2.2 workgroups

**Purpose:** Multi-tenant workspace representing a team/organization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique workgroup identifier |
| name | text | NOT NULL | Workgroup display name |
| owner_id | uuid | FK→profiles.id | Creator/owner user ID |
| join_code | text | UNIQUE, NOT NULL | 6-character invite code |
| admin_passcode | text | NULLABLE | Numeric passcode for admin actions |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**RLS Policy:**
- Users can only access workgroups they belong to (via profile.workgroup_id)
- Only admins can update workgroup settings
- Only owners can delete workgroups

**Business Rules:**
- `join_code` must be unique across platform
- `admin_passcode` is optional but recommended for sensitive operations
- Deleting a workgroup cascades to all related data

---

#### 5.2.3 warehouses

**Purpose:** Top-level physical location for storing inventory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique warehouse identifier |
| name | text | NOT NULL | Warehouse name (e.g., "Main Warehouse") |
| description | text | NULLABLE | Short description |
| address | text | NULLABLE | Physical address |
| icon | text | NULLABLE | Emoji or icon name for UI |
| workgroup_id | uuid | FK→workgroups.id, NOT NULL | Owning workgroup |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**RLS Policy:**
- Scoped to workgroup_id matching user's profile.workgroup_id

**Business Rules:**
- Each warehouse belongs to exactly one workgroup
- Name should be unique within a workgroup (soft constraint)

---

#### 5.2.4 storages

**Purpose:** Storage unit/container within a warehouse (e.g., shelf, rack, room)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique storage unit identifier |
| name | text | NOT NULL | Storage unit name (e.g., "Freezer Section") |
| warehouse_id | uuid | FK→warehouses.id, NOT NULL | Parent warehouse |
| workgroup_id | uuid | FK→workgroups.id, NOT NULL | Owning workgroup (for RLS) |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**RLS Policy:**
- Scoped to workgroup_id matching user's profile.workgroup_id

**Business Rules:**
- Each storage unit belongs to exactly one warehouse
- Name should be unique within a warehouse (soft constraint)

---

#### 5.2.5 defined_locations

**Purpose:** Precise grid-based location slots within a storage unit

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique location identifier |
| storage_id | uuid | FK→storages.id, NOT NULL | Parent storage unit |
| shelf | text | NOT NULL | Shelf identifier (A, B, 1, 2, etc.) |
| row | text | NULLABLE | Row identifier within shelf |
| column | text | NULLABLE | Column identifier within shelf |
| container | text | NULLABLE | Container/bin identifier |
| width_span | integer | DEFAULT 1 | Grid width (for visual layout) |
| height_span | integer | DEFAULT 1 | Grid height (for visual layout) |
| master_id | uuid | FK→defined_locations.id, NULLABLE | For merged locations |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**RLS Policy:**
- Scoped to storage's workgroup_id (join through storages table)

**Business Rules:**
- Composite uniqueness: (storage_id, shelf, row, column, container) should be unique
- `master_id` creates self-referential relationship for slot merging in grid view
- When locations are merged, multiple records share same `master_id`
- Items assigned to any merged location appear in the merged unit

**Grid Layout Behavior:**
- `width_span` and `height_span` control visual size in Stock Grid view
- Natural sort applied to shelf/row/column (handles alphanumeric: A, B, ..., 1, 2, 10)
- Merged locations share visual space in grid (borders removed between them)

---

#### 5.2.6 items

**Purpose:** Individual inventory items tracked in the system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique item identifier |
| name | text | NOT NULL | Item name/description |
| quantity | integer | NOT NULL, >= 0 | Current stock quantity |
| restock_threshold | integer | NOT NULL | Alert when qty ≤ this value |
| barcode | text | NULLABLE | Barcode for scanning (unique within workgroup) |
| storage_id | uuid | FK→storages.id, NOT NULL | Parent storage unit |
| warehouse_id | uuid | FK→warehouses.id, NOT NULL | Parent warehouse |
| workgroup_id | uuid | FK→workgroups.id, NOT NULL | Owning workgroup (for RLS) |
| location_id | uuid | FK→defined_locations.id, NULLABLE | Precise location slot |
| usage_type | text | DEFAULT 'production' | 'production' or 'resale' |
| cost_per_unit | numeric | NULLABLE, DEPRECATED | Legacy cost field |
| purchase_price | numeric | NULLABLE | Net purchase price per unit |
| purchase_vat_percent | numeric | NULLABLE | Purchase tax percentage |
| sale_price | numeric | NULLABLE | Net sale price (if resale) |
| sale_vat_percent | numeric | NULLABLE | Sales tax percentage |
| updated_at | timestamptz | DEFAULT now() | Last modification time |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**RLS Policy:**
- Scoped to workgroup_id matching user's profile.workgroup_id
- Barcode lookup MUST filter by workgroup_id to prevent cross-tenant leaks

**Business Rules:**
- One item per location (location_id should be unique unless NULL)
- `barcode` is unique within a workgroup (but not globally)
- `quantity` must be >= 0
- When `quantity <= restock_threshold`, item appears in restock list
- Financial fields optional; if not set, exclude from cost reports

**Financial Fields:**
- `usage_type`:
  - **'production'**: Items used in manufacturing (only purchase tracking)
  - **'resale'**: Items sold to customers (requires sale_price)
- `cost_per_unit`: Legacy field, replaced by `purchase_price` (keep for backwards compatibility)
- Tax percentages stored as numbers (e.g., 25.5 for 25.5%)

---

#### 5.2.7 activity_logs

**Purpose:** Immutable audit trail of all inventory actions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique log entry identifier |
| workgroup_id | uuid | FK→workgroups.id, NOT NULL | Owning workgroup |
| user_id | uuid | FK→profiles.id, NOT NULL | User who performed action |
| item_id | uuid | FK→items.id, NULLABLE | Related item (NULL for non-item actions) |
| item_name | text | NOT NULL | Item name (denormalized) |
| action | text | NOT NULL | Action type (see below) |
| change_amount | integer | NULLABLE | Quantity change (+/-) |
| final_quantity | integer | NULLABLE | Resulting quantity after action |
| created_at | timestamptz | DEFAULT now() | Action timestamp |

**Action Types:**
- **CREATE**: New item added
- **UPDATE**: Item details modified
- **DELETE**: Item removed
- **RESTOCK**: Quantity increased (manual or bulk)
- **REMOVE**: Quantity decreased
- **COUNT_UPDATE**: Quantity adjusted via stock grid

**RLS Policy:**
- Users can only view logs from their workgroup
- Logs are write-only via application (no direct updates/deletes)

**Business Rules:**
- Logs are immutable (no UPDATE or DELETE operations)
- `item_name` denormalized to preserve history even if item is deleted
- `change_amount` is signed (+5 for restock, -3 for removal)
- Logged synchronously from app code (not DB trigger)

---

### 5.3 Database Functions (RPC)

#### 5.3.1 get_restock_items()

**Purpose:** Retrieve all items needing restock for current user's workgroup

**Parameters:** None (uses auth context)

**Returns:**
```typescript
{
  id: string;
  name: string;
  quantity: number;
  restock_threshold: number;
  warehouse_name: string;
  storage_name: string;
}[]
```

**Logic:**
```sql
SELECT
  items.id,
  items.name,
  items.quantity,
  items.restock_threshold,
  warehouses.name as warehouse_name,
  storages.name as storage_name
FROM items
JOIN storages ON items.storage_id = storages.id
JOIN warehouses ON items.warehouse_id = warehouses.id
WHERE
  items.workgroup_id = (SELECT workgroup_id FROM profiles WHERE id = auth.uid())
  AND items.quantity <= items.restock_threshold
ORDER BY items.name ASC
```

**Used In:**
- Dashboard home screen (shows restock banner)
- Restock workflow screen

---

#### 5.3.2 bulk_update_item_quantities(updates)

**Purpose:** Efficiently update multiple item quantities in single transaction

**Parameters:**
```typescript
{
  updates: Array<{
    id: string;
    new_quantity: number;
  }>
}
```

**Returns:** Success/error response

**Logic:**
- Loop through updates array
- For each item:
  - Verify item belongs to user's workgroup
  - Update quantity = new_quantity
- Transaction: all succeed or all fail

**Used In:**
- Restock workflow (bulk stock button)

---

#### 5.3.3 delete_current_workgroup()

**Purpose:** Completely delete workgroup and all associated data (admin-only)

**Parameters:** None (uses auth context)

**Returns:** Success/error response

**Logic:**
1. Verify user is admin of workgroup
2. Delete all related records:
   - activity_logs (workgroup_id match)
   - items (workgroup_id match)
   - defined_locations (via storages)
   - storages (workgroup_id match)
   - warehouses (workgroup_id match)
   - Update profiles: set workgroup_id = NULL for all members
   - Delete workgroup record
3. Use cascade delete or explicit cleanup

**Used In:**
- Settings screen (Danger Zone)

---

### 5.4 Row Level Security (RLS) Policies

**Critical Requirement:** Every table with `workgroup_id` MUST enforce multi-tenant isolation.

#### RLS Implementation Pattern:

```sql
-- Example for items table
CREATE POLICY "Users can access items in their workgroup"
ON items
FOR ALL
USING (
  workgroup_id = (
    SELECT workgroup_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Example for warehouses table
CREATE POLICY "Users can manage warehouses in their workgroup"
ON warehouses
FOR ALL
USING (
  workgroup_id = (
    SELECT workgroup_id
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

#### Critical RLS Notes:

1. **Barcode Lookup Security:**
   ```typescript
   // ✅ CORRECT: Scoped to workgroup
   const { data } = await supabase
     .from('items')
     .eq('barcode', code)
     .eq('workgroup_id', profile.workgroup_id)
     .single();

   // ❌ WRONG: Could leak items from other workgroups
   const { data } = await supabase
     .from('items')
     .eq('barcode', code)
     .single();
   ```

2. **Admin Passcode Verification:**
   - Verified client-side before accessing Stock Grid
   - Stored as plaintext in `workgroups.admin_passcode`
   - [CLARIFICATION NEEDED]: Should this be hashed/encrypted?

3. **Role-Based Policies:**
   - Certain operations (delete workgroup, manage members) require `role = 'admin'`
   - Enforce via application logic + database policies

---

## 6. AUTHENTICATION & AUTHORIZATION

### 6.1 Authentication Flow

**Provider:** Supabase Auth (Email/Password)

**Authentication States:**
1. **Unauthenticated** → Show login/signup screens
2. **Authenticated, No Workgroup** → Show workgroup-gate (create/join)
3. **Authenticated, Has Workgroup, Trial Active** → Main app
4. **Authenticated, Has Workgroup, Trial Expired** → Paywall screen

**Implementation:**

```typescript
// AuthProvider manages authentication state
type AuthState = {
  session: Session | null;
  profile: Profile | null;
  workgroup: Workgroup | null;
  loading: boolean;
  subscriptionStatus: 'trial_active' | 'trial_expired' | 'subscribed' | 'none';
  daysRemaining: number;
};
```

**Session Management:**
- Supabase handles session tokens via HttpOnly cookies (web) or secure storage (mobile)
- `onAuthStateChange` listener updates app state on login/logout
- Session refresh automatic via Supabase client

---

### 6.2 Login Flow

**Screen:** `/login`

**Fields:**
- Email (text input, email keyboard)
- Password (text input, secure entry, toggleable visibility)

**Actions:**
1. **Sign In Button:**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: email.trim().toLowerCase(),
     password: password
   });
   ```
   - On success: Navigate based on workgroup status
   - On error: Show error toast with message

2. **Forgot Password:**
   - Shows modal to enter email
   - Sends OTP via email using `supabase.auth.resetPasswordForEmail()`
   - User enters OTP code + new password
   - Calls `supabase.auth.updateUser({ password: newPassword })`

3. **Sign Up Link:**
   - Navigates to `/sign-up`

**Validation:**
- Email format validation
- Password minimum 8 characters (enforced by Supabase)

---

### 6.3 Sign Up Flow

**Screen:** `/sign-up`

**Fields:**
- Username (text input)
- Email (text input, email keyboard)
- Password (text input, secure entry)
- Confirm Password (text input, secure entry)

**Actions:**
1. **Sign Up Button:**
   - Validate passwords match
   - Validate email format
   - Call Supabase auth signup:
     ```typescript
     const { data, error } = await supabase.auth.signUp({
       email: email.trim().toLowerCase(),
       password: password,
       options: {
         data: { username: username.trim() }
       }
     });
     ```
   - Create profile record (via trigger or explicit insert)
   - Navigate to workgroup-gate

**Email Confirmation:**
- **Current Implementation:** Email confirmation DISABLED
- Users can sign in immediately after signup
- [CLARIFICATION NEEDED]: Should email confirmation be enabled?

---

### 6.4 Workgroup Selection (Gate)

**Screen:** `/workgroup-gate`

**Purpose:** Force users to create or join a workgroup before accessing app

**Actions:**
1. **Create New Workgroup:**
   - Navigate to `/create-workgroup`
   - User enters workgroup name
   - Backend generates unique 6-character `join_code`
   - User becomes owner and admin
   - Update `profiles.workgroup_id` and `profiles.role = 'admin'`

2. **Join with Code:**
   - Navigate to `/join-workgroup`
   - User enters 6-character join code
   - Validate code exists
   - Update `profiles.workgroup_id`
   - Default role: `'member'`

**Business Rules:**
- Users cannot access main app without workgroup membership
- Users can only belong to one workgroup at a time
- Changing workgroup requires leaving current one (or creating new profile)

---

## 7. USER ROLES & PERMISSIONS

### 7.1 Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Workgroup administrator | Full access: all member permissions + admin-only features |
| **Member** | Standard team member | Can manage inventory, scan items, view reports, export data |
| **None/Null** | No role assigned | Cannot access main app (stuck at workgroup-gate) |

### 7.2 Permission Matrix

| Feature/Action | Admin | Member | None |
|----------------|-------|--------|------|
| Create/Edit/Delete Warehouses | ✅ | ✅ | ❌ |
| Create/Edit/Delete Storage Units | ✅ | ✅ | ❌ |
| Create/Edit/Delete Locations | ✅ | ✅ | ❌ |
| Add/Edit/Delete Items | ✅ | ✅ | ❌ |
| Scan Barcodes | ✅ | ✅ | ❌ |
| Adjust Stock Quantities | ✅ | ✅ | ❌ |
| Restock Items | ✅ | ✅ | ❌ |
| **Access Stock Grid (Visual Layout)** | ✅ | ❌ | ❌ |
| **Merge/Delete Locations in Grid** | ✅ | ❌ | ❌ |
| View Activity History | ✅ | ✅ | ❌ |
| Export Reports (CSV/PDF) | ✅ | ✅ | ❌ |
| **Set/Change Admin Passcode** | ✅ | ❌ | ❌ |
| **Manage Team Members (promote/demote/remove)** | ✅ | ❌ | ❌ |
| **Delete Workgroup** | ✅ | ❌ | ❌ |
| Change Own Profile | ✅ | ✅ | ❌ |
| Change Theme/Language | ✅ | ✅ | ✅ |

### 7.3 Admin-Only Features

#### 7.3.1 Stock Grid Access

**Protection:** Admin passcode required

**Flow:**
1. Admin clicks grid icon on storage unit
2. App shows passcode modal (4-8 digit numeric input)
3. User enters passcode
4. If passcode matches `workgroup.admin_passcode`, navigate to `/stock-grid/[storageId]`
5. If incorrect, show error toast

**Grid Capabilities:**
- View visual layout of all locations in storage
- Merge adjacent locations (create multi-slot units)
- Delete empty locations
- View items assigned to each location
- Quick stock removal via quantity modal (tap location with item)

**Exit:**
- "Lock & Exit" button in grid menu
- Returns to previous screen
- Locks grid (requires passcode to re-enter)

---

#### 7.3.2 Member Management

**Screen:** `/manage-members`

**List Display:**
- Shows all members of workgroup
- Each member shows: username, role badge (Admin/Member)

**Actions per Member:**
1. **Promote to Admin:**
   - Updates `profiles.role = 'admin'`
   - Confirmation required
2. **Demote to Member:**
   - Updates `profiles.role = 'member'`
   - Confirmation required
3. **Remove from Workgroup:**
   - Updates `profiles.workgroup_id = NULL`
   - Member loses access to workgroup
   - Confirmation with warning

**Business Rules:**
- Cannot demote/remove self
- Cannot remove workgroup owner (or require transfer)

---

#### 7.3.3 Admin Passcode Management

**Location:** Settings → Security section (admin only)

**Flow:**
1. **If passcode exists:**
   - Show "Change Passcode" button
   - Prompt for current passcode (validation)
   - If correct, prompt for new passcode
   - Update `workgroups.admin_passcode`
2. **If no passcode:**
   - Show "Set Admin Passcode" button
   - Prompt for new passcode (4-8 digits)
   - Save to `workgroups.admin_passcode`

**Purpose:**
- Protects Stock Grid access (location deletion/merging)
- Protects workgroup deletion
- Prevents accidental destructive actions

---

## 8. COMPLETE SCREEN-BY-SCREEN BREAKDOWN

### 8.1 Authentication Screens

#### 8.1.1 Login Screen (`/login`)

**Layout:**
```
┌─────────────────────────┐
│   [App Logo/Icon]       │
│                         │
│   Welcome Back          │
│   Sign in to manage     │
│   your inventory        │
│                         │
│   Email                 │
│   [___________________] │
│                         │
│   Password              │
│   [___________________] │
│   [Show/Hide] Forgot?   │
│                         │
│   [ Sign In ]           │
│                         │
│   Don't have account?   │
│   Sign Up               │
└─────────────────────────┘
```

**Interactions:**
- Email input: lowercase, email keyboard
- Password input: secure, toggle visibility
- "Forgot Password": Opens OTP reset flow (modal)
- Sign In: Validates + calls Supabase auth
- Sign Up link: Navigate to `/sign-up`

**Error States:**
- Invalid credentials: Show toast "Invalid email or password"
- Network error: Show toast "Connection error. Please try again"
- Email not confirmed (if enabled): Show toast "Please verify your email"

---

#### 8.1.2 Sign Up Screen (`/sign-up`)

**Layout:**
```
┌─────────────────────────┐
│   Create Account        │
│   Get started with      │
│   your new workgroup    │
│                         │
│   Username              │
│   [___________________] │
│                         │
│   Email                 │
│   [___________________] │
│                         │
│   Password              │
│   [___________________] │
│   Min 8 char. Letters   │
│   and numbers           │
│                         │
│   Confirm Password      │
│   [___________________] │
│                         │
│   [ Sign Up ]           │
│                         │
│   Already have account? │
│   Sign In               │
└─────────────────────────┘
```

**Validation:**
- Username: required, trimmed
- Email: valid format
- Password: min 8 characters
- Confirm Password: must match password

**Success Flow:**
- Account created → Show success toast
- Auto-login → Navigate to `/workgroup-gate`

---

#### 8.1.3 Workgroup Gate (`/workgroup-gate`)

**Layout:**
```
┌─────────────────────────┐
│   One Last Step         │
│                         │
│   You need to be part   │
│   of a workgroup to     │
│   continue.             │
│                         │
│   ┌─────────────────┐   │
│   │ Create a New    │   │
│   │ Workgroup       │   │
│   └─────────────────┘   │
│                         │
│   ┌─────────────────┐   │
│   │ Join with a     │   │
│   │ Code            │   │
│   └─────────────────┘   │
└─────────────────────────┘
```

**Options:**
1. **Create Workgroup** → `/create-workgroup`
2. **Join with Code** → `/join-workgroup`

---

### 8.2 Main App Screens

#### 8.2.1 Dashboard/Home (`/(tabs)/index`)

**Layout:**
```
┌─────────────────────────────────┐
│  [+ Add] [🔍 Find] [📷 Scan]    │ ← Action buttons
├─────────────────────────────────┤
│  Needs Restock                  │ ← Header (only if items exist)
│                                 │
│  ┌─────────────────────────┐   │
│  │ Widget Bolts            │   │
│  │ Main Warehouse / Shelf A│   │
│  │            [5 / 20] ←   │   │ ← Red indicator
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Steel Plates            │   │
│  │ Warehouse 2 / Storage B │   │
│  │            [8 / 50]     │   │
│  └─────────────────────────┘   │
│                                 │
│  ...                            │
│                                 │
│  [ ⬆ Restock Items ]  ←       │ ← Bottom button (if items)
└─────────────────────────────────┘
```

**Components:**
1. **Header Action Buttons (3):**
   - Add Item: Navigate `/add-item` (with location selection modal)
   - Find Item: Navigate `/find`
   - Scan: Navigate `/scan`

2. **Restock List:**
   - Fetched via `get_restock_items()` RPC
   - Each card shows:
     - Item name
     - Location path (warehouse / storage)
     - Current quantity / restock threshold (in RED)
   - Empty state: "🎉 Everything is well-stocked!"

3. **Restock Button (Bottom):**
   - Only visible if list has items
   - Navigates to `/restock`

**Behavior:**
- Refetch data on screen focus (useFocusEffect)
- 5-second timeout on RPC call to prevent hanging

---

#### 8.2.2 Warehouse Tab (`/(tabs)/warehouse/index`)

**Layout:**
```
┌─────────────────────────────────┐
│  Warehouses              [+]   │ ← Header with add button
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ 🏭 Main Warehouse       │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🏢 Distribution Center  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🏪 Retail Store         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Components:**
- **List of Warehouses:**
  - Each card displays: icon (emoji), name
  - Tap → Navigate to `/warehouse/[id]` (storage list)
- **Add Button (+) in header:**
  - Navigates to `/create-warehouse`
- **Empty State:**
  - "No warehouses found. Create Your First Warehouse"

---

#### 8.2.3 Warehouse Detail (Storage List) (`/warehouse/[id]`)

**Layout:**
```
┌─────────────────────────────────┐
│  ← Main Warehouse         [+]  │ ← Header with back + add
├─────────────────────────────────┤
│  Storage Units                  │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📦 Shelf A        [🎛] ← │ │ ← Grid icon (admin only)
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📦 Freezer Section [🎛]  │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📦 Back Room      [🎛]   │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Components:**
- **Storage Unit Cards:**
  - Icon + Name
  - Tap card → Navigate to `/storage/[id]` (locations list)
  - **Grid Button (Admin Only):**
    - Tap → Prompt for admin passcode
    - If correct → Navigate to `/stock-grid/[storageId]`
- **Add Button (+) in header:**
  - Navigate to `/create-storage` with `warehouseId` param
- **Empty State:**
  - "No storage units found. Tap '+' to add one."

---

#### 8.2.4 Storage Detail (Locations List) (`/storage/[id]`)

**Layout:**
```
┌─────────────────────────────────┐
│  ← Shelf A                [+]  │
├─────────────────────────────────┤
│  Defined Location Slots         │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Shelf A, Row 1, Col 1     │ │
│  │ [Widget Bolts]   (qty:45) │ │ ← Has item
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Shelf A, Row 1, Col 2     │ │
│  │ [Empty]                    │ │ ← Empty slot
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Shelf A, Row 2, Col 1     │ │
│  │ [Steel Plates]  (qty:12)  │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Components:**
- **Location Cards:**
  - Shows: shelf, row, column, container (if set)
  - If item assigned: show item name + quantity
  - If empty: show "Empty" indicator
  - Tap → Navigate to `/edit-location/[id]`
- **Add Button (+):**
  - Navigate to `/create-location` with `storageId` param
- **Empty State:**
  - "No locations defined. Tap '+' to add a location."

---

#### 8.2.5 Add Item Screen (`/add-item`)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Add New Item                      │
├──────────────────────────────────────┤
│  Item Name *                         │
│  [_________________________________] │
│                                      │
│  Quantity *             [ - ] [0] [+]│ ← Stepper
│                                      │
│  Restock at or below *               │
│  [_________________________________] │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Financial & Tax Details    [⚙] │ │ ← Toggle switch
│  └────────────────────────────────┘ │
│                                      │
│  [If toggle ON:]                     │
│  Item Usage:  [Production] [Resale]  │
│                                      │
│  Purchase Price (Net)                │
│  [_______________]  [Tax: 25.5%]     │
│  [25.5%] [14%] [10%] [0%]  ← Tax pills│
│                                      │
│  [If Resale selected:]               │
│  Sale Price (Net)                    │
│  [_______________]  [Tax: 25.5%]     │
│  [25.5%] [14%] [10%] [0%]           │
│                                      │
│  Barcode (Optional)                  │
│  [_________________________________] │
│                                      │
│  Select Location(s)                  │
│  ┌────────────────────────────────┐ │
│  │ Shelf A                         │ │
│  │ [□] [□] [■] [□] [■]  ← Grid    │ │
│  │                                 │ │
│  │ Shelf B                         │ │
│  │ [□] [□] [□]                    │ │
│  └────────────────────────────────┘ │
│  2 locations selected               │
│                                      │
│  [        Add Item        ]          │
└──────────────────────────────────────┘
```

**Behavior:**
1. **Initial Navigation:**
   - If no warehouse/storage selected → redirect to `/select-location-modal`
   - Modal returns `warehouseId` and `storageId` params
   - Screen loads with those params

2. **Quantity Stepper:**
   - Default: 0
   - +/- buttons adjust by 1
   - Direct text input allowed

3. **Financial Toggle:**
   - Collapsed by default
   - Expanding shows usage type + price fields
   - Tax selectors: quick-pick pills for common rates

4. **Location Grid:**
   - Loads all defined_locations for selected storage
   - Groups by shelf
   - Each location = small square chip
   - Tap to toggle selection (color change)
   - Multiple selection allowed

5. **Add Item Button:**
   - Validates: name, quantity, threshold required
   - If multiple locations selected: creates multiple item records (one per location)
   - If no location selected: creates single item with `location_id = NULL`
   - Logs activity: action = 'CREATE'
   - **Resets form** instead of navigating back (allows rapid item entry)

**Validation:**
- Name: required
- Quantity: must be integer >= 0
- Threshold: must be integer >= 0
- Financial fields: optional, but if usage_type = 'resale', sale_price required

---

#### 8.2.6 Find Item Screen (`/find`)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Find Item                         │
├──────────────────────────────────────┤
│  [🔍 Search with item name...]       │ ← Search input
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Widget Bolts              [→]  │ │ ← Search result
│  │ Warehouse: Main Warehouse      │ │
│  │ Storage: Shelf A               │ │
│  │ Location: Row 1, Col 3         │ │
│  │ Quantity: 45                    │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Steel Plates              [→]  │ │
│  │ Warehouse: Distribution Center │ │
│  │ Storage: Back Room             │ │
│  │ Location: Shelf B, Row 2       │ │
│  │ Quantity: 12                    │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Behavior:**
- **Search Input:**
  - Real-time filtering (debounced)
  - Searches `items.name` (case-insensitive)
  - Scoped to current workgroup
- **Result Cards:**
  - Shows: name, warehouse, storage, location, quantity
  - Tap → Navigate to `/edit-item/[id]`
- **Empty State:**
  - "No results found."

---

#### 8.2.7 Scan Screen (`/scan`)

**Layout:**
```
┌──────────────────────────────────────┐
│   [Camera Viewfinder - Full Screen]  │
│                                      │
│   ┌────────────────────┐            │
│   │   Scan Box         │ ← Visual guide
│   │   (250x250)        │
│   └────────────────────┘            │
│   Align barcode within frame         │
│                                      │
│ ╔════════════════════════════════╗  │ ← Bottom sheet
│ ║ Or enter manually              ║  │
│ ║                                ║  │
│ ║ [Enter barcode]          [→]  ║  │
│ ╚════════════════════════════════╝  │
└──────────────────────────────────────┘
```

**Behavior:**
1. **Camera Permission:**
   - On mount: request camera permission
   - If denied: show permission request screen

2. **Barcode Scanning:**
   - Uses expo-camera's `onBarcodeScanned`
   - On scan: debounce to prevent multiple triggers
   - Lookup item by barcode (scoped to workgroup):
     ```typescript
     .eq('barcode', code)
     .eq('workgroup_id', profile.workgroup_id)
     .single()
     ```
   - **If found:** Navigate to `/edit-item/[id]`
   - **If not found:** Navigate to `/select-location-modal` with barcode param (to create new item)

3. **Manual Entry:**
   - Bottom sheet with text input
   - Numeric keyboard
   - Submit button triggers same lookup logic

**Visual Feedback:**
- Scan box turns green on successful scan
- "Processing..." text during lookup
- Haptic feedback on scan (mobile)

---

#### 8.2.8 Restock Screen (`/restock`)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Restock Items                     │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐ │
│  │ [✓] Widget Bolts               │ │ ← Checkbox
│  │     Current: 5 | Needs: 20     │ │
│  │                         [-] [+]│ │ ← Quick adjust
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ [ ] Steel Plates               │ │
│  │     Current: 8 | Needs: 50     │ │
│  │                         [-] [+]│ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ [ ] Copper Wire                │ │
│  │     Current: 12 | Needs: 30    │ │
│  │                         [-] [+]│ │
│  └────────────────────────────────┘ │
│                                      │
│ ╔════════════════════════════════╗  │
│ ║ [ Bulk Stock 2 Items ]         ║  │ ← Footer (if selected)
│ ╚════════════════════════════════╝  │
└──────────────────────────────────────┘
```

**Behavior:**
1. **Data Source:**
   - Fetch via `get_restock_items()` RPC
   - Shows items where `quantity <= restock_threshold`

2. **Individual Adjustment:**
   - +/- buttons: increment/decrement by 1
   - Updates immediately (optimistic UI)
   - Logs activity: action = 'RESTOCK', change_amount = +1 or -1

3. **Bulk Stock:**
   - Select multiple items via checkboxes
   - Tap "Bulk Stock X Items" button
   - Shows modal: "Enter quantity to add to each item"
   - User enters amount (e.g., 10)
   - Calls `bulk_update_item_quantities()` RPC with:
     ```typescript
     updates: selectedItems.map(item => ({
       id: item.id,
       new_quantity: item.quantity + enteredAmount
     }))
     ```
   - Logs activity for each item individually
   - Shows success toast: "X items restocked successfully"

4. **Auto-Remove:**
   - When item.quantity exceeds restock_threshold, item removed from list
   - UI updates instantly (optimistic)

**Empty State:**
- "🎉 All items are stocked!"

---

#### 8.2.9 Stock Grid (Admin) (`/stock-grid/[storageId]`)

**Layout:**
```
┌──────────────────────────────────────┐
│  [Grid View - Scrollable 2D]         │
│                                      │
│  ┌──┬──┬──┬──┬──┬──┐                │
│  │  │  │■ │  │■ │  │  Shelf A       │
│  ├──┼──┼──┼──┼──┼──┤                │
│  │  │  │■ │  │  │  │                │
│  └──┴──┴──┴──┴──┴──┘                │
│                                      │
│  ┌──┬──┬──┬──┐                      │
│  │■ │■ │  │  │  Shelf B             │
│  ├──┼──┼──┼──┤                      │
│  │  │  │  │  │                      │
│  └──┴──┴──┴──┘                      │
│                                      │
│                      [Menu FAB] ←   │ ← Floating action button
└──────────────────────────────────────┘

Menu (FAB pressed):
┌────────────────────┐
│ [⋮] Toggle Grid    │
│ [✏] Edit Layout    │
│ [↩] Exit           │
└────────────────────┘

Edit Mode Menu:
┌────────────────────┐
│ [⋮] Toggle Grid    │
│ [✓] Save Changes   │
│ [✗] Cancel         │
└────────────────────┘
```

**Visual Layout:**
- **Each location slot** = rectangle (size based on width_span/height_span)
- **Color coding:**
  - Empty slots: light gray (dashed border if grid hidden)
  - Occupied slots: card color (solid border)
  - Merged slots: borders removed between merged units
- **Content (if occupied):**
  - Item name (centered, 2 lines max)
  - Quantity badge (top-right corner, color: green if > 0, red if 0)
- **Grid Lines:**
  - Toggle on/off via menu
  - Background grid color vs transparent

**Interactions:**

1. **View Mode (default):**
   - Tap occupied slot → Show quantity modal "Remove stock from [Item Name]"
   - Enter amount to remove
   - Updates item quantity
   - Logs activity: action = 'REMOVE'

2. **Edit Mode (admin passcode required to enter):**
   - **Merge Adjacent Slots:**
     - Each slot shows merge handles (4 directions: ↑ ↓ ← →)
     - Tap handle to merge with neighbor
     - If neighbor occupied: reject with error "Both locations contain items"
     - If mergeable: update both to share same `master_id`
     - Visual: borders removed, single larger unit
   - **Delete Empty Slot:**
     - Tap small [X] button on empty slot
     - Confirmation: "Delete this location?"
     - On confirm: mark for deletion (not committed until Save)
   - **Save Changes:**
     - Commits all merges and deletions to database
     - Updates `defined_locations` records
   - **Cancel:**
     - Discards all pending changes
     - Reverts to original layout

3. **FAB Menu:**
   - **Toggle Grid:** Show/hide grid lines
   - **Edit Layout:** Enter edit mode (requires passcode)
   - **Lock & Exit:** Return to previous screen

**Dynamic Sizing:**
- Grid adapts to screen size
- Calculates unit width/height to fit screen (max 6x8 visible, scrolls if larger)
- Maintains aspect ratio for visual consistency

**Sorting:**
- Shelves sorted naturally (A, B, C... or 1, 2, 10...)
- Rows/columns sorted naturally within each shelf

---

#### 8.2.10 Settings Screen (`/(tabs)/settings`)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Settings                          │
├──────────────────────────────────────┤
│  APPEARANCE                          │
│  ┌────────────────────────────────┐ │
│  │ Dark Mode              [toggle]│ │
│  └────────────────────────────────┘ │
│  [Theme Grid: 6 color options]      │
│                                      │
│  ACCOUNT                             │
│  ┌────────────────────────────────┐ │
│  │ Manage Profile             [>] │ │
│  └────────────────────────────────┘ │
│                                      │
│  GROUP INFO                          │
│  ┌────────────────────────────────┐ │
│  │ Workgroup Name: Roadhouse Inc. │ │
│  │ Join Code: ABC123              │ │
│  └────────────────────────────────┘ │
│                                      │
│  [If Admin:]                         │
│  SECURITY                            │
│  ┌────────────────────────────────┐ │
│  │ 🕑 Event History           [>] │ │
│  │ 🔒 Change Passcode         [>] │ │
│  │ 👥 Manage Members          [>] │ │
│  └────────────────────────────────┘ │
│                                      │
│  LANGUAGE                            │
│  ┌────────────────────────────────┐ │
│  │ [English] [Suomi]              │ │
│  └────────────────────────────────┘ │
│                                      │
│  DATA MANAGEMENT                     │
│  ┌────────────────────────────────┐ │
│  │ Tax Rate (Fallback)  [25.5% ▼]│ │
│  │ Export All Item Data       [↓] │ │
│  └────────────────────────────────┘ │
│                                      │
│  [If Admin:]                         │
│  ┌────────────────────────────────┐ │
│  │ Delete Workgroup (RED)         │ │
│  └────────────────────────────────┘ │
│                                      │
│  [         Log Out         ]         │
└──────────────────────────────────────┘
```

**Sections:**

1. **Appearance:**
   - Dark mode toggle
   - Theme selector: 6 themes (default, industrial, forest, cherryblossom, sunflower, sunset)
   - Each theme changes `colors.selector` value

2. **Account:**
   - "Manage Profile" → `/profile` (change username, password)

3. **Group Info:**
   - Read-only display of workgroup name and join code
   - Join code for inviting new members

4. **Security (Admin only):**
   - Event History → `/history`
   - Change Passcode → Modal flow
   - Manage Members → `/manage-members`

5. **Language:**
   - Toggle between English and Finnish (Suomi)
   - Stored in AsyncStorage, persists across sessions

6. **Data Management:**
   - **Tax Rate Dropdown:**
     - Sets fallback tax rate for items without specific tax
     - Options: 0%, 10%, 14%, 24%, 25.5%
     - Used in export calculations
   - **Export Button:**
     - Shows modal with options:
       - Format: CSV or PDF
       - Timeframe: Today, All, Last X days
     - Generates report (see section 11)

7. **Danger Zone (Admin only):**
   - **Delete Workgroup:**
     - Requires admin passcode
     - Confirmation: "This is irreversible and will delete all data."
     - Calls `delete_current_workgroup()` RPC
     - Logs out user

8. **Logout:**
   - Clears session
   - Navigate to `/login`

---

#### 8.2.11 Profile Screen (`/profile`)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Edit Profile                      │
├──────────────────────────────────────┤
│  Username                             │
│  [_________________________________] │
│                                      │
│  Email (read-only)                   │
│  user@example.com                    │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Change Password                │ │
│  └──���─────────────────────────────┘ │
│                                      │
│  [        Save Changes        ]      │
└──────────────────────────────────────┘

Change Password Modal:
┌──────────────────────────────────────┐
│  Change Password                     │
│                                      │
│  New Password                        │
│  [_________________________________] │
│                                      │
│  Confirm New Password                │
│  [_________________________________] │
│                                      │
│  [Cancel]           [Save]           │
└──────────────────────────────────────┘
```

**Behavior:**
- **Username:** Editable text input
- **Email:** Read-only (from auth)
- **Change Password:**
  - Opens modal
  - Validates: passwords match, min 8 characters
  - Calls `supabase.auth.updateUser({ password: newPassword })`
  - Shows success toast
- **Save Changes:**
  - Updates `profiles.username`
  - Shows success toast

---

#### 8.2.12 History Screen (`/history`)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Activity History           [↓]   │ ← Export button
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐ │
│  │ 2026-02-04 10:30  @john_admin  │ │
│  │ Widget Bolts             [+5]  │ │ ← Green
│  │ RESTOCK         Total: 50      │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ 2026-02-04 09:15  @jane_member │ │
│  │ Steel Plates            [-10]  │ │ ← Red
│  │ REMOVE          Total: 40      │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ 2026-02-03 15:22  @john_admin  │ │
│  │ Copper Wire              [+0]  │ │
│  │ CREATE          Total: 100     │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘

Export Modal:
┌──────────────────────────────────────┐
│  Export History                      │
│                                      │
│  [CSV]  [PDF]  ← Format toggle       │
│                                      │
│  [ Today (24h) ]                     │
│  [ From Start (All) ]                │
│                                      │
│  Last [30] Days  [→]                 │
│                                      │
│  [Cancel]                            │
└──────────────────────────────────────┘
```

**Data:**
- Fetched from `activity_logs` table
- Scoped to current workgroup
- Limited to last 50 entries for display (export has no limit)
- Joins with `profiles` to show username

**Display:**
- Each log entry shows:
  - Date/time
  - Username
  - Item name
  - Action (badge with color)
  - Change amount (+/- with color)
  - Final quantity

**Action Colors:**
- RESTOCK: Green
- REMOVE: Red
- CREATE: Blue
- UPDATE: Gray

**Export:**
- Tap header export icon → Show modal
- Select format (CSV or PDF)
- Select timeframe
- Generate and share file

---

### 8.3 Onboarding Screens

#### 8.3.1 Welcome Screen (`/onboarding/welcome`)

**Purpose:** First-time user introduction

**Layout:**
```
┌──────────────────────────────────────┐
│                                      │
│       [App Icon (100x100)]           │
│                                      │
│   Welcome to StoreTool               │
│   Your complete inventory            │
│   management solution                │
│                                      │
│   ┌────────────────────────────┐    │
│   │ 🏭 Warehouse Management    │    │
│   │ Organize across locations  │    │
│   └────────────────────────────┘    │
│                                      │
│   ┌────────────────────────────┐    │
│   │ 📷 Barcode Scanning        │    │
│   │ Quick lookup and entry     │    │
│   └────────────────────────────┘    │
│                                      │
│   [More features...]                 │
│                                      │
│   [Scroll indicator ↓]               │
│                                      │
│   [ See How It Works → ]             │ ← Bottom (after scroll)
└──────────────────────────────────────┘
```

**Behavior:**
- Animated entrance (fade + slide)
- Scroll to reveal all features
- "Continue" button appears after scrolling to bottom
- "Skip intro" link in top-right
- Tapping Continue → `/onboarding/demo`

---

#### 8.3.2 Demo Screens

**Series of interactive demos:**
1. `/onboarding/demo` - Overview selection
2. `/onboarding/demo-warehouse` - Warehouse organization
3. `/onboarding/demo-inventory` - Item management
4. `/onboarding/demo-scanning` - Barcode scanning

**Features:**
- Interactive elements (tap to try)
- Visual animations
- "Next" button to progress
- "Skip" button to jump to paywall

---

#### 8.3.3 Completion & Paywall (`/onboarding/completion` → `/onboarding/paywall`)

**Completion Screen:**
- Congratulations message
- Summary of learned features
- "Unlock Full Access" button → Paywall

**Paywall Screen:**
```
┌──────────────────────────────────────┐
│   Unlock StoreTool                   │
│   Streamline your inventory          │
│                                      │
│   Free for 7 days, then $9.99/mo    │
│                                      │
│   What's Included:                   │
│   ✓ Unlimited Warehouses             │
│   ✓ Barcode Scanning                 │
│   ✓ Export to CSV/PDF                │
│   ✓ Team Roles & Admin Controls      │
│                                      │
│   [ Start 7-Day Free Trial ]         │
│                                      │
│   Cancel anytime. No commitment.     │
│                                      │
│   [Restore]  [Terms]  [Privacy]      │
└──────────────────────────────────────┘
```

**Behavior:**
- "Start Trial" → Sets `trial_ends_at = now() + 7 days`
- User proceeds to create/join workgroup
- [CLARIFICATION NEEDED]: RevenueCat integration details

---

## 9. BUSINESS LOGIC & WORKFLOWS

### 9.1 Item Lifecycle

```
┌─────────────┐
│  CREATE     │ ← User adds item (scan or manual)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  IN STOCK   │ ← quantity > restock_threshold
└──────┬──────┘
       │
       │ (quantity decreases)
       ▼
┌─────────────┐
│  LOW STOCK  │ ← quantity <= restock_threshold
└──────┬──────┘   → Appears in restock list
       │
       │ (restock action)
       ▼
┌─────────────┐
│  IN STOCK   │ ← quantity > restock_threshold
└──────┬──────┘   → Removed from restock list
       │
       │ (optional)
       ▼
┌─────────────┐
│  DELETE     │ ← User deletes item
└─────────────┘   → Logged in activity_logs
```

**State Transitions:**
- **quantity > restock_threshold** → Item is "well-stocked"
- **quantity <= restock_threshold** → Item appears in restock workflow
- **quantity = 0** → Item still exists, just out of stock
- **Item deleted** → Soft delete (keeps logs) or hard delete [CLARIFICATION NEEDED]

---

### 9.2 Location Merging Workflow (Stock Grid)

**Purpose:** Combine multiple small location slots into larger visual units

**Flow:**
```
1. Admin enters Stock Grid
2. Activates Edit Mode (requires passcode)
3. Selects a location slot
4. Taps merge handle (↑ ↓ ← →)
5. System validates:
   - Is there a neighbor in that direction?
   - Are both slots empty OR only one occupied?
6. If valid: Update master_id to create group
7. Visual: Borders removed, treated as single unit
8. Admin clicks "Save Changes"
9. Database updates committed
```

**Validation Rules:**
- Cannot merge if both slots have items
- Can merge if one or both empty
- If one has item: item appears in merged unit
- Merged units span multiple grid coordinates
- Items assigned to any merged location show in the unified display

**Unmerge:**
- Delete one of the merged locations
- Remaining locations revert to individual slots

---

### 9.3 Barcode Workflow

**Scenario 1: Existing Item**
```
User scans barcode
  → Lookup: items WHERE barcode = X AND workgroup_id = Y
  → Item found
  → Navigate to /edit-item/[id]
  → User can adjust quantity, update details
```

**Scenario 2: New Item**
```
User scans barcode
  → Lookup: items WHERE barcode = X AND workgroup_id = Y
  → Item NOT found
  → Navigate to /select-location-modal with barcode param
  → User selects warehouse + storage
  → Navigate to /add-item with barcode pre-filled
  → User enters name, quantity, etc.
  → Create new item with barcode
```

**Scenario 3: Barcode Collision (different workgroup)**
```
User scans barcode
  → Lookup: items WHERE barcode = X AND workgroup_id = Y
  → Item NOT found (even though exists in workgroup Z)
  → System treats as new item (correct behavior)
  → Creates item in user's workgroup
  → No cross-workgroup data leak
```

---

### 9.4 Restock Workflow

**Individual Restock:**
```
1. Dashboard shows "Needs Restock" section
2. User taps "Restock Items" button
3. Navigate to /restock screen
4. List shows all items where quantity <= restock_threshold
5. User taps +/- to adjust quantity
6. Each adjustment:
   - Updates item.quantity in database
   - Logs activity (RESTOCK action)
   - If new quantity > restock_threshold, removes from list
```

**Bulk Restock:**
```
1. User on /restock screen
2. Selects multiple items via checkboxes
3. Taps "Bulk Stock X Items" button
4. Modal: "Enter quantity to add to each item"
5. User enters amount (e.g., 10)
6. System calls bulk_update_item_quantities RPC:
   - For each selected item: new_quantity = current + amount
   - Single transaction (all or nothing)
7. Logs activity for each item individually
8. Shows success toast
9. Removes items from list if above threshold
```

---

### 9.5 Export Workflow

**Inventory Export:**
```
1. User navigates to Settings
2. Taps "Export All Item Data"
3. Modal appears with options:
   - Format: CSV or PDF
   - Timeframe: Today, All, Last X days
4. User selects options, taps export
5. System:
   a. Queries items with filters
   b. Joins with warehouses, storages for location names
   c. Calculates financials:
      - Per-item: quantity × purchase_price
      - Tax: Net × (1 + purchase_vat_percent/100)
      - Totals: Sum of all items (Net and Gross)
   d. Formats data (CSV or HTML for PDF)
   e. Generates file
   f. Shares via system share sheet
```

**History Export:**
```
1. User navigates to /history
2. Taps export icon in header
3. Modal appears with same options
4. System:
   a. Queries activity_logs with filters
   b. Joins with profiles for usernames
   c. Formats as CSV or PDF
   d. Shares via system share sheet
```

**CSV Structure (Inventory):**
```csv
Warehouse,Storage,Name,Quantity,Unit Cost,Tax %,Cost (Net),Cost (Gross)
Main,Shelf A,Widget Bolts,45,2.50,25.5,112.50,141.19
...
,,,,COST OF STOCK,,1250.00,
,,,,WITH TAX,,1568.75,
```

**PDF Structure:**
- Header with title, date, user
- Table with columns (same as CSV)
- Footer with totals
- Styled for printing/sharing

---

## 10. UI/UX SPECIFICATIONS

### 10.1 Design System

#### Color System

**6 Theme Variants:**
| Theme | Selector Color | Representative |
|-------|----------------|----------------|
| Default | #10567A | Teal blue |
| Industrial | #C9C9C9 | Gray |
| Forest | #064D06 | Dark green |
| Cherryblossom | #EBC7D4 | Pink |
| Sunflower | #FFEA00 | Yellow |
| Sunset | #D93000 | Red-orange |

**Color Roles (per theme):**
```typescript
{
  background: string;      // Screen background
  card: string;            // Card/container background
  text: string;            // Primary text color
  subtext: string;         // Secondary text color
  primary: string;         // Accent color (orange)
  primaryText: string;     // Text on primary color
  selector: string;        // Theme's main color
  border: string;          // Borders, dividers
  success: string;         // Green for success
  danger: string;          // Red for errors/delete
  primaryMuted: string;    // Translucent primary
  textShadow: string;      // Shadows
  textWhite: string;       // White text
}
```

**Light/Dark Mode:**
- Each theme has light and dark variant
- Toggle in settings
- Persists across sessions

---

#### Typography System

**Font Hierarchy:**
```typescript
{
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
}
```

**Usage:**
```typescript
<Text style={[typography.h2, { color: colors.text }]}>Heading</Text>
```

---

#### Spacing System

**8px base unit:**
- Padding: 8, 16, 24, 32
- Margins: 8, 16, 24, 32
- Gaps: 4, 8, 12, 16

**Screen Padding:**
- Default horizontal: 24px
- Default vertical: 16px
- Content containers: 16px internal padding

---

#### Component Patterns

**Card:**
```typescript
{
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
}
```

**Button (Primary):**
```typescript
{
  backgroundColor: colors.primary,
  borderRadius: 8,
  padding: 16,
  alignItems: 'center',
}
```

**Button (Secondary):**
```typescript
{
  backgroundColor: colors.card,
  borderRadius: 8,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: 'center',
}
```

**Input Field:**
```typescript
{
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
  color: colors.text,
}
```

---

### 10.2 Interaction Patterns

#### Modal Dialogs

**Confirmation Modal:**
- Semi-transparent overlay (rgba(0,0,0,0.6))
- Centered card with title, message, buttons
- "Cancel" (left, gray) + "Confirm" (right, primary/danger)
- Closes on overlay tap (optional)

**Passcode Modal:**
- Numeric input (4-8 digits)
- Masked/unmasked toggle
- Submit button
- Validation on submit

**Quantity Modal:**
- Large numeric input
- "Remove" or "Add" action
- Validation (must be positive integer)

---

#### Toast Notifications

**Success:**
```typescript
showSuccess(title: string, message: string);
// Green toast, auto-dismiss after 3 seconds
```

**Error:**
```typescript
showError(title: string, message: string);
// Red toast, auto-dismiss after 4 seconds
```

**Position:** Top of screen
**Animation:** Slide down + fade in

---

#### Loading States

**Inline Spinner:**
```typescript
<ActivityIndicator size="small" color={colors.primary} />
```

**Full Screen:**
```typescript
<View style={styles.centered}>
  <ActivityIndicator size="large" color={colors.primary} />
</View>
```

**Button Loading:**
- Replace button text with spinner
- Disable button interaction

---

### 10.3 Navigation Transitions

**Stack Navigation:**
- Push: Slide from right
- Pop: Slide to right
- Default animation (platform-specific)

**Tab Navigation:**
- No animation
- Instant switch between tabs

**Modal Presentation:**
- Slide up from bottom (iOS style)
- Fade in (Android style)

---

### 10.4 Accessibility

**Minimum Touch Targets:** 44x44 pixels
**Text Contrast:** WCAG AA compliant
**Screen Reader Support:** Via React Native accessibility props
**Keyboard Navigation:** Not applicable (mobile-first)

---

## 11. DATA EXPORT & REPORTING

### 11.1 Inventory Export

**Purpose:** Generate snapshot of all inventory with financial totals

**Data Included:**
- Warehouse name
- Storage name
- Item name
- Quantity
- Unit cost (purchase_price)
- Tax percentage
- Total cost (net): quantity × unit cost
- Total cost (gross): net × (1 + tax/100)
- Summary totals

**Format Options:**
1. **CSV:**
   - Plain text, comma-separated
   - Compatible with Excel, Google Sheets
   - Includes header row + summary rows
2. **PDF:**
   - Formatted table with styling
   - Printable
   - Professional appearance

**Filters:**
- **Today:** Items updated in last 24 hours (filters by `updated_at`)
- **All:** Every item in workgroup
- **Last X days:** Custom range

**Financial Calculation:**
```typescript
const unitCost = item.purchase_price || item.cost_per_unit || 0;
const taxPercent = item.purchase_vat_percent || globalTaxRate * 100;
const rowTotalNet = item.quantity * unitCost;
const taxMultiplier = 1 + (taxPercent / 100);
const rowTotalGross = rowTotalNet * taxMultiplier;

totalNetStockValue += rowTotalNet;
totalGrossStockValue += rowTotalGross;
```

**Tax Fallback:**
- If item has `purchase_vat_percent`, use it
- Otherwise, use global tax rate from settings (default 25.5%)

---

### 11.2 History Export

**Purpose:** Generate audit trail report

**Data Included:**
- Date/time of action
- Username (who performed action)
- Item name
- Action type (CREATE, RESTOCK, REMOVE, etc.)
- Change amount (+/-)
- Final quantity after action

**Format Options:**
- CSV: Tabular data
- PDF: Formatted report with color-coded actions

**Filters:**
- Same as inventory export (Today, All, Last X days)

---

## 12. INTERNATIONALIZATION

### 12.1 Supported Languages

1. **English (en)** - Default
2. **Finnish (fi)** - Full translation

### 12.2 Translation Keys

**Structure:**
```json
{
  "common": { "error": "Error", "success": "Success" },
  "general": { ... },
  "auth": { "loginHeader": "Welcome Back", ... },
  "dashboard": { "title": "Dashboard", ... },
  "warehouse": { ... },
  "storage": { ... },
  "location": { ... },
  "item": { ... },
  "restock": { ... },
  "scan": { ... },
  "settings": { ... },
  "profile": { ... },
  "find": { ... },
  "stockGrid": { ... },
  "themes": { ... },
  "workgroup": { ... },
  "history": { ... },
  "pilot": { ... },
  "export": { ... },
  "paywall": { ... },
  "onboarding": { ... }
}
```

### 12.3 Implementation

**Library:** react-i18next
**Provider:** I18nextProvider wrapping app
**Usage:**
```typescript
const { t } = useTranslation();
<Text>{t('dashboard.title')}</Text>
```

**Language Switch:**
- Settings screen toggle
- Calls `i18n.changeLanguage('en' | 'fi')`
- Updates AsyncStorage for persistence

---

## 13. EDGE CASES & ERROR HANDLING

### 13.1 Authentication Edge Cases

| Scenario | Behavior |
|----------|----------|
| User signs up but doesn't confirm email | Allowed to login immediately (confirmation disabled) |
| User forgets password | OTP sent to email → Enter code + new password |
| Session expires | Auto-refresh via Supabase client |
| Logout during active operation | Flag set to prevent redirect loop, navigate to login |
| User deleted from workgroup while logged in | Next API call fails with RLS error → Show error, logout |

### 13.2 Workgroup Edge Cases

| Scenario | Behavior |
|----------|----------|
| Join code doesn't exist | Show error: "Invalid join code" |
| User tries to join while already in workgroup | [CLARIFICATION NEEDED]: Allow or reject? |
| Last admin leaves workgroup | [CLARIFICATION NEEDED]: Promote someone or delete workgroup? |
| Workgroup deleted while user logged in | Next API call fails → Show error, logout, clear workgroup |

### 13.3 Inventory Edge Cases

| Scenario | Behavior |
|----------|----------|
| Barcode scanned matches item in different workgroup | Not found (correct: prevents cross-tenant leak) |
| Two users edit same item simultaneously | Last write wins (optimistic locking not implemented) |
| Item deleted while user viewing it | Navigate away, show error toast |
| Location deleted with item assigned | [CLARIFICATION NEEDED]: Set location_id = NULL or prevent deletion? |
| Quantity goes negative | Validation prevents (quantity >= 0 constraint) |

### 13.4 Stock Grid Edge Cases

| Scenario | Behavior |
|----------|----------|
| Merge locations both with items | Reject: "Both locations contain items. Empty one first." |
| Delete location with item | [CLARIFICATION NEEDED]: Prevent or set item.location_id = NULL? |
| Exit edit mode without saving | Prompt: "Save changes?" with Discard/Save options |
| Admin passcode forgotten | [CLARIFICATION NEEDED]: Recovery mechanism? |

### 13.5 Export Edge Cases

| Scenario | Behavior |
|----------|----------|
| No data in selected timeframe | Show error: "No data to export" |
| Export fails (file system error) | Show error toast with message |
| User cancels share dialog | No action, return to screen |

### 13.6 Network & Offline Behavior

**Current Implementation:**
- **No offline mode** (requires active connection)
- API calls timeout after 5 seconds (home screen RPC)
- Failed requests show error toasts
- [CLARIFICATION NEEDED]: Should offline queue be implemented?

**Desired Behavior (Future):**
- Queue mutations locally
- Sync when connection restored
- Show "Offline" indicator
- [CLARIFICATION NEEDED]: Scope of offline support?

---

## 14. OFFLINE BEHAVIOR & NETWORK

### 14.1 Current State

**Online-Only:**
- All operations require active internet connection
- No local caching of data
- Supabase queries fail immediately if offline
- User sees error toasts for failed operations

**Timeout Handling:**
- Home screen RPC has 5-second timeout
- Other queries use default Supabase timeout
- Prevents app hanging indefinitely

### 14.2 Network Error Handling

**User-Facing Messages:**
- Generic: "Connection error. Please try again."
- Specific: "Request timed out"
- Database errors shown as-is (could be improved)

**Retry Logic:**
- Manual: User must tap button again
- No automatic retry

### 14.3 Future Considerations

**Potential Offline Features:**
1. **Read-Only Caching:**
   - Cache last fetched items, warehouses, storages
   - Show cached data when offline
   - Prevent mutations

2. **Offline Queue:**
   - Store mutations (add item, adjust quantity) locally
   - Sync when online
   - Conflict resolution strategy needed

3. **Indicators:**
   - "Offline" banner at top
   - Disable buttons that require network

[CLARIFICATION NEEDED]: Priority and scope for offline support?

---

## 15. SUBSCRIPTION & TRIAL MANAGEMENT

### 15.1 Trial System

**Implementation:**
- `profiles.trial_ends_at` stores expiration timestamp
- Set to `now() + 7 days` on signup or trial activation
- Checked on login to determine subscription status

**States:**
```typescript
type SubscriptionStatus =
  | 'trial_active'    // trial_ends_at > now()
  | 'trial_expired'   // trial_ends_at < now()
  | 'subscribed'      // [CLARIFICATION NEEDED]: How determined?
  | 'none'            // trial_ends_at is null
```

**Trial Enforcement:**
- **trial_active:** Full app access
- **trial_expired:** Redirect to paywall screen
- **subscribed:** Full app access (no expiration)

### 15.2 Paywall Flow

**Trigger Points:**
1. After onboarding completion
2. On login if trial expired
3. [CLARIFICATION NEEDED]: Any in-app prompts?

**Paywall Screen:**
- Shows trial/subscription benefits
- "Start 7-Day Free Trial" button
- Subscription options (if RevenueCat integrated)
- "Restore" button for previous purchases

**Actions:**
- **Start Trial:** Sets `trial_ends_at`, allows app access
- **Subscribe:** [CLARIFICATION NEEDED]: RevenueCat flow?
- **Restore:** [CLARIFICATION NEEDED]: RevenueCat restore flow?

### 15.3 RevenueCat Integration

**Mentioned in Code:**
- `react-native-purchases` package in package.json
- Reference in onboarding screens

**Implementation Status:**
- [CLARIFICATION NEEDED]: Is RevenueCat configured?
- [CLARIFICATION NEEDED]: What are subscription tiers and prices?
- [CLARIFICATION NEEDED]: How is subscription status synced to database?

**Typical Flow (if implemented):**
1. User taps "Subscribe"
2. App shows native payment sheet (Apple/Google)
3. User completes purchase
4. RevenueCat notifies backend
5. Update `profiles` with subscription status
6. Grant full access

---

## 16. CLARIFICATION QUESTIONS

The following aspects require clarification for complete reproduction:

### 16.1 Database & Backend

1. **Database Migrations:**
   - Are there migration files we should reference?
   - What's the exact schema for all indexes?
   - Are there database triggers (e.g., for `updated_at` auto-update)?

2. **RLS Policies:**
   - Should admin passcode be hashed/encrypted in database?
   - Should barcode uniqueness be enforced at DB level per workgroup?

3. **Deletion Cascades:**
   - When location deleted with item assigned: prevent or set item.location_id = NULL?
   - When user deleted: hard delete or soft delete (set deleted_at)?
   - When item deleted: keep logs (item_name denormalized) or cascade delete logs?

4. **Data Integrity:**
   - Should one location have max one item (enforce unique location_id)?
   - Can items exist without warehouse/storage? (Currently required)

### 16.2 Business Logic

5. **Financial Tracking:**
   - What's the business difference between "production" and "resale" usage types?
   - Are there any calculations done with sale_price beyond storage?
   - Should cost_per_unit be deprecated entirely or keep for backwards compatibility?

6. **Stock Grid:**
   - What are the constraints on merging? (Same shelf only? Max size?)
   - What happens if user tries to merge locations from different shelves?
   - Should width_span/height_span have max values?

7. **Workgroup Management:**
   - Can user belong to multiple workgroups? (Currently: no, one at a time)
   - What happens if last admin leaves workgroup? (Promote someone? Delete group?)
   - Can user switch workgroups without leaving current one?

### 16.3 Subscription & Monetization

8. **RevenueCat:**
   - Is RevenueCat fully integrated or placeholder?
   - What are the subscription tiers: Individual, Company?
   - What are the prices: Monthly $9.99, Yearly with discount?
   - How is subscription status stored in database?
   - What features are locked behind subscription?

9. **Trial Logic:**
   - Can user start multiple trials (create new accounts)?
   - What happens after trial expires? (Full lockout or limited access?)
   - Is there a grace period after expiration?

### 16.4 Platform & Deployment

10. **Target Platforms:**
    - Primary target: iOS, Android, or both?
    - Any minimum version requirements?
    - Web deployment planned? (Expo supports web output)

11. **Third-Party Services:**
    - Supabase project ID and configuration?
    - Are there any other external services integrated?

### 16.5 Features & Behavior

12. **Offline Support:**
    - Is offline mode required? If so, what's the scope?
    - Should mutations queue locally or reject?
    - Read-only caching acceptable?

13. **Real-time Updates:**
    - Should inventory updates appear live across devices?
    - Is Supabase Realtime enabled?
    - Which tables need realtime subscriptions?

14. **Barcode System:**
    - Support for QR codes in addition to barcodes?
    - Any specific barcode formats required (EAN-13, UPC-A)?

15. **Email Confirmation:**
    - Should email confirmation be enabled for signups?
    - Supabase Auth config: confirm email on signup?

16. **Member Permissions:**
    - Can members be restricted further (read-only access)?
    - Should there be a "viewer" role?

### 16.6 UI/UX Clarifications

17. **Stock Grid:**
    - Should grid auto-save or require explicit Save?
    - Undo/redo functionality needed?

18. **Item Addition:**
    - Should adding item navigate back or stay on form (current: stay)?
    - Allow adding items without location? (Current: yes, location_id nullable)

19. **Search:**
    - Should search include barcode in addition to name?
    - Filter options needed (by warehouse, by low stock, etc.)?

---

## APPENDIX A: GLOSSARY

**Workgroup:** Multi-tenant workspace representing a team/organization. All data scoped to workgroup.

**Warehouse:** Top-level physical location for inventory storage (building, facility).

**Storage Unit:** Container/area within warehouse (shelf, rack, room, freezer).

**Defined Location:** Precise slot within storage unit (shelf A, row 3, column 5).

**Location Slot:** Same as defined location (used interchangeably).

**Stock Grid:** Visual admin interface showing location layout in 2D grid format.

**Master ID:** Identifier linking merged location slots into single visual unit.

**Restock Threshold:** Minimum quantity before item triggers restock alert.

**RLS (Row Level Security):** Supabase security feature enforcing multi-tenant isolation.

**Barcode:** Unique identifier for item scanning (not globally unique, scoped to workgroup).

**Activity Log:** Immutable audit trail entry recording inventory action.

**Admin Passcode:** Numeric code protecting sensitive operations (stock grid, deletion).

**Usage Type:** Item classification (production: used in manufacturing, resale: sold to customers).

**Trial Period:** 7-day free access period before subscription required.

**Onboarding Flow:** First-time user introduction and setup process.

---

## APPENDIX B: API SURFACE

### Supabase Tables (Direct Access)

```typescript
// Read operations
supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
supabase.from('workgroups').select('*').eq('id', workgroupId).single()
supabase.from('warehouses').select('*').eq('workgroup_id', wgId)
supabase.from('storages').select('*').eq('warehouse_id', whId)
supabase.from('defined_locations').select('*').eq('storage_id', stId)
supabase.from('items').select('*').eq('workgroup_id', wgId)
supabase.from('activity_logs').select('*').eq('workgroup_id', wgId)

// Write operations
supabase.from('items').insert({ ... })
supabase.from('items').update({ quantity: X }).eq('id', itemId)
supabase.from('items').delete().eq('id', itemId)
supabase.from('activity_logs').insert({ ... })
```

### Supabase RPC Functions

```typescript
supabase.rpc('get_restock_items') → RestockItem[]
supabase.rpc('bulk_update_item_quantities', { updates: [...] })
supabase.rpc('delete_current_workgroup')
```

### Supabase Auth

```typescript
supabase.auth.signUp({ email, password, options })
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()
supabase.auth.resetPasswordForEmail(email)
supabase.auth.updateUser({ password })
supabase.auth.getSession()
supabase.auth.onAuthStateChange(callback)
```

---

## APPENDIX C: FILE STRUCTURE REFERENCE

```
/app
  /_layout.tsx                  # Root layout
  /(tabs)
    /_layout.tsx                # Tab layout
    /index.tsx                  # Dashboard
    /warehouse
      /_layout.tsx              # Warehouse tab stack
      /index.tsx                # Warehouse list
    /settings.tsx               # Settings screen
  /login.tsx
  /sign-up.tsx
  /workgroup-gate.tsx
  /create-workgroup.tsx
  /join-workgroup.tsx
  /add-item.tsx
  /edit-item/[id].tsx
  /find.tsx
  /scan.tsx
  /restock.tsx
  /create-warehouse.tsx
  /warehouse/[id].tsx           # Warehouse detail
  /create-storage.tsx
  /storage/[id].tsx             # Storage detail
  /create-location.tsx
  /edit-location/[id].tsx
  /select-location-modal.tsx
  /stock-grid/[storageId].tsx   # Admin grid
  /profile.tsx
  /history.tsx
  /manage-members.tsx
  /onboarding
    /_layout.tsx
    /welcome.tsx
    /demo.tsx
    /demo-warehouse.tsx
    /demo-inventory.tsx
    /demo-scanning.tsx
    /completion.tsx
    /paywall.tsx
    /setup-grid.tsx
/components
  /ChangePasswordModal.tsx
  /ConfirmationModal.tsx
  /dropdownPicker.tsx
  /PasscodeModal.tsx
  /QuantityModal.tsx
/providers
  /AuthProvider.tsx
  /ThemeProvider.tsx
  /ModalProvider.tsx
  /OnboardingProvider.tsx
/lib
  /supabase.ts                  # Supabase client setup
  /logger.ts                    # Activity logging helper
  /toast.ts                     # Toast notifications
  /offline.ts                   # Offline detection [CLARIFICATION NEEDED]
  /nanoid.ts                    # ID generation
/styles
  /typography.ts                # Typography system
/locales
  /en/translation.json
  /fi/translation.json
/i18n.ts                        # i18next config
```

---

## APPENDIX D: ENVIRONMENT VARIABLES

```bash
# .env file
EXPO_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

**Usage:**
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

[CLARIFICATION NEEDED]: Actual Supabase project details for deployment?

---

## CONCLUSION

This specification provides a complete blueprint for reproducing the StoreTool inventory management application. It covers all functional requirements, technical architecture, database schema, user workflows, and UI/UX details necessary for implementation.

**Next Steps for Development:**
1. Set up Supabase project with provided schema
2. Configure authentication and RLS policies
3. Implement database RPC functions
4. Build React Native app following screen-by-screen specifications
5. Integrate barcode scanning and export functionality
6. Test multi-tenant isolation thoroughly
7. Address clarification questions before production deployment

**Key Success Criteria:**
- ✅ Multi-tenant isolation (no data leaks between workgroups)
- ✅ Barcode scanning functional and scoped correctly
- ✅ Stock grid admin features working (merge, delete)
- ✅ Complete audit trail in activity logs
- ✅ Export functionality (CSV/PDF) with accurate financials
- ✅ Role-based access control (admin/member)
- ✅ Trial and subscription management
- ✅ Internationalization (English/Finnish)

---

**END OF SPECIFICATION**
