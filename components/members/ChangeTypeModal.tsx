"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { X, Loader2 } from "lucide-react"
import { DEFAULT_PRICING, BOXING_PRICING, type MonthlyPlan, type PricingConfig } from "@/lib/pricing"
import { addDaysISOInPH } from "@/lib/phTime"
import { getAdjustedEndDate } from "@/lib/memberSubscription"

type ChangeTypeModalProps = {
  isOpen: boolean
  onClose: () => void
  member: {
    id: string
    name?: string | null
    start_date: string
    end_date: string
    status?: string | null
    membership_type?: "1_day" | "weekly" | "monthly" | null
    membership_category?: "gym" | "boxing_muaythai" | null
    payment_amount?: number | null
  } | null
  onUpdate: () => void
}

export function ChangeTypeModal({ isOpen, onClose, member, onUpdate }: ChangeTypeModalProps) {
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<"gym" | "boxing_muaythai">("gym")
  const [type, setType] = useState<"1_day" | "weekly" | "monthly">("weekly")
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan>("regular")
  const [payment, setPayment] = useState("")
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING)
  const [boxingPricing, setBoxingPricing] = useState<PricingConfig>(BOXING_PRICING)
  const [updateEndDate, setUpdateEndDate] = useState(true)

  useEffect(() => {
    const loadPricing = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [
          "session_rate", "weekly_rate", "monthly_rate", "student_rate",
          "boxing_session_rate", "boxing_monthly_rate", "boxing_student_rate"
        ])

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
      }
    }

    void loadPricing()
  }, [])

  const getDefaultPayment = useCallback((
    membershipCategory: "gym" | "boxing_muaythai",
    membershipType: "1_day" | "weekly" | "monthly",
    plan: MonthlyPlan
  ) => {
    const currentPricing = membershipCategory === "boxing_muaythai" ? boxingPricing : pricing
    if (membershipType === "1_day") return String(currentPricing.session)
    if (membershipType === "weekly") return String(currentPricing.weekly)
    return String(plan === "student" ? currentPricing.monthlyStudent : currentPricing.monthlyRegular)
  }, [pricing, boxingPricing])

  const inferMonthlyPlan = useCallback((membershipCategory: "gym" | "boxing_muaythai", amount: number): MonthlyPlan => {
    const currentPricing = membershipCategory === "boxing_muaythai" ? boxingPricing : pricing
    const studentDiff = Math.abs(amount - currentPricing.monthlyStudent)
    const regularDiff = Math.abs(amount - currentPricing.monthlyRegular)
    return studentDiff <= regularDiff ? "student" : "regular"
  }, [pricing, boxingPricing])

  useEffect(() => {
    if (!isOpen || !member) return

    const nextCategory = (member.membership_category || "gym") as "gym" | "boxing_muaythai"
    const nextType = (member.membership_type || "weekly") as "1_day" | "weekly" | "monthly"
    const nextPlan =
      nextType === "monthly" ? inferMonthlyPlan(nextCategory, Number(member.payment_amount) || (nextCategory === "boxing_muaythai" ? boxingPricing : pricing).monthlyRegular) : "regular"

    setCategory(nextCategory)
    setType(nextType)
    setMonthlyPlan(nextPlan)
    setPayment(
      member.payment_amount !== null && member.payment_amount !== undefined
        ? String(member.payment_amount)
        : getDefaultPayment(nextCategory, nextType, nextPlan)
    )
  }, [getDefaultPayment, inferMonthlyPlan, isOpen, member, pricing, boxingPricing])

  const computeNewEndISO = useCallback((duration: "1_day" | "weekly" | "monthly", baseISO: string) => {
    if (!baseISO) return ""
    if (duration === "1_day") return baseISO // Sessions expire on the same day they start
    if (duration === "weekly") return addDaysISOInPH(baseISO, 7)
    return addDaysISOInPH(baseISO, 30)
  }, [])

  const newEndISO = computeNewEndISO(type, member?.start_date ?? "")

  if (!isOpen || !member) return null

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updates: any = {
        membership_category: category,
        membership_type: type,
        payment_amount: Number(payment),
      }

      if (updateEndDate && newEndISO) {
        updates.end_date = newEndISO
      }

      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', member.id)

      if (error) throw error

      onUpdate() // Refresh data
      onClose()
      toast.success("Membership type updated successfully!")
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error("Failed to update membership type: " + msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-bg-base border-white/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-card/30">
          <div>
            <h2 className="text-xl font-bold text-primary font-primary">Change Membership Type</h2>
            <p className="text-xs text-secondary mt-1 tracking-wide uppercase">For {member.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          
          <div className="space-y-3">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Gym Duration</label>
            <div className="grid grid-cols-3 gap-2">
              <div 
                onClick={() => handleTypeChange("gym", "1_day")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  category === "gym" && type === "1_day" ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-white/10 hover:border-white/20 text-primary"
                }`}
              >
                <div className="font-semibold text-sm">1 Day</div>
              </div>
              <div 
                onClick={() => handleTypeChange("gym", "weekly")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  category === "gym" && type === "weekly" ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-white/10 hover:border-white/20 text-primary"
                }`}
              >
                <div className="font-semibold text-sm">Weekly</div>
              </div>
              <div 
                onClick={() => handleTypeChange("gym", "monthly")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  category === "gym" && type === "monthly" ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-white/10 hover:border-white/20 text-primary"
                }`}
              >
                <div className="font-semibold text-sm">Monthly</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Boxing / Muay Thai Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <div 
                onClick={() => handleTypeChange("boxing_muaythai", "1_day")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  category === "boxing_muaythai" && type === "1_day" ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-white/10 hover:border-white/20 text-primary"
                }`}
              >
                <div className="font-semibold text-sm">Session</div>
              </div>
              <div 
                onClick={() => handleTypeChange("boxing_muaythai", "monthly")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  category === "boxing_muaythai" && type === "monthly" ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-white/10 hover:border-white/20 text-primary"
                }`}
              >
                <div className="font-semibold text-sm">Monthly</div>
              </div>
            </div>
          </div>

          {type === "monthly" && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Monthly Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleMonthlyPlanChange("regular")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    monthlyPlan === "regular"
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-white/20 hover:border-white/30 text-primary"
                  }`}
                >
                <p className="font-semibold text-sm">Regular</p>
                  <p className="text-xs">₱{(category === "boxing_muaythai" ? boxingPricing : pricing).monthlyRegular.toFixed(2)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleMonthlyPlanChange("student")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    monthlyPlan === "student"
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-white/20 hover:border-white/30 text-primary"
                  }`}
                >
                  <p className="font-semibold text-sm">Student</p>
                  <p className="text-xs">₱{(category === "boxing_muaythai" ? boxingPricing : pricing).monthlyStudent.toFixed(2)}</p>
                </button>
              </div>
            </div>
          )}

          <div>
             <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">Payment Amount (₱)</label>
             <Input 
                type="number" 
                step="0.01"
                min="0"
                value={payment} 
                onChange={(e) => setPayment(e.target.value)} 
                required 
              />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateEndDate"
              checked={updateEndDate}
              onChange={(e) => setUpdateEndDate(e.target.checked)}
              className="rounded border-white/10 bg-card text-accent-primary focus:ring-accent-primary"
            />
            <label htmlFor="updateEndDate" className="text-sm text-secondary">
              Recalculate end date based on start date
            </label>
          </div>

          <div className="bg-input/50 p-4 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Start Date:</span>
              <span className="text-secondary font-medium">{member.start_date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Current End Date:</span>
              <span className="text-secondary font-medium">{getAdjustedEndDate(member.end_date, member.membership_type)}</span>
            </div>
            {updateEndDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">New End Date:</span>
                <span className="text-accent-primary font-medium">{getAdjustedEndDate(newEndISO, type) || "—"}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
