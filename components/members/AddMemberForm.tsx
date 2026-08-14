"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/utils/supabase/client"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { DEFAULT_PRICING, BOXING_PRICING, type MonthlyPlan, type PricingConfig } from "@/lib/pricing"
import { ImageUploader } from "@/components/ui/ImageUploader"

export function AddMemberForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [category, setCategory] = useState<"gym" | "boxing_muaythai">("gym")
  const [type, setType] = useState<"1_day" | "weekly" | "monthly">("weekly")
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan>("regular")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [payment, setPayment] = useState("")
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING)
  const [boxingPricing, setBoxingPricing] = useState<PricingConfig>(BOXING_PRICING)

  useEffect(() => {
    const loadPricing = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [
          "session_rate", "weekly_rate", "monthly_rate", "student_rate",
          "boxing_session_rate", "boxing_monthly_rate", "boxing_student_rate"
        ])

      if (error || !data) {
        setPayment(String(DEFAULT_PRICING.weekly))
        return
      }

      if (!error && data) {
        const nextGym = { ...DEFAULT_PRICING }
        const nextBoxing = { ...BOXING_PRICING }
        for (const row of data) {
          const parsed = Number(row.value)
          if (Number.isNaN(parsed)) continue
          
          // Gym
          if (row.key === "session_rate") nextGym.session = parsed
          if (row.key === "weekly_rate") nextGym.weekly = parsed
          if (row.key === "monthly_rate") nextGym.monthlyRegular = parsed
          if (row.key === "student_rate") nextGym.monthlyStudent = parsed
          
          // Boxing
          if (row.key === "boxing_session_rate") nextBoxing.session = parsed
          if (row.key === "boxing_monthly_rate") nextBoxing.monthlyRegular = parsed
          if (row.key === "boxing_student_rate") nextBoxing.monthlyStudent = parsed
        }
        setPricing(nextGym)
        setBoxingPricing(nextBoxing)
        setPayment(String(nextGym.weekly))
      }
    }

    void loadPricing()
  }, [])

  const getDefaultPayment = (
    membershipCategory: "gym" | "boxing_muaythai",
    membershipType: "1_day" | "weekly" | "monthly",
    plan: MonthlyPlan
  ) => {
    const currentPricing = membershipCategory === "boxing_muaythai" ? boxingPricing : pricing
    if (membershipType === "1_day") return String(currentPricing.session)
    if (membershipType === "weekly") return String(currentPricing.weekly)
    return String(plan === "student" ? currentPricing.monthlyStudent : currentPricing.monthlyRegular)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic validation based on type
      if (!name || !payment) throw new Error("Name and payment amount are required.")

      // Calculate dates
      const startDate = new Date()
      const endDate = new Date()

      if (type === "weekly") {
        endDate.setDate(startDate.getDate() + 7)
      } else if (type === "monthly") {
        endDate.setDate(startDate.getDate() + 30)
      }

      // Generate shorter, human-friendly Scan ID (e.g. RM1A2B)
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let qrCode = 'RM'
      for (let i = 0; i < 4; i++) {
        qrCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }

      // Insert member
      const { data, error } = await supabase
        .from('members')
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          photo_url: photoUrl,
          membership_category: category,
          membership_type: type,
          status: "active",
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          payment_amount: Number(payment),
          qr_code: qrCode,
        })
        .select()
        .single()

      if (error) throw error

      // Redirect back to members list on success
      router.push("/members")
      
    } catch (err: any) {
      toast.error(err.message || "Failed to create member. Please try again.")
      setLoading(false)
    }
  }

  // Preset payment values depending on membership type (for convenience)
  const handleTypeChange = (newCategory: "gym" | "boxing_muaythai", newType: "1_day" | "weekly" | "monthly") => {
    setCategory(newCategory)
    setType(newType)
    setPayment(getDefaultPayment(newCategory, newType, monthlyPlan))
  }

  const handleMonthlyPlanChange = (plan: MonthlyPlan) => {
    setMonthlyPlan(plan)
    if (type === "monthly") {
      setPayment(getDefaultPayment(category, "monthly", plan))
    }
  }

  return (
    <Card className="max-w-3xl mx-auto w-full border border-white/10">
      <div className="p-6 border-b border-white/10 flex items-center gap-4">
        <Button variant="secondary" className="px-3" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold font-primary text-primary tracking-tight">Add New Member</h2>
          <p className="text-sm text-secondary">Register a new client to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-8">
        
        {/* Gym Membership Type Picker */}
        <div className="space-y-3 p-4 bg-input/50 rounded-xl border border-white/10">
          <label className="text-sm font-semibold text-primary uppercase tracking-wider block">Gym Membership Duration</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div 
              onClick={() => handleTypeChange("gym", "1_day")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                category === "gym" && type === "1_day" 
                ? "border-accent-primary bg-accent-primary/10" 
                : "border-white/20 hover:border-white/30 bg-card"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${category === "gym" && type === "1_day" ? "text-accent-primary" : "text-primary"}`}>Session Rate</span>
                {category === "gym" && type === "1_day" && <div className="w-2 h-2 rounded-full bg-accent-primary" />}
              </div>
              <p className="text-xs text-muted">Per session access. ₱{pricing.session.toFixed(2)}</p>
            </div>
            
            <div 
              onClick={() => handleTypeChange("gym", "weekly")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                category === "gym" && type === "weekly" 
                ? "border-accent-primary bg-accent-primary/10" 
                : "border-white/20 hover:border-white/30 bg-card"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${category === "gym" && type === "weekly" ? "text-accent-primary" : "text-primary"}`}>Weekly</span>
                {category === "gym" && type === "weekly" && <div className="w-2 h-2 rounded-full bg-accent-primary" />}
              </div>
              <p className="text-xs text-muted">7 days access. ₱{pricing.weekly.toFixed(2)}</p>
            </div>
            
            <div 
              onClick={() => handleTypeChange("gym", "monthly")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                category === "gym" && type === "monthly" 
                ? "border-accent-primary bg-accent-primary/10" 
                : "border-white/20 hover:border-white/30 bg-card"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${category === "gym" && type === "monthly" ? "text-accent-primary" : "text-primary"}`}>Monthly</span>
                {category === "gym" && type === "monthly" && <div className="w-2 h-2 rounded-full bg-accent-primary" />}
              </div>
              <p className="text-xs text-muted">30 days access. Regular/Student pricing.</p>
            </div>
          </div>
        </div>

        {/* Boxing / Muay Thai Membership Type Picker */}
        <div className="space-y-3 p-4 bg-input/50 rounded-xl border border-white/10">
          <label className="text-sm font-semibold text-primary uppercase tracking-wider block">Boxing / Muay Thai Membership Duration</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div 
              onClick={() => handleTypeChange("boxing_muaythai", "1_day")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                category === "boxing_muaythai" && type === "1_day" 
                ? "border-accent-primary bg-accent-primary/10" 
                : "border-white/20 hover:border-white/30 bg-card"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${category === "boxing_muaythai" && type === "1_day" ? "text-accent-primary" : "text-primary"}`}>Session Rate</span>
                {category === "boxing_muaythai" && type === "1_day" && <div className="w-2 h-2 rounded-full bg-accent-primary" />}
              </div>
              <p className="text-xs text-muted">Per session access. ₱{boxingPricing.session.toFixed(2)}</p>
            </div>
            
            <div 
              onClick={() => handleTypeChange("boxing_muaythai", "monthly")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                category === "boxing_muaythai" && type === "monthly" 
                ? "border-accent-primary bg-accent-primary/10" 
                : "border-white/20 hover:border-white/30 bg-card"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${category === "boxing_muaythai" && type === "monthly" ? "text-accent-primary" : "text-primary"}`}>Monthly</span>
                {category === "boxing_muaythai" && type === "monthly" && <div className="w-2 h-2 rounded-full bg-accent-primary" />}
              </div>
              <p className="text-xs text-muted">30 days access. Regular/Student pricing. ₱{boxingPricing.monthlyRegular.toFixed(2)}/₱{boxingPricing.monthlyStudent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {type === "monthly" && (
          <div className="space-y-3 p-4 bg-input/50 rounded-xl border border-white/10">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider block">Monthly Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleMonthlyPlanChange("regular")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  monthlyPlan === "regular"
                    ? "border-accent-primary bg-accent-primary/10"
                    : "border-white/20 hover:border-white/30 bg-card"
                }`}
              >
                <p className="font-semibold text-primary">Regular</p>
                <p className="text-xs text-muted">₱{(category === "boxing_muaythai" ? boxingPricing : pricing).monthlyRegular.toFixed(2)}</p>
              </button>
              <button
                type="button"
                onClick={() => handleMonthlyPlanChange("student")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  monthlyPlan === "student"
                    ? "border-accent-primary bg-accent-primary/10"
                    : "border-white/20 hover:border-white/30 bg-card"
                }`}
              >
                <p className="font-semibold text-primary">Student</p>
                <p className="text-xs text-muted">₱{(category === "boxing_muaythai" ? boxingPricing : pricing).monthlyStudent.toFixed(2)}</p>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-5">
            <div className="flex flex-col items-center justify-center p-4 bg-input/30 border border-white/10 rounded-xl">
              <ImageUploader
                value={photoUrl}
                onChange={setPhotoUrl}
                name={name || "New Member"}
                size="lg"
                disabled={loading}
              />
              <p className="text-xs text-muted mt-2">Upload profile photo or snap with webcam</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">Full Name <span className="text-accent-danger">*</span></label>
              <Input 
                placeholder="E.g. John Doe" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
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
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">Payment Amount <span className="text-accent-danger">*</span></label>
              <Input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="45.00" 
                value={payment} 
                onChange={(e) => setPayment(e.target.value)} 
                required 
              />
            </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Saving...</span> : "Create Member"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
