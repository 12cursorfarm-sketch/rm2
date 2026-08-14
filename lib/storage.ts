import { supabase } from "@/utils/supabase/client"

/**
 * Uploads a member photo (Blob or File) to the 'member-photos' Supabase Storage bucket.
 * Returns the public URL, or falls back to a base64 Data URL if Supabase storage fails/is unavailable.
 */
export async function uploadMemberPhoto(file: Blob | File): Promise<string> {
  const fileExt = (file.type && file.type.split('/')[1]) || 'jpg'
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
