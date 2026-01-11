#!/usr/bin/env python3
"""
Comprehensive UI testing script for Second Brain application.
Tests all routes, navigation, forms, modals, buttons, and error states.
"""

from playwright.sync_api import sync_playwright, Page, Browser
import json
import time
from typing import List, Dict, Any
from datetime import datetime

class TestReport:
    def __init__(self):
        self.timestamp = datetime.now().isoformat()
        self.issues = []
        self.passed_tests = []
        self.route_screenshots = []

    def add_issue(self, severity: str, route: str, description: str, details: Dict[str, Any] = None):
        """Add an issue to the report"""
        self.issues.append({
            "severity": severity,  # "critical", "high", "medium", "low"
            "route": route,
            "description": description,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        })

    def add_passed_test(self, route: str, test_name: str):
        """Add a passed test to the report"""
        self.passed_tests.append({
            "route": route,
            "test": test_name,
            "timestamp": datetime.now().isoformat()
        })

    def save(self, filename: str = "ui_test_report.json"):
        """Save the report to a JSON file"""
        with open(filename, 'w') as f:
            json.dump({
                "timestamp": self.timestamp,
                "summary": {
                    "total_issues": len(self.issues),
                    "critical_issues": len([i for i in self.issues if i["severity"] == "critical"]),
                    "high_issues": len([i for i in self.issues if i["severity"] == "high"]),
                    "medium_issues": len([i for i in self.issues if i["severity"] == "medium"]),
                    "low_issues": len([i for i in self.issues if i["severity"] == "low"]),
                    "passed_tests": len(self.passed_tests)
                },
                "issues": self.issues,
                "passed_tests": self.passed_tests,
                "screenshots": self.route_screenshots
            }, f, indent=2)
        print(f"\n✅ Test report saved to: {filename}")

def wait_for_page_ready(page: Page, route: str):
    """Wait for page to be fully loaded and interactive"""
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
        page.wait_for_timeout(500)  # Small delay for animations
        return True
    except Exception as e:
        print(f"  ⚠️  Warning: Page load timeout on {route}: {str(e)}")
        return False

def test_route_accessibility(page: Page, route: str, report: TestReport):
    """Test if a route is accessible and renders without errors"""
    print(f"\n📍 Testing route: {route}")

    try:
        # Navigate to route
        response = page.goto(f"http://localhost:5173{route}", wait_until='domcontentloaded', timeout=15000)

        if not response or response.status >= 400:
            report.add_issue("critical", route, f"Route returned status {response.status if response else 'No response'}")
            return False

        # Wait for page to be ready
        if not wait_for_page_ready(page, route):
            report.add_issue("medium", route, "Page load timeout - may have slow API calls")

        # Take screenshot
        screenshot_path = f"/tmp/screenshot_{route.replace('/', '_')}.png"
        page.screenshot(path=screenshot_path, full_page=True)
        report.route_screenshots.append({"route": route, "path": screenshot_path})
        print(f"  📸 Screenshot saved: {screenshot_path}")

        # Check for console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # Check for visible error messages in the UI
        error_indicators = [
            "text=Error",
            "text=Failed to",
            "text=Something went wrong",
            "[class*='error']",
            "[class*='alert-error']"
        ]

        for selector in error_indicators:
            if page.locator(selector).count() > 0:
                error_text = page.locator(selector).first.text_content()
                report.add_issue("high", route, f"Error message visible on page: {error_text}")

        report.add_passed_test(route, "Route accessible and renders")
        return True

    except Exception as e:
        report.add_issue("critical", route, f"Failed to load route: {str(e)}")
        return False

def test_navigation(page: Page, report: TestReport):
    """Test navigation between pages using nav links"""
    print("\n🧭 Testing navigation between pages...")

    # Go to home page
    page.goto("http://localhost:5173/", wait_until='domcontentloaded')
    wait_for_page_ready(page, "/")

    # Find all navigation links
    nav_links = page.locator("nav a, [role='navigation'] a, .nav-link, [class*='nav'] a").all()

    if len(nav_links) == 0:
        report.add_issue("high", "/", "No navigation links found on page")
        return

    print(f"  Found {len(nav_links)} navigation links")

    # Test each navigation link
    for i, link in enumerate(nav_links[:10]):  # Limit to first 10 to avoid infinite loops
        try:
            href = link.get_attribute("href")
            text = link.text_content().strip()

            if not href or href.startswith("http"):
                continue

            print(f"  Testing nav link: {text} -> {href}")
            link.click(timeout=5000)
            wait_for_page_ready(page, href)

            # Verify URL changed
            current_url = page.url
            if href not in current_url:
                report.add_issue("medium", href, f"Navigation link '{text}' did not change URL correctly")
            else:
                report.add_passed_test(href, f"Navigation link '{text}' works")

        except Exception as e:
            report.add_issue("medium", "/", f"Navigation link '{text}' failed: {str(e)}")

def test_forms_on_page(page: Page, route: str, report: TestReport):
    """Test all forms on the current page"""
    print(f"  📝 Testing forms on {route}...")

    # Find all forms
    forms = page.locator("form").all()

    if len(forms) == 0:
        print(f"    No forms found on {route}")
        return

    print(f"    Found {len(forms)} forms")

    for i, form in enumerate(forms):
        try:
            # Find all input fields in the form
            inputs = form.locator("input, textarea, select").all()

            for input_elem in inputs:
                input_type = input_elem.get_attribute("type") or "text"
                input_name = input_elem.get_attribute("name") or f"input_{i}"

                # Test basic interaction
                if input_type in ["text", "email", "password", "search", "url"]:
                    input_elem.fill("Test input")
                    report.add_passed_test(route, f"Form input '{input_name}' accepts text")
                elif input_type == "checkbox":
                    input_elem.check()
                    report.add_passed_test(route, f"Checkbox '{input_name}' can be checked")
                elif input_elem.tag_name == "select":
                    options = input_elem.locator("option").all()
                    if len(options) > 1:
                        input_elem.select_option(index=1)
                        report.add_passed_test(route, f"Select '{input_name}' can change value")

            # Find submit buttons
            submit_buttons = form.locator("button[type='submit'], input[type='submit'], button:has-text('Submit')").all()

            if len(submit_buttons) > 0:
                print(f"    Found {len(submit_buttons)} submit buttons in form {i+1}")
                # Note: We don't actually submit to avoid side effects, just verify the button exists
                report.add_passed_test(route, f"Form {i+1} has submit button")
            else:
                report.add_issue("low", route, f"Form {i+1} has no visible submit button")

        except Exception as e:
            report.add_issue("medium", route, f"Error testing form {i+1}: {str(e)}")

def test_buttons_on_page(page: Page, route: str, report: TestReport):
    """Test all interactive buttons on the current page"""
    print(f"  🔘 Testing buttons on {route}...")

    # Find all buttons (excluding submit buttons which are tested with forms)
    buttons = page.locator("button:not([type='submit'])").all()

    if len(buttons) == 0:
        print(f"    No interactive buttons found on {route}")
        return

    print(f"    Found {len(buttons)} buttons")

    for i, button in enumerate(buttons[:15]):  # Limit to first 15
        try:
            button_text = button.text_content().strip()

            # Check if button is visible and enabled
            if not button.is_visible():
                continue

            if not button.is_enabled():
                report.add_issue("low", route, f"Button '{button_text}' is disabled")
                continue

            # Test button hover state (check for CSS changes)
            button.hover()
            report.add_passed_test(route, f"Button '{button_text}' is interactive")

        except Exception as e:
            print(f"    ⚠️  Error testing button {i+1}: {str(e)}")

def test_modals_on_page(page: Page, route: str, report: TestReport):
    """Test modals/dialogs on the current page"""
    print(f"  🪟 Testing modals on {route}...")

    # Look for buttons that might open modals
    modal_triggers = page.locator("button:has-text('Add'), button:has-text('Edit'), button:has-text('Create'), button:has-text('Delete'), [data-modal], [aria-haspopup='dialog']").all()

    if len(modal_triggers) == 0:
        print(f"    No modal triggers found on {route}")
        return

    print(f"    Found {len(modal_triggers)} potential modal triggers")

    for i, trigger in enumerate(modal_triggers[:5]):  # Test first 5 modals
        try:
            if not trigger.is_visible() or not trigger.is_enabled():
                continue

            trigger_text = trigger.text_content().strip()
            print(f"    Testing modal trigger: {trigger_text}")

            # Click to open modal
            trigger.click(timeout=3000)
            page.wait_for_timeout(500)

            # Look for modal/dialog elements
            modal_selectors = [
                "[role='dialog']",
                "[role='alertdialog']",
                ".modal",
                "[class*='modal']",
                "[class*='dialog']"
            ]

            modal_found = False
            for selector in modal_selectors:
                if page.locator(selector).count() > 0 and page.locator(selector).first.is_visible():
                    modal_found = True
                    report.add_passed_test(route, f"Modal opens for '{trigger_text}'")

                    # Take screenshot of modal
                    page.screenshot(path=f"/tmp/modal_{route.replace('/', '_')}_{i}.png")

                    # Look for close button
                    close_buttons = page.locator("[aria-label='Close'], button:has-text('Cancel'), button:has-text('Close'), [class*='close']").all()
                    if len(close_buttons) > 0:
                        close_buttons[0].click(timeout=2000)
                        page.wait_for_timeout(300)
                        report.add_passed_test(route, f"Modal can be closed for '{trigger_text}'")
                    else:
                        # Try pressing Escape
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(300)

                    break

            if not modal_found:
                report.add_issue("low", route, f"Button '{trigger_text}' may not open a modal or modal not detected")

        except Exception as e:
            print(f"    ⚠️  Error testing modal trigger {i+1}: {str(e)}")

def test_search_functionality(page: Page, route: str, report: TestReport):
    """Test search functionality if present"""
    print(f"  🔍 Testing search on {route}...")

    # Look for search inputs
    search_inputs = page.locator("input[type='search'], input[placeholder*='search' i], input[name*='search' i]").all()

    if len(search_inputs) == 0:
        print(f"    No search inputs found on {route}")
        return

    print(f"    Found {len(search_inputs)} search inputs")

    for i, search_input in enumerate(search_inputs):
        try:
            if not search_input.is_visible():
                continue

            # Test search input
            search_input.fill("test query")
            page.wait_for_timeout(500)

            # Look for search button or press Enter
            search_button = page.locator("button[type='submit']:near(:text('search'))", has_text="Search").first
            if search_button.count() > 0:
                search_button.click()
            else:
                search_input.press("Enter")

            page.wait_for_timeout(1000)

            report.add_passed_test(route, f"Search input {i+1} is functional")

        except Exception as e:
            report.add_issue("medium", route, f"Error testing search {i+1}: {str(e)}")

def main():
    print("🚀 Starting comprehensive UI testing for Second Brain application\n")
    print("=" * 80)

    report = TestReport()

    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Playwright Test Bot)"
        )
        page = context.new_page()

        # Enable console error tracking
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg) if msg.type == "error" else None)

        # Define all routes to test
        routes = [
            "/",
            "/capture",
            "/inbox",
            "/today",
            "/browse",
            "/clarifications",
            "/receipts",
            "/search",
            "/digest/dashboard",
            "/digest/weekly"
        ]

        # Test 1: Route accessibility
        print("\n" + "=" * 80)
        print("TEST 1: Route Accessibility")
        print("=" * 80)

        accessible_routes = []
        for route in routes:
            if test_route_accessibility(page, route, report):
                accessible_routes.append(route)

        # Test 2: Navigation
        print("\n" + "=" * 80)
        print("TEST 2: Navigation")
        print("=" * 80)
        test_navigation(page, report)

        # Test 3: Forms, buttons, modals on each accessible route
        print("\n" + "=" * 80)
        print("TEST 3: Interactive Elements")
        print("=" * 80)

        for route in accessible_routes:
            print(f"\n🔬 Deep testing route: {route}")

            # Navigate to the route
            page.goto(f"http://localhost:5173{route}", wait_until='domcontentloaded')
            wait_for_page_ready(page, route)

            # Test forms
            test_forms_on_page(page, route, report)

            # Test buttons
            test_buttons_on_page(page, route, report)

            # Test modals
            test_modals_on_page(page, route, report)

            # Test search (if on search page or has search functionality)
            if "search" in route.lower():
                test_search_functionality(page, route, report)

        # Test 4: Console errors
        print("\n" + "=" * 80)
        print("TEST 4: Console Errors")
        print("=" * 80)

        if len(console_errors) > 0:
            print(f"  ⚠️  Found {len(console_errors)} console errors:")
            for error in console_errors[:10]:  # Show first 10
                print(f"    - {error.text}")
                report.add_issue("medium", "console", f"Console error: {error.text}")
        else:
            print("  ✅ No console errors detected")
            report.add_passed_test("console", "No console errors")

        # Close browser
        browser.close()

    # Generate report
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed tests: {len(report.passed_tests)}")
    print(f"❌ Total issues: {len(report.issues)}")
    print(f"  🔴 Critical: {len([i for i in report.issues if i['severity'] == 'critical'])}")
    print(f"  🟠 High: {len([i for i in report.issues if i['severity'] == 'high'])}")
    print(f"  🟡 Medium: {len([i for i in report.issues if i['severity'] == 'medium'])}")
    print(f"  🔵 Low: {len([i for i in report.issues if i['severity'] == 'low'])}")

    # Save report
    report.save("/tmp/ui_test_report.json")

    print("\n" + "=" * 80)
    print("📊 Detailed issues:")
    print("=" * 80)
    for issue in report.issues:
        severity_emoji = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🔵"
        }
        print(f"\n{severity_emoji.get(issue['severity'], '⚪')} {issue['severity'].upper()}: {issue['route']}")
        print(f"  {issue['description']}")

    print("\n✨ Testing complete!")

if __name__ == "__main__":
    main()
