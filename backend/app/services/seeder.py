"""
Seed the database from the iSAQB upstream XML files on GitHub.

Schema (namespace https://www.isaqb.org/ns/exam/foundation/v1):

Pick question (one file = one root <pickQuestion> element):
  <pickQuestion id="Q-20-04-01" points="1">
    <refersToLgs><lg lg="04-02" .../></refersToLgs>
    <stem><text>...</text><text>...</text></stem>   ← multilingual, first = DE
    <pickOptions>
      <option correct="correct">          ← absent means wrong
        <text>...</text>
        <explanation>...</explanation>    ← optional
      </option>
    </pickOptions>
    <explanation>...</explanation>
  </pickQuestion>

Category question (one file = one root <categoryQuestion> element):
  <categoryQuestion id="Q-17-13-02">
    <refersToLgs><lg lg="04-02" .../></refersToLgs>
    <stem><text>...</text></stem>
    <categoryStatements>
      <categories>
        <category label="a"><text>Geeignet</text><text>appropriate</text></category>
        <category label="b"><text>Nicht geeignet</text></category>
      </categories>
      <statements>
        <statement correctCategory="a" identifier="A">
          <text>...</text><text>...</text>   ← multilingual, first = DE
        </statement>
      </statements>
    </categoryStatements>
    <explanation>...</explanation>
  </categoryQuestion>
"""

import xml.etree.ElementTree as ET
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from ..models import Chapter, Choice, Question

NS = "https://www.isaqb.org/ns/exam/foundation/v1"

GITHUB_API = (
    "https://api.github.com/repos/isaqb-org/foundation-exam-questions"
    "/contents/mock/questions"
)
GITHUB_RAW = (
    "https://raw.githubusercontent.com/isaqb-org/foundation-exam-questions"
    "/main/mock/questions"
)

# 2025.1 curriculum chapter structure
CPSA_CHAPTERS = [
    ("LG-01", "Basic Concepts of Software Architecture"),
    ("LG-02", "Requirements and Constraints"),
    ("LG-03", "Design and Development of Software Architectures"),
    ("LG-04", "Specification and Communication of Software Architectures"),
    ("LG-05", "Analysis and Assessment of Software Architectures"),
    ("LG-06", "Examples of Software Architectures"),  # R3 only — not exam-weighted
    ("LG-GEN", "General / Cross-cutting"),
]

# GitHub XML files use old curriculum LG codes — map them to 2025.1 chapters
# Old 01→Basic, 02→Design, 03→Specification, 04→Quality, 05→Examples
_LG_PREFIX_MAP = {
    "01": "LG-01", "1": "LG-01",   # Basic Concepts (unchanged)
    "02": "LG-03", "2": "LG-03",   # Old Design → new LG-03 Design
    "03": "LG-04", "3": "LG-04",   # Old Specification → new LG-04 Specification
    "04": "LG-05", "4": "LG-05",   # Old Quality → new LG-05 Analysis & Assessment
    "05": "LG-06", "5": "LG-06",   # Old Examples → new LG-06 Examples
}


def _tag(local: str) -> str:
    return f"{{{NS}}}{local}"


def _all_texts(elem: ET.Element, local: str) -> list[str]:
    """Return all non-empty texts of children with the given local name (multilingual)."""
    return [
        c.text.strip()
        for c in elem
        if c.tag == _tag(local) and c.text and c.text.strip()
    ]


def _first_text(elem: ET.Element, local: str) -> str:
    texts = _all_texts(elem, local)
    return texts[0] if texts else ""


def _second_text(elem: ET.Element, local: str) -> Optional[str]:
    """Return English (index 1) text, or None if not present."""
    texts = _all_texts(elem, local)
    return texts[1] if len(texts) > 1 else None


def _stem_text(root: ET.Element, index: int = 0) -> str:
    stem = root.find(_tag("stem"))
    if stem is None:
        return ""
    texts = _all_texts(stem, "text")
    if not texts:
        return ""
    return texts[index] if index < len(texts) else texts[0]


def _lg_to_chapter_code(lg_attr: str) -> str:
    """'04-02' → 'LG-04', '3-2' → 'LG-03'"""
    prefix = lg_attr.split("-")[0]
    return _LG_PREFIX_MAP.get(prefix, "LG-GEN")


def _infer_chapter_code(root: ET.Element) -> str:
    lgs_el = root.find(_tag("refersToLgs"))
    if lgs_el is not None:
        for lg_el in lgs_el.findall(_tag("lg")):
            lg_attr = lg_el.get("lg", "")
            if lg_attr:
                return _lg_to_chapter_code(lg_attr)
    return "LG-GEN"


def ensure_chapters(db: Session) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for lg_code, name in CPSA_CHAPTERS:
        chapter = db.query(Chapter).filter(Chapter.learning_goal_code == lg_code).first()
        if not chapter:
            chapter = Chapter(name=name, learning_goal_code=lg_code)
            db.add(chapter)
            db.flush()
        mapping[lg_code] = chapter.id
    return mapping


def parse_pick_question(
    root: ET.Element, source_file: str, chapter_map: dict[str, int]
) -> Optional[tuple[Question, list[Choice]]]:
    qid = root.get("id", "").strip()
    text = _stem_text(root)
    if not qid or not text:
        return None

    chapter_code = _infer_chapter_code(root)
    chapter_id = chapter_map.get(chapter_code, chapter_map["LG-GEN"])

    text_en = _stem_text(root, index=1) or None

    expl_el = root.find(_tag("explanation"))
    explanation = expl_el.text.strip() if expl_el is not None and expl_el.text else None

    q = Question(
        id=qid,
        chapter_id=chapter_id,
        type="pick",
        text=text,
        text_en=text_en,
        explanation=explanation,
        source_file=source_file,
    )

    choices: list[Choice] = []
    pick_opts = root.find(_tag("pickOptions"))
    if pick_opts is not None:
        for i, opt in enumerate(pick_opts.findall(_tag("option"))):
            is_correct = opt.get("correct") == "correct"
            opt_text = _first_text(opt, "text")
            opt_text_en = _second_text(opt, "text")
            opt_expl_el = opt.find(_tag("explanation"))
            opt_expl = opt_expl_el.text.strip() if opt_expl_el is not None and opt_expl_el.text else None
            if opt_text:
                choices.append(Choice(
                    question_id=qid,
                    text=opt_text,
                    text_en=opt_text_en,
                    is_correct=is_correct,
                    explanation=opt_expl,
                    display_order=i,
                ))

    if not choices:
        return None
    return q, choices


def parse_category_question(
    root: ET.Element, source_file: str, chapter_map: dict[str, int]
) -> Optional[tuple[Question, list[Choice]]]:
    qid = root.get("id", "").strip()
    text = _stem_text(root)
    if not qid or not text:
        return None

    chapter_code = _infer_chapter_code(root)
    chapter_id = chapter_map.get(chapter_code, chapter_map["LG-GEN"])

    text_en = _stem_text(root, index=1) or None

    expl_el = root.find(_tag("explanation"))
    explanation = expl_el.text.strip() if expl_el is not None and expl_el.text else None

    q = Question(
        id=qid,
        chapter_id=chapter_id,
        type="category",
        text=text,
        text_en=text_en,
        explanation=explanation,
        source_file=source_file,
    )

    cat_stmts = root.find(_tag("categoryStatements"))
    if cat_stmts is None:
        return None

    # Build label → (DE name, EN name) map from <categories>
    cats_el = cat_stmts.find(_tag("categories"))
    label_to_de: dict[str, str] = {}
    label_to_en: dict[str, str] = {}
    if cats_el is not None:
        for cat in cats_el.findall(_tag("category")):
            label = cat.get("label", "")
            texts = _all_texts(cat, "text")
            label_to_de[label] = texts[0] if texts else label
            label_to_en[label] = texts[1] if len(texts) > 1 else (texts[0] if texts else label)

    stmts_el = cat_stmts.find(_tag("statements"))
    if stmts_el is None:
        return None

    choices: list[Choice] = []
    for i, stmt in enumerate(stmts_el.findall(_tag("statement"))):
        correct_cat_label = stmt.get("correctCategory", "")
        stmt_text = _first_text(stmt, "text")
        stmt_text_en = _second_text(stmt, "text")
        if stmt_text:
            choices.append(Choice(
                question_id=qid,
                text=stmt_text,
                text_en=stmt_text_en,
                is_correct=True,
                category_label=label_to_de.get(correct_cat_label, correct_cat_label),
                category_label_en=label_to_en.get(correct_cat_label, correct_cat_label),
                display_order=i,
            ))

    if not choices:
        return None

    return q, choices


def parse_xml(
    xml_text: str, source_file: str, chapter_map: dict[str, int]
) -> list[tuple[Question, list[Choice]]]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    local = root.tag.split("}")[-1] if "}" in root.tag else root.tag

    if local == "pickQuestion":
        parsed = parse_pick_question(root, source_file, chapter_map)
        return [parsed] if parsed else []
    elif local == "categoryQuestion":
        parsed = parse_category_question(root, source_file, chapter_map)
        return [parsed] if parsed else []
    else:
        # Wrapper element — search inside
        results = []
        for elem in root.findall(f".//{_tag('pickQuestion')}"):
            p = parse_pick_question(elem, source_file, chapter_map)
            if p:
                results.append(p)
        for elem in root.findall(f".//{_tag('categoryQuestion')}"):
            p = parse_category_question(elem, source_file, chapter_map)
            if p:
                results.append(p)
        return results


async def fetch_file_list() -> list[str]:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(GITHUB_API, headers={"Accept": "application/vnd.github.v3+json"})
        r.raise_for_status()
        return [f["name"] for f in r.json() if f["name"].endswith(".xml")]


async def fetch_xml_file(filename: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{GITHUB_RAW}/{filename}")
        r.raise_for_status()
        return r.text


def seed_bundled(db: Session) -> dict:
    """Seed pre-generated questions bundled with the application."""
    from ..seeds.bundled_questions import BUNDLED_QUESTIONS

    chapter_map = ensure_chapters(db)
    db.commit()

    seeded = 0
    skipped = 0
    errors: list[str] = []

    for q_data in BUNDLED_QUESTIONS:
        qid = q_data["id"]
        try:
            if db.query(Question).filter(Question.id == qid).first():
                skipped += 1
                continue

            lg_code = q_data.get("chapter_lg", "LG-GEN")
            chapter_id = chapter_map.get(lg_code, chapter_map.get("LG-GEN"))
            if chapter_id is None:
                errors.append(f"{qid}: chapter '{lg_code}' not found")
                continue

            q = Question(
                id=qid,
                chapter_id=chapter_id,
                type=q_data["type"],
                text=q_data["text"],
                text_en=q_data.get("text_en"),
                explanation=q_data.get("explanation"),
                difficulty=q_data.get("difficulty", 2),
                version="bundled",
                is_manual=False,
            )
            db.add(q)
            db.flush()

            for i, c in enumerate(q_data.get("choices", [])):
                choice = Choice(
                    question_id=qid,
                    text=c["text"],
                    text_en=c.get("text_en"),
                    is_correct=c.get("is_correct", False),
                    category_label=c.get("category_label"),
                    category_label_en=c.get("category_label_en"),
                    explanation=c.get("explanation"),
                    display_order=i,
                )
                db.add(choice)

            db.commit()
            seeded += 1
        except Exception as e:
            db.rollback()
            errors.append(f"{qid}: {e}")

    return {"seeded": seeded, "skipped": skipped, "errors": errors}


async def seed_from_github(db: Session, version: str = "current") -> dict:
    chapter_map = ensure_chapters(db)
    db.commit()

    filenames = await fetch_file_list()
    seeded = 0
    skipped = 0
    errors: list[str] = []

    for filename in filenames:
        try:
            xml_text = await fetch_xml_file(filename)
        except Exception as e:
            errors.append(f"{filename}: fetch error — {e}")
            continue

        pairs = parse_xml(xml_text, filename, chapter_map)
        if not pairs:
            errors.append(f"{filename}: no questions parsed")
            continue

        for q, choices in pairs:
            existing = db.query(Question).filter(Question.id == q.id).first()
            if existing:
                skipped += 1
                continue
            q.version = version
            db.add(q)
            db.flush()
            for c in choices:
                db.add(c)
            seeded += 1

    db.commit()
    return {"seeded": seeded, "skipped": skipped, "errors": errors}
