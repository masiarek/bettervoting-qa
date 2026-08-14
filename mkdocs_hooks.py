"""Build-time fixes that would otherwise need a plugin (and a new pinned dependency).

Currently one: the top-level sidebar order.

MkDocs' auto-nav is alphabetical, which here opens the site on
`adam_bv_process/` — Adam's local start/stop runbook, the one section a visitor
following a link from an upstream issue has no use for. The reading order a
reader actually wants is the handoff, then the QA itself (cases, issues,
analysis), then the reference material, then the runbook last.

Order lives here rather than in renamed folders because folder names are in
every published URL, and those URLs are quoted from upstream GitHub issue
comments that can be edited but rarely are. Unlisted sections keep their
alphabetical slot at the bottom, so adding one needs no edit here.
"""

NAV_ORDER = [
    "HANDOFF.md",
    "test_cases",
    "issues",
    "analysis",
    "reference",
    "adam_bv_process",
]

# Sidebar labels MkDocs derives from folder names by replacing underscores and
# capitalising the first word only — which turns adam_bv_process into "Adam bv
# process". Rename the label, never the folder: folder names are in every
# published URL, and those URLs get quoted from upstream issue comments.
SECTION_TITLES = {
    "Adam bv process": "Local runbook",
}


def _key(item):
    """Position of a nav item in NAV_ORDER; unlisted items sort after, by title."""
    name = getattr(item, "title", None) or ""
    src = getattr(getattr(item, "file", None), "src_path", "") or ""
    for i, wanted in enumerate(NAV_ORDER):
        if src == wanted or src.startswith(wanted + "/") or _slug(item) == wanted:
            return (0, i, "")
    return (1, 0, name.lower())


def _slug(item):
    """The on-disk folder name behind a section, or "" for a page."""
    children = getattr(item, "children", None)
    if not children:
        return ""
    for child in children:
        src = getattr(getattr(child, "file", None), "src_path", "")
        if src and "/" in src:
            return src.split("/", 1)[0]
    return ""


def on_nav(nav, config, files):
    for item in nav.items:
        if getattr(item, "title", None) in SECTION_TITLES:
            item.title = SECTION_TITLES[item.title]
    nav.items.sort(key=_key)
    return nav
