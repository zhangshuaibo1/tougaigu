"""Read all earned endings through the real journal, reply and reload UI.

The caller must first finish chapter six normally.  This module only reads
storage/DOM evidence; every selection, dismissal and scroll uses user input.
It adds no intentional request failures to the caller's final network ledger.
"""
import json
import time
from pathlib import Path

from browser_library_v26 import click_input


REPLIES = {
    'send': {'page': '01 / 01', 'speaker': '拾光', 'file': 'portrait-soul.svg',
             'word': '信乘着掀盖时的风飞走'},
    'keep': {'page': '01 / 01', 'speaker': '拾光', 'file': 'portrait-soul.svg',
             'word': '阿拾把信收好'},
    'release': {'page': '01 / 01', 'speaker': '拾光', 'file': 'portrait-soul.svg',
                'word': '把记忆放进钟声'},
    'hold': {'page': '01 / 01', 'speaker': '拾光', 'file': 'portrait-soul.svg',
             'word': '书页画了扇小窗'},
}
ENDING_CONTENT = {
    'dawn': {
        'title': '天亮了。你也还在。', 'eyebrow': 'ENDING 01 · 一起向前',
        'paragraphs': [
            '第一班列车带来晨风。归先生捧着茶走下楼梯，终于赶上答应小满的日出。',
            '阿拾轻扣头盖骨。小火车载着嫩芽、纸月亮和小鲸，绕那轮太阳开了整整一圈。',
            '拾光把“未完待续”挂在脑内剧场门口。阿拾收好小满的信，又接过一封新的。',
        ],
        'lastLine': '头盖骨不再锁住明天。下一封信，出发。',
    },
    'tender': {
        'title': '不用一下子，走出长夜。', 'eyebrow': 'ENDING 02 · 慢慢天亮',
        'paragraphs': [
            '黎明先落在窗沿。归先生让钟多走一秒，阿拾就把头顶的窗再推开一点。',
            '还没寄出的信住在靠窗的位置。小鲸替它压住折角，嫩芽负责每天报一次天气。',
            '拾光没催谁出发。它陪阿拾把小满的字读完，再给明天留出一张空白信纸。',
        ],
        'lastLine': '盖子可以慢慢开，明天不必再锁着。',
    },
    'lanterns': {
        'title': '这一夜，不再只有你。', 'eyebrow': 'ENDING 03 · 长夜有灯',
        'paragraphs': [
            '太阳还没升起，小镇已经摆好长桌。归先生把守钟的椅子搬来，坐在朋友中间。',
            '阿拾掀起头盖骨，请大家看脑内小剧场。纸月亮亮着，小鲸笨拙地谢了三次幕。',
            '小满的信放在空座旁。拾光替还没准备出发的人留灯，也替想去远方的人开窗。',
        ],
        'lastLine': '头顶的窗开着。明天，随时可以进来。',
    },
}
COMBINATIONS = [
    ('send', 'release', 'dawn'),
    ('keep', 'hold', 'lanterns'),
    ('keep', 'release', 'tender'),
    ('send', 'hold', 'tender'),
]
LETTER_LABELS = {'send': '信已寄出', 'keep': '信留窗边'}
CLOCK_LABELS = {'release': '钟声向前', 'hold': '为想念留灯'}
SKY_LABELS = {'dawn': '晨光正升起', 'tender': '晨光刚抵达窗沿',
              'lanterns': '长夜的窗灯亮着，太阳尚未升起'}

READ_PROGRESS = """()=>{
  const dream=JSON.parse(localStorage.getItem('tougaigu.dream.v1')||'null');
  const book=JSON.parse(localStorage.getItem('tougaigu.capbook.v1')||'null');
  return {dream,collections:Object.fromEntries(Object.entries(book?.scenes||{})
    .map(([id,scene])=>[id,{memories:scene.memories,seals:scene.seals}]))};
}"""

ENDING_PROBE = """()=>{
  const d=document.querySelector('#ending-dialog');
  const rect=e=>{const r=e.getBoundingClientRect();return {
    left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const dr=rect(d),style=getComputedStyle(d);
  const fullyVisible=e=>{const r=rect(e);return r.width>0&&r.height>0&&
    r.left>=dr.left-.5&&r.right<=dr.right+.5&&r.top>=dr.top+1&&
    r.bottom<=dr.bottom-1&&r.top>=0&&r.bottom<=innerHeight;};
  const paragraphs=[...d.querySelectorAll('#ending-text>p')].map(p=>{
    const s=getComputedStyle(p);return {text:p.textContent,rect:rect(p),
      fontSize:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight),
      fullyVisible:fullyVisible(p),scrollWidth:p.scrollWidth,clientWidth:p.clientWidth};});
  const host=d.querySelector('#ending-scene');
  const scene=host?.querySelector('[data-ending-scene]');
  const svg=scene?.matches('svg')?scene:scene?.querySelector('svg');
  const home=d.querySelector('#ending-home');const hr=rect(home);
  const hit=document.elementFromPoint(hr.left+hr.width/2,hr.top+hr.height/2);
  const collection=d.querySelector('#ending-collection');
  return {open:d.open,ending:d.dataset.ending,sceneId:scene?.dataset.endingScene||null,
    savedChoices:JSON.parse(localStorage.getItem('tougaigu.dream.v1')||'null')?.choices,
    sceneChoice:{ending:host?.dataset.ending,letter:host?.dataset.letter,clock:host?.dataset.clock},
    choiceLabels:{letter:host?.querySelector('[data-ending-letter-label]')?.textContent||'',
      clock:host?.querySelector('[data-ending-clock-label]')?.textContent||'',
      sky:host?.querySelector('[data-ending-sky-label]')?.textContent||''},
    art:{sun:host?.querySelectorAll('[data-art="rising-sun"]').length||0,
      lamps:host?.querySelectorAll('[data-art="paper-lantern"]').length||0,
      emptyChair:host?.querySelectorAll('[data-art="empty-chair"]').length||0,
      slot:host?.querySelectorAll('[data-art="delivery-slot"]').length||0,
      train:host?.querySelectorAll('[data-art="first-train"]').length||0,
      bench:host?.querySelectorAll('[data-art="reading-bench"]').length||0,
      blankPage:host?.querySelectorAll('[data-art="blank-page"]').length||0,
      whale:host?.querySelectorAll('[data-art="folded-whale"]').length||0,
      ashi:host?.querySelectorAll('[data-character="ashi"]').length||0,
      shiguang:host?.querySelectorAll('[data-character="shiguang"]').length||0},
    sceneCount:host?.querySelectorAll('[data-ending-scene]').length||0,
    sceneSvgCount:host?.querySelectorAll('svg').length||0,
    sceneLabel:scene?.getAttribute('aria-label')||svg?.getAttribute('aria-label')||
      scene?.querySelector('title')?.textContent||'',sceneRect:host?rect(host):null,
    title:d.querySelector('#ending-title').textContent,
    eyebrow:d.querySelector('#ending-eyebrow').textContent,
    paragraphs,lastLine:d.querySelector('#ending-last-line').textContent,
    collection:collection.textContent,collectionFont:parseFloat(getComputedStyle(collection).fontSize),
    home:{rect:hr,fullyVisible:fullyVisible(home),centerHits:hit===home||home.contains(hit)},
    dialog:dr,scrollTop:d.scrollTop,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,
    scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,overflowY:style.overflowY,
    pageWidth:document.documentElement.scrollWidth,viewport:{width:innerWidth,height:innerHeight},
    reducedMotion:d.dataset.reducedMotion,mediaReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
    activeAnimations:host?.getAnimations({subtree:true}).filter(a=>a.playState==='running')
      .map(a=>({name:a.animationName||'',duration:a.effect.getTiming().duration,
                iterations:a.effect.getTiming().iterations}))||[]};
}"""


def ending_for_choices(choices):
    pair = (choices.get('letter'), choices.get('clock'))
    matches = [ending for letter, clock, ending in COMBINATIONS if (letter, clock) == pair]
    assert len(matches) == 1, 'ending was not derived from two actual valid saved replies'
    return matches[0]


def validate_progress(before, after, choices, discovered, grants_before, grants_after):
    """Reject a repeated chapter settlement, collection or reward during rereading."""
    original, current = before['dream'], after['dream']
    assert original and current and len(original['chapters']) == 6
    assert all(ch['completed'] for ch in original['chapters']), 'ending proof did not follow six completed chapters'
    assert current.keys() == original.keys(), 'rereading added or removed a save field'
    for key in original:
        if key not in ('choices', 'discoveredEndings'):
            assert current[key] == original[key], 'rereading or reload mutated saved '+key
    assert current['choices'] == choices, 'visible ending did not use the actual saved replies'
    actual = current['discoveredEndings']
    assert len(actual) == len(set(actual)) and set(actual) == set(discovered), 'ending discovery duplicated or missed an earned result'
    assert set(actual) <= set(ENDING_CONTENT), 'a fourth ending was invented'
    assert after['collections'] == before['collections'], 'rereading changed earned cap-book memories or lamps'
    assert grants_after == grants_before, 'rereading granted or claimed a reward'
    return {'chaptersAndScoresUnchanged': True, 'riddlesAndSettingsUnchanged': True,
            'collectionsUnchanged': True, 'rewardGrantsUnchanged': True,
            'actualChoices': dict(choices), 'discoveredEndings': sorted(actual)}


def validate_ending_view(view, expected, discovered, phone=False, at_top=False):
    """Require the displayed branch, all original prose and measurable safe layout."""
    detail = json.dumps({'expected': expected, 'actual': view}, ensure_ascii=False)
    content = ENDING_CONTENT[expected]
    assert view['open'] and view['ending'] == expected and view['sceneId'] == expected, 'ending/illustration branch mismatch; '+detail
    choices = view['savedChoices']
    assert ending_for_choices(choices) == expected, 'illustration ignores the actual saved replies; '+detail
    assert view['sceneChoice'] == {'ending': expected, **choices}, 'displayed letter/clock branch differs from the actual save; '+detail
    assert view['choiceLabels'] == {'letter': LETTER_LABELS[choices['letter']],
                                    'clock': CLOCK_LABELS[choices['clock']], 'sky': SKY_LABELS[expected]}, 'ending labels do not describe the real two replies; '+detail
    assert view['sceneCount'] == 1 and view['sceneSvgCount'] >= 1 and len(view['sceneLabel'].strip()) >= 8, 'ending scene is missing or inaccessible; '+detail
    art = view['art']
    assert art['ashi'] == art['shiguang'] == 1, 'ending lost its original two protagonists; '+detail
    if expected == 'dawn':
        assert art['sun'] == art['slot'] == art['train'] == 1, 'daybreak lacks its actual sunrise, posting action or train; '+detail
    elif expected == 'lanterns':
        assert art['sun'] == 0 and art['lamps'] == 3 and art['emptyChair'] == 1, 'long-night scene contradicts its unrisen sun or empty-chair story; '+detail
    else:
        assert art['sun'] == 0 and art['bench'] == art['blankPage'] == art['whale'] == 1, 'gentle ending lacks its reading companionship; '+detail
    for key in ('title', 'eyebrow', 'lastLine'):
        assert view[key] == content[key], 'wrong ending '+key+'; '+detail
    assert [p['text'] for p in view['paragraphs']] == content['paragraphs'], 'ending lost or replaced an original paragraph; '+detail
    assert view['collection'] == f'你已收好 {len(set(discovered))} / 3 种天色', 'wrong visible discovery count; '+detail
    width, height = view['viewport']['width'], view['viewport']['height']
    d = view['dialog']
    assert 0 <= d['left'] < d['right'] <= width+.5 and 0 <= d['top'] < d['bottom'] <= height+.5, 'dialog leaves the actual viewport; '+detail
    assert view['pageWidth'] <= width and view['scrollWidth'] <= view['clientWidth']+1, 'ending creates horizontal overflow; '+detail
    assert view['overflowY'] in ('auto', 'scroll'), 'long ending cannot scroll; '+detail
    assert view['home']['rect']['height'] >= 44 and view['home']['rect']['width'] >= 44, 'ending dismissal is not a usable touch target; '+detail
    for p in view['paragraphs']:
        assert d['left'] <= p['rect']['left'] and p['rect']['right'] <= d['right'], 'ending paragraph is clipped horizontally; '+detail
        assert p['scrollWidth'] <= p['clientWidth']+1, 'ending paragraph text overflows its own line box; '+detail
        if phone:
            assert p['fontSize'] >= 14 and p['lineHeight'] >= p['fontSize']*1.5, 'phone ending prose is too small or crowded; '+detail
    if phone:
        assert view['collectionFont'] >= 11, 'phone discovery count is too small; '+detail
    if at_top:
        assert view['scrollTop'] <= 1, 'opening the ending silently focused/scrolled to the bottom; '+detail
        r = view['sceneRect']
        assert r and r['height'] >= 90 and r['width'] >= 200 and r['top'] >= d['top'] and r['bottom'] <= d['bottom'], 'opening illustration is not actually visible; '+detail
    return view


def validate_reading_coverage(samples):
    """A short phone viewport must expose every whole paragraph and the final button."""
    assert samples, 'no actual phone reading samples'
    first = samples[0]
    seen = set()
    for sample in samples:
        assert sample['ending'] == first['ending'] and sample['viewport'] == first['viewport'], 'reading proof changed branch or viewport'
        seen.update(i for i, p in enumerate(sample['paragraphs']) if p['fullyVisible'])
    assert seen == {0, 1, 2}, 'phone scrolling never exposed all three complete paragraphs'
    assert samples[-1]['home']['fullyVisible'] and samples[-1]['home']['centerHits'], 'final ending button is clipped or covered'
    if first['scrollHeight'] > first['clientHeight']+1:
        assert max(s['scrollTop'] for s in samples) > first['scrollTop']+1, 'long phone ending did not actually scroll'
    return {'fullyReadParagraphs': sorted(seen), 'homeFullyVisibleAndUncovered': True,
            'scrollSamples': len(samples), 'maxScrollTop': max(s['scrollTop'] for s in samples),
            'input': 'Chromium CDP simulated touch scroll and tap; not a physical phone'}


async def read_progress(page):
    return await page.evaluate(READ_PROGRESS)


async def leave_ending(page, driver, touch=False, continue_to_journal=True):
    await click_input(page, '#ending-home', driver, touch)
    await page.locator('#map-dialog[open]').wait_for()
    if continue_to_journal:
        await click_input(page, '#map-continue', driver, touch)
        await page.wait_for_function("()=>window.__qaRead?.()?.state==='playing'")
        await click_input(page, '[data-shell-action="profile"]', driver, touch)
        await page.locator('#journal-dialog[open]').wait_for()


async def choose_reply(page, driver, key, value, touch=False):
    before = (await read_progress(page))['dream']['choices'][key]
    await click_input(page, f'#journal-choices [data-reply="{key}"]', driver, touch)
    await page.locator('#choice-dialog[open]').wait_for()
    if before:
        assert 'selected' in (await page.locator(f'#choice-options [data-choice="{before}"]').get_attribute('class') or '')
    await click_input(page, f'#choice-options [data-choice="{value}"]', driver, touch)
    await page.locator('#story-dialog[open]').wait_for()
    portrait = await driver.read_ready_story_portrait(page, REPLIES[value])
    # Unlike the generic desktop helper, the phone cases also advance this
    # ordinary decoded one-page reply with an actual touch event.
    await click_input(page, '#story-next', driver, touch)
    assert not await page.locator('#story-dialog[open]').is_visible(), 'choice reply gained an unexpected page'
    await page.locator('#journal-dialog[open]').wait_for()
    assert (await read_progress(page))['dream']['choices'][key] == value
    return portrait


async def open_ending(page, driver, expected, discovered, touch=False):
    await click_input(page, '#journal-ending-open', driver, touch)
    await page.locator('#ending-dialog[open]').wait_for()
    # Observe one real painted frame.  Do not seek or finish an animation.
    await page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))')
    return validate_ending_view(await page.evaluate(ENDING_PROBE), expected, discovered,
                                phone=touch, at_top=True)


async def swipe_ending_up(page):
    """Scroll the native dialog by a real bounded CDP touch gesture."""
    view = await page.evaluate(ENDING_PROBE)
    d = view['dialog']
    x = d['right']-22
    start = d['top']+d['height']*.76
    end = d['top']+d['height']*.43
    session = await page.context.new_cdp_session(page)
    try:
        await session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [
            {'x': x, 'y': start, 'id': 49}]})
        for step in range(1, 13):
            await session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [
                {'x': x, 'y': start+(end-start)*step/12, 'id': 49}]})
            await page.wait_for_timeout(16)
        await session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        # Let the native gesture reach a resting point before reading rectangles.
        await page.wait_for_timeout(100)
    finally:
        await session.detach()


async def phone_reading(page, output, label, driver, expected, discovered):
    samples = [validate_ending_view(await page.evaluate(ENDING_PROBE), expected, discovered,
                                    phone=True, at_top=True)]
    width = samples[0]['viewport']['width']
    await page.screenshot(path=str(Path(output)/(f'{label}-ending-{expected}-{width}-top.png')), full_page=True)
    seen = set(i for i, p in enumerate(samples[0]['paragraphs']) if p['fullyVisible'])
    for _ in range(9):
        last = samples[-1]
        if seen == {0, 1, 2} and last['home']['fullyVisible'] and last['home']['centerHits']:
            break
        await swipe_ending_up(page)
        sample = validate_ending_view(await page.evaluate(ENDING_PROBE), expected, discovered, phone=True)
        samples.append(sample)
        seen.update(i for i, p in enumerate(sample['paragraphs']) if p['fullyVisible'])
    evidence = validate_reading_coverage(samples)
    await page.screenshot(path=str(Path(output)/(f'{label}-ending-{expected}-{width}-read.png')), full_page=True)
    return {'layoutSamples': samples, 'reading': evidence}


async def verify_endings(page, output, label, driver):
    """Continue from the earned ending; finish at the ordinary chapter map."""
    started = time.monotonic()
    print(label, 'read all earned endings, rewrite actual replies and reload', flush=True)
    await page.locator('#ending-dialog[open]').wait_for()
    before = await read_progress(page)
    grants = await driver.read_reward_grants(page)
    original_viewport = dict(page.viewport_size)
    discovered = set(before['dream']['discoveredEndings'])
    initial_id = ending_for_choices(before['dream']['choices'])
    assert initial_id in discovered, 'the actual completed ending was not remembered'
    initial = validate_ending_view(await page.evaluate(ENDING_PROBE), initial_id, discovered)
    validate_progress(before, before, before['dream']['choices'], discovered, grants, grants)
    await leave_ending(page, driver)
    desktop, phones = [], {}
    try:
        for letter, clock, expected in COMBINATIONS:
            replies = [await choose_reply(page, driver, 'letter', letter),
                       await choose_reply(page, driver, 'clock', clock)]
            choices = {'letter': letter, 'clock': clock}
            # Writing a reply alone must not add a discovered ending or reward.
            validate_progress(before, await read_progress(page), choices, discovered,
                              grants, await driver.read_reward_grants(page))
            discovered.add(expected)
            first = await open_ending(page, driver, expected, discovered)
            invariant = validate_progress(before, await read_progress(page), choices, discovered,
                                          grants, await driver.read_reward_grants(page))
            await page.screenshot(path=str(Path(output)/(f'{label}-ending-{letter}-{clock}.png')), full_page=True)
            # Reload actual stored data, without replacing or priming storage.
            # The ordinary route has decoded all portraits before advancing;
            # waiting for its own outstanding network avoids accidental races.
            await page.wait_for_load_state('networkidle')
            await page.reload(wait_until='networkidle')
            await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===5")
            validate_progress(before, await read_progress(page), choices, discovered,
                              grants, await driver.read_reward_grants(page))
            await click_input(page, '[data-shell-action="profile"]', driver)
            await page.locator('#journal-dialog[open]').wait_for()
            repeated = await open_ending(page, driver, expected, discovered)
            validate_progress(before, await read_progress(page), choices, discovered,
                              grants, await driver.read_reward_grants(page))
            desktop.append({'choices': choices, 'ending': expected, 'replyPortraits': replies,
                            'firstView': first, 'afterRealReload': repeated, 'invariants': invariant,
                            'repeatReadDidNotDuplicateDiscovery': True})
            await leave_ending(page, driver)

        assert discovered == set(ENDING_CONTENT), 'four real combinations did not discover exactly three endings'
        for width, height in [(390, 844), (320, 680)]:
            await page.set_viewport_size({'width': width, 'height': height})
            cases = []
            for letter, clock, expected in COMBINATIONS[:3]:
                replies = [await choose_reply(page, driver, 'letter', letter, touch=True),
                           await choose_reply(page, driver, 'clock', clock, touch=True)]
                await open_ending(page, driver, expected, discovered, touch=True)
                evidence = await phone_reading(page, output, label, driver, expected, discovered)
                invariant = validate_progress(before, await read_progress(page),
                                              {'letter': letter, 'clock': clock}, discovered,
                                              grants, await driver.read_reward_grants(page))
                cases.append({'ending': expected, 'choices': {'letter': letter, 'clock': clock},
                              'replyPortraits': replies, 'invariants': invariant, **evidence})
                await leave_ending(page, driver, touch=True)
            phones[str(width)] = cases

        # Actual platform reduced-motion preference: verify the final visible
        # illustration respects it while all three prose paragraphs remain.
        await page.emulate_media(reduced_motion='reduce')
        await open_ending(page, driver, 'tender', discovered, touch=True)
        reduced = validate_ending_view(await page.evaluate(ENDING_PROBE), 'tender', discovered,
                                      phone=True, at_top=True)
        assert reduced['mediaReduced'] and not reduced['activeAnimations'], 'reduced-motion ending still animates'
        await leave_ending(page, driver, touch=True, continue_to_journal=False)
    finally:
        await page.emulate_media(reduced_motion='no-preference')
        await page.set_viewport_size(original_viewport)
    assert await page.locator('#map-dialog[open]').is_visible(), 'ending verification did not leave the ordinary map'
    final = validate_progress(before, await read_progress(page), {'letter': 'keep', 'clock': 'release'},
                              discovered, grants, await driver.read_reward_grants(page))
    return {'scope': 'all four real reply combinations after normal six-chapter completion; three endings and actual reload; phone dialogs use simulated touch, not physical devices',
            'initialEnding': initial_id, 'initialView': initial, 'desktop': desktop,
            'phoneReadings': phones, 'reducedMotion': reduced, 'finalInvariants': final,
            'expectedRequestFailures': [], 'elapsedWallSeconds': time.monotonic()-started}
