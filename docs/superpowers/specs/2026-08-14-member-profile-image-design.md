# Design Specification: Member Profile Image Feature

## Overview
This feature allows gym staff to attach profile images to gym members. Staff can either upload an image file (JPEG, PNG, WebP) via drag-and-drop/file browser or capture a live photo directly using the device webcam. Images are stored in Supabase Storage, and public URLs are saved in `members.photo_url`.

## Requirements
1. **File Upload**: Support image file selection, drag-and-drop, and preview before saving.
2. **Webcam Capture**: Live camera preview modal allowing staff to snap photos directly in browser.
3. **Supabase Storage Integration**: Upload images to Supabase Storage bucket `member-photos`, generating public URLs. Fallback gracefully if bucket requires creation or offline mock DB is used.
4. **UI Integration**:
   - `AddMemberForm.tsx`: Add profile image picker during member registration.
   - `EditMemberModal.tsx`: Edit member profile image.
   - `MemberProfile.tsx`: Interactive avatar with inline camera/upload trigger.
   - `MembersTable.tsx`: Display updated member avatar images with fallback initials.

## System Architecture & Data Flow

```
[ User Interaction ] 
  ├── File Drag & Drop / Upload ──┐
  └── Webcam Camera Capture ──────┼─> [ ImageUploader Component ]
                                  │           │
                                  │     Compress/Blob
                                  │           ▼
                                  │   [ uploadMemberPhoto() Utility ]
                                  │           │
                                  │   Supabase Storage (`member-photos`)
                                  │           │
                                  │     Public Image URL
                                  │           ▼
                                  └── [ member.photo_url ] ──> Database (members table)
```

## Detailed Component Specifications

### 1. `lib/storage.ts` (Storage Utility)
- `uploadMemberPhoto(file: Blob | File, memberId?: string): Promise<string>`
- Generates unique filename (e.g. `member-photos/${Date.now()}_${randomId}.jpg`).
- Uploads blob/file to Supabase Storage bucket `member-photos`.
- Obtains and returns public URL for `photo_url`.

### 2. `components/ui/ImageUploader.tsx` (Reusable Uploader)
- Props:
  - `currentPhotoUrl?: string | null`
  - `memberName?: string`
  - `onPhotoChange: (url: string | null) => void`
  - `size?: 'sm' | 'md' | 'lg'`
- UI Components:
  - Avatar display with fallback initials when `currentPhotoUrl` is missing.
  - Hover overlay button ("Change Photo" / camera icon).
  - Dropdown / Action menu: "Upload File", "Take Photo with Camera", and "Remove Photo".
  - Webcam Modal:
    - `navigator.mediaDevices.getUserMedia({ video: true })` video stream container.
    - "Snap Photo" trigger capturing canvas snapshot.
    - Preview & confirm/retake controls.

### 3. Integration Points
- **`AddMemberForm.tsx`**: State for `photoUrl`. Pass `onPhotoChange={(url) => setPhotoUrl(url)}` to `<ImageUploader>`.
- **`EditMemberModal.tsx`**: State for `photoUrl`. Update `members` table record with new `photo_url`.
- **`MemberProfile.tsx`**: Add direct avatar edit controls. Update member database record upon photo change.
- **`MembersTable.tsx`**: Render `photo_url` avatar thumbnail.

## Edge Cases & Error Handling
- **Webcam permission denied / unavailable**: Show friendly user-facing notice and default to file upload.
- **Supabase bucket missing**: Auto-create bucket or provide clear fallback URL / base64 preview handling.
- **Large image sizes**: Resize / compress image on canvas before upload if needed.
