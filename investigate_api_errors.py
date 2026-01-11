#!/usr/bin/env python3
"""
Investigate API 500 errors by capturing network traffic.
"""

from playwright.sync_api import sync_playwright
import json
from datetime import datetime

def main():
    print("🔍 Investigating API errors...\n")

    failed_requests = []
    successful_requests = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture all network requests
        def handle_response(response):
            if response.url.startswith("http://localhost:3001"):
                request_info = {
                    "url": response.url,
                    "method": response.request.method,
                    "status": response.status,
                    "timestamp": datetime.now().isoformat()
                }

                if response.status >= 400:
                    print(f"❌ {response.request.method} {response.url} - Status: {response.status}")
                    failed_requests.append(request_info)
                else:
                    print(f"✅ {response.request.method} {response.url} - Status: {response.status}")
                    successful_requests.append(request_info)

        page.on("response", handle_response)

        # Test routes that typically load data
        routes_to_test = [
            "/inbox",
            "/today",
            "/browse",
            "/clarifications",
            "/receipts",
            "/search",
            "/digest/dashboard",
            "/digest/weekly"
        ]

        for route in routes_to_test:
            print(f"\n📍 Testing: {route}")
            try:
                page.goto(f"http://localhost:5173{route}", wait_until='domcontentloaded', timeout=15000)
                page.wait_for_timeout(2000)  # Wait for API calls
            except Exception as e:
                print(f"  ⚠️  Error loading {route}: {str(e)}")

        browser.close()

    # Generate report
    print("\n" + "=" * 80)
    print("API ERROR ANALYSIS")
    print("=" * 80)
    print(f"\n✅ Successful requests: {len(successful_requests)}")
    print(f"❌ Failed requests: {len(failed_requests)}")

    if failed_requests:
        print("\n🔴 Failed API Endpoints:")
        # Group by endpoint
        endpoint_failures = {}
        for req in failed_requests:
            endpoint = req['url'].replace('http://localhost:3001', '')
            if endpoint not in endpoint_failures:
                endpoint_failures[endpoint] = 0
            endpoint_failures[endpoint] += 1

        for endpoint, count in endpoint_failures.items():
            print(f"  {endpoint} - Failed {count} time(s)")

    # Save detailed report
    with open("/tmp/api_error_report.json", 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "successful_requests": len(successful_requests),
                "failed_requests": len(failed_requests)
            },
            "failed_requests": failed_requests,
            "successful_requests": successful_requests
        }, f, indent=2)

    print(f"\n📄 Detailed report saved to: /tmp/api_error_report.json")

if __name__ == "__main__":
    main()
