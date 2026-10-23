"""End-to-end, visual, accessibility, and local speed checks.

Run against ``npm run dev``. Uses installed Chrome, Python Playwright, PyMuPDF,
and the repository's local axe-core bundle. Set SCREENSHOT_ROUND=round-1 or
round-2 to preserve a named five-width visual set.
"""
from pathlib import Path
import json
import os
import re
import time
import pymupdf
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:5173")
ROUND = os.environ.get("SCREENSHOT_ROUND", "final")
WIDTHS = [(320, 780), (375, 812), (768, 900), (1024, 900), (1440, 1000)]
OUT = Path("outputs") / "screenshots" / ROUND
OUT.mkdir(parents=True, exist_ok=True)
AXE = Path("node_modules/axe-core/axe.min.js")


def choose_birth_date(page, legend, year="1992", month="12", day="09"):
    group = page.locator("fieldset").filter(has_text=legend)
    group.locator("select").nth(0).select_option(year)
    group.locator("select").nth(1).select_option(month)
    group.locator("select").nth(2).select_option(day)


def open_natal_chart(page):
    page.goto(BASE + "/natal", wait_until="networkidle")
    page.get_by_label("Таны нэр").fill("Саруул")
    choose_birth_date(page, "Төрсөн огноо")
    page.get_by_label("Төрсөн газар").select_option("ulaanbaatar")
    page.locator("select[id$='-hour']").select_option("08")
    page.locator("select[id$='-minute']").select_option("45")
    page.get_by_role("button", name="Натал зургаа гаргах").click()
    expect(page.get_by_role("heading", name="Таны төрсөн агшны тэнгэр")).to_be_visible()
    chart_image = page.locator("figure").get_by_role("img")
    expect(chart_image).to_be_visible()
    expect(chart_image).to_have_attribute("aria-labelledby", re.compile(r"title.*desc"))
    expect(page.get_by_role("table", name="Гараг ба цэгүүдийн нарийвчилсан байрлал")).to_be_visible()


def axe_scan(page, label):
    page.add_script_tag(content=AXE.read_text(encoding="utf-8"))
    result = page.evaluate("async () => await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})")
    serious = [item for item in result["violations"] if item.get("impact") in ("serious", "critical")]
    (OUT / f"axe-{label}.json").write_text(json.dumps(result["violations"], ensure_ascii=False, indent=2), encoding="utf-8")
    assert not serious, [(item["id"], item["help"], len(item["nodes"])) for item in serious]


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, channel="chrome", args=["--disable-gpu"])
    errors = []

    # Landing route, navigation semantics, five-width visual set.
    for width, height in WIDTHS:
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        page.on("pageerror", lambda error: errors.append(str(error)))
        started = time.perf_counter()
        page.goto(BASE, wait_until="networkidle")
        elapsed_ms = (time.perf_counter() - started) * 1000
        expect(page.get_by_role("heading", name="Таны түүх тоо ба тэнгэрт зэрэг бичигдсэн.")).to_be_visible()
        expect(page.get_by_role("link", name="Эцгийн код", exact=True)).to_be_visible()
        expect(page.get_by_role("link", name="Натал зураг", exact=True)).to_be_visible()
        expect(page.get_by_text("₮10,000", exact=True)).to_be_visible()
        expect(page.get_by_text("Зураг үнэгүй · Бүрэн тайлал ₮20,000", exact=True)).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"landing overflow at {width}px"
        assert elapsed_ms < 5000, f"landing network-idle took {elapsed_ms:.0f}ms at {width}px"
        page.screenshot(path=str(OUT / f"landing-{width}.png"), full_page=True)
        page.close()

    # Complex natal result at every requested width.
    for width, height in WIDTHS:
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        page.on("pageerror", lambda error: errors.append(str(error)))
        if width == 375:
            page.route("**/api/config", lambda route: route.fulfill(status=200, content_type="application/json", body='{"live":false,"price":10000,"etsgiinPrice":10000,"natalPrice":20000}'))
        open_natal_chart(page)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"natal overflow at {width}px"
        page.evaluate("scrollTo(0, 0)")
        page.screenshot(path=str(OUT / f"natal-{width}.png"), full_page=True)
        if width == 375:
            axe_scan(page, "natal-375")
            page.get_by_role("button", name=re.compile(r"^Бүрэн тайлал")).click()
            page.get_by_label("Имэйл хаяг").fill("sarul@example.com")
            page.get_by_role("button", name="Туршилтын тайлал нээх").click()
            expect(page.get_by_role("heading", name="Тэнгэрийн хөрөг", exact=True)).to_be_visible()
            expect(page.get_by_text("Саруул", exact=True)).to_be_visible()
            with page.expect_download() as event:
                page.get_by_role("button", name="Зурагтай PDF татах").click()
            pdf_path = OUT / "natal-preview.pdf"
            event.value.save_as(pdf_path)
            document = pymupdf.open(pdf_path)
            pdf_text = "".join(item.get_text() for item in document)
            assert "Саруул" in pdf_text and len(document) >= 2
            assert sum(len(item.get_drawings()) for item in document) > 20
        page.close()

    # Unknown birth time is accepted and never fabricates an Ascendant.
    unknown = browser.new_page(viewport={"width": 390, "height": 844})
    unknown.goto(BASE + "/natal", wait_until="networkidle")
    unknown.get_by_label("Таны нэр").fill("Номин")
    choose_birth_date(unknown, "Төрсөн огноо", "1995", "06", "13")
    unknown.get_by_label("Төрсөн цагаа мэдэхгүй").check()
    unknown.get_by_role("button", name="Натал зургаа гаргах").click()
    expect(unknown.get_by_text("Тодорхойгүй", exact=True)).to_be_visible()
    expect(unknown.get_by_text("Төрсөн цаггүй зураг", exact=False)).to_be_visible()
    unknown.close()

    # Etsgiin-kod date inputs are explicit year/month/day controls.
    etsgiin = browser.new_page(viewport={"width": 390, "height": 844})
    etsgiin.goto(BASE + "/etsgiin-kod", wait_until="networkidle")
    expect(etsgiin.get_by_text("₮10,000", exact=True)).to_be_visible()
    choose_birth_date(etsgiin, "Аавын төрсөн огноо", "1961", "04", "24")
    choose_birth_date(etsgiin, "Таны төрсөн огноо", "1995", "06", "13")
    etsgiin.get_by_role("button", name="Миний кодыг харах").click()
    expect(etsgiin.get_by_text("09–07", exact=True)).to_be_visible()
    axe_scan(etsgiin, "etsgiin-390")
    etsgiin.close()

    assert not errors, errors
    browser.close()
    print(f"PASS: routes, five widths, natal chart/table, unknown time, preview PDF, axe AA scan, and local speed check. Screenshots: {OUT}")
