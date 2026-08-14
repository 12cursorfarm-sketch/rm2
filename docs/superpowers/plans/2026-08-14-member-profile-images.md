# Member Profile Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow gym staff to add, change, and view member profile photos using file upload or live camera photo capture stored in Supabase Storage.

**Architecture:** Create a `lib/storage.ts` utility for uploading files to Supabase Storage `member-photos` bucket, a reusable `components/ui/ImageUploader.tsx` with file drag-and-drop and browser webcam photo capture, and integrate it into `AddMemberForm.tsx`, `EditMemberModal.tsx`, `MemberProfile.tsx`, and `MembersTable.tsx`.

**Tech Stack:** Next.js, React, Tailwind CSS, Supabase JS Client, HTML5 MediaDevices API (`getUserMedia`).

## Global Constraints
- Naming convention: camelCase for properties, PascalCase for components.
- Image format: JPEG/PNG/WebP, upload bucket: `member-photos`.
- Fallback: Gracefully fallback to base64 data URL if Supabase storage bucket is unavailable/offline.

---

### Task 1: Supabase Storage Utility (`lib/storage.ts`)

**Files:**
- Create: `lib/storage.ts`

**Interfaces:**
- Produces: `uploadMemberPhoto(file: Blob | File): Promise<string>`

- [ ] **Step 1: Write `lib/storage.ts`**

```typescript
import { supabase } from "@/utils/supabase/client"

export async function uploadMemberPhoto(file: Blob | File): Promise<string> {
  const fileExt = file.type?.split('/')[1] || 'jpg'
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const filePath = `photos/${fileName}`

  try {
    const { data, error } = await supabase.storage
      .from('member-photos')
      .upload(filePath, file, { upsert: true })

    if (error) {
      console.warn("Supabase storage upload error, using base64 fallback:", error)
      return await fileToBase64(file)
    }

    const { data: publicUrlData } = supabase.storage
      .from('member-photos')
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  } catch (err) {
    console.warn("Storage upload failed, fallback to base64:", err)
    return await fileToBase64(file)
  }
}

function fileToBase64(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 2: Commit Task 1**

```bash
git add lib/storage.ts
git commit -m "feat: add storage utility for uploading member photos"
```

---

### Task 2: Reusable `ImageUploader` Component (`components/ui/ImageUploader.tsx`)

**Files:**
- Create: `components/ui/ImageUploader.tsx`

**Interfaces:**
- Consumes: `uploadMemberPhoto` from `lib/storage.ts`
- Produces: `<ImageUploader value={photoUrl} onChange={(url) => void} name={memberName} />`

- [ ] **Step 1: Write `components/ui/ImageUploader.tsx`**

Include preview avatar, file selection, drag & drop, webcam camera modal (with `navigator.mediaDevices.getUserMedia`), snap photo button, loading state, and clear photo option.

- [ ] **Step 2: Commit Task 2**

```bash
git add components/ui/ImageUploader.tsx
git commit -m "feat: add reusable ImageUploader component with webcam support"
```

---

### Task 3: Form Integrations (`AddMemberForm.tsx` and `EditMemberModal.tsx`)

**Files:**
- Modify: `components/members/AddMemberForm.tsx`
- Modify: `components/members/EditMemberModal.tsx`

**Interfaces:**
- Consumes: `<ImageUploader>` from `components/ui/ImageUploader.tsx`

- [ ] **Step 1: Integrate into `AddMemberForm.tsx`**
Add `<ImageUploader>` field and bind state to form payload `photo_url`.

- [ ] **Step 2: Integrate into `EditMemberModal.tsx`**
Add `<ImageUploader>` field and save updated `photo_url` to Supabase `members` table.

- [ ] **Step 3: Commit Task 3**

```bash
git add components/members/AddMemberForm.tsx components/members/EditMemberModal.tsx
git commit -m "feat: add photo uploader to member registration and edit modal"
```

---

### Task 4: Profile Page & Table Integration (`MemberProfile.tsx` and `MembersTable.tsx`)

**Files:**
- Modify: `components/members/MemberProfile.tsx`
- Modify: `components/members/MembersTable.tsx`

- [ ] **Step 1: Enable direct avatar photo edit on `MemberProfile.tsx`**
Allow clicking on the member's profile avatar to launch image uploader and auto-update `photo_url` in database.

- [ ] **Step 2: Verify `MembersTable.tsx` avatar rendering**
Ensure member table displays avatar image or initial fallback correctly.

- [ ] **Step 3: Commit Task 4**

```bash
git add components/members/MemberProfile.tsx components/members/MembersTable.tsx
git commit -m "feat: enable profile page direct photo update and avatar display"
```
