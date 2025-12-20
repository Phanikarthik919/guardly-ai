import time
from playwright.sync_api import sync_playwright

def verify_theme():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Page Error: {err}"))

        try:
            print("Navigating to /automation...")
            page.goto("http://localhost:8080/automation")

            # Wait for network idle
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except:
                print("Timeout waiting for networkidle.")

            print("Taking initial screenshot...")
            page.screenshot(path="verification_theme_initial.png")

            print("Looking for Theme Toggle button...")
            toggle_btn = page.get_by_role("button", name="Toggle theme")

            if toggle_btn.count() > 0:
                print("Theme toggle button found.")
                toggle_btn.click()

                light_option = page.get_by_role("menuitem", name="Light")
                if light_option.count() > 0:
                     light_option.click()
                     print("Clicked 'Light' mode.")
                     time.sleep(1)
                     page.screenshot(path="verification_theme_light.png")

                toggle_btn.click()
                dark_option = page.get_by_role("menuitem", name="Dark")
                if dark_option.count() > 0:
                    dark_option.click()
                    print("Clicked 'Dark' mode.")
                    time.sleep(1)
                    page.screenshot(path="verification_theme_dark.png")

            else:
                print("Theme toggle button NOT found.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_theme()
