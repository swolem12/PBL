# E2E Test Fix Request

I have 2 failing E2E Playwright tests to fix.
**Test framework:** Python Playwright + pytest (Page Object Model)
**Test directory:** `tests/e2e/`  **Page objects:** `tests/e2e/pages/`
**App:** Next.js 15 + Firebase Auth (client-side auth guards — no server-side redirects on auth failure)

---

## Issue 1: UC-AUTH-001 — Valid credentials redirect to app

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestEmailLogin::test_valid_credentials_redirect_to_app`

**Acceptance criteria (do not change):**
- Login form accepts email and password
- Correct credentials redirect away from /auth/login
- User is not returned to the login page

**Failed at step:** "Verify redirected away from login"
```
AssertionError: Expected to be signed in but URL is: https://pickleleauge.web.app/auth/login/
```

**Error:**
```
E   AssertionError: Expected to be signed in but URL is: https://pickleleauge.web.app/auth/login/
```

**Suggested fix:**
URL assertion failed during: "Verify redirected away from login".

Fix:
• For login tests: verify the account exists in your auth backend
• For RBAC tests: check both URL redirect AND inline login UI rendering
• Update the assertion to accept client-side auth guard behavior (URL may not change)

---

## Issue 2: UC-AUTH-012 — Sign out redirects to login or home

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestSignOut::test_sign_out_redirects_to_login`

**Acceptance criteria (do not change):**
- Clicking sign-out removes the authenticated session
- User is redirected to /auth/login or the home page

**Failed at step:** "Trigger sign-out"
```
TimeoutError: Locator.wait_for: Timeout 5000ms exceeded.
Call log:
  - waiting for locator("[aria-label='Profile menu'], [data-testid='user-menu']").first to be visible

```

**Error:**
```
E     - waiting for locator("[aria-label='Profile menu'], [data-testid='user-menu']").first to be visible
```

**Suggested fix:**
Locator timeout during: "Trigger sign-out".

The selector did not find the element within the timeout window.

Fix:
• Open the app and inspect the element
• Update the locator in tests/e2e/pages/ to use:
  get_by_placeholder("hint") for inputs
  get_by_role("button", name="...") for buttons
  get_by_test_id("...") if data-testid is present
• Remove get_by_label() for fields without proper for= attributes

---

## Instructions

1. Read the relevant test files and page objects **before** making changes
2. Fix selectors to match the actual DOM — prefer `get_by_placeholder()`, `get_by_role()`, `get_by_test_id()`
3. Fix assertions where the expectation doesn't match current app behavior
4. **Do NOT change the acceptance criteria** — only fix the implementation
5. Do not silence failures with try/except — fix the root cause
6. Briefly explain what you changed and why
