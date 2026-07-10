import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data: members, error } = await supabase.from('members').select('*')
  if (error) throw error
  
  const { data: renewals, error: err2 } = await supabase.from('renewals').select('*')
  if (err2) throw err2

  let inserted = 0
  for (const m of members) {
    const memberRenewals = renewals.filter(r => r.member_id === m.id)
    
    // Sort renewals by created_at
    memberRenewals.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    // If the earliest renewal is exactly around created_at, then they already have an initial record
    // Or if the earliest renewal has a previous_end_date that equals the date of created_at (as implemented above)
    // Actually, we can check if the member has ANY renewal where previous_end_date <= created_at.
    // Or just check if the number of renewals is enough to cover their history.
    // Let's just check if they have a renewal within 1 day of created_at.
    const createdDate = new Date(m.created_at)
    
    const hasInitial = memberRenewals.some(r => {
        const rDate = new Date(r.created_at)
        const diffDays = Math.abs(rDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays < 2
    })
    
    if (!hasInitial) {
      console.log(`Backfilling for member ${m.name}...`)
      
      let initialType = m.membership_type
      let initialCategory = m.membership_category
      let initialPayment = m.payment_amount
      let initialEndDate = m.end_date
      
      if (memberRenewals.length > 0) {
        const firstRenewal = memberRenewals[0]
        initialEndDate = firstRenewal.previous_end_date
        // Infer duration based on first renewal's previous end date and created_at
        const durationDays = (new Date(initialEndDate).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        if (durationDays <= 8) {
            initialType = 'weekly'
            initialPayment = 200 // Default weekly
        } else if (durationDays <= 32) {
            initialType = 'monthly'
            initialPayment = 500 // Default gym monthly
            if (m.membership_category === 'boxing_muaythai') initialPayment = 2000
        }
      }
      
      const previousEndDate = createdDate.toISOString().split("T")[0]
      
      const { error: insertErr } = await supabase.from('renewals').insert({
        member_id: m.id,
        membership_category: initialCategory,
        membership_type: initialType,
        previous_end_date: previousEndDate,
        new_end_date: initialEndDate,
        payment_amount: initialPayment,
        created_at: m.created_at // Use the member's creation date!
      })
      
      if (insertErr) {
        console.error("Error inserting:", insertErr)
      } else {
        inserted++
      }
    }
  }
  
  console.log(`Backfilled ${inserted} initial records.`)
}

run()
