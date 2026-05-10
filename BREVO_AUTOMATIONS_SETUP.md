# Brevo Automation Workflows — Setup Guide

> **Prerequisite:** The app must emit the tracking events. See "Events to Implement" section at the bottom.

---

## How to Access the Automation Builder

1. Go to [https://app.brevo.com](https://app.brevo.com)
2. Navigate to **Automations → Workflows**
3. Click **"Create an automation"**
4. Choose **"Start from scratch"**

---

## Workflow 1: Welcome Email

### Settings
- **Name:** `🚀 Welcome Email`
- **Description:** Immediate welcome email after signup, sent in user's language

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER: A contact performs a custom event                 │
│           Event name = "user_signed_up"                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CONDITION: Contact attribute "LANG"                        │
└──────────┬────────────────────┬────────────────────┬────────┘
           │                    │                    │
      LANG = fr             LANG = en             LANG = ar
           │                    │                    │
           ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ Send Email   │    │ Send Email   │    │ Send Email   │
   │ Template #42 │    │ Template #43 │    │ Template #44 │
   │ Welcome FR   │    │ Welcome EN   │    │ Welcome AR   │
   └──────────────┘    └──────────────┘    └──────────────┘
           │                    │                    │
           └────────────────────┴────────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │    EXIT      │
                      └──────────────┘
```

### Step-by-Step

| Step | Action | Config |
|------|--------|--------|
| 1 | **Entry Point** → *A contact performs a custom event (Track Event)* | Event name: `user_signed_up` |
| 2 | **+** → *If/Else condition* → *Contact attribute* | `LANG` **is equal to** `fr` |
| 3a | **Yes branch** → *Send an email* | Select template **#42** `Welcome \| FR - Email de bienvenue` |
| 3b | **No branch** → *If/Else condition* | `LANG` **is equal to** `en` |
| 4a | **Yes branch** → *Send an email* | Select template **#43** `Welcome \| EN - Welcome email` |
| 4b | **No branch** → *Send an email* | Select template **#44** `Welcome \| AR - Bienvenue email` (default/fallback) |

> **Tip:** In each email step, set the sender to your verified sender (e.g., `charaf@okeyo.ma`).

---

## Workflow 2: Onboarding — No Action

### Settings
- **Name:** `📋 Onboarding No-Action`
- **Description:** J+1, J+3, J+7 follow-up for users who signed up but never explored

### Exit Conditions
Contact leaves the workflow if they trigger ANY of:
- `page_explore_viewed`
- `ai_conversation_started`
- `experience_detail_viewed`

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  TRIGGER: Event = "user_signed_up"                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  DELAY: Wait 1 day     │
              └───────────┬────────────┘
                          │
                          ▼
      ┌──────────────────────────────────────────────┐
      │  CONDITION: Has performed event?             │
      │  "page_explore_viewed" OR                    │
      │  "ai_conversation_started" OR                │
      │  "experience_detail_viewed"                  │
      └──────────────┬─────────────────┬─────────────┘
                     │                 │
                   YES                NO
                     │                 │
                     ▼                 ▼
               ┌──────────┐   ┌──────────────────────────────┐
               │   EXIT   │   │  CONDITION: LANG = fr?       │
               └──────────┘   └──────┬───────────┬───────────┘
                                     │           │
                                   YES          NO
                                     │           │
                                     ▼           ▼
                            ┌──────────┐  ┌──────────┐
                            │ Send #45 │  │ LANG=en? │
                            │ J+1 FR   │  └────┬─────┘
                            └──────────┘       │
                                          ┌────┴────┐
                                         YES       NO
                                          │         │
                                          ▼         ▼
                                   ┌──────────┐ ┌──────────┐
                                   │ Send #48 │ │ Send #51 │
                                   │ J+1 EN   │ │ J+1 AR   │
                                   └──────────┘ └──────────┘
                                          │
                                          ▼
                               ┌────────────────────────┐
                               │  DELAY: Wait 2 days    │
                               │  (Total = J+3)         │
                               └───────────┬────────────┘
                                           │
                                           ▼
      ┌──────────────────────────────────────────────────┐
      │  Same exit check (explore/AI/detail viewed?)     │
      └──────────────────┬───────────────┬───────────────┘
                         │               │
                       YES              NO
                         │               │
                         ▼               ▼
                    ┌──────────┐   ┌──────────────────────────────┐
                    │   EXIT   │   │  Send #46 (FR) / #49 (EN)    │
                    └──────────┘   │  / #52 (AR) — J+3 email      │
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                       ┌────────────────────────┐
                                       │  DELAY: Wait 4 days    │
                                       │  (Total = J+7)         │
                                       └───────────┬────────────┘
                                                   │
                                                   ▼
      ┌──────────────────────────────────────────────────────┐
      │  Same exit check (explore/AI/detail viewed?)         │
      └──────────────────┬───────────────┬───────────────────┘
                         │               │
                       YES              NO
                         │               │
                         ▼               ▼
                    ┌──────────┐   ┌──────────────────────────────┐
                    │   EXIT   │   │  Send #47 (FR) / #50 (EN)    │
                    └──────────┘   │  / #53 (AR) — J+7 email      │
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                           ┌──────────┐
                                           │   EXIT   │
                                           └──────────┘
```

### Step-by-Step

| Step | Action | Config |
|------|--------|--------|
| 1 | **Entry Point** → *A contact performs a custom event (Track Event)* | Event name: `user_signed_up` |
| 2 | **+** → *Wait* | **1 day** |
| 3 | **+** → *If/Else condition* → *Has performed an event* | Event: `page_explore_viewed` |
| 4 | On the **Yes** branch → *Exit* (drag to end or leave empty) | — |
| 5 | On the **No** branch → *If/Else condition* → *Has performed an event* | Event: `ai_conversation_started` |
| 6 | **Yes** branch → *Exit* | — |
| 7 | **No** branch → *If/Else condition* → *Has performed an event* | Event: `experience_detail_viewed` |
| 8 | **Yes** branch → *Exit* | — |
| 9 | **No** branch → *If/Else condition* → *Contact attribute* | `LANG` **is equal to** `fr` |
| 10a | **Yes** → *Send an email* | Template **#45** `Onboarding \| FR J+1 - 1er mail` |
| 10b | **No** → *If/Else condition* | `LANG` **is equal to** `en` |
| 11a | **Yes** → *Send an email* | Template **#48** `Onboarding \| EN J+1 - 1st mail` |
| 11b | **No** → *Send an email* | Template **#51** `Onboarding \| AR J+1 - 1er mail` |
| 12 | **+** (after all 3 email branches converge) → *Wait* | **2 days** |
| 13 | Repeat the same 3 exit checks (steps 3-8) | — |
| 14 | Send J+3 email based on LANG | **#46** (FR) / **#49** (EN) / **#52** (AR) |
| 15 | **+** → *Wait* | **4 days** |
| 16 | Repeat the same 3 exit checks | — |
| 17 | Send J+7 email based on LANG | **#47** (FR) / **#50** (EN) / **#53** (AR) |
| 18 | End | — |

> **Important:** In Brevo, after a condition branches into Yes/No, you need to add the same action (Send email) on all 3 language branches at each stage. After the email is sent, the branches converge naturally to the next Wait step.

---

## Workflow 3: AI Abandoned Cart

### Settings
- **Name:** `🤖 AI Abandoned`
- **Description:** 30min, 1d, 3d follow-up for users who started AI chat but never got results

### Exit Condition
Contact leaves the workflow if they trigger:
- `ai_experiences_listed`

### Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  TRIGGER: Event = "ai_conversation_started"                   │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  DELAY: Wait 30 min    │
              └───────────┬────────────┘
                          │
                          ▼
      ┌─────────────────────────────────────────────┐
      │  CONDITION: Has performed event?            │
      │  "ai_experiences_listed"                    │
      └──────────────┬──────────────────┬───────────┘
                     │                  │
                   YES                 NO
                     │                  │
                     ▼                  ▼
               ┌──────────┐   ┌───────────────────────────────┐
               │   EXIT   │   │  CONDITION: LANG = fr?        │
               └──────────┘   └──────┬───────────┬────────────┘
                                     │           │
                                   YES          NO
                                     │           │
                                     ▼           ▼
                            ┌──────────┐  ┌──────────┐
                            │ Send #54 │  │ LANG=en? │
                            │ 30m FR   │  └────┬─────┘
                            └──────────┘       │
                                          ┌────┴────┐
                                         YES       NO
                                          │         │
                                          ▼         ▼
                                   ┌──────────┐ ┌──────────┐
                                   │ Send #57 │ │ Send #60 │
                                   │ 30m EN   │ │ 30m AR   │
                                   └──────────┘ └──────────┘
                                          │
                                          ▼
                               ┌────────────────────────┐
                               │  DELAY: Wait 1 day     │
                               └───────────┬────────────┘
                                           │
                                           ▼
      ┌──────────────────────────────────────────────────┐
      │  CONDITION: Has performed "ai_experiences_listed"?│
      └──────────────────┬───────────────┬───────────────┘
                         │               │
                       YES              NO
                         │               │
                         ▼               ▼
                    ┌──────────┐   ┌──────────────────────────────┐
                    │   EXIT   │   │  Send #55 (FR) / #58 (EN)    │
                    └──────────┘   │  / #61 (AR) — 1d email       │
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                       ┌────────────────────────┐
                                       │  DELAY: Wait 2 days    │
                                       │  (Total = 3 days)      │
                                       └───────────┬────────────┘
                                                   │
                                                   ▼
      ┌───────────────────────────────────────────────────────┐
      │  CONDITION: Has performed "ai_experiences_listed"?    │
      └──────────────────┬───────────────┬────────────────────┘
                         │               │
                       YES              NO
                         │               │
                         ▼               ▼
                    ┌──────────┐   ┌──────────────────────────────┐
                    │   EXIT   │   │  Send #56 (FR) / #59 (EN)    │
                    └──────────┘   │  / #62 (AR) — 3d email       │
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                           ┌──────────┐
                                           │   EXIT   │
                                           └──────────┘
```

### Step-by-Step

| Step | Action | Config |
|------|--------|--------|
| 1 | **Entry Point** → *A contact performs a custom event (Track Event)* | Event name: `ai_conversation_started` |
| 2 | **+** → *Wait* | **30 minutes** |
| 3 | **+** → *If/Else condition* → *Has performed an event* | Event: `ai_experiences_listed` |
| 4 | **Yes** branch → *Exit* | — |
| 5 | **No** branch → *If/Else condition* → *Contact attribute* | `LANG` **is equal to** `fr` |
| 6a | **Yes** → *Send an email* | Template **#54** `AI Abandoned \| FR 30min - 1er mail` |
| 6b | **No** → *If/Else condition* | `LANG` **is equal to** `en` |
| 7a | **Yes** → *Send an email* | Template **#57** `AI Abandoned \| EN 30min - 1st mail` |
| 7b | **No** → *Send an email* | Template **#60** `AI Abandoned \| AR 30min - 1er mail` |
| 8 | **+** (after all branches) → *Wait* | **1 day** |
| 9 | **+** → *If/Else condition* → *Has performed an event* | Event: `ai_experiences_listed` |
| 10 | **Yes** → *Exit* | — |
| 11 | **No** → Language branch (LANG = fr/en/ar) | **#55** (FR) / **#58** (EN) / **#61** (AR) |
| 12 | **+** → *Wait* | **2 days** |
| 13 | **+** → *If/Else condition* → *Has performed an event* | Event: `ai_experiences_listed` |
| 14 | **Yes** → *Exit* | — |
| 15 | **No** → Language branch (LANG = fr/en/ar) | **#56** (FR) / **#59** (EN) / **#62** (AR) |
| 16 | End | — |

---

## 🎯 Events to Implement in the App

For these automations to work, the app must emit tracking events. Here are the events and where to fire them:

| Event Name | When to Fire | File to Modify |
|-----------|-------------|----------------|
| `user_signed_up` | After successful signup (email or OAuth) | Already implemented ✅ |
| `ai_conversation_started` | When user sends first message to AI chat | `src/components/ai/...` or AI hook |
| `ai_experiences_listed` | When AI returns experience results to user | AI response handler |
| `page_explore_viewed` | When user navigates to `/explore` or `/search` | `src/app/explore/page.tsx` or router |
| `experience_detail_viewed` | When user opens an experience detail page | `src/app/experience/[slug]/page.tsx` |

### Code Pattern

```typescript
import { trackBrevoEvent } from "@/lib/brevo/events";

// In the relevant component/hook:
if (user?.email) {
  void trackBrevoEvent(user.email, "event_name_here", {
    optional_property: "value",
  });
}
```

---

## ✅ Quick Reference — Template IDs

| Flow | FR | EN | AR |
|------|----|----|----|
| **Welcome** | #42 | #43 | #44 |
| **Onboarding J+1** | #45 | #48 | #51 |
| **Onboarding J+3** | #46 | #49 | #52 |
| **Onboarding J+7** | #47 | #50 | #53 |
| **AI Abandoned 30min** | #54 | #57 | #60 |
| **AI Abandoned 1d** | #55 | #58 | #61 |
| **AI Abandoned 3d** | #56 | #59 | #62 |

---

## 🚀 Activation Checklist

- [ ] Build Workflow 1: `🚀 Welcome Email`
- [ ] Build Workflow 2: `📋 Onboarding No-Action`
- [ ] Build Workflow 3: `🤖 AI Abandoned`
- [ ] Implement `trackBrevoEvent()` calls in app (see Events table above)
- [ ] Test each workflow with a test contact
- [ ] Activate all 3 workflows
