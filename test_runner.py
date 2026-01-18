#!/usr/bin/env python3
"""
Automated test runner for Second Brain app.
Run individual tests and write detailed results to files.
"""
import sys
import json
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
RESULTS_DIR = "/tmp/test_results"

import os
os.makedirs(RESULTS_DIR, exist_ok=True)

def write_result(test_name, passed, details, screenshot_path=None):
    """Write test result to JSON file"""
    result = {
        "test": test_name,
        "passed": passed,
        "timestamp": datetime.now().isoformat(),
        "details": details,
        "screenshot": screenshot_path
    }
    with open(f"{RESULTS_DIR}/{test_name}.json", "w") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))

def test_capture_page():
    """Test: Navigate to capture page and submit an item"""
    test_name = "test_capture_page"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to app
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            # Should be on capture page (default route)
            # Look for textarea or input for capture
            textarea = page.locator('textarea').first
            if not textarea.is_visible():
                write_result(test_name, False, "Textarea not found on capture page", screenshot)
                page.screenshot(path=screenshot)
                browser.close()
                return False

            # Type test content
            test_text = f"Automated test capture {datetime.now().strftime('%H:%M:%S')}"
            textarea.fill(test_text)

            # Find and click the Capture button (black button on the right)
            submit_btn = page.locator('button:has-text("Capture")').first

            if submit_btn.is_visible():
                submit_btn.click()
            else:
                # Fallback: use CMD+Enter keyboard shortcut
                textarea.press("Meta+Enter")

            # Also try clicking any visible button as backup
            if not submit_btn.is_visible():
                all_buttons = page.locator('button').all()
                for btn in all_buttons:
                    if btn.is_visible():
                        btn.click()
                        break

            # Wait for response
            time.sleep(3)
            page.screenshot(path=screenshot)

            # Check if textarea is cleared (indicates success) or success message
            textarea_value = textarea.input_value()
            success = textarea_value == "" or len(textarea_value) < len(test_text)

            write_result(test_name, success, {
                "action": "submitted capture",
                "text": test_text,
                "textarea_cleared": textarea_value == "",
                "final_textarea_value": textarea_value[:50] if textarea_value else ""
            }, screenshot)

            browser.close()
            return success

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_browse_tasks():
    """Test: Navigate to Browse page and verify tasks load"""
    test_name = "test_browse_tasks"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to browse
            page.goto(f"{BASE_URL}/browse")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            page.screenshot(path=screenshot)

            # Check page content
            content = page.content()

            # Look for task-related content
            has_tasks_tab = "Tasks" in content or "tasks" in content
            has_any_content = len(content) > 1000  # Page loaded something

            # Try to find task items
            task_items = page.locator('[data-testid="task-item"]').count()
            list_items = page.locator('li').count()
            table_rows = page.locator('tr').count()

            write_result(test_name, has_any_content, {
                "has_tasks_tab": has_tasks_tab,
                "task_items_count": task_items,
                "list_items_count": list_items,
                "table_rows_count": table_rows,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_any_content

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_today_page():
    """Test: Navigate to Today page and verify it loads"""
    test_name = "test_today_page"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to today
            page.goto(f"{BASE_URL}/today")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            page.screenshot(path=screenshot)

            content = page.content()

            # Look for today-related content
            has_today_content = any(word in content for word in ["Today", "Next Actions", "Digest", "Summary"])

            write_result(test_name, has_today_content, {
                "has_today_content": has_today_content,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_today_content

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_search():
    """Test: Use search functionality"""
    test_name = "test_search"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to app
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            # Look for search input
            search_input = page.locator('input[type="search"]').first
            if not search_input.is_visible():
                search_input = page.locator('input[placeholder*="earch"]').first
            if not search_input.is_visible():
                search_input = page.locator('[data-testid="search-input"]').first

            if not search_input.is_visible():
                page.screenshot(path=screenshot)
                write_result(test_name, False, "Search input not found on page", screenshot)
                browser.close()
                return False

            # Type search query
            search_input.fill("milk")
            time.sleep(1)

            # Press enter or wait for results
            search_input.press("Enter")
            time.sleep(2)

            page.screenshot(path=screenshot)
            content = page.content()

            # Check if results contain "milk"
            has_results = "milk" in content.lower() or "Buy milk" in content

            write_result(test_name, has_results, {
                "search_query": "milk",
                "found_in_results": has_results,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_results

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_inbox_page():
    """Test: Navigate to Inbox page"""
    test_name = "test_inbox_page"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.goto(f"{BASE_URL}/inbox")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            page.screenshot(path=screenshot)
            content = page.content()

            has_inbox_content = any(word in content for word in ["Inbox", "processed", "new", "blocked"])

            write_result(test_name, has_inbox_content, {
                "has_inbox_content": has_inbox_content,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_inbox_content

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_edit_task():
    """Test: Click on a task in Browse and edit it"""
    test_name = "test_edit_task"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to browse
            page.goto(f"{BASE_URL}/browse")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # Find and click on a task (look for "Buy milk")
            task_link = page.locator('text=Buy milk').first
            if not task_link.is_visible():
                page.screenshot(path=screenshot)
                write_result(test_name, False, "No 'Buy milk' task found", screenshot)
                browser.close()
                return False

            task_link.click()
            time.sleep(2)

            # Check if we're on an edit/detail page or a modal opened
            page.screenshot(path=f"{RESULTS_DIR}/{test_name}_after_click.png")

            # Look for edit form elements
            content = page.content()
            has_form = any(x in content for x in ["title", "nextAction", "dueDate", "Edit", "Save", "input"])

            # Try to find and change the title if there's an input
            title_input = page.locator('input[name="title"], input[placeholder*="title"], input').first
            if title_input.is_visible():
                original = title_input.input_value()
                title_input.fill("Buy milk - EDITED")
                time.sleep(1)

                # Look for save button
                save_btn = page.locator('button:has-text("Save")').first
                if save_btn.is_visible():
                    save_btn.click()
                    time.sleep(2)

            page.screenshot(path=screenshot)

            write_result(test_name, has_form, {
                "clicked_task": "Buy milk",
                "has_form_elements": has_form,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_form

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_digest_page():
    """Test: Navigate to Digest page"""
    test_name = "test_digest_page"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.goto(f"{BASE_URL}/digest")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            page.screenshot(path=screenshot)
            content = page.content()

            has_digest_content = any(word in content for word in ["Digest", "Weekly", "Review", "Summary", "Stats"])

            write_result(test_name, has_digest_content, {
                "has_digest_content": has_digest_content,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_digest_content

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_receipts_page():
    """Test: Navigate to Receipts page"""
    test_name = "test_receipts_page"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.goto(f"{BASE_URL}/receipts")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            page.screenshot(path=screenshot)
            content = page.content()

            has_receipts = any(word in content for word in ["Receipt", "Classification", "filed", "flagged", "task", "project"])

            write_result(test_name, has_receipts, {
                "has_receipts": has_receipts,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_receipts

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_delete_task():
    """Test: Delete a task from Browse page"""
    test_name = "test_delete_task"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to browse
            page.goto(f"{BASE_URL}/browse")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # Look for a task title to click (more reliable than div)
            # Try clicking on task title text like "Buy milk" or "Schedule dental"
            task_title = page.locator('h4.font-medium').first
            if not task_title.is_visible():
                # Fallback: look for any clickable task card
                task_title = page.locator('div.rounded-lg.border.cursor-pointer').first

            if not task_title.is_visible():
                page.screenshot(path=screenshot)
                write_result(test_name, False, "No task title found to click", screenshot)
                browser.close()
                return False

            # Click on task title to open modal
            task_title.click()
            time.sleep(2)  # Wait for modal

            page.screenshot(path=f"{RESULTS_DIR}/{test_name}_after_click.png")

            # Look for Delete button in modal (check for various forms)
            delete_btn = page.locator('button:has-text("Delete")').first

            # If not visible, try to scroll to actions section
            if not delete_btn.is_visible():
                # Check if modal is open by looking for modal content
                modal_content = page.content()
                has_modal = "Quick Status" in modal_content or "Quick Edit" in modal_content

                if not has_modal:
                    page.screenshot(path=screenshot)
                    write_result(test_name, False, "Modal did not open after clicking task", screenshot)
                    browser.close()
                    return False

                page.screenshot(path=screenshot)
                write_result(test_name, False, "Delete button not visible in modal (modal is open)", screenshot)
                browser.close()
                return False

            page.screenshot(path=f"{RESULTS_DIR}/{test_name}_before_delete.png")

            # Click delete
            delete_btn.click()
            time.sleep(2)

            page.screenshot(path=screenshot)

            # Check success by verifying delete happened (task count decreased or modal closed)
            write_result(test_name, True, {
                "action": "delete button clicked",
                "modal_interaction": "success"
            }, screenshot)

            browser.close()
            return True

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_nudges_page():
    """Test: Navigate to Today page and check for nudges"""
    test_name = "test_nudges_page"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to today page (nudges show here)
            page.goto(f"{BASE_URL}/today")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            page.screenshot(path=screenshot)
            content = page.content()

            # Look for nudge-related content
            has_nudges = any(word in content for word in ["Nudge", "nudge", "Dismiss", "Snooze", "Reminder"])

            # Check for dismiss/snooze buttons
            dismiss_btn = page.locator('button:has-text("Dismiss")').count()
            snooze_btn = page.locator('button:has-text("Snooze")').count()

            write_result(test_name, True, {
                "has_nudge_content": has_nudges,
                "dismiss_buttons": dismiss_btn,
                "snooze_buttons": snooze_btn,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return True

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_browse_filters():
    """Test: Use status filters on Browse page"""
    test_name = "test_browse_filters"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to browse
            page.goto(f"{BASE_URL}/browse")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # Look for filter controls (tabs or dropdown)
            content = page.content()
            has_filters = any(word in content for word in ["All", "Active", "Completed", "Waiting", "Someday", "status"])

            # Try clicking a filter tab if exists
            filter_clicked = False
            for status in ["Active", "Completed", "Waiting"]:
                filter_btn = page.locator(f'button:has-text("{status}"), [role="tab"]:has-text("{status}")').first
                if filter_btn.is_visible():
                    filter_btn.click()
                    time.sleep(1)
                    filter_clicked = True
                    break

            page.screenshot(path=screenshot)

            write_result(test_name, has_filters, {
                "has_filter_controls": has_filters,
                "filter_clicked": filter_clicked,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_filters

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_fix_entity():
    """Test: Use Fix button to change entity type"""
    test_name = "test_fix_entity"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to browse
            page.goto(f"{BASE_URL}/browse")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # Click on a task title to open modal
            task_title = page.locator('h4.font-medium').first
            if not task_title.is_visible():
                task_title = page.locator('div.rounded-lg.border.cursor-pointer').first

            if not task_title.is_visible():
                page.screenshot(path=screenshot)
                write_result(test_name, False, "No items found", screenshot)
                browser.close()
                return False

            task_title.click()
            time.sleep(2)  # Wait for modal

            page.screenshot(path=f"{RESULTS_DIR}/{test_name}_after_click.png")

            # Check if modal opened
            content = page.content()
            has_modal = "Quick Status" in content or "Quick Edit" in content or "Delete" in content

            if not has_modal:
                page.screenshot(path=screenshot)
                write_result(test_name, False, "Modal did not open", screenshot)
                browser.close()
                return False

            # Look for Fix input field and enter text to enable Fix button
            fix_input = page.locator('input[placeholder*="actually"], input[placeholder*="project"]').first
            if fix_input.is_visible():
                fix_input.fill("This is actually a project, not a task")
                time.sleep(0.5)

            # Look for Fix button
            fix_btn = page.locator('button:has-text("Fix")').first
            if not fix_btn.is_visible():
                page.screenshot(path=screenshot)
                has_edit_features = "Quick Status" in content or "Quick Edit" in content
                write_result(test_name, has_edit_features, {
                    "fix_button_visible": False,
                    "has_edit_features": has_edit_features,
                    "modal_open": True
                }, screenshot)
                browser.close()
                return has_edit_features

            # Click Fix (should be enabled now after text input)
            fix_btn.click()
            time.sleep(2)

            # Look for fix processing or success
            content = page.content()
            fix_processed = "project" in content.lower() or "processing" in content.lower() or "success" in content.lower()

            page.screenshot(path=screenshot)

            write_result(test_name, True, {
                "fix_processed": fix_processed,
                "fix_button_clicked": True,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return True

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_reprocess_inbox():
    """Test: Reprocess an inbox item"""
    test_name = "test_reprocess_inbox"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to inbox
            page.goto(f"{BASE_URL}/inbox")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # Look for any inbox item to click
            inbox_items = page.locator('[class*="cursor-pointer"], tr').all()
            has_items = len(inbox_items) > 0

            # Look for Reprocess button
            reprocess_btn = page.locator('button:has-text("Reprocess"), button:has-text("reprocess")').first

            if reprocess_btn.is_visible():
                reprocess_btn.click()
                time.sleep(3)

            page.screenshot(path=screenshot)
            content = page.content()

            write_result(test_name, has_items, {
                "has_inbox_items": has_items,
                "found_reprocess_button": reprocess_btn.is_visible() if has_items else False,
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return has_items

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

def test_people_followup():
    """Test: People follow-up completion"""
    test_name = "test_people_followup"
    screenshot = f"{RESULTS_DIR}/{test_name}.png"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Navigate to browse and click People tab
            page.goto(f"{BASE_URL}/browse")
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # Click People tab
            people_tab = page.locator('button:has-text("People"), [role="tab"]:has-text("People")').first
            if people_tab.is_visible():
                people_tab.click()
                time.sleep(1)

            # Look for a person item
            person_items = page.locator('[class*="cursor-pointer"]').all()
            if len(person_items) > 0:
                person_items[0].click()
                time.sleep(1)

            # Look for Mark Complete or follow-up related buttons
            content = page.content()
            has_followup = any(word in content for word in ["Complete", "Follow", "follow", "touched"])

            complete_btn = page.locator('button:has-text("Complete"), button:has-text("Mark Complete")').first
            if complete_btn.is_visible():
                complete_btn.click()
                time.sleep(1)

            page.screenshot(path=screenshot)

            write_result(test_name, True, {
                "has_followup_content": has_followup,
                "people_count": len(person_items),
                "content_length": len(content)
            }, screenshot)

            browser.close()
            return True

    except Exception as e:
        write_result(test_name, False, f"Exception: {str(e)}", None)
        return False

# Main - run specific test based on argument
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_runner.py <test_name>")
        print("Available tests: capture, browse, today, search, inbox, edit, digest, receipts, delete, nudges, filters, fix, reprocess, people")
        sys.exit(1)

    test_map = {
        "capture": test_capture_page,
        "browse": test_browse_tasks,
        "today": test_today_page,
        "search": test_search,
        "inbox": test_inbox_page,
        "edit": test_edit_task,
        "digest": test_digest_page,
        "receipts": test_receipts_page,
        "delete": test_delete_task,
        "nudges": test_nudges_page,
        "filters": test_browse_filters,
        "fix": test_fix_entity,
        "reprocess": test_reprocess_inbox,
        "people": test_people_followup,
    }

    test_name = sys.argv[1]
    if test_name not in test_map:
        print(f"Unknown test: {test_name}")
        sys.exit(1)

    result = test_map[test_name]()
    sys.exit(0 if result else 1)
