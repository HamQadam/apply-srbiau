# Ghadam Platform: Product Roadmap & Technical Plan

## Executive Summary

You have two distinct but complementary products that are currently disconnected:

1. **Experience Sharing Platform** (built) — Students share their application journeys, earn Ghadams, readers pay to view
2. **Application Tracker** (not built) — Personal tool to track universities, deadlines, and application status

The fundamental problem: **There's no entry point.** A new user lands on your platform and immediately sees "pay to view other people's experiences" which feels extractive. They have no reason to stay, no reason to contribute, and no value before paying.

**The solution:** Make the Application Tracker the **free, value-first entry point**. Users come for the tracker (free), discover relevant profiles as they add universities (contextual), and naturally convert to contributors after their journey ends.

---

## Part 1: Current State Analysis

### What You Have (Backend)

| Component | Status | Notes |
|-----------|--------|-------|
| Applicant Profiles | ✅ Done | GPA, university, major, graduation year |
| Language Credentials | ✅ Done | IELTS, TOEFL, DELF with sub-scores |
| Documents | ✅ Done | File uploads, public/private toggle |
| Extracurricular Activities | ✅ Done | Work, research, volunteering, awards |
| Applications | ✅ Done | Programs applied, status, tips |
| Ghadam Coin System | ✅ Done | Earn on contribute, pay to view |
| OTP Authentication | ✅ Done | Debug mode with 000000 |
| Stats Endpoints | ✅ Done | By university, by country |

### What You Have (Frontend)

| Component | Status | Notes |
|-----------|--------|-------|
| Home Page | ✅ Done | Stats overview |
| Applicants Listing | ✅ Done | Browse profiles |
| Profile Detail | ✅ Done | Full applicant view |
| Multi-step Form | ✅ Done | Create profile flow |
| Login Page | ✅ Done | OTP flow in Persian |
| Wallet Page | ✅ Done | Ghadam balance, transactions |
| Search Page | ✅ Done | Filter applications |
| Paywall Component | ✅ Done | Pay-to-view gate |

### What's Critically Missing

| Component | Priority | Why It Matters |
|-----------|----------|----------------|
| Application Tracker | 🔴 Critical | No free value prop = no user retention |
| University/Program Database | 🔴 Critical | Tracker is useless without data |
| User Dashboard | 🔴 Critical | No central home for logged-in users |
| Onboarding Flow | 🟡 High | Users don't know what to do |
| Profile-to-University Matching | 🟡 High | The magic that ties both products together |
| Notification System | 🟢 Medium | Deadline reminders, profile matches |
| Mobile Responsiveness | 🟢 Medium | Students are mobile-first |

---

## Part 2: The Integrated User Journey

### Current (Broken) Flow
```
User arrives → Sees "pay to view profiles" → Leaves (no value)
```

### Proposed (Fixed) Flow
```
User arrives 
    → Creates free account
    → Adds target programs to Tracker (free, immediate value)
    → Sees "5 students with similar background got into TU Delft CS"
    → Uses free Ghadams to view 1-2 profiles
    → Applies to programs (tracked)
    → Gets result (accept/reject)
    → Prompted: "Share your journey, earn 150+ Ghadams"
    → Becomes contributor
    → Cycle continues
```

### Key Insight

The Tracker isn't a separate product. It's the **acquisition funnel** for the Experience Sharing platform. Every tracker user is a future contributor.

---

## Part 3: The Missing Pieces (Detailed)

### 3.1 Application Tracker (User's Personal Dashboard)

This is what users see when they log in. It's their command center.

**Data Model Additions:**
```
TrackedProgram
├── id
├── user_id (FK → User)
├── program_id (FK → Program, nullable if custom)
├── custom_program_name (if not in database)
├── university_name
├── country
├── deadline
├── status: enum [researching, preparing, submitted, interview, accepted, rejected, waitlisted]
├── submitted_date
├── result_date
├── notes (private)
├── priority: enum [reach, target, safety]
├── documents_checklist: JSON [{name: "SOP", done: bool}, ...]
├── created_at
├── updated_at
```

**Frontend Views:**

1. **Tracker Dashboard** (`/dashboard`)
   - Overview cards: X applications, Y pending, Z deadlines this month
   - Quick actions: Add program, Update status
   - Upcoming deadlines (next 30 days, sorted)
   - Mini calendar view of deadlines

2. **Program List** (`/dashboard/programs`)
   - Table/Card view of all tracked programs
   - Filter by status, country, deadline
   - Bulk status update
   - Export to CSV

3. **Program Detail** (`/dashboard/programs/:id`)
   - Full info about this tracked program
   - Document checklist
   - Notes
   - Timeline of status changes
   - **"See who got accepted here"** → links to matching profiles (paywall if needed)

4. **Add Program** (`/dashboard/programs/new`)
   - Search from database OR add custom
   - Auto-fill deadline, requirements if from database
   - Set priority (reach/target/safety)

**Backend Endpoints:**
```
POST   /api/v1/tracker/programs          # Add program to tracker
GET    /api/v1/tracker/programs          # List user's tracked programs
GET    /api/v1/tracker/programs/:id      # Get single tracked program
PATCH  /api/v1/tracker/programs/:id      # Update status, notes, etc.
DELETE /api/v1/tracker/programs/:id      # Remove from tracker
GET    /api/v1/tracker/stats             # User's application stats
GET    /api/v1/tracker/deadlines         # Upcoming deadlines
POST   /api/v1/tracker/programs/:id/checklist  # Update document checklist
```

---

### 3.2 University & Program Database

This is the backbone that makes the tracker useful.

**Data Model:**
```
University
├── id
├── name
├── name_local (e.g., Persian/German name)
├── country
├── city
├── ranking_qs
├── ranking_the
├── ranking_shanghai
├── website
├── type: enum [public, private]
├── created_at
├── updated_at

Program
├── id
├── university_id (FK)
├── name
├── degree: enum [bachelor, master, phd]
├── field (normalized: "Computer Science", "Data Science", etc.)
├── language: enum [english, german, french, dutch, etc.]
├── duration_months
├── tuition_fee_eur (null if free)
├── deadline_fall
├── deadline_spring (nullable)
├── requirements: JSON {
│     gpa_min: float,
│     ielts_min: float,
│     toefl_min: int,
│     gre_required: bool,
│     work_experience_years: int
│   }
├── application_link
├── program_link
├── last_verified_at
├── verified_by_user_id (nullable)
├── created_at
├── updated_at
```

**Data Strategy (Start Simple):**

Phase 1: Manual entry for top 50 programs
- Focus on: France, Germany, Netherlands (your Campus France focus)
- Fields: CS, Data Science, AI, Software Engineering
- Source: MastersPortal, DAAD, Campus France listings

Phase 2: Community verification
- When user gets accepted, prompt: "Is this info still accurate?"
- Award Ghadams for verified updates

Phase 3: Crawler (later, when you have traction)
- Not needed for MVP
- Your competitive advantage is profiles, not program data

**Backend Endpoints:**
```
GET    /api/v1/universities              # List/search universities
GET    /api/v1/universities/:id          # Get university detail
GET    /api/v1/universities/:id/programs # Get programs at university
GET    /api/v1/programs                  # Search/filter programs
GET    /api/v1/programs/:id              # Get program detail
GET    /api/v1/programs/:id/profiles     # Get profiles who applied here
POST   /api/v1/programs/:id/verify       # Community verification
```

---

### 3.3 Profile-to-Program Matching (The Magic)

This is what makes the two products work together.

**Matching Logic:**

When a user adds "TU Delft - Computer Science" to their tracker:
1. Query profiles who have an Application with:
   - university = "TU Delft" AND program ≈ "Computer Science"
   - OR university = "TU Delft" AND any program
2. Filter by similarity:
   - Same country origin
   - Similar GPA range (±0.5)
   - Similar graduation year (±2 years)
3. Rank by relevance:
   - Exact program match > Same university > Same country
   - Accepted > Rejected (both are valuable!)
   - More complete profile > Less complete

**Frontend Integration:**

On Tracker Dashboard:
```
┌─────────────────────────────────────────────────────┐
│ TU Delft - Computer Science                         │
│ Status: Preparing | Deadline: 15 Mar 2026           │
│ ─────────────────────────────────────────────────── │
│ 👥 12 students from your university applied here    │
│    8 accepted · 4 rejected                          │
│ [View Success Stories →] (costs 50 Ghadams each)    │
└─────────────────────────────────────────────────────┘
```

**Backend Endpoints:**
```
GET /api/v1/tracker/programs/:id/matches   # Get matching profiles
GET /api/v1/programs/:id/stats             # Acceptance rate, avg GPA, etc.
```

---

### 3.4 Onboarding Flow

First-time users need guidance.

**Flow:**
```
1. Sign Up (phone + OTP)
        ↓
2. "What's your goal?"
   [ ] I'm applying abroad soon (→ Tracker focus)
   [ ] I already applied/got accepted (→ Contribute focus)
   [ ] Just browsing (→ Limited access)
        ↓
3a. Tracker Path:
    - "Add your first target program"
    - Show 3-5 popular programs
    - Or search
        ↓
3b. Contributor Path:
    - "Share your journey, earn Ghadams"
    - Quick profile form
        ↓
4. Dashboard (with contextual tips)
```

**Ghadam Incentives:**
- Complete onboarding: +20 Ghadams (enough to view 1 profile)
- Add first program: +10 Ghadams
- This gives new users immediate value

---

### 3.5 The Contributor Prompt (Post-Result)

When a user updates their tracker status to "Accepted" or "Rejected":

**Modal/Page:**
```
🎉 Congratulations on your result!

Your journey can help future students like you.

By sharing your experience, you'll:
• Earn 150+ Ghadams (enough to view 3 profiles)
• Help students from your university
• Get 70% of future view fees forever

[Share My Journey] [Maybe Later]
```

**Quick Contribute Flow:**

Pre-fill from tracker data:
- Programs they applied to (already tracked!)
- Results (already tracked!)
- Just need: GPA, language scores, tips, optional documents

---

## Part 4: Implementation Phases

### Phase 1: Tracker Foundation (Week 1-2)

**Goal:** Users can track applications without any paywall

**Backend Tasks:**
- [ ] Create `TrackedProgram` model and migration
- [ ] Create tracker CRUD endpoints
- [ ] Add deadlines and stats endpoints
- [ ] Seed 30 programs manually (France, Germany, Netherlands)

**Frontend Tasks:**
- [ ] Create `/dashboard` route (protected)
- [ ] Build TrackerDashboard component
- [ ] Build AddProgram flow (search + custom)
- [ ] Build ProgramCard component with status dropdown
- [ ] Add deadline calendar view
- [ ] Update navbar: show Dashboard when logged in

**Product Outcome:**
- User can sign up
- User can add programs to track
- User can update status
- User sees upcoming deadlines
- **No payment required yet**

---

### Phase 2: Database & Matching (Week 3-4)

**Goal:** Programs come from database, matched profiles appear

**Backend Tasks:**
- [ ] Create `University` and `Program` models
- [ ] Create search/filter endpoints for programs
- [ ] Create matching endpoint (profiles for a program)
- [ ] Seed 50 universities, 200 programs
- [ ] Add acceptance rate calculation

**Frontend Tasks:**
- [ ] Build ProgramSearch component with autocomplete
- [ ] Show "X students applied here" on tracker cards
- [ ] Build MatchedProfiles preview (blurred, teaser)
- [ ] Integrate paywall for full profile access

**Product Outcome:**
- Adding programs is easy (autocomplete)
- Users see social proof (X applied, Y accepted)
- Clear path to paid profiles

---

### Phase 3: Onboarding & Conversion (Week 5-6)

**Goal:** Smooth first-time experience, clear contributor path

**Backend Tasks:**
- [ ] Add onboarding status to User model
- [ ] Award signup/onboarding Ghadams
- [ ] Create "quick contribute" endpoint (pre-filled from tracker)
- [ ] Trigger notifications when status changes to accepted/rejected

**Frontend Tasks:**
- [ ] Build OnboardingFlow component
- [ ] Add "goal selection" step
- [ ] Build ContributorPrompt modal
- [ ] Pre-fill profile form from tracker data
- [ ] Add contextual tips/tooltips throughout

**Product Outcome:**
- New users immediately understand the platform
- Clear path from tracker user → contributor
- Frictionless contribution (data pre-filled)

---

### Phase 4: Polish & Retention (Week 7-8)

**Goal:** Users come back regularly

**Backend Tasks:**
- [ ] Deadline reminder system (email/SMS)
- [ ] "New profiles for your programs" notifications
- [ ] Weekly digest of relevant activity

**Frontend Tasks:**
- [ ] Build notification center
- [ ] Add email preferences
- [ ] Mobile-responsive improvements
- [ ] Empty states with helpful CTAs
- [ ] Progress indicators (profile completeness, tracker health)

**Product Outcome:**
- Users have reasons to return
- Platform feels alive and active
- Mobile experience is solid

---

## Part 5: Current Codebase Gaps

### Backend Changes Needed

**New Files to Create:**
```
app/models/university.py      # University model
app/models/program.py         # Program model  
app/models/tracked_program.py # TrackedProgram model
app/api/v1/universities.py    # University endpoints
app/api/v1/programs.py        # Program endpoints
app/api/v1/tracker.py         # Tracker endpoints
app/services/matching.py      # Profile matching logic
```

**Files to Modify:**
```
app/models/__init__.py        # Export new models
app/api/v1/router.py          # Add new routers
app/models/user.py            # Add onboarding_completed, goal fields
app/services/ghadam.py        # Add signup bonus, tracker rewards
```

### Frontend Changes Needed

**New Files to Create:**
```
src/pages/Dashboard/
  ├── DashboardPage.tsx       # Main tracker dashboard
  ├── ProgramListPage.tsx     # All tracked programs
  ├── AddProgramPage.tsx      # Add new program
  └── ProgramDetailPage.tsx   # Single program detail

src/components/Tracker/
  ├── ProgramCard.tsx         # Program in tracker
  ├── DeadlineCalendar.tsx    # Calendar view
  ├── StatusDropdown.tsx      # Status selector
  ├── ProgramSearch.tsx       # Autocomplete search
  └── MatchedProfilesPreview.tsx

src/components/Onboarding/
  ├── OnboardingFlow.tsx      # Multi-step onboarding
  ├── GoalSelector.tsx        # What's your goal?
  └── ContributorPrompt.tsx   # Share your journey modal

src/api/
  ├── tracker.ts              # Tracker API calls
  ├── universities.ts         # University/program API calls
```

**Files to Modify:**
```
src/App.tsx                   # Add Dashboard routes
src/components/Layout/Navbar  # Show Dashboard when logged in
src/pages/index.ts            # Export new pages
src/types/index.ts            # Add new types
```

---

## Part 6: Quick Wins (Do These First)

### This Week

1. **Create TrackedProgram model + basic CRUD**
   - Even without program database, users can add custom programs
   - Immediate value

2. **Build basic Dashboard page**
   - List of tracked programs
   - Status dropdown
   - Deadline display

3. **Seed 20 programs manually**
   - Focus on French universities (Campus France)
   - Add deadline, basic requirements

4. **Change homepage messaging**
   - Current: "See other people's experiences" (extractive)
   - New: "Track your applications. Learn from success stories." (value-first)

### Database Seeding Priority

**Countries (in order):**
1. France (your Campus France application)
2. Germany (DAAD, free tuition)
3. Netherlands (popular English programs)
4. Canada (straightforward immigration)
5. Others later

**Fields (in order):**
1. Computer Science / Software Engineering
2. Data Science / AI / ML
3. Electrical / Electronic Engineering
4. Business / MBA
5. Others later

**Per Program, Minimum Data:**
- Name
- University
- Country
- City
- Deadline (Fall intake)
- Degree level
- Language of instruction
- Tuition (0 if free)

---

## Part 7: Success Metrics

### North Star Metric
**Monthly Active Trackers** — Users who update their tracker at least once per month

### Supporting Metrics

| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| Signups | 100 | 500 |
| Programs tracked | 300 | 2,000 |
| Profiles created | 20 | 100 |
| Profile views (paid) | 50 | 500 |
| Contributor conversion | 10% | 15% |

### What to Watch

- **Drop-off after signup**: If high, onboarding is broken
- **Programs tracked per user**: If <2, database is too limited
- **Time to first profile view**: Should be <5 minutes
- **Contributor conversion rate**: Are accepted students sharing?

---

## Summary: The 3 Things That Matter Most

1. **Build the Tracker first** — It's your free value proposition and acquisition funnel

2. **Seed the program database manually** — 50 programs is enough to start, crawler comes later

3. **Connect tracker to profiles** — The magic moment is "5 students like you got into this program"

Everything else is polish. Get these three right, and you have a product people will use.
