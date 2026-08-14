"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/Badge"
import { format } from "date-fns"
import { ArrowLeft, User, Calendar, Clock, Loader2, AlertCircle, Mail, ChevronLeft, ChevronRight, Phone, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RenewModal } from "./RenewModal"
import { ChangeTypeModal } from "./ChangeTypeModal"
import { EditMemberModal } from "./EditMemberModal"
import { ImageUploader } from "@/components/ui/ImageUploader"
import { memberStatusBadgeVariant, memberStatusLabel, getAdjustedEndDate } from "@/lib/memberSubscription"
import { cn } from "@/lib/utils"
import {
  notificationKindLabel,
  notificationStatusBadgeVariant,
  notificationStatusLabel,
} from "@/lib/memberNotificationDisplay"

type MemberProfileProps = {
  member: any
  onUpdate: () => void
  role?: "admin" | "staff"
}

export function MemberProfile({ member, onUpdate, role = "staff" }: MemberProfileProps) {
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false)
  const [isChangeTypeModalOpen, setIsChangeTypeModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isRenewFromUrl = searchParams.get("renew") === "1"
  const renewModalOpen = isRenewModalOpen || isRenewFromUrl

  const closeRenewModal = () => {
    setIsRenewModalOpen(false)

    // If the modal was opened via ?renew=1, remove it so it doesn't reopen.
    if (searchParams.get("renew") === "1") {
      const next = new URLSearchParams(searchParams.toString())
      next.delete("renew")
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }

  const handleRequestDeletion = async () => {
    const confirmed = confirm("Are you sure you want to request deletion of this account? An admin must approve it.")
    if (!confirmed) return

    setDeleteLoading(true)
    const { error } = await supabase
      .from("members")
      .update({ pending_deletion: true })
      .eq("id", member.id)

    if (error) {
      toast.error("Failed to request deletion.")
      console.error(error)
    } else {
      toast.success("Deletion requested successfully.")
      onUpdate()
    }
    setDeleteLoading(false)
  }

  const handleApproveDeletion = async () => {
    const confirmed = confirm("Are you sure you want to permanently delete this account? This cannot be undone.")
    if (!confirmed) return

    setDeleteLoading(true)
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", member.id)

    if (error) {
      toast.error("Failed to delete account.")
      console.error(error)
      setDeleteLoading(false)
      return
    }

    toast.success("Account deleted successfully.")

    onUpdate()
    router.push("/members")
    router.refresh()
  }

  const handleRejectDeletion = async () => {
    setDeleteLoading(true)
    const { error } = await supabase
      .from("members")
      .update({ pending_deletion: false })
      .eq("id", member.id)

    if (error) {
      toast.error("Failed to reject deletion.")
      console.error(error)
    } else {
      toast.success("Deletion rejected.")
      onUpdate()
    }
    setDeleteLoading(false)
  }

  const handleDirectPhotoUpdate = async (newUrl: string | null) => {
    try {
      const { error } = await supabase
        .from("members")
        .update({ photo_url: newUrl })
        .eq("id", member.id)

      if (error) throw error
      toast.success("Profile photo updated!")
      onUpdate()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error("Failed to update profile photo: " + msg)
    }
  }

  const handleRevertRenewal = async (renewalId: string) => {
    const confirmed = confirm("Are you sure you want to revert this renewal? This will delete the renewal record and restore the member's previous membership status.")
    if (!confirmed) return

    setDeleteLoading(true)
    try {
      // 1. Delete the renewal record
      const { error: deleteError } = await supabase
        .from("renewals")
        .delete()
        .eq("id", renewalId)

      if (deleteError) throw deleteError

      // 2. Revert the member's details
      const remainingRenewals = (member.renewals || [])
        .filter((r: any) => r.id !== renewalId)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      let updateData: any = {}

      if (remainingRenewals.length > 0) {
        // If there's a previous renewal, restore to its values
        const prev = remainingRenewals[0]
        updateData = {
          end_date: prev.new_end_date,
          start_date: prev.previous_end_date,
          membership_type: prev.membership_type,
          membership_category: prev.membership_category || "gym",
          payment_amount: Number(prev.payment_amount),
          status: "active"
        }
      } else {
        // If no renewals remain, restore to original registration values
        const deletedRenewal = (member.renewals || []).find((r: any) => r.id === renewalId)
        const prevEndDate = deletedRenewal ? deletedRenewal.previous_end_date : member.start_date
        const regDate = member.created_at ? member.created_at.split("T")[0] : member.start_date

        updateData = {
          end_date: prevEndDate,
          start_date: regDate,
        }
      }

      const { error: updateError } = await supabase
        .from("members")
        .update(updateData)
        .eq("id", member.id)

      if (updateError) throw updateError

      toast.success("Renewal reverted successfully.")
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || "Failed to revert renewal.")
      console.error(err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const statusLabel = memberStatusLabel(member)
  const statusBadgeVariant = memberStatusBadgeVariant(member)

  const totalPaid = Number(member.payment_amount) + (member.renewals?.reduce((sum: number, r: any) => sum + Number(r.payment_amount), 0) || 0)
  const attendanceRecords = member.attendance || []
  const allTimeVisits = attendanceRecords.length

  const attendanceByDate = useMemo(() => {
    return attendanceRecords.reduce((acc: Record<string, string[]>, row: any) => {
      const day = String(row.check_in_date)
      if (!acc[day]) {
        acc[day] = []
      }
      const timeIn = row.created_at ? format(new Date(row.created_at), "h:mm a") : "Unknown"
      acc[day].push(timeIn)
      return acc
    }, {} as Record<string, string[]>)
  }, [attendanceRecords])

  const selectedMonthKey = format(viewMonth, "yyyy-MM")
  const selectedMonthDays = (Object.entries(attendanceByDate) as Array<[string, string[]]>)
    .filter(([date]) => date.startsWith(selectedMonthKey))
    .sort(([a], [b]) => b.localeCompare(a))

  const monthVisits = selectedMonthDays.reduce((sum, [, times]) => sum + times.length, 0)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const weekVisits = attendanceRecords.filter((row: any) => {
    const d = new Date(`${row.check_in_date}T00:00:00`)
    return d >= weekStart && d <= weekEnd
  }).length

  const monthStartWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const prevMonthDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 0).getDate()

  const calendarCells: Array<{ key: string; date: Date; inMonth: boolean }> = []
  for (let i = monthStartWeekday - 1; i >= 0; i--) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, prevMonthDays - i)
    calendarCells.push({ key: `prev-${i}`, date: d, inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    calendarCells.push({ key: `curr-${day}`, date: d, inMonth: true })
  }
  while (calendarCells.length % 7 !== 0) {
    const nextDay = calendarCells.length - (monthStartWeekday + daysInMonth) + 1
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, nextDay)
    calendarCells.push({ key: `next-${nextDay}`, date: d, inMonth: false })
  }

  const goToPrevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href="/members">
          <Button variant="secondary" className="px-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          {role === "admin" && member.pending_deletion ? (
            <>
              <Button 
                variant="secondary" 
                className="text-accent-danger border-accent-danger/50 hover:bg-accent-danger/10"
                onClick={handleApproveDeletion}
                disabled={deleteLoading}
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Approve Deletion
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleRejectDeletion}
                disabled={deleteLoading}
              >
                Reject Deletion
              </Button>
            </>
          ) : role === "admin" ? (
            <Button 
              variant="secondary" 
              className="text-accent-danger border-accent-danger/50 hover:bg-accent-danger/10"
              onClick={handleApproveDeletion}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Account
            </Button>
          ) : (
             <Button 
              variant="secondary" 
              className="text-accent-danger border-accent-danger/50 hover:bg-accent-danger/10"
              onClick={handleRequestDeletion}
              disabled={deleteLoading || member.pending_deletion}
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {member.pending_deletion ? "Deletion Pending" : "Request Deletion"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            Edit Profile
          </Button>
          <Button onClick={() => setIsRenewModalOpen(true)}>
            Renew Membership
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4">
          <Card className="h-full flex flex-col items-center text-center p-8 border border-white/10 relative overflow-hidden">
            {/* Status indicator ring around photo */}
            <div
              className={`relative mb-6 rounded-full p-1 ring-2 ${
                statusLabel === "Active"
                  ? "ring-accent-secondary"
                  : statusLabel === "Suspended" || statusLabel === "Expiring soon"
                    ? "ring-accent-warning"
                    : "ring-accent-danger"
              }`}
            >
              <ImageUploader
                value={member.photo_url}
                onChange={handleDirectPhotoUpdate}
                name={member.name}
                size="lg"
              />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1 group/name">
              <h2 className="text-2xl font-bold text-primary">{member.name}</h2>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="opacity-0 group-hover/name:opacity-100 p-1 hover:bg-white/5 rounded transition-all text-muted hover:text-primary animate-in fade-in duration-150"
                title="Edit Profile"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            {member.email && (
              <p className={cn("text-secondary text-sm", member.phone ? "mb-1" : "mb-4")}>
                {member.email}
              </p>
            )}
            {member.phone && <p className="text-secondary text-sm mb-4">{member.phone}</p>}
            {!member.email && !member.phone && <div className="mb-4" />}
            
            <Badge variant={statusBadgeVariant} className="mb-6 px-3 py-1">
              <div className="flex items-center gap-1">
                {(statusLabel === "Expired" ||
                  statusLabel === "Cancelled" ||
                  statusLabel === "Expiring soon") && (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                {statusLabel}
              </div>
            </Badge>

            <div className="w-full border-t border-white/10 pt-6 mt-2">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted uppercase tracking-wider mb-1">Total Paid</span>
                <span className="text-xl font-semibold text-primary">₱{totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <Card className="p-0 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Membership Details</h3>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setIsChangeTypeModalOpen(true)}
                className="text-xs"
              >
                Change Type
              </Button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-input border border-white/10 shrink-0">
                  <Calendar className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Membership Type</p>
                  <p className="text-primary font-medium capitalize">
                    {member.membership_category === 'boxing_muaythai' ? 'Boxing/Muay Thai' : (member.membership_category === 'gym' ? 'Gym' : (member.membership_category || 'Gym'))} — {member.membership_type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-input border border-white/10 shrink-0">
                  <Clock className="w-5 h-5 text-accent-secondary" />
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-primary font-medium mb-1">
                    {format(new Date(member.start_date), 'MMM d, yyyy')} — {format(new Date(getAdjustedEndDate(member.end_date, member.membership_type)), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted">
                    {Math.max(0, Math.ceil((new Date(getAdjustedEndDate(member.end_date, member.membership_type)).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} days remaining
                  </p>
                </div>
              </div>

            </div>
          </Card>

          <Card className="p-0 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Renewal History</h3>
            </div>
            <div className="overflow-x-auto w-full">
              {!member.renewals || member.renewals.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm bg-card/20">
                  No renewal records found.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01]">
                      <th className="font-medium p-4 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider">Date Renewed</th>
                      <th className="font-medium p-4 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider">Category & Type</th>
                      <th className="font-medium p-4 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider">Duration</th>
                      <th className="font-medium p-4 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider">Amount</th>
                      {role === "admin" && (
                        <th className="font-medium p-4 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...member.renewals]
                      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((renewal: any, index: number) => {
                        const isLatest = index === 0
                        const formattedDate = new Date(renewal.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })
                        const formatCategory = (cat: string) => {
                          if (cat === "boxing_muaythai") return "Boxing/MT"
                          return "Gym"
                        }
                        return (
                          <tr key={renewal.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 text-sm text-primary">{formattedDate}</td>
                            <td className="p-4 text-sm text-secondary">
                              <span className="capitalize">{formatCategory(renewal.membership_category || "gym")}</span> — <span className="capitalize">{renewal.membership_type.replace("_", " ")}</span>
                            </td>
                            <td className="p-4 text-sm text-secondary">
                              {format(new Date(renewal.previous_end_date), "MMM d, yyyy")} — {format(new Date(getAdjustedEndDate(renewal.new_end_date, renewal.membership_type)), "MMM d, yyyy")}
                            </td>
                            <td className="p-4 text-sm font-semibold text-primary">₱{Number(renewal.payment_amount).toFixed(2)}</td>
                            {role === "admin" && (
                              <td className="p-4 text-right">
                                {isLatest ? (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleRevertRenewal(renewal.id)}
                                    disabled={deleteLoading}
                                    className="text-accent-danger hover:bg-accent-danger/10 border-accent-danger/20 inline-flex items-center gap-1.5 py-1 px-2.5 h-auto text-xs"
                                    title="Revert/Delete this renewal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Revert
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted select-none">Locked</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
        
        <div className="xl:col-span-7">
          <Card className="p-0 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Attendance</h3>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-card/30 p-4">
                  <p className="text-[11px] text-muted uppercase tracking-wider mb-1">This month</p>
                  <p className="text-2xl font-semibold text-primary">{monthVisits}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-card/30 p-4">
                  <p className="text-[11px] text-muted uppercase tracking-wider mb-1">This week</p>
                  <p className="text-2xl font-semibold text-primary">{weekVisits}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-card/30 p-4">
                  <p className="text-[11px] text-muted uppercase tracking-wider mb-1">All time</p>
                  <p className="text-2xl font-semibold text-primary">{allTimeVisits}</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 w-full">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="secondary" className="px-3 py-2" onClick={goToPrevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <p className="text-lg font-semibold text-primary">{format(viewMonth, "MMMM yyyy")}</p>
                  <Button variant="secondary" className="px-3 py-2" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-2 w-full text-center text-xs text-muted uppercase tracking-wider mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 w-full">
                  {calendarCells.map((cell) => {
                    const dateKey = format(cell.date, "yyyy-MM-dd")
                    const times = attendanceByDate[dateKey] || []
                    const hasVisit = times.length > 0
                    const formattedDate = format(cell.date, "EEEE, MMM d, yyyy")

                    return (
                      <div
                        key={cell.key}
                        className={`group relative aspect-square rounded-md flex items-center justify-center text-sm border transition-colors ${
                          cell.inMonth
                            ? hasVisit
                              ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-200"
                              : "bg-card/20 border-white/25 text-primary"
                            : "bg-transparent border-transparent text-muted/40"
                        }`}
                      >
                        {format(cell.date, "d")}
                        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-white/20 bg-black/90 px-2 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                          <p className="whitespace-nowrap">{formattedDate}</p>
                          {hasVisit ? (
                            <p className="text-emerald-200">Time in: {times.join(", ")}</p>
                          ) : (
                            <p className="text-gray-300">No check-ins</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="xl:col-span-5">
          <Card className="p-0 border border-white/10 overflow-hidden flex-1 min-h-[300px]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-card/50">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                Email notifications
              </h3>
              <Link
                href={`/email-logs?memberId=${member.id}`}
                className="text-xs text-accent-primary hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="p-0">
              {!member.member_notification_logs || member.member_notification_logs.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm">
                  No reminder emails logged yet. They will appear here after expiry reminders are sent.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {member.member_notification_logs.slice(0, 20).map((row: any) => (
                    <div
                      key={row.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 p-4 hover:bg-card-hover transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-input border border-white/10 shrink-0 mt-0.5">
                          <Mail className="w-4 h-4 text-accent-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-primary text-sm font-medium">
                            {notificationKindLabel(row.kind)}
                          </p>
                          <p className="text-muted text-xs mt-0.5 break-all">
                            To: {row.recipient_email}
                          </p>
                          <p className="text-secondary text-xs mt-0.5">
                            Sent {format(new Date(row.sent_at), "MMM d, yyyy 'at' h:mm a")}
                            {row.delivered_at && (
                              <span className="text-muted">
                                {" "}
                                · Confirmed delivered{" "}
                                {format(new Date(row.delivered_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            )}
                          </p>
                          {row.error_message && (
                            <p className="text-red-400 text-xs mt-1 break-words">{row.error_message}</p>
                          )}
                          {row.provider_message_id && (
                            <p className="text-muted text-[11px] mt-1 break-all">
                              Message ID: {row.provider_message_id}
                            </p>
                          )}
                          <Link
                            href={`/email-logs/${row.id}`}
                            className="text-xs text-accent-primary hover:underline mt-1 inline-block"
                          >
                            View message
                          </Link>
                        </div>
                      </div>
                      <Badge variant={notificationStatusBadgeVariant(row.status)} className="shrink-0 self-start sm:self-center">
                        {notificationStatusLabel(row.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* Renew Modal */}
      <RenewModal 
        isOpen={renewModalOpen} 
        onClose={closeRenewModal} 
        member={member} 
        onUpdate={onUpdate}
      />

      {/* Change Type Modal */}
      <ChangeTypeModal
        isOpen={isChangeTypeModalOpen}
        onClose={() => setIsChangeTypeModalOpen(false)}
        member={member}
        onUpdate={onUpdate}
      />

      {/* Edit Profile Modal */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={member}
        onUpdate={onUpdate}
      />
    </div>
  )
}
