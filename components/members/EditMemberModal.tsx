"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { X, Loader2 } from "lucide-react"

import { ImageUploader } from "@/components/ui/ImageUploader"

type EditMemberModalProps = {
  isOpen: boolean
  onClose: () => void
  member: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    photo_url?: string | null
  } | null
  onUpdate: () => void
}

export function EditMemberModal({ isOpen, onClose, member, onUpdate }: EditMemberModalProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && member) {
      setName(member.name || "")
      setEmail(member.email || "")
      setPhone(member.phone || "")
      setPhotoUrl(member.photo_url || null)
    }
  }, [isOpen, member])

  if (!isOpen || !member) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("Name is required.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from("members")
        .update({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          photo_url: photoUrl,
        })
        .eq("id", member.id)

      if (error) throw error

      toast.success("Member profile updated successfully!")
      onUpdate()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error("Failed to update profile: " + msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-bg-base border-white/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-card/30">
          <div>
            <h2 className="text-xl font-bold text-primary font-primary">Edit Member Profile</h2>
            <p className="text-xs text-secondary mt-1 tracking-wide uppercase">Modify personal details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center justify-center mb-2">
            <ImageUploader
              value={photoUrl}
              onChange={setPhotoUrl}
              name={name || "Member"}
              size="lg"
              disabled={loading}
            />
            <p className="text-xs text-muted mt-2">Click image to upload file or take photo</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
              Full Name <span className="text-accent-danger">*</span>
            </label>
            <Input
              type="text"
              placeholder="E.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex justify-between">
              <span>Email Address</span>
              <span className="text-muted font-normal normal-case italic">Optional</span>
            </label>
            <Input
              type="email"
              placeholder="E.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex justify-between">
              <span>Phone Number</span>
              <span className="text-muted font-normal normal-case italic">Optional</span>
            </label>
            <Input
              type="tel"
              placeholder="E.g. 09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10 mt-2">
            <Button variant="secondary" type="button" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
