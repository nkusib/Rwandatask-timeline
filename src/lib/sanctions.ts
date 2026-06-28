export type SanctionsResult =
  | { clear: true }
  | { clear: false; reason: string; matches: SanctionsMatch[] }
  // API unavailable — caller must treat this as a hard block, not a pass
  | { clear: false; reason: string; matches: []; apiUnavailable: true }

export type SanctionsMatch = {
  name: string
  score: number
  datasets: string[]
  caption: string
}

const OPENSANCTIONS_API = 'https://api.opensanctions.org'
const MATCH_THRESHOLD = 0.75

/**
 * Screen a person against OpenSanctions datasets (OFAC, UN, EU, PEP lists).
 *
 * FAIL-CLOSED: if the API is unreachable or returns an error, the result is
 * treated as an unresolved risk — the caller must NOT allow the user through.
 * MLR 2017 requires that CDD is completed before onboarding; inability to
 * screen is not equivalent to a clear result.
 */
export async function screenPerson(
  fullName: string,
  dateOfBirth: string | null,
  nationality: string | null
): Promise<SanctionsResult> {
  const properties: Record<string, string[]> = {
    name: [fullName.trim()],
  }
  if (dateOfBirth) properties.birthDate = [dateOfBirth]
  if (nationality) properties.nationality = [nationality]

  try {
    const res = await fetch(`${OPENSANCTIONS_API}/match/default`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(process.env.OPENSANCTIONS_API_KEY
          ? { 'Authorization': `ApiKey ${process.env.OPENSANCTIONS_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        queries: {
          person: {
            schema: 'Person',
            properties,
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      // API returned an error — fail closed, queue for manual review
      console.error('[sanctions] OpenSanctions API error:', res.status)
      return {
        clear: false,
        reason: 'Sanctions screening service temporarily unavailable. Manual review required before onboarding.',
        matches: [],
        apiUnavailable: true,
      }
    }

    const data = await res.json()
    const results = data.responses?.person?.results ?? []

    const hits: SanctionsMatch[] = results
      .filter((r: any) => r.score >= MATCH_THRESHOLD)
      .map((r: any) => ({
        name: r.caption,
        score: r.score,
        datasets: r.datasets ?? [],
        caption: r.caption,
      }))

    if (hits.length > 0) {
      return {
        clear: false,
        reason: `Possible sanctions/PEP match found (score: ${hits[0].score.toFixed(2)}). Manual review required.`,
        matches: hits,
      }
    }

    return { clear: true }
  } catch (err: any) {
    // Network timeout or other error — fail closed
    console.error('[sanctions] Screening failed:', err.message)
    return {
      clear: false,
      reason: 'Sanctions screening service unreachable. Manual review required before onboarding.',
      matches: [],
      apiUnavailable: true,
    }
  }
}
