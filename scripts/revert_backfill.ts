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

  let deleted = 0
  for (const m of members) {
    const memberRenewals = renewals.filter(r => r.member_id === m.id)
    
    // Find backfilled records: created_at exactly matches member's created_at
    const backfilled = memberRenewals.filter(r => r.created_at === m.created_at)
    
    for (const b of backfilled) {
        const { error: delErr } = await supabase.from('renewals').delete().eq('id', b.id)
        if (delErr) {
            console.error("Error deleting:", delErr)
        } else {
            deleted++
        }
    }
  }
  
  console.log(`Deleted ${deleted} backfilled records.`)
}

run()
