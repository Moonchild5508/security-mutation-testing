# Security-Focused Mutation Testing for Web Applications

A research project applying mutation testing — a technique traditionally used to evaluate functional test suites — to the domain of **web application security**. Instead of checking whether an app *is* secure, this project checks whether an app's *own existing test suite* would actually catch a realistic security regression if one were introduced.

## The Idea

Passing tests don't guarantee secure code. A test suite can pass 100% of its checks while having **zero coverage for the exact scenario an attacker would exploit** — specifically, whether unauthorized requests are correctly rejected, not just whether authorized ones succeed.

This project:
1. Deliberately introduces small, realistic security mistakes ("mutants") into [OWASP Juice Shop](https://github.com/juice-shop/juice-shop)
2. Re-runs the application's existing unit test suite against each mutant
3. Records whether the mutant is **killed** (test suite catches it) or **survives** (undetected)
4. For every surviving mutant, independently confirms it is a **genuinely exploitable** vulnerability — not just a theoretical gap

## Key Finding

| OWASP Category | Mutants Tested | Killed | Mutation Score |
|---|---|---|---|
| Broken Access Control | 3 | 0 | **0%** |
| Broken Authentication | 1 | 0 | **0%** |
| Security Misconfiguration | 1 | 0 | **0%** |
| Injection (XSS) | 1 | 1 | **100%** |
| Cryptographic Failure | 1 | 1 | **100%** |
| **Overall** | **7** | **2** | **~29%** |

**Pattern:** every mutant targeting a *gatekeeping* function (deciding who's allowed access) survived undetected. Every mutant targeting a *data-transformation* function (sanitizing/hashing) was caught immediately. This suggests test suites are systematically weaker exactly where OWASP-documented real-world risk (Broken Access Control has been the #1 category since 2021) is highest.

## Repository Contents

```
├── research_paper.docx        # Full paper (abstract, related work, methodology, results, discussion)
├── security-mutator.mjs       # Automated mutation testing tool
├── mutants.config.json        # Declarative config of all 7 mutation operators
├── mutation_results.json      # Raw output from the automation tool
├── exploit_check.mjs          # Standalone exploitability verification scripts
└── README.md
```

## How It Works

The automation tool (`security-mutator.mjs`) reads `mutants.config.json` — a list of target functions, their exact code pattern, and the OWASP category they represent — and for each one:

1. Applies the mutation directly to the source file
2. Runs the existing test suite
3. Records pass/fail counts and whether the mutant was killed or survived
4. Reverts the code back to original
5. Moves to the next mutant

At the end, it prints a summary table and category-level mutation scores, and writes full results to `mutation_results.json`.

## Running It Yourself

**Prerequisites:** Node.js, a local clone of [OWASP Juice Shop](https://github.com/juice-shop/juice-shop)

```bash
git clone https://github.com/juice-shop/juice-shop.git
cd juice-shop
npm install
```

Copy `security-mutator.mjs` and `mutants.config.json` from this repo into your `juice-shop` folder, then:

```bash
node --import tsx security-mutator.mjs
```

## Extending to Other Functions or Applications

Add a new entry to `mutants.config.json`:

```json
{
  "id": "M8",
  "file": "path/to/file.ts",
  "function": "functionName",
  "category": "OWASP Category",
  "find": "exact original code to match",
  "replace": "mutated code"
}
```

The tool will automatically pick it up on the next run — no changes to `security-mutator.mjs` needed.

## Methodology Summary

- **Target:** OWASP Juice Shop, commit `[FILL IN — see below]`
- **Scope:** 7 mutants across 5 OWASP Top 10 (2021) categories
- **Test suite:** `test/server/insecurity.unit.test.ts` (35 tests, 11 suites)
- **Exploitability confirmation:** standalone scripts simulating an unauthorized actor for every surviving mutant

Full methodology, related work, and discussion are in `research_paper.docx`.

## Limitations

- Single application (a deliberately vulnerable training app, not a production codebase)
- Small, manually curated sample (7 mutants)
- Results are sensitive to the exact commit tested (see paper §6)
- Unit-test scope only — dynamic/scanner-level evaluation (e.g., OWASP ZAP) is proposed future work

See `research_paper.docx` §6 for the full discussion.

## Future Work

- Replicate across additional applications
- Extend to dynamic analysis tools (OWASP ZAP)
- Package as a CI/CD quality gate flagging authorization functions with no negative-path test
- Compare against LLM-generated test coverage

## Author

[Your Name] — [Your Institution]

## License

This project targets OWASP Juice Shop, which is MIT licensed. This project's own code (`security-mutator.mjs`, `mutants.config.json`) is provided as-is for academic/research purposes.
