# E2E Test Fix Request

I have 6 failing E2E Playwright tests to fix.
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
• For login tests: verify the account exists in Firebase
• For RBAC tests: check both URL redirect AND inline login UI rendering
• Update the assertion to accept client-side auth guard behavior (URL may not change)

---

## Issue 2: UC-AUTH-005 — Login page has signup link

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestEmailLogin::test_login_page_has_signup_link`

**Acceptance criteria (do not change):**
- A 'Sign Up' or 'Create Account' link is visible on the login page
- Clicking it navigates to /auth/signup

**Failed at step:** "Click signup link and verify navigation"
```
AssertionError: assert '/auth/signup' in 'https://pickleleauge.web.app/auth/login/'
 +  where 'https://pickleleauge.web.app/auth/login/' = <Page url='https://pickleleauge.web.app/auth/login/'>.url
 +    where <Page url='https://pickleleauge.web.app/auth/login/'> = <tests.e2e.pages.auth_page.AuthPage object at 0x0000021D252263F0>.page
```

**Error:**
```
E    +    where <Page url='https://pickleleauge.web.app/auth/login/'> = <tests.e2e.pages.auth_page.AuthPage object at 0x0000021D252263F0>.page
```

**Suggested fix:**
Signup form field selectors may not match the DOM.

Fix: Use placeholder selectors in auth_page.py sign_up():
  First Name  → get_by_placeholder("Jane")
  Last Name   → get_by_placeholder("Smith")
  Email       → get_by_placeholder("you@example.com")
  Password    → get_by_placeholder("At least 6 characters")
  Confirm PW  → get_by_placeholder("Repeat your password")

---

## Issue 3: UC-AUTH-008 — Weak password shows strength indicator

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestSignup::test_weak_password_shows_strength_indicator`

**Acceptance criteria (do not change):**
- Typing a weak password surfaces a visual strength indicator
- Indicator appears without form submission

**Failed at step:** "Verify strength indicator appears"
```
AssertionError: Locator expected to be visible
Actual value: None
Error: element(s) not found 
Call log:
  - Expect "to_be_visible" with timeout 3000ms
  - waiting for get_by_text("Weak").or_(locator(".password-strength, [data-testid='pw-strength']")).first

```

**Error:**
```
E     - waiting for get_by_text("Weak").or_(locator(".password-strength, [data-testid='pw-strength']")).first
```

**Suggested fix:**
Signup form field selectors may not match the DOM.

Fix: Use placeholder selectors in auth_page.py sign_up():
  First Name  → get_by_placeholder("Jane")
  Last Name   → get_by_placeholder("Smith")
  Email       → get_by_placeholder("you@example.com")
  Password    → get_by_placeholder("At least 6 characters")
  Confirm PW  → get_by_placeholder("Repeat your password")

---

## Issue 4: UC-AUTH-009 — Duplicate email returns error on signup

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestSignup::test_duplicate_email_shows_error`

**Acceptance criteria (do not change):**
- Registering with an already-used email shows an error
- No account is created

**Failed at step:** "Submit form with an existing email"
```
TimeoutError: Locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for get_by_role("main").get_by_role("button", name="Sign Up")

```

**Error:**
```
E     - waiting for get_by_role("main").get_by_role("button", name="Sign Up")
```

**Suggested fix:**
Locator timeout during: "Submit form with an existing email".

The selector did not find the element within the timeout window.

Fix:
• Open the app and inspect the element
• Update the locator in tests/e2e/pages/ to use:
  get_by_placeholder("hint") for inputs
  get_by_role("button", name="...") for buttons
  get_by_test_id("...") if data-testid is present
• Remove get_by_label() for fields without proper for= attributes

---

## Issue 5: UC-AUTH-011 — Unknown email handled gracefully on password reset

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestPasswordReset::test_unknown_email_handled_gracefully`

**Acceptance criteria (do not change):**
- Submitting an unknown email does not crash the page
- A confirmation or success message is shown

**Failed at step:** "Submit an unknown email"
```
TimeoutError: Locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for get_by_role("button", name="Send Reset Email")

```

**Error:**
```
E     - waiting for get_by_role("button", name="Send Reset Email")
```

**Suggested fix:**
Locator timeout during: "Submit an unknown email".

The selector did not find the element within the timeout window.

Fix:
• Open the app and inspect the element
• Update the locator in tests/e2e/pages/ to use:
  get_by_placeholder("hint") for inputs
  get_by_role("button", name="...") for buttons
  get_by_test_id("...") if data-testid is present
• Remove get_by_label() for fields without proper for= attributes

---

## Issue 6: UC-AUTH-012 — Sign out redirects to login or home

**Status:** FAIL  **Persona:** Auth
**Test node:** `test_auth.py::TestSignOut::test_sign_out_redirects_to_login`

**Acceptance criteria (do not change):**
- Clicking sign-out removes the authenticated session
- User is redirected to /auth/login or the home page

**Failed at step:** "Trigger sign-out"
```
TimeoutError: Locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for get_by_role("button", name="Sign Out").or_(get_by_role("menuitem", name="Sign Out"))

```

**Error:**
```
E     - waiting for get_by_role("button", name="Sign Out").or_(get_by_role("menuitem", name="Sign Out"))
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
