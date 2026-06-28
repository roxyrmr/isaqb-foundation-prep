# iSAQB Foundation Prep

Unofficial exam practice application — 287 questions across 5 learning goals, runs entirely in the browser with no server required.

[![Deploy](https://github.com/roxyrmr/isaqb-foundation-prep/actions/workflows/deploy.yml/badge.svg)](https://github.com/roxyrmr/isaqb-foundation-prep/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](CONTRIBUTING.md)

> **Disclaimer.** This is an independently developed practice tool and is not affiliated with, endorsed by, or approved by iSAQB GmbH or the International Software Architecture Qualification Board (iSAQB®). All trademarks, including iSAQB® and CPSA®, belong to their respective owners. The 250 practice questions are independently authored for study purposes. The 37 official mock exam questions are reproduced from publicly available iSAQB mock exams.

---

## Live App

> **https://roxyrmr.github.io/isaqb-foundation-prep/**

Click the link to start an exam or study session directly in your browser — no login, no installation.

---

## Overview

A practice application for the iSAQB Certified Professional for Software Architecture — Foundation Level (CPSA-F) exam. It ships with **287 questions** covering all six CPSA-F 2025.1 learning goal chapters:

- **250 independently authored questions** written to match the style and difficulty of the official exam
- **37 questions from publicly available iSAQB official mock exams** (mock exams 2017-13, 2020-04, and 2021-05, published by iSAQB GmbH)

The application is **fully static** — all exam logic, question sampling, scoring, and state management run in the browser. No login, no installation, no backend required.

---

## Exam Modes

| Feature | Exam | Study |
|---|---|---|
| Question count | 32–44, weighted | 1 – all available |
| Chapter filter | All (auto-weighted) | User-selectable |
| Per-question feedback | No | Yes |
| Explanation shown | Results page only | Immediately |
| Shuffle | Always | Configurable |
| Language | DE / EN toggle | DE / EN toggle |

---

## Question Types

**`pick` — Multi-select**
The question specifies how many answers are correct ("Which TWO…"). Scoring is partial: one point per correct selection minus one point per incorrect selection, floored at zero. Selecting more options than the correct count scores zero.

**`category` — Classification**
Each option must be assigned to one of two or more categories. One point per correctly classified item.

---

## Official Mock Exam Questions

The 37 official mock exam questions are sourced from the publicly available iSAQB mock exams published by @isaqb-org:

> [github.com/isaqb-org/foundation-exam-questions](https://github.com/isaqb-org/foundation-exam-questions)

Mock exams included: **2017-13**, **2020-04**, and **2021-05**.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to run the project locally, deploy to GitHub Pages, add questions, and submit pull requests.

---

*This project is not affiliated with iSAQB GmbH. iSAQB® and CPSA® are registered trademarks of the International Software Architecture Qualification Board. The 250 practice questions are independently authored. The 37 official mock exam questions are reproduced from publicly available iSAQB mock exams published by iSAQB GmbH.*
