"""Run against npm run dev. Requires Playwright, Chrome, and PyMuPDF."""
from pathlib import Path
import hashlib
import json
import sqlite3
import uuid
import pymupdf
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:5173'
out = Path('outputs')
out.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome', args=['--disable-gpu'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='Таны тоонууд. Таны түүх.')).to_be_visible()
    assert page.locator('html').get_attribute('lang') == 'mn'
    assert page.locator('.language-switch, #report-language').count() == 0
    assert page.request.get(BASE + '/api/sample?lang=en').json()['language'] == 'mn'
    page.get_by_role('button', name='Миний тоог нээх').click()
    page.get_by_label('Таны бүтэн нэр').fill('Anu')
    page.get_by_label('Төрсөн огноо').fill('1995-06-13')
    page.get_by_role('button', name='Төлбөр төлөх').click()
    expect(page.get_by_role('heading', name='Тайлангаа үнэгүй туршаарай')).to_be_visible()
    page.get_by_role('button', name='Миний тайланг үзэх').click()
    expect(page.get_by_text('Туршилтын тайлан бэлэн')).to_be_visible()
    expect(page.get_by_role('heading', name='Амьдралын зам 7')).to_be_visible()
    with page.expect_download() as event:
        page.get_by_role('button', name='PDF татах', exact=True).click()
    event.value.save_as(out / 'browser-desktop-mn.pdf')
    doc = pymupdf.open(out / 'browser-desktop-mn.pdf')
    text = ''.join(p.get_text() for p in doc)
    assert 'Anu' in text and 'Эргэцүүлэгч' in text and len(doc) == 2
    # Embedded outlines must exist, not merely invisible searchable characters.
    assert sum(len(p.get_drawings()) for p in doc) > 0
    with page.expect_download() as event:
        page.get_by_role('button', name='Текст файл', exact=True).click()
    event.value.save_as(out / 'browser-desktop-mn.txt')
    assert 'Anu' in (out / 'browser-desktop-mn.txt').read_text(encoding='utf-8-sig')
    page.get_by_role('button', name='Жишээ тайлан', exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).not_to_be_visible()
    page.get_by_role('button', name='Миний тайлан', exact=True).click()
    page.get_by_label('Сэргээх код', exact=True).fill('wrong-code')
    page.get_by_role('button', name='Тайлангаа олох', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Сэргээх кодыг бүтнээр оруулна уу')
    page.keyboard.press('Escape')

    # Exercise actual server validation and fail-closed checkout.
    api = page.request
    response = api.post(BASE + '/api/orders', data={}, headers={'Origin': BASE})
    assert response.status == 503
    response = api.post(BASE + '/api/preview', data={'name': 'Anu', 'birthday': '2023-02-29', 'language': 'en'}, headers={'Origin': BASE})
    assert response.status == 400
    response = api.post(BASE + '/api/preview', data={'name': 'Anu', 'birthday': '1995-06-13', 'language': 'en'}, headers={'Origin': 'https://untrusted.example'})
    assert response.status in (400,403)
    assert api.get(BASE + '/api/orders/unknown').status == 404

    # Verify durable order authorization and payment gating using local-only fixtures.
    db_file = next(Path('.wrangler/state/v3/d1').rglob('*.sqlite'))
    connection = sqlite3.connect(db_file)
    order_id, token = str(uuid.uuid4()), str(uuid.uuid4())
    hashed = hashlib.sha256(token.encode()).hexdigest()
    connection.execute('INSERT INTO orders (id,access_hash,callback_hash,name,birthday,language,amount,year,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', (order_id,hashed,hashed,'Local Test','1995-06-13','en',19900,2026,'pending',1))
    connection.commit()
    try:
        url = BASE + '/api/orders/' + order_id
        assert api.get(url).status == 404
        assert api.get(url, headers={'Authorization': 'Bearer wrong'}).status == 404
        response = api.get(url, headers={'Authorization': 'Bearer ' + token})
        assert response.status == 200 and response.json()['report'] is None
        connection.execute("UPDATE orders SET status='paid' WHERE id=?", (order_id,))
        connection.commit()
        response = api.get(url, headers={'Authorization': 'Bearer ' + token})
        assert response.json()['report']['lifePath'] == 7
        assert response.json()['report']['language'] == 'mn'
    finally:
        connection.execute('DELETE FROM orders WHERE id=?', (order_id,))
        connection.commit()
        connection.close()

    mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    mobile.goto(BASE)
    mobile.wait_for_load_state('networkidle')
    mobile.screenshot(path=str(out / 'mobile-mn.png'), full_page=True)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.get_by_label('Таны бүтэн нэр').fill('Мөнх-Эрдэнэ')
    mobile.get_by_label('Төрсөн огноо').fill('1995-06-13')
    mobile.get_by_role('button', name='Төлбөр төлөх', exact=True).click()
    mobile.get_by_role('button', name='Миний тайланг үзэх', exact=True).click()
    expect(mobile.get_by_role('heading', name='Мөнх-Эрдэнэ', exact=True)).to_be_visible()
    with mobile.expect_download() as event:
        mobile.get_by_role('button', name='PDF татах', exact=True).click()
    event.value.save_as(out / 'browser-mn.pdf')
    doc = pymupdf.open(out / 'browser-mn.pdf')
    assert 'Мөнх-Эрдэнэ' in ''.join(p.get_text() for p in doc)
    doc[0].get_pixmap().save(str(out / 'pdf-mn.png'))
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
    print('PASS: desktop/mobile, Mongolian only, PDF/text downloads, dialogs, input validation, order authorization, payment gating; no browser errors.')
