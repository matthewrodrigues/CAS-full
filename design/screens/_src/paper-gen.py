import os, html

OUT = r"c:\dev\CAS\nightlife-trivia\design\screens"
E = html.escape

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="../system/tokens.css">
<link rel="stylesheet" href="../system/kit.css">
<script src="../system/include.js"></script>
</head>
<body>
"""

def svg(paths, cls, sw="2.4", extra=""):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{paths}</svg>'

I_SEND = '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>'
I_LOCK = '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
I_HOURGLASS = '<path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9"/>'
I_STAR = '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'
I_PAUSE = '<rect x="6.5" y="5" width="3.5" height="14" rx="1.2"/><rect x="14" y="5" width="3.5" height="14" rx="1.2"/>'
I_CHECK = '<path d="M5 12.5l4.5 4.5L19 7"/>'
I_CROSS = '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'
I_BULB = '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'
I_DOWN = '<path d="M12 4v14"/><path d="M6 13l6 6 6-6"/>'
I_CAPTAIN = '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/><path d="M8.5 3.5 12 2l3.5 1.5"/>'
I_PLAY = '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'

PILLS = {
    "live": '<span class="pill pill--live"><span class="pill__dot" aria-hidden="true"></span>Question live</span>',
    "locked": f'<span class="pill pill--locked">{svg(I_LOCK, "pill__icon")}Answers locked</span>',
    "waiting": f'<span class="pill pill--waiting">{svg(I_HOURGLASS, "pill__icon")}Waiting for the host</span>',
    "results": f'<span class="pill pill--results">{svg(I_STAR, "pill__icon")}Results are in</span>',
    "paused": f'<span class="pill pill--paused">{svg(I_PAUSE, "pill__icon")}Paused by the host</span>',
    "wager": '<span class="pill pill--wager"><span class="pill__dot" aria-hidden="true"></span>Place your wager</span>',
}

# The player app's tab bar, copied exactly from leaderboard-tonight.html (kit §6). Only the round break shows it here.
TABBAR = """  <nav class="tabbar" aria-label="Game sections">
    <ul class="tabbar__list">
      <li><a class="tabbar__link" href="ended-prizes.html" aria-current="page"><svg class="tabbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6"/><path d="M12 17h.01"/></svg>Play</a></li>
      <li><a class="tabbar__link" href="leaderboard-tonight.html"><svg class="tabbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4"/><path d="M8 20h8"/></svg>Leaderboard</a></li>
      <li><a class="tabbar__link" href="rewards.html"><svg class="tabbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="8" width="17" height="5" rx="1.5"/><path d="M5.5 13v7h13v-7"/><path d="M12 8v12"/><path d="M12 8C10 4 6.5 4 6.5 6.3S12 8 12 8Zm0 0c2-4 5.5-4 5.5-1.7S12 8 12 8Z"/></svg>Rewards</a></li>
      <li><a class="tabbar__link" href="animals.html"><svg class="tabbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6.5" cy="10.5" r="1.7"/><circle cx="10" cy="6.5" r="1.7"/><circle cx="14" cy="6.5" r="1.7"/><circle cx="17.5" cy="10.5" r="1.7"/><path d="M12 12.5c-3 0-5.5 3.4-5.5 5.3 0 1.4 1.1 2.2 2.5 2.2 1.3 0 1.9-.6 3-.6s1.7.6 3 .6c1.4 0 2.5-.8 2.5-2.2 0-1.9-2.5-5.3-5.5-5.3Z"/></svg>Animals</a></li>
    </ul>
  </nav>
"""

HOSTS = {"rocco": "Rocco the raccoon", "pebble": "Pebble the penguin", "june": "Dr. June"}

def host(name, expr, size=96, state=None, hidden=False, idle=False):
    cls = f"char char--{size}" + (" char--idle" if idle else "")
    st = f' data-host="{state}"' if state else ""
    hd = " hidden" if hidden else ""
    return f'<span class="{cls}" role="img" aria-label="{HOSTS[name]}, {expr}" data-character="hosts/{name}/{expr}"{st}{hd}></span>'

def top(pill, note):
    return f"""  <div class="screen__top">
    <div role="status" aria-live="polite" id="phase">
      {PILLS[pill]}
    </div>
    <p class="hand hand--sm">{note}</p>
  </div>
"""

def countdown(total, start, frozen=False):
    urgent = " is-urgent" if start <= 5 else ""
    fz = ' data-frozen=""' if frozen else ""
    return f"""<div class="countdown{urgent}" role="timer" aria-label="Seconds left" id="timer" data-total="{total}" data-start="{start}"{fz} style="--left: {start/total:.2f}">
        <svg class="countdown__ring" viewBox="0 0 54 54" aria-hidden="true">
          <circle class="countdown__track" cx="27" cy="27" r="23"/>
          <circle class="countdown__fill" cx="27" cy="27" r="23" pathLength="100"/>
        </svg>
        <span class="countdown__num" id="seconds">{start}</span>
      </div>"""

def head(qline, meta, right=""):
    return f"""    <header class="paper__head">
      <div class="paper__meta">
        <p class="hand">{qline}</p>
        <p class="small">{E(meta).replace(" points", "&nbsp;points").replace(" questions", "&nbsp;questions")}</p>
      </div>
      {right}
    </header>
"""

LETTERS = "ABCD"

def mc_options(labels, picked=None, disabled=False, sent=None, label="Answers"):
    rows = []
    for i, l in enumerate(labels):
        pr = "true" if i == picked else "false"
        d = " disabled" if disabled else ""
        note = '<span class="option__note">sent!</span>' if sent == i else ""
        rows.append(f'        <li><button type="button" class="option" aria-pressed="{pr}"{d}><span class="option__letter" aria-hidden="true">{LETTERS[i]}</span><span class="option__label">{E(l)}</span>{note}</button></li>')
    return f'      <ul class="options" aria-label="{label}">\n' + "\n".join(rows) + "\n      </ul>\n"

def tf_options(picked=None, disabled=False, sent=None):
    rows = []
    for i, (letter, word) in enumerate([("T", "True"), ("F", "False")]):
        pr = "true" if i == picked else "false"
        d = " disabled" if disabled else ""
        note = '<span class="option__note">sent!</span>' if sent == i else ""
        rows.append(f'        <li><button type="button" class="option option--tf" aria-pressed="{pr}"{d}><span class="option__letter" aria-hidden="true">{letter}</span><span class="option__label">{word}</span>{note}</button></li>')
    return '      <ul class="options options--tf" aria-label="Answers">\n' + "\n".join(rows) + "\n      </ul>\n"

CRAB = """            <circle cx="262" cy="40" r="5" fill="var(--color-info-soft)" fill-opacity="0.35"/>
            <circle cx="276" cy="64" r="3" fill="var(--color-info-soft)" fill-opacity="0.3"/>
            <circle cx="52" cy="40" r="4" fill="var(--color-info-soft)" fill-opacity="0.3"/>
            <path d="M0 180V156q60-14 120-6t200 2v28z" fill="var(--color-depth)"/>
            <path d="M276 180l8-70q10-9 20 0l8 70z" fill="var(--color-border)"/>
            <path d="M288 104q6-26 2-50M298 104q8-22 12-44" fill="none" stroke="var(--color-info-soft)" stroke-opacity="0.3" stroke-width="8" stroke-linecap="round"/>
            <g transform="translate(0 -8)">
            <path d="M118 128l-30 22M122 136l-26 30M200 128l30 22M196 136l26 30" stroke="var(--color-line)" stroke-width="7" stroke-linecap="round"/>
            <path d="M128 106q-34-10-54-48M190 106q34-10 54-48" fill="none" stroke="var(--color-paper)" stroke-width="16" stroke-linecap="round"/>
            <path d="M128 106q-34-10-54-48M190 106q34-10 54-48" fill="none" stroke="var(--color-line)" stroke-width="20" stroke-linecap="round" stroke-dasharray="2 7"/>
            <ellipse cx="68" cy="50" rx="16" ry="12" fill="var(--color-paper)"/>
            <ellipse cx="250" cy="50" rx="16" ry="12" fill="var(--color-paper)"/>
            <ellipse cx="159" cy="122" rx="52" ry="34" fill="var(--color-paper)"/>
            <ellipse cx="159" cy="132" rx="38" ry="16" fill="var(--color-paper-edge)"/>
            <path d="M146 92v-12M172 92v-12" stroke="var(--color-paper)" stroke-width="5" stroke-linecap="round"/>
            <circle cx="146" cy="78" r="5" fill="var(--color-depth)"/>
            <circle cx="172" cy="78" r="5" fill="var(--color-depth)"/>
            </g>
"""

def picture(kind="barreleye"):
    # A token-only stand-in for the round's photo, in the dark. No text.
    if kind == "crab":
        return """      <figure class="media">
        <span class="media__frame">
          <svg viewBox="0 0 320 160" role="img" aria-label="Picture for this question">
""" + CRAB + """          </svg>
        </span>
      </figure>
"""
    return """      <figure class="media">
        <span class="media__frame">
          <svg viewBox="0 0 320 160" role="img" aria-label="Picture for this question">
            <circle cx="40" cy="38" r="5" fill="var(--color-info-soft)" fill-opacity="0.35"/>
            <circle cx="58" cy="62" r="3" fill="var(--color-info-soft)" fill-opacity="0.3"/>
            <circle cx="276" cy="44" r="4" fill="var(--color-info-soft)" fill-opacity="0.3"/>
            <circle cx="292" cy="130" r="6" fill="var(--color-info-soft)" fill-opacity="0.25"/>
            <path d="M232 112l46-26c6-3 10 1 8 7l-10 19 10 19c2 6-2 10-8 7z" fill="var(--color-border)"/>
            <ellipse cx="166" cy="114" rx="78" ry="30" fill="var(--color-line)"/>
            <ellipse cx="176" cy="126" rx="56" ry="12" fill="var(--color-paper-edge)"/>
            <path d="M150 140q14 22 34 18q-8-12-10-22z" fill="var(--color-border)"/>
            <path d="M188 88q18-24 38-12q-14 4-22 20z" fill="var(--color-border)"/>
            <ellipse cx="128" cy="86" rx="48" ry="36" fill="var(--color-info-soft)" fill-opacity="0.22" stroke="var(--color-info-soft)" stroke-width="3"/>
            <rect x="106" y="70" width="14" height="30" rx="7" fill="var(--color-rule)"/>
            <rect x="132" y="66" width="14" height="30" rx="7" fill="var(--color-rule)"/>
            <circle cx="102" cy="120" r="4" fill="var(--color-depth)"/>
            <path d="M92 132q8 4 16 0" fill="none" stroke="var(--color-depth)" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </span>
      </figure>
"""

def clip(caption, played=0.35, time="0:04", disabled=False, toggle=True):
    d = " disabled" if disabled else ""
    foot = ""
    cc = """
          <button type="button" class="clip__cc" id="captions" aria-pressed="true" aria-controls="caption">CC<span class="sr-only"> captions</span></button>""" if toggle else ""
    return f"""      <div class="clip" role="group" aria-label="Sound clip for this question">
        <div class="clip__bar">
          <button type="button" class="clip__play" id="play" aria-label="Play the clip"{d}>{svg(I_PLAY, "", "0")}</button>
          <span class="clip__track" aria-hidden="true"><span class="clip__fill" id="played" style="--played: {played}"></span></span>
          <span class="clip__time" id="clip-time">{time}</span>{cc}
        </div>
        <p class="clip__caption" id="caption"><span class="clip__caption-label">Caption:</span><span>{E(caption)}</span></p>{foot}
      </div>
"""

CLIP_JS = """
  // Sound clip: play and pause, and captions that start on.
  const play = document.getElementById('play')
  const fill = document.getElementById('played')
  const clipTime = document.getElementById('clip-time')
  const toggle = document.getElementById('captions')
  const caption = document.getElementById('caption')
  let at = 4
  let playing = null
  const drawClip = () => {
    fill.style.setProperty('--played', at / 12)
    clipTime.textContent = `0:${String(at).padStart(2, '0')}`
  }
  play?.addEventListener('click', () => {
    if (playing) {
      clearInterval(playing)
      playing = null
    } else {
      if (at >= 12) at = 0
      playing = setInterval(() => {
        at = Math.min(12, at + 1)
        drawClip()
        if (at === 12) play.click()
      }, 1000)
    }
    play.setAttribute('aria-label', playing ? 'Pause the clip' : 'Play the clip')
    play.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="3.5" height="14" rx="1.2"/><rect x="14" y="5" width="3.5" height="14" rx="1.2"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>'
  })
  toggle?.addEventListener('click', () => {
    const on = toggle.getAttribute('aria-pressed') !== 'true'
    toggle.setAttribute('aria-pressed', String(on))
    caption.hidden = !on
  })
"""

SHEET_JS = """
<script>
  // Mockup behavior for the answer sheet. Tapping circles an answer on your own sheet only;
  // "That's our answer!" sends it for the team, and the team can change and resend until the lock.
  // At 5 seconds, a circled answer that isn't sent gets the host's nudge. Real logic lives in the app.
  const main = document.querySelector('main')
  const options = [...document.querySelectorAll('.options button.option')]
  const field = document.querySelector('.field')
  const input = document.querySelector('.field__input')
  const count = document.querySelector('.field__count')
  const error = document.getElementById('error')
  const send = document.getElementById('send')
  const hint = document.getElementById('hint')
  const sent = document.getElementById('sent')
  const nudge = document.getElementById('nudge')
  const speech = document.getElementById('speech')
  const hosts = [...document.querySelectorAll('[data-host]')]
  const timer = document.getElementById('timer')
  const seconds = document.getElementById('seconds')
  const total = Number(timer.dataset.total)
  let left = Number(timer.dataset.start)
  let sentValue = null

  const picked = () => {
    if (options.length) {
      const i = options.findIndex((o) => o.getAttribute('aria-pressed') === 'true')
      return i === -1 ? null : i
    }
    return input.value.trim() || null
  }

  function render() {
    const pick = picked()
    const isSent = pick !== null && pick === sentValue
    const live = left > 0
    const nudging = live && !isSent && pick !== null && left <= 5
    options.forEach((o, i) => {
      o.querySelector('.option__note')?.remove()
      if (i === sentValue) o.insertAdjacentHTML('beforeend', '<span class="option__note">sent!</span>')
    })
    field?.classList.toggle('field--submitted', isSent)
    send.hidden = isSent
    send.disabled = !live || pick === null
    send.textContent = sentValue === null ? send.dataset.first : send.dataset.again
    hint.hidden = isSent || nudging
    hint.textContent = pick === null ? hint.dataset.empty : hint.dataset.picked
    sent.hidden = !isSent
    nudge.hidden = !nudging
    const mood = isSent || !live ? 'waiting' : 'asking'
    hosts.forEach((h) => (h.hidden = h.dataset.host !== mood))
    speech.textContent = speech.dataset[!live ? 'locked' : isSent ? 'waiting' : nudging ? 'nudge' : 'asking']
    if (count) count.textContent = `${input.value.length} / 200`
  }

  options.forEach((o) =>
    o.addEventListener('click', () => {
      options.forEach((x) => x.setAttribute('aria-pressed', String(x === o)))
      render()
    }),
  )
  input?.addEventListener('input', () => {
    if (error) error.hidden = true
    render()
  })
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !send.disabled && !send.hidden) send.click()
  })
  send.addEventListener('click', () => {
    if (field?.classList.contains('field--number') && !/^-?[\\d,]+(\\.\\d+)?$/.test(input.value.trim())) {
      error.hidden = false
      return
    }
    sentValue = picked()
    render()
  })
  if ((new URLSearchParams(location.search).get('state') ?? main.dataset.state) === 'submitted') sentValue = picked()
  render()

  // The countdown. The number always ticks (it's information); the ring only glides when motion is allowed.
  if (!('frozen' in timer.dataset)) {
    const tick = setInterval(() => {
      left = Math.max(0, left - 1)
      seconds.textContent = left
      timer.style.setProperty('--left', left / total)
      timer.classList.toggle('is-urgent', left <= 5)
      if (left === 0) {
        clearInterval(tick)
        document.getElementById('phase').innerHTML =
          '<span class="pill pill--locked"><svg class="pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Answers locked</span>'
        options.forEach((o) => (o.disabled = true))
        if (input) input.disabled = true
      }
      render()
    }, 1000)
  }
"""

TIMER_ONLY_JS = """
<script>
  // Mockup countdown. The number always ticks; the ring only glides when motion is allowed.
  const timer = document.getElementById('timer')
  const seconds = document.getElementById('seconds')
  const total = Number(timer.dataset.total)
  let left = Number(timer.dataset.start)
  const tick = setInterval(() => {
    left = Math.max(0, left - 1)
    seconds.textContent = left
    timer.style.setProperty('--left', left / total)
    timer.classList.toggle('is-urgent', left <= 5)
    if (left === 0) {
      clearInterval(tick)
      document.getElementById('phase').innerHTML =
        '<span class="pill pill--locked"><svg class="pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Answers locked</span>'
    }
  }, 1000)
"""

ORDER = [
    ("question-mc", "Question"),
    ("question-mc-submitted", "Sent"),
    ("locked", "Locked"),
    ("reveal-correct", "Reveal: correct"),
    ("question-mc-nudge", "Nudge at 5 s"),
    ("question-true-false", "True or false"),
    ("question-text", "Typed answer"),
    ("question-number", "Closest number"),
    ("round-break", "Round break"),
    ("question-image", "Picture"),
    ("question-captain-only", "Captain only"),
    ("reveal-incorrect", "Reveal: not quite"),
    ("question-audio", "Sound"),
    ("question-stress", "Stress"),
    ("paused", "Paused"),
    ("wager", "Final wager"),
]

def nav(name, extra=()):
    names = [n for n, _ in ORDER]
    i = names.index(name)
    links = []
    if i > 0:
        links.append(f'<a href="{names[i-1]}.html">Back: {ORDER[i-1][1]}</a>')
    if i < len(names) - 1:
        links.append(f'<a href="{names[i+1]}.html">Next: {ORDER[i+1][1]}</a>')
    for href, label in extra:
        links.append(f'<a href="{href}">{label}</a>')
    return '<nav class="mock-controls" aria-label="Mockup states">\n  <span>Mockup state:</span>\n  ' + "\n  ".join(links) + "\n</nav>\n"

def stage(hosts_html, speech_attrs, first_say, cls="stage"):
    return f"""  <section class="{cls}" aria-label="Your host">
    {hosts_html}
    <p class="bubble" id="speech"{speech_attrs}>{E(first_say)}</p>
  </section>
"""

def send_actions(sticky, first="That's our answer!", again="Send this one instead", empty="Tap an answer to circle it.",
                 picked="You can change it until time's up.", sent_text="Sent! Tap another answer to change it before time's up.",
                 nudge_text="It's circled, but your team doesn't have it yet. Send it now!"):
    cls = "screen__actions"
    return f"""  <div class="{cls}">
    <div role="status" aria-live="polite"><p class="note" id="nudge" hidden>
      {svg(I_DOWN, "note__icon")}
      <span>{E(nudge_text)}</span>
    </p></div>
    <button type="button" class="btn btn--primary btn--block" id="send" data-first="{E(first)}" data-again="{E(again)}">{E(first)}</button>
    <p class="small muted center" id="hint" data-empty="{E(empty)}" data-picked="{E(picked)}">{E(picked)}</p>
    <div role="status" aria-live="polite"><p class="note" id="sent" hidden>
      {svg(I_SEND, "note__icon")}
      <span>{E(sent_text)}</span>
    </p></div>
  </div>
"""

def say_attrs(asking, waiting="Got it! Fingers crossed…", nudge="Don't forget to send!", locked="Pencils down!"):
    return f' data-asking="{E(asking)}" data-waiting="{E(waiting)}" data-nudge="{E(nudge)}" data-locked="{E(locked)}"'

def question_page(fname, title, round_note, hostname, asking, qline, meta, total, start, prompt, body, *,
                  long=False, sticky=False, state="picking", frozen=False, extra_nav=(), actions=None, extra_js="", first_say=None):
    hosts_html = host(hostname, "asking", state="asking") + "\n    " + host(hostname, "waiting", state="waiting", hidden=True)
    qcls = "question question--long" if long else "question"
    out = HEAD.format(title=E(title))
    out += f'\n<main class="screen" data-state="{state}">\n'
    out += top("live", round_note)
    out += stage(hosts_html, say_attrs(asking), first_say or asking)
    out += f"""
  <article class="paper" aria-labelledby="prompt">
{head(qline, meta, countdown(total, start, frozen))}    <div class="paper__body">
      <h1 class="{qcls}" id="prompt" data-role="question">{E(prompt)}</h1>
{body}    </div>
  </article>

"""
    out += actions if actions is not None else send_actions(sticky)
    out += "</main>\n\n" + nav(fname, extra_nav) + SHEET_JS + extra_js + "</script>\n</body>\n</html>\n"
    write(fname, out)

def write(name, text):
    with open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

MC_STATES = (("question-mc.html", "Picking"), ("question-mc-submitted.html", "Submitted"), ("question-mc-nudge.html", "Nudge"))

# ---------------------------------------------------------------- Round 1, Rocco
Q1 = ["Challenger Deep", "Puerto Rico Trench", "Tonga Trench", "Java Trench"]
Q1_PROMPT = "What is the deepest known point in Earth's oceans?"
question_page("question-mc", "Question: multiple choice", "Round 1 of 4", "rocco", "Let's start in the deep end!",
              "Question 1 of 10", "Into the Abyss · 10 points", 20, 16, Q1_PROMPT, mc_options(Q1, picked=0),
              extra_nav=MC_STATES)
question_page("question-mc-submitted", "Question: answer sent", "Round 1 of 4", "rocco", "Let's start in the deep end!",
              "Question 1 of 10", "Into the Abyss · 10 points", 20, 11, Q1_PROMPT, mc_options(Q1, picked=0),
              state="submitted", extra_nav=MC_STATES, first_say="Got it! Fingers crossed…")
question_page("question-mc-nudge", "Question: don't forget to send", "Round 1 of 4", "rocco", "Glowing answers only!",
              "Question 5 of 10", "Into the Abyss · 10 points", 20, 5,
              "What is the name for light made by living things, common in the deep sea?",
              mc_options(["Bioluminescence", "Phosphorescence", "Fluorescence", "Incandescence"], picked=0),
              frozen=True, extra_nav=MC_STATES, first_say="Don't forget to send!")
question_page("question-true-false", "Question: true or false", "Round 1 of 4", "rocco", "True or false? Trust your gut!",
              "Question 3 of 10", "Into the Abyss · 10 points", 20, 14,
              "Sunlight reaches the sea floor everywhere in the deep ocean.", tf_options(picked=1))

TEXT_BODY = """      <div class="field">
        <label class="field__label" for="answer">Our answer</label>
        <input class="field__input" id="answer" type="text" maxlength="200" autocomplete="off" autocapitalize="sentences" enterkeyhint="send" placeholder="Type your answer" value="Octopus" aria-describedby="answer-foot">
        <div class="field__foot" id="answer-foot"><span>Close spellings get checked.</span><span class="field__count" aria-hidden="true">7 / 200</span></div>
      </div>
"""
question_page("question-text", "Question: typed answer", "Round 1 of 4", "rocco", "Spell it how it sounds!",
              "Question 2 of 10", "Into the Abyss · 10 points", 30, 22,
              "Which eight-armed animal has three hearts and blue blood?", TEXT_BODY,
              actions=send_actions(False, empty="Type an answer first.", picked="You can change it until time's up.",
                                   sent_text="Sent! Edit it and send again before time's up.",
                                   nudge_text="It's typed, but your team doesn't have it yet. Send it now!"),
              extra_nav=(("question-text.html?state=submitted", "Sent"),))

NUMBER_BODY = """      <div class="field field--number">
        <label class="field__label" for="answer">Our guess</label>
        <input class="field__input" id="answer" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="send" placeholder="Type a number" value="1958" aria-describedby="answer-foot">
        <div class="field__foot" id="answer-foot"><span>Closest guess gets the points.</span></div>
        <p class="small" id="error" role="alert" hidden><strong>Enter a number, like 1955.</strong></p>
      </div>
"""
question_page("question-number", "Question: closest number", "Round 1 of 4", "rocco", "Closest guess wins!",
              "Question 4 of 10", "Into the Abyss · 10 points", 30, 19,
              "In what year did Jacques Piccard and Don Walsh first reach the bottom of Challenger Deep?", NUMBER_BODY,
              actions=send_actions(False, empty="Type a number first.", sent_text="Sent! Change it and send again before time's up.",
                                   nudge_text="It's typed, but your team doesn't have it yet. Send it now!"),
              extra_nav=(("question-number.html?state=submitted", "Sent"),))

# ---------------------------------------------------------------- Round 2, Pebble (picture round)
question_page("question-image", "Question: picture", "Round 2 of 4", "pebble", "Take a good look!",
              "Question 2 of 9", "Who Lives Down There? · 10 points", 20, 15,
              "This fish has a see-through head, and you can watch its eyes move inside it. What is it called?",
              picture() + mc_options(["Barreleye", "Blobfish", "Viperfish", "Lanternfish"]),
              sticky=True, extra_nav=(("question-image.html?state=submitted", "Sent"),))

# ---------------------------------------------------------------- Round 3, Dr. June (sound round)
question_page("question-audio", "Question: sound", "Round 3 of 4", "june", "Ears on! Listen closely…",
              "Question 1 of 9", "Ocean Sounds · 10 points", 20, 17,
              "Which whale, famous for its long and complex songs, is singing here?",
              clip("[Long moans and whoops that rise and fall]") + mc_options(["Humpback whale", "Blue whale", "Sperm whale", "Orca"], picked=0),
              sticky=True, extra_js=CLIP_JS, extra_nav=(("question-audio.html?state=submitted", "Sent"),))

# Stress: longer than anything in the seed. The prompt stretches the snapping-shrimp question past the seed's
# longest prompt (123 characters), and the options stretch past its longest option (33 characters).
question_page("question-stress", "Question: longest text", "Round 3 of 4", "june", "Ears on! Listen closely…",
              "Question 5 of 9", "Ocean Sounds · 10 points", 20, 13,
              "Snapping shrimp make this crackling, loud enough to confuse a submarine's sonar. When one snaps its oversized claw shut, what actually makes the sound you hear?",
              clip("[Constant crackling, like bacon frying, with sharp pops over a low hiss of the reef]") +
              mc_options(["A collapsing bubble shot out from the snapping claw",
                          "The two halves of its shell knocking against each other",
                          "Its walking legs rubbing together very, very quickly",
                          "Tiny teeth grinding away inside its stomach"], picked=0),
              long=True, sticky=True, state="submitted", extra_js=CLIP_JS, first_say="Got it! Fingers crossed…")

# ---------------------------------------------------------------- Captain only (Round 2, Pebble)
CAPTAIN = "Bartholomew the Barnacle"  # 24 characters, the nickname limit
out = HEAD.format(title="Question: captain answers")
out += '\n<main class="screen">\n' + top("live", "Round 2 of 4")
out += stage(host("pebble", "asking"), "", "Cheer your captain on!")
out += f"""
  <article class="paper" aria-labelledby="prompt">
{head("Question 9 of 9", "Who Lives Down There? · 10 points", countdown(20, 9))}    <div class="paper__body">
      <h1 class="question" id="prompt" data-role="question">This crab lives on hydrothermal vents and has hairy arms. What is its nickname?</h1>
{picture("crab")}{mc_options(["Yeti crab", "Bigfoot crab", "Snow crab", "Spider crab"], picked=0, disabled=True, sent=0, label="Your team's answer")}    </div>
  </article>

  <div class="screen__actions">
    <p class="note">
      {svg(I_CAPTAIN, "note__icon")}
      <span>Only your captain can answer. <strong>{CAPTAIN}</strong> sent <strong>Yeti crab</strong> for the team.</span>
    </p>
  </div>
</main>

""" + nav("question-captain-only") + TIMER_ONLY_JS + "</script>\n</body>\n</html>\n"
write("question-captain-only", out)

# ---------------------------------------------------------------- Locked (Round 1, Rocco), torn edge
out = HEAD.format(title="Answers locked")
out += '\n<main class="screen">\n' + top("locked", "Round 1 of 4")
out += f"""  <section class="stage stage--butter stage--hero" aria-label="Your host">
    <p class="bubble bubble--down">Got it! Fingers crossed…</p>
    {host("rocco", "waiting", size=160, idle=True)}
  </section>

  <div class="paper-shadow">
    <article class="paper paper--torn" aria-labelledby="prompt">
  {head("Question 1 of 10", "Into the Abyss · 10 points").replace(chr(10) + "    ", chr(10) + "      ")}      <div class="paper__body">
        <h1 class="question" id="prompt" data-role="question">{E(Q1_PROMPT)}</h1>
        <p class="hand">Our answer</p>
        <ul class="options" aria-label="Your team's answer">
          <li><button type="button" class="option" aria-pressed="true" disabled><span class="option__letter" aria-hidden="true">A</span><span class="option__label">Challenger Deep</span><span class="option__note">sent!</span></button></li>
        </ul>
        <p class="note">
          {svg(I_LOCK, "note__icon")}
          <span>Pencils down! The host will reveal the answer in a moment.</span>
        </p>
      </div>
    </article>
  </div>
</main>

""" + nav("locked") + "</body>\n</html>\n"
write("locked", out)

# ---------------------------------------------------------------- Reveals
def reveal(fname, title, round_note, hostname, expr, say, correct, points_line, qline, meta, prompt, rows, fact, stage_cls):
    badge = (f'<span class="result result--correct">{svg(I_CHECK, "result__icon", "3")}Correct!</span>' if correct
             else f'<span class="result result--incorrect">{svg(I_CROSS, "result__icon", "3")}Not quite</span>')
    o = HEAD.format(title=E(title))
    o += '\n<main class="screen">\n' + top("results", round_note)
    o += f"""  <section class="{stage_cls} stage--hero" aria-label="Your result">
    <p class="bubble bubble--down">{E(say)}</p>
    {host(hostname, expr, size=160, idle=True)}
    {badge}
    <p class="hand hand--ink">{E(points_line)}</p>
  </section>

  <article class="paper" aria-labelledby="prompt">
{head(qline, meta)}    <div class="paper__body">
      <h2 class="question" id="prompt" data-role="question">{E(prompt)}</h2>
{rows}      <div class="fact">
        {svg(I_BULB, "fact__icon", "2.2")}
        <div>
          <p class="fact__label">Fun fact</p>
          <p>{E(fact)}</p>
        </div>
      </div>
    </div>
  </article>

  <div class="screen__actions">
    <p class="small muted center">The next question is coming up.</p>
  </div>
</main>

""" + nav(fname) + "</body>\n</html>\n"
    write(fname, o)

def row(label, ok, note=None, tf=False):
    mark = (f'<span class="option__mark option__mark--correct">{svg(I_CHECK, "", "3")}</span><span class="sr-only">Right answer: </span>' if ok
            else f'<span class="option__mark option__mark--incorrect">{svg(I_CROSS, "", "3")}</span><span class="sr-only">Not this one: </span>')
    n = f'<span class="option__note option__note--muted">{note}</span>' if note else ""
    cls = "option option--static option--tf" if tf else "option option--static"
    state = "is-correct" if ok else "is-incorrect"
    return f'<li><div class="{cls} {state}">{mark}<span class="option__label">{label}</span>{n}</div></li>'

reveal("reveal-correct", "Reveal: correct", "Round 1 of 4", "rocco", "cheering", "Yes! Deep-sea pros!", True,
       "+10 points for your team!", "Question 1 of 10", "Into the Abyss · 10 points", Q1_PROMPT,
       f'      <ul class="options" aria-label="The answer">\n        {row("Challenger Deep", True, "our pick")}\n      </ul>\n',
       "Challenger Deep lies at the southern end of the Mariana Trench in the western Pacific.", "stage stage--sky")
reveal("reveal-incorrect", "Reveal: not quite", "Round 2 of 4", "pebble", "consoling", "Aw, so close! Next one!", False,
       "No points this time", "Question 3 of 9", "Who Lives Down There? · 10 points",
       "The blobfish looks just as blobby in its deep-sea home.",
       f'      <ul class="options options--tf" aria-label="The answer">\n        {row("True", False, "our pick", tf=True)}\n        {row("False", True, None, tf=True)}\n      </ul>\n',
       "At depth the water pressure holds its body in shape. It only sags into a blob when brought to the surface.", "stage")

# ---------------------------------------------------------------- Round break: Pebble takes Round 2
out = HEAD.format(title="Round break")
out += '\n<main class="screen">\n' + top("waiting", "Round 2 of 4")
out += f"""  <section class="stage stage--butter stage--hero" aria-labelledby="new-host">
    <p class="bubble bubble--down">Hi, friends! Ready to dive in?</p>
    {host("pebble", "greeting", size=160, idle=True)}
    <div class="stack stack--tight">
      <h1 class="h1" id="new-host">Pebble's taking Round 2!</h1>
      <p class="body"><strong>Who Lives Down There?</strong></p>
      <p class="small muted">A picture round</p>
    </div>
  </section>

  <article class="paper" aria-labelledby="summary">
    <header class="paper__head">
      <div class="paper__meta">
        <h2 class="hand" id="summary">Round 1 done!</h2>
        <p class="small">Into the Abyss · 10 questions</p>
      </div>
    </header>
    <div class="paper__body">
      <div class="stack stack--tight">
        <p class="body"><strong>The Blobfish Brigade</strong></p>
        <p class="tally"><span class="tally__num">#3</span><span class="tally__label">of 20 teams, with 70 points</span></p>
      </div>
      <div class="row">
        {host("rocco", "relaxing", size=64)}
        <p class="bubble bubble--fit">Over to you, Pebble!</p>
      </div>
    </div>
  </article>

  <div class="screen__actions">
    <a class="btn btn--quiet" href="leaderboard-tonight.html">See the whole leaderboard</a>
    <p class="small muted center">The next round starts soon.</p>
  </div>
""" + TABBAR + """</main>

""" + nav("round-break") + "</body>\n</html>\n"
write("round-break", out)

# ---------------------------------------------------------------- Paused (Round 3, Dr. June)
out = HEAD.format(title="Paused")
out += '\n<main class="screen">\n' + top("paused", "Round 3 of 4")
out += stage(host("june", "relaxing"), "", "Quick breather! Back soon…", cls="stage stage--butter")
out += f"""
  <article class="paper" aria-labelledby="prompt">
{head("Question 7 of 9", "Ocean Sounds · 10 points", countdown(20, 12, frozen=True).replace('aria-label="Seconds left"', 'aria-label="Seconds left, paused"'))}    <div class="paper__body">
      <h1 class="question" id="prompt" data-role="question">Orcas in different family groups use different dialects of calls.</h1>
{clip("[Squeaky whistles and pulsed calls]", disabled=True, toggle=False)}{tf_options(picked=0, disabled=True, sent=0)}    </div>
  </article>

  <div class="screen__actions">
    <p class="note">
      {svg(I_PAUSE, "note__icon")}
      <span>Paused by the host. Your answer waits until the game picks back up.</span>
    </p>
  </div>
</main>

""" + nav("paused") + "</body>\n</html>\n"
write("paused", out)

# ---------------------------------------------------------------- Final wager (Rocco), torn edge
out = HEAD.format(title="Final wager")
out += '\n<main class="screen">\n' + top("wager", "Final round")
waiting_hosts = host("rocco", "asking", state="asking") + "\n    " + host("rocco", "waiting", state="waiting", hidden=True)
out += f"""  <section class="stage" aria-label="Your host">
    {waiting_hosts}
    <p class="bubble" id="speech" data-asking="I'm back! Feeling bold?" data-waiting="Bold move! Good luck…">I'm back! Feeling bold?</p>
  </section>

  <div class="paper-shadow">
    <article class="paper paper--torn" aria-labelledby="prompt">
      <header class="paper__head">
        <div class="paper__meta">
          <p class="hand">Final wager</p>
          <p class="small">One last question, any topic</p>
        </div>
      </header>
      <div class="paper__body">
        <h1 class="question" id="prompt" data-role="question">How many points will you bet?</h1>
        <p class="body">Bet some or all of your points on the last question. Get it right to win them, wrong to lose them.</p>
        <p class="tally"><span class="tally__num">180</span><span class="tally__label">points to play with</span></p>
        <div class="field field--number">
          <label class="field__label" for="wager">Our wager</label>
          <input class="field__input" id="wager" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="send" placeholder="0" value="100" aria-describedby="wager-foot">
          <div class="field__foot" id="wager-foot"><span>Anything from 0 to 180</span></div>
          <p class="small" id="error" role="alert" hidden><strong>Pick a whole number from 0 to 180.</strong></p>
        </div>
      </div>
    </article>
  </div>

  <div class="screen__actions">
    <button type="button" class="btn btn--primary btn--block" id="send">Lock in our wager</button>
    <p class="small muted center" id="hint">You can change it until the question opens.</p>
    <div role="status" aria-live="polite"><p class="note" id="sent" hidden>
      {svg(I_SEND, "note__icon")}
      <span id="sent-text">Wager locked in! Change it any time before the question opens.</span>
    </p></div>
  </div>
</main>

""" + nav("wager", (("wager.html?state=submitted", "Locked in"),)) + """
<script>
  // Mockup behavior: type a wager from 0 to the team's score, then lock it in. It can change until the question opens.
  const score = 180
  const input = document.getElementById('wager')
  const field = document.querySelector('.field')
  const error = document.getElementById('error')
  const send = document.getElementById('send')
  const hint = document.getElementById('hint')
  const sent = document.getElementById('sent')
  const sentText = document.getElementById('sent-text')
  const speech = document.getElementById('speech')
  const hosts = [...document.querySelectorAll('[data-host]')]
  let locked = null
  const value = () => (/^\\d+$/.test(input.value.trim()) ? Number(input.value.trim()) : null)
  function render() {
    const isLocked = locked !== null && value() === locked
    field.classList.toggle('field--submitted', isLocked)
    send.hidden = isLocked
    hint.hidden = isLocked
    sent.hidden = !isLocked
    send.disabled = input.value.trim() === ''
    send.textContent = locked === null ? 'Lock in our wager' : 'Lock in this one instead'
    sentText.textContent = `Wager locked in: ${locked} points. Change it any time before the question opens.`
    hosts.forEach((h) => (h.hidden = h.dataset.host !== (isLocked ? 'waiting' : 'asking')))
    speech.textContent = speech.dataset[isLocked ? 'waiting' : 'asking']
  }
  input.addEventListener('input', () => {
    error.hidden = true
    render()
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !send.hidden) send.click()
  })
  send.addEventListener('click', () => {
    const v = value()
    if (v === null || v > score) {
      error.hidden = false
      return
    }
    locked = v
    render()
  })
  if (new URLSearchParams(location.search).get('state') === 'submitted') locked = value()
  render()
</script>
</body>
</html>
"""
write("wager", out)
print("ok")
