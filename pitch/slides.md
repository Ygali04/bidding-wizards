---
marp: true
theme: default
paginate: true
backgroundColor: "#FAFAFA"
style: |
  section {
    font-family: "Inter", "Helvetica Neue", sans-serif;
    color: #171717;
    padding: 56px 72px;
  }
  h1 { font-weight: 900; letter-spacing: -0.03em; color: #171717; }
  h2 { font-weight: 800; letter-spacing: -0.02em; color: #171717; }
  strong { color: #171717; }
  .kicker {
    color: #a3a3a3;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.55em;
    font-weight: 700;
  }
  .yellow { background: #FACC15; padding: 0 0.15em; }
  table { font-size: 0.62em; border-collapse: collapse; width: 100%; }
  th { text-align: left; color: #a3a3a3; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.08em; }
  td, th { border: none; border-bottom: 1px solid #e5e5e5; padding: 8px 10px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { border-top: 2px solid #171717; border-bottom: none; font-weight: 800; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .stat { font-size: 2.6em; font-weight: 900; letter-spacing: -0.03em; }
  .stat small { display: block; font-size: 0.32em; font-weight: 600; color: #737373; letter-spacing: 0; }
  footer { color: #a3a3a3; font-size: 0.5em; }
---

<!-- _paginate: false -->

<p class="kicker">Bidding Wizards · Seed</p>

# BidBench

## Know your <span class="yellow">margin</span> before the bid leaves your hands.

Paste a job in plain words — or drop a PDF blueprint — and get an itemized contractor bid: materials, labor, contingency, markup, GST, and the profit you'll keep.

**Live product:** espetro.github.io/bidding-wizards → `#/bid`
**Try it:** no sign-in, no card, no sales call.

---

<p class="kicker">The problem</p>

# Contractors bid blind.

- A written estimate takes **hours** of spreadsheet work per job.
- One missed line item or a thin markup **silently eats the profit** on a won job.
- The margin is discovered **after** the bid goes out — when it's too late to change.
- Existing takeoff suites are priced and built for enterprise pre-construction teams, not a two-crew shop.

---

<p class="kicker">The product</p>

# Brief in. Itemized bid out.

- **Material lines** — item × quantity × unit cost, plus square-footage lines (L × W × $/sf)
- **Labor** — role × hours × rate
- **Contingency % and markup %** — editable, applied to cost-to-complete
- **Itemized breakdown** — materials, labor, contingency, markup, bid total
- **Profit and margin** — always on the page, plus a margin-floor warning with a one-click fix
- GST on its own line — AU/NZ/CA/UK rates, or 0 if exempt

Everything editable. Every dollar figure is plain arithmetic you can check by hand.

---

<p class="kicker">What a bid looks like</p>

# Guest bath — first cut in seconds

| Line | Kind | Amount |
|---|---|---:|
| Subway tile · 48 sq ft | Material | $204 |
| Vanity + toilet + faucet | Material | $750 |
| Tile setter + plumber + painter | Labor | $1,140 |
| Contingency + markup | On cost | → Bid $3,100 ex GST |
| GST 10% | On bid | $310 |
| **Total inc GST** | **Client pays** | **$3,410** |

Contingency auto-bumps when the brief mentions an occupied home or hidden water damage. Stress-test shows margin kept after a 10% cost overrun.

---

<p class="kicker">How it works</p>

# AI where it reads. Code where it counts.

<div class="cols">
<div>

**Reads free text**

- On-device catalog matcher itemizes a plain-language brief — no API key, instant
- Jev (`@ai-sdk/typesafe-ai`) classifies PDF blueprints vs job forms and flags occupied/hidden conditions
- Non-trade briefs are qualified out instead of hallucinating a bid

</div>
<div>

**Does the math**

- `direct = materials + labor`
- `contingency = direct × contingency %`
- `bid = (direct + contingency) × (1 + markup %)`
- `margin = profit ÷ bid`

No model invents a dollar figure. Reviewers can check every line.

</div>
</div>

---

<p class="kicker">Why it sticks</p>

# The bid is the workflow.

- **Copy bid** as clean client-ready text, or **print** a formatted bid sheet
- **Export to Procore** budget CSV and **QuickBooks** IIF estimate — lands inside the tools contractors already run their books on
- Saved drafts survive refresh; job details (client, site, terms) ride along on the bid
- Each export and re-bid is another reason not to go back to the spreadsheet

---

<p class="kicker">Traction</p>

# Selling today.

<div class="cols">
<div>

<span class="stat">$133.8K<small>booked ARR</small></span>
<span class="stat">4<small>paying customers, incl. a $90K/yr interiors firm</small></span>

</div>
<div>

<span class="stat">$250K<small>raised · $6M post · founders hold 92%</small></span>
<span class="stat">#5<small>of the cohort · 44 wks runway</small></span>

</div>
</div>

**Model:** per-seat subscription for estimators and owners. Land with the free estimator, expand into saved templates, blueprint take-off volume, and accounting exports.

---

<p class="kicker">Market</p>

# Every trade bids. Most bid blind.

- Small trade contractors — electrical, roofing, remodel, landscaping, interiors — live and die by the bid sheet
- They won't buy enterprise takeoff suites; they will use a tool that reads a texted job description
- Expansion is structural: each signed shop pulls its subs and suppliers onto the same line-item format

---

<p class="kicker">Team</p>

# Builders, not slideware.

- **Quino Terrasa** — product & AI engineer. Shipped AI products at MaibornWolff (Rohde & Schwarz AI gateway analytics, agentic coding rollout) and Volkswagen AG; ex-stealth co-founder.
- **Yahvin Gali** — ML engineer. 19 months at SAP Research fine-tuning SLMs; CV research in scene reconstruction and world models at UCLA/VMG; shipped BruinBot for UCLA Physics.
- **Kamayani Rai** — data & ML engineer. Billing/tax validation across millions of DirecTV records at DXC; mammography detection mAP 0.54 → 0.68 on ASU's Sol supercomputer.

---

<!-- _paginate: false -->

<p class="kicker">The ask</p>

# Help us bid on more jobs.

- **Raising** to extend runway and put the estimator in front of every trade that still quotes in a spreadsheet
- **Already in:** Sarah Hatcher, Ronnie Rolodex (Everywhere Angels), Chong Han Chua — $250K at a $6M post
- **Use of funds:** blueprint take-off parser, trade catalogs, distribution to contractor communities

**Try the product now — it sells itself:**
espetro.github.io/bidding-wizards · deck: /pitch.html

<footer>Bidding Wizards · BidBench · espetro.github.io/bidding-wizards</footer>
