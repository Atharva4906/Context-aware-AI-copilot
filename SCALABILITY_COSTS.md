# Scalability & Cost Analysis: Pragyantra AI Co-Pilot

## Executive Summary
This document provides a detailed cost breakdown for the Pragyantra system operating at various scales. It assumes 1 student creating 50 interactions and scales up to production scenarios.

---

## Part 1: Single Student - 50 Interactions Cost Breakdown

### 1.1 Assumptions
- **1 Student ID**: `student-uuid-123`
- **50 interactions**: Each interaction triggers the full diagnostic pipeline
- **Average student response length**: 200 tokens
- **Average LLM output**: 300 tokens per node
- **LLM Model**: Groq llama-3.3-70b-versatile (70B model) + llama-3.1-8b-instant (8B model)
- **Database queries**: ~5 operations per interaction
- **Vector embeddings**: Pre-computed via sentence-transformers (local, free)
- **Time period**: 1 month

### 1.2 Per-Interaction Cost Breakdown

| Component | Cost Per Interaction | Details |
|-----------|---------------------|---------|
| **LLM API (Groq)** | $0.002540 | 5 nodes × ~500 tokens × Groq pricing (~$0.0102 per 1M tokens for llama-3.3-70b) |
| **Vector Search (pgvector)** | $0.0002 | 1 vector search query to common_misconceptions table (pgvector operations are ~$0.0002 per query at scale) |
| **Database Reads** | $0.0004 | 2 reads: student_misconception_state + interaction_logs ($0.0002 per read) |
| **Database Writes** | $0.0005 | 2-3 writes: log interaction + update RL policy + update state ($0.0002-0.0003 per write) |
| **Data Transfer** | $0.0001 | ~50KB data in/out (first 1GB/month free on Supabase) |
| **Compute (FastAPI)** | $0.0010 | Minimal CPU for orchestration (~0.1 seconds per request) |
| **Storage (Incremental)** | $0.00002 | ~500 bytes per interaction stored |
| **Total Per Interaction** | **$0.004364** | ~0.43¢ per interaction |

### 1.3 50 Interactions Cost Summary

| Item | Quantity | Unit Cost | Total Cost |
|------|----------|-----------|-----------|
| LLM API Calls (Groq) | 50 | $0.002540 | **$0.127** |
| Vector Searches | 50 | $0.0002 | **$0.010** |
| Database Reads | 100 | $0.0002 | **$0.020** |
| Database Writes | 125 | $0.0002 | **$0.025** |
| Data Transfer | 50 | $0.0001 | **$0.005** |
| Compute (FastAPI) | 50 | $0.0010 | **$0.050** |
| Storage Growth | 50 | $0.00002 | **$0.001** |
| **TOTAL FOR 50 INTERACTIONS** | — | — | **$0.238** |
| **Cost Per Interaction** | — | — | **$0.00476** |

### 1.4 Monthly Subscription Costs (Beyond Per-Request)

| Service | Free Tier | Paid Tier | Cost/Month |
|---------|-----------|-----------|-----------|
| **Supabase (PostgreSQL)** | ✓ (Free: 500 MB, 2 concurrent connections) | Pay-as-you-go | $0–$50 (low volume: ~$0) |
| **Supabase (pgvector)** | ✓ Included | Included | $0 |
| **Groq API** | ✓ (Free tier: generous limits) | Pay-per-token | $0–$100 (50 interactions: ~$0.13) |
| **Frontend Hosting** (Vercel/Netlify) | ✓ | Pro: $20+ | $0–$20 |
| **Backend Hosting** (Railway/Fly.io) | $5 | Pay-as-you-go | $5–$50 |
| **Vector Embeddings** (Local: sentence-transformers) | ✓ | — | $0 |
| **Monitoring/Logging** (Optional: Sentry) | ✓ | Pro: $29+ | $0–$29 |
| **Domain & SSL** (Optional) | — | — | $0–$12 |

### 1.5 Total Cost for 1 Student × 50 Interactions (1 Month)

```
Per-request costs:          $0.238
Fixed hosting (backend):    $5.00
Frontend hosting:           $0.00 (free tier)
Groq API (if not free tier): $0.00 (included in per-request)
Total Infrastructure Cost:  ≈ $5.24 for 50 interactions
Cost per interaction:       ≈ $0.105
```

**Result**: For a single student with 50 interactions in a month, the total cost is approximately **$5.24**, or about **0.1¢ to 0.2¢ per interaction** when accounting for fixed infrastructure.

---

## Part 2: Scaling to 100 Students (5,000 Interactions/Month)

### 2.1 Cost Summary at 100 Students

| Item | Quantity | Unit Cost | Total Cost |
|------|----------|-----------|-----------|
| LLM API Calls (Groq) | 5,000 | $0.002540 | **$12.70** |
| Vector Searches | 5,000 | $0.0002 | **$1.00** |
| Database Reads | 10,000 | $0.0002 | **$2.00** |
| Database Writes | 12,500 | $0.0002 | **$2.50** |
| Data Transfer | 5,000 | $0.0001 | **$0.50** |
| Compute (FastAPI) | 5,000 | $0.0010 | **$5.00** |
| Storage Growth (incremental) | 5,000 | $0.00002 | **$0.10** |
| **Subtotal (Per-Request)** | — | — | **$24.30** |
| Backend Hosting (Railway/Fly.io) | 1 month | $15–$30 | **$15.00** |
| Supabase (PostgreSQL: $25 for 8GB) | 1 month | $0–$25 | **$0–$5.00** |
| Frontend Hosting | 1 month | $0–$20 | **$0.00** |
| Monitoring/Logging | 1 month | $0–$29 | **$0.00** |
| **TOTAL FOR 100 STUDENTS** | — | — | **$39.30–$49.30** |
| **Cost Per Interaction** | — | — | **$0.0079–$0.0099** |

---

## Part 3: Scaling to 1,000 Students (50,000 Interactions/Month)

### 3.1 Cost Summary at 1,000 Students

| Item | Quantity | Unit Cost | Total Cost |
|------|----------|-----------|-----------|
| LLM API Calls (Groq) | 50,000 | $0.002540 | **$127.00** |
| Vector Searches | 50,000 | $0.0002 | **$10.00** |
| Database Reads | 100,000 | $0.0002 | **$20.00** |
| Database Writes | 125,000 | $0.0002 | **$25.00** |
| Data Transfer | 50,000 | $0.0001 | **$5.00** |
| Compute (FastAPI) | 50,000 | $0.0010 | **$50.00** |
| Storage Growth (incremental) | 50,000 | $0.00002 | **$1.00** |
| **Subtotal (Per-Request)** | — | — | **$238.00** |
| Backend Hosting (auto-scaling) | 1 month | $50–$150 | **$50.00** |
| Supabase (PostgreSQL: $100 for 32GB) | 1 month | $25–$100 | **$25.00** |
| Frontend Hosting (scaling) | 1 month | $0–$100 | **$20.00** |
| Monitoring/Logging (Datadog/Sentry) | 1 month | $29–$300 | **$50.00** |
| CDN (Cloudflare) | 1 month | $0–$20 | **$0.00** |
| **TOTAL FOR 1,000 STUDENTS** | — | — | **$383.00** |
| **Cost Per Interaction** | — | — | **$0.00766** |

---

## Part 4: Enterprise Scale (10,000 Students × 50 Interactions = 500,000 Interactions/Month)

### 4.1 Cost Summary at 10,000 Students

| Item | Quantity | Unit Cost | Total Cost |
|------|----------|-----------|-----------|
| LLM API Calls (Groq) | 500,000 | $0.002540 | **$1,270.00** |
| Vector Searches (pgvector) | 500,000 | $0.0002 | **$100.00** |
| Database Reads | 1,000,000 | $0.0002 | **$200.00** |
| Database Writes | 1,250,000 | $0.0002 | **$250.00** |
| Data Transfer (egress) | 500,000 | $0.0001 | **$50.00** |
| Compute (FastAPI multi-region) | 500,000 | $0.0010 | **$500.00** |
| Storage Growth (incremental) | 500,000 | $0.00002 | **$10.00** |
| **Subtotal (Per-Request)** | — | — | **$2,380.00** |
| Backend Hosting (auto-scaling, multi-region) | 1 month | $200–$500 | **$300.00** |
| Supabase (PostgreSQL: $500 for 128GB) | 1 month | $100–$500 | **$200.00** |
| Frontend CDN (Vercel/Netlify Enterprise) | 1 month | $50–$500 | **$100.00** |
| Monitoring/Logging (Datadog) | 1 month | $300–$1000 | **$500.00** |
| Redis Cache (query optimization) | 1 month | $50–$300 | **$100.00** |
| Backup & Disaster Recovery | 1 month | $50–$200 | **$75.00** |
| **TOTAL FOR 10,000 STUDENTS** | — | — | **$3,655.00** |
| **Cost Per Interaction** | — | — | **$0.00731** |

---

## Part 5: Cost Comparison Table (All Scales)

| Metric | 1 Student (50) | 100 Students (5K) | 1K Students (50K) | 10K Students (500K) |
|--------|---------------|-------------------|-------------------|---------------------|
| **Total Monthly Cost** | $5.24 | $39–$49 | $383 | $3,655 |
| **Cost Per Interaction** | $0.105 | $0.0079 | $0.00766 | $0.00731 |
| **LLM Cost** | $0.127 | $12.70 | $127.00 | $1,270.00 |
| **Hosting Cost** | $5.00 | $15.00 | $70.00 | $675.00 |
| **Database Cost** | $0.04 | $5–$10 | $25 | $200 |
| **Storage Per Month** | ~500 KB | ~5 MB | ~50 MB | ~500 MB |
| **Interactions Per Month** | 50 | 5,000 | 50,000 | 500,000 |

---

## Part 6: Cost Breakdown by Component (Single Student × 50 Interactions)

### 6.1 Visual Cost Distribution

```
Total Cost: $5.24 for 50 interactions
├── Backend Hosting (95.4%): $5.00
│   └── Fixed infrastructure cost
├── LLM API Calls (2.4%): $0.127
│   └── 5 Groq API calls per interaction
├── Database Operations (0.9%): $0.045
│   └── Reads, writes, vector searches
├── Data Transfer (0.1%): $0.005
│   └── Minimal egress for low volume
└── Other (0.2%): $0.013
    └── Compute, storage, monitoring
```

### 6.2 Per-Interaction Cost Breakdown (When Amortized)

```
$0.105 per interaction (50 interactions, 1 month)
├── Fixed Hosting Amortized: $0.100
│   └── $5.00 / 50 interactions
├── LLM API: $0.00254
├── Vector Search: $0.0002
├── Database (R/W): $0.00019
└── Other: $0.00007
```

---

## Part 7: What's Included in Each Cost?

### 7.1 LLM API (Groq) - $0.127 for 50 interactions

| Node | Tokens Per Call | Calls | Total Tokens | Cost* |
|------|-----------------|-------|--------------|-------|
| Reasoner | ~500 | 50 | 25,000 | $0.000255 |
| Explanation Analyzer | ~500 | 50 | 25,000 | $0.000255 |
| Judge | ~400 | 50 | 20,000 | $0.000204 |
| Tutor | ~500 | 50 | 25,000 | $0.000255 |
| Architect (MCQ Gen) | ~300 | 50 | 15,000 | $0.000153 |
| **Total** | — | 250 | ~110,000 | **$0.0112** |

*Groq pricing: ~$0.102 per 1M input tokens for llama-3.3-70b

### 7.2 Supabase Operations - $0.035 for 50 interactions

| Operation | Per Interaction | × 50 | Unit Cost | Total |
|-----------|-----------------|------|-----------|--------|
| Vector Query (pgvector) | 1 | 50 | $0.0002 | $0.010 |
| Student History Read | 1 | 50 | $0.0002 | $0.010 |
| RL Policy Update | 1 | 50 | $0.0002 | $0.010 |
| Interaction Log Write | 1 | 50 | $0.0002 | $0.010 |
| Misconception State Update | 1 | 50 | $0.0001 | $0.005 |
| **Total Supabase** | — | — | — | **$0.045** |

---

## Part 8: Cost Optimization Strategies

### 8.1 Reduce Costs by 40-60%

| Strategy | Current Cost | Optimized Cost | Savings |
|----------|--------------|----------------|---------|
| **1. Batch Vector Searches** | $0.0002/query | $0.00008/query | 60% |
| Use cached embeddings | — | — | — |
| **2. Database Connection Pooling** | $0.0002/query | $0.0001/query | 50% |
| Reduce connection overhead | — | — | — |
| **3. Implement Redis Cache** | — | -$0.0005/interaction | Saves 15% |
| Cache common misconceptions | — | — | — |
| **4. Use 8B Model for Some Nodes** | $0.002540 | $0.001200 | 53% |
| Judge + Analyzer on 8B model | — | — | — |
| **5. Lazy Load Interactions Logs** | $0.0004/interaction | $0.0001/interaction | 75% |
| Don't fetch full history always | — | — | — |

### 8.2 Optimized Cost for 50 Interactions

| Item | Original | Optimized | Savings |
|------|----------|-----------|---------|
| LLM Calls | $0.127 | $0.055 | **57%** |
| Database | $0.045 | $0.015 | **67%** |
| Vector Search | $0.010 | $0.004 | **60%** |
| **Total Per-Request** | $0.238 | $0.099 | **58%** |
| **+ Hosting (Fixed)** | $5.00 | $5.00 | — |
| **TOTAL OPTIMIZED** | $5.24 | $5.10 | **2.7%** |

---

## Part 9: Revenue & Profitability Model

### 9.1 Pricing Strategy

| Model | Price Per Student/Month | Break-Even Students |
|-------|------------------------|---------------------|
| **Freemium** (50 interactions/month free) | $0–$5 | N/A (loss leader) |
| **Basic Plan** | $9.99/month (50 interactions) | 85 students |
| **Pro Plan** | $29.99/month (200 interactions) | 28 students |
| **Enterprise** | $299/month (unlimited) | 3–5 customers |

### 9.2 Profitability Example: 100 Students on Basic Plan

```
Revenue:       100 × $9.99 = $999/month
Infrastructure: $45/month (cost from Part 2.1)
Gross Margin:  $954/month (95.5% margin!)

Staff/Dev:     $5,000–$15,000/month (estimated)
Operating Cost: $5,045–$15,045/month
**Net Profit/Loss: -$4,046 to -$14,046/month (still requires investment)**
```

---

## Part 10: Key Takeaways

### 10.1 Cost Per Interaction at Different Scales

```
1 Student (50):         $0.105 per interaction
100 Students (5K):      $0.0079 per interaction
1K Students (50K):      $0.00766 per interaction
10K Students (500K):    $0.00731 per interaction
```

**Observation**: Due to fixed infrastructure costs, larger scales benefit from economy of scale. You hit marginal cost (~$0.007) at ~1,000 students.

### 10.2 Cost Drivers (Single Student)

1. **Backend Hosting (95.4%)**: Fixed cost dominates
2. **LLM API (2.4%)**: Variable, scales with interactions
3. **Database (0.9%)**: Minimal cost
4. Other: ~0.3%

### 10.3 For a Startup MVP

- Keep infrastructure minimal ($5–$15/month on free tiers)
- Optimize LLM calls first (batch, cache, cheaper models)
- Monitor Supabase usage (usually free for <500MB)
- Target 100–500 students before scaling

---

## Part 11: Detailed Pricing Sources

### 11.1 Groq API Pricing
- **llama-3.3-70b-versatile**: ~$0.102/1M input tokens, ~$0.306/1M output tokens
- **llama-3.1-8b-instant**: ~$0.024/1M input tokens, ~$0.024/1M output tokens
- **Free Tier**: Available with reasonable rate limits (50 requests/min for users)

### 11.2 Supabase Pricing
- **PostgreSQL**: Free tier (500 MB), then $25/month per tier
- **pgvector**: Included (no extra cost)
- **Compute**: $5/month + usage ($0.0002 per compute unit) [approximate]
- **Bandwidth**: 5GB free/month, then $0.09/GB

### 11.3 Hosting Costs
- **Railway**: $5–$50/month depending on compute
- **Fly.io**: $5–$30/month for small app
- **Vercel**: Free for frontend, custom pricing for enterprise
- **Netlify**: Free for frontend, $19+/month pro

### 11.4 Storage Usage (50 Interactions)

| Data Type | Size Per Interaction | Total per 50 |
|-----------|---------------------|--------------|
| Student query | ~200 bytes | ~10 KB |
| LLM response | ~500 bytes | ~25 KB |
| Metadata/logs | ~300 bytes | ~15 KB |
| **Total** | ~1000 bytes | ~50 KB |

---

## Part 12: Cost Projections (Annual)

### 12.1 Year 1 Projections (Assuming Gradual Growth)

| Month | Students | Interactions | Monthly Cost | COGS | Cumulative Cost |
|-------|----------|--------------|--------------|------|-----------------|
| 1–2 | 1 | 100 | $5 | $5 | $10 |
| 3–4 | 10 | 1,000 | $8 | $16 | $26 |
| 5–6 | 50 | 5,000 | $35 | $70 | $96 |
| 7–8 | 100 | 10,000 | $55 | $110 | $206 |
| 9–10 | 250 | 25,000 | $120 | $240 | $446 |
| 11–12 | 500 | 50,000 | $200 | $400 | $846 |
| **Year 1 Total** | — | — | — | — | **~$846** |

### 12.2 Revenue vs. Cost (Year 1, Basic Plan @ $9.99/student/month)

```
Avg Students in Year 1:  ~150
Avg Revenue/Month:       $150 × $9.99 = $1,498
Total Year 1 Revenue:    ~$9,000–$12,000
Total Year 1 COGS:       ~$846
Marketing/Dev/Staff:     ~$30,000–$60,000
Net Year 1:              **-$20,000 to -$50,000** (expected for startup)
```

---

## Conclusion

For **a single student creating 50 interactions**:
- **Total cost**: ~**$5.24/month**
- **Cost per interaction**: ~**$0.1/interaction** (including fixed hosting)
- **Variable cost only**: ~**$0.005/interaction**

At scale (10K students), costs drop to **$0.007/interaction**, making it highly profitable for a B2B/B2C educational SaaS.

