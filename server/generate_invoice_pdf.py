#!/usr/bin/env python3
"""
MindOS — Rechnungs-PDF-Generator
Aufruf: python3 generate_invoice_pdf.py '<json_payload>' '<output_path>'
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime
import urllib.request

# ── ReportLab imports ─────────────────────────────────────────────────────────
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

# ── Fonts ─────────────────────────────────────────────────────────────────────
FONT_DIR = Path("/tmp/mindos_fonts")
FONT_DIR.mkdir(exist_ok=True)

def download_font(name, url, path, timeout=8):
    """Download font with timeout. Returns True if available."""
    if path.exists():
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
        path.write_bytes(data)
        return True
    except Exception as e:
        sys.stderr.write(f"Font download failed ({name}): {e}\n")
        return False

# DM Sans (body) — from bunny.net CDN (fast)
dm_sans_path  = FONT_DIR / "DMSans-Regular.ttf"
dm_sans_bold  = FONT_DIR / "DMSans-Bold.ttf"

# Try multiple CDN sources for DM Sans
DM_SANS_URLS = [
    "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8Cmcqbu5-K6z.ttf",
    "https://github.com/google/fonts/raw/main/ofl/dmsans/static/DMSans-Regular.ttf",
]
DM_SANS_BOLD_URLS = [
    "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8Cmcqbu6OK4z.ttf",
    "https://github.com/google/fonts/raw/main/ofl/dmsans/static/DMSans-Bold.ttf",
]

def try_download(path, urls):
    for url in urls:
        if download_font(path.stem, url, path):
            return True
    return False

has_body = try_download(dm_sans_path, DM_SANS_URLS)
has_bold = try_download(dm_sans_bold, DM_SANS_BOLD_URLS)

BODY_FONT   = "Helvetica"
BOLD_FONT   = "Helvetica-Bold"
DISPLAY_FONT = "Helvetica-Bold"

if has_body:
    try:
        pdfmetrics.registerFont(TTFont("DMSans", str(dm_sans_path)))
        BODY_FONT = "DMSans"
    except Exception as e:
        sys.stderr.write(f"Font register failed: {e}\n")

if has_bold:
    try:
        pdfmetrics.registerFont(TTFont("DMSans-Bold", str(dm_sans_bold)))
        BOLD_FONT   = "DMSans-Bold"
        DISPLAY_FONT = "DMSans-Bold"
    except Exception as e:
        sys.stderr.write(f"Font register failed: {e}\n")

# ── Brand Colours (MindOS palette) ───────────────────────────────────────────
BG_DARK    = HexColor("#0c0a0d")
PANEL      = HexColor("#161218")
PANEL_2    = HexColor("#1c1720")
GOLD       = HexColor("#cda868")
GOLD_DIM   = HexColor("#a8884e")
TEAL       = HexColor("#6ea7a4")
SUCCESS    = HexColor("#73b58d")
WARNING    = HexColor("#c4a44a")
DANGER     = HexColor("#c47474")
TEXT       = HexColor("#f0e8dd")
MUTED      = HexColor("#a89e92")
FAINT      = HexColor("#6a6060")
LINE       = HexColor("#2a2330")

# Brand colours per sector
SECTOR_COLOR = {
    "Mindsound":      GOLD,
    "Mindconsulting": TEAL,
    "Call-Agent":     SUCCESS,
}

STATUS_COLOR = {
    "bezahlt":  SUCCESS,
    "offen":    WARNING,
    "erwartet": TEAL,
}

STATUS_LABEL = {
    "bezahlt":  "Bezahlt",
    "offen":    "Offen",
    "erwartet": "Erwartet",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def eur(n):
    return f"€ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def fmt_date(d):
    try:
        return datetime.strptime(d, "%Y-%m-%d").strftime("%d.%m.%Y")
    except Exception:
        return d

# ── Styles ────────────────────────────────────────────────────────────────────
def make_styles():
    return {
        "title": ParagraphStyle(
            "Title",
            fontName=DISPLAY_FONT, fontSize=28, leading=32,
            textColor=TEXT, spaceAfter=4,
        ),
        "eyebrow": ParagraphStyle(
            "Eyebrow",
            fontName=BOLD_FONT, fontSize=7, leading=10,
            textColor=FAINT, spaceAfter=2, spaceBefore=0,
            wordWrap="LTR",
            letterSpacing=2.5,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName=BODY_FONT, fontSize=9, leading=13,
            textColor=MUTED,
        ),
        "body_text": ParagraphStyle(
            "BodyText",
            fontName=BODY_FONT, fontSize=9.5, leading=13,
            textColor=TEXT,
        ),
        "section_head": ParagraphStyle(
            "SectionHead",
            fontName=DISPLAY_FONT, fontSize=16, leading=20,
            textColor=TEXT, spaceBefore=10, spaceAfter=6,
        ),
        "kpi_label": ParagraphStyle(
            "KpiLabel",
            fontName=BOLD_FONT, fontSize=7, leading=10,
            textColor=FAINT, wordWrap="LTR", letterSpacing=2,
        ),
        "kpi_value": ParagraphStyle(
            "KpiValue",
            fontName=BOLD_FONT, fontSize=18, leading=22,
            textColor=GOLD,
        ),
        "kpi_value_sm": ParagraphStyle(
            "KpiValueSm",
            fontName=BOLD_FONT, fontSize=13, leading=16,
            textColor=TEXT,
        ),
        "footer": ParagraphStyle(
            "Footer",
            fontName=BODY_FONT, fontSize=7.5, leading=10,
            textColor=FAINT,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            fontName=BOLD_FONT, fontSize=7.5, leading=10,
            textColor=TEXT, wordWrap="LTR", letterSpacing=1.5,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            fontName=BODY_FONT, fontSize=9, leading=12,
            textColor=TEXT,
        ),
        "table_cell_muted": ParagraphStyle(
            "TableCellMuted",
            fontName=BODY_FONT, fontSize=8.5, leading=11,
            textColor=MUTED,
        ),
        "table_cell_right": ParagraphStyle(
            "TableCellRight",
            fontName=BOLD_FONT, fontSize=9, leading=12,
            textColor=TEXT, alignment=2,  # RIGHT
        ),
        "note": ParagraphStyle(
            "Note",
            fontName=BODY_FONT, fontSize=8, leading=11,
            textColor=MUTED,
        ),
    }

# ── Header / Footer callbacks ─────────────────────────────────────────────────
W, H = A4
MARGIN = 18 * mm

def draw_page_bg(canvas_obj, doc):
    """Dark background + gold top bar + footer."""
    canvas_obj.saveState()
    # Background
    canvas_obj.setFillColor(BG_DARK)
    canvas_obj.rect(0, 0, W, H, fill=1, stroke=0)
    # Gold top accent bar
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, H - 2*mm, W, 2*mm, fill=1, stroke=0)
    # Footer line
    canvas_obj.setStrokeColor(LINE)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(MARGIN, 14*mm, W - MARGIN, 14*mm)
    # Footer text
    canvas_obj.setFont(BODY_FONT, 7.5)
    canvas_obj.setFillColor(FAINT)
    canvas_obj.drawString(MARGIN, 9*mm, "MindOS · Mindluxx")
    canvas_obj.drawRightString(W - MARGIN, 9*mm, f"Seite {doc.page}")
    canvas_obj.restoreState()

# ── Main generator ────────────────────────────────────────────────────────────
def generate(payload: dict, output_path: str):
    entries   = payload.get("entries", [])
    settings  = payload.get("settings", {})
    month     = payload.get("month", "")        # "YYYY-MM" or ""
    sectors   = payload.get("sectors", [])      # [] = all
    generated_at = payload.get("generatedAt", datetime.now().isoformat())

    # ── Filter ────────────────────────────────────────────────────────────────
    if month:
        entries = [e for e in entries if e.get("date", "").startswith(month)]
    if sectors:
        entries = [e for e in entries if e.get("business") in sectors]

    # ── Sort by date ──────────────────────────────────────────────────────────
    entries = sorted(entries, key=lambda e: e.get("date", ""))

    # ── KPI computation ───────────────────────────────────────────────────────
    paid    = [e for e in entries if e.get("status") == "bezahlt"]
    open_   = [e for e in entries if e.get("status") == "offen"]
    expect  = [e for e in entries if e.get("status") == "erwartet"]

    net_paid    = sum(e.get("net", 0)   for e in paid)
    gross_paid  = sum(e.get("gross", 0) for e in paid)
    reserve     = gross_paid - net_paid
    open_gross  = sum(e.get("gross", 0) for e in open_)
    exp_gross   = sum(e.get("gross", 0) for e in expect)
    monthly_goal = settings.get("monthlyGoal", 3000)
    goal_pct    = min(100, (net_paid / monthly_goal * 100)) if monthly_goal else 0

    # Per-sector
    sec_data = {}
    for s in ["Mindsound", "Mindconsulting", "Call-Agent"]:
        sec_entries = [e for e in paid if e.get("business") == s]
        sec_data[s] = {
            "net":   sum(e.get("net", 0)   for e in sec_entries),
            "gross": sum(e.get("gross", 0) for e in sec_entries),
            "count": len(sec_entries),
        }

    call_minutes = sum(e.get("minutes", 0) for e in entries if e.get("business") == "Call-Agent")

    # ── Doc setup ─────────────────────────────────────────────────────────────
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        title="MindOS Einnahmen-Export",
        author="Perplexity Computer",
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=22*mm, bottomMargin=22*mm,
    )

    S = make_styles()
    story = []

    # ── COVER BLOCK ───────────────────────────────────────────────────────────
    # Logo row (text-based)
    logo_data = [[
        Paragraph("MINDOS", ParagraphStyle(
            "Logo", fontName=BOLD_FONT, fontSize=8, textColor=GOLD, letterSpacing=3,
        )),
        Paragraph(
            f"Erstellt: {fmt_date(generated_at[:10])}",
            ParagraphStyle("LogoR", fontName=BODY_FONT, fontSize=8, textColor=FAINT, alignment=2),
        ),
    ]]
    logo_tbl = Table(logo_data, colWidths=[85*mm, 85*mm])
    logo_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), PANEL),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
        ("LEFTPADDING",  (0,0), (0,-1),  10),
        ("RIGHTPADDING", (-1,0),(-1,-1), 10),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(logo_tbl)
    story.append(Spacer(1, 6*mm))

    # Title
    story.append(Paragraph("EINNAHMEN", S["eyebrow"]))
    month_display = ""
    if month:
        try:
            dt = datetime.strptime(month + "-01", "%Y-%m-%d")
            month_display = dt.strftime("%B %Y")
        except Exception:
            month_display = month
    else:
        month_display = "Alle Zeiträume"

    story.append(Paragraph(month_display, S["title"]))
    story.append(Spacer(1, 1*mm))

    sector_label = " · ".join(sectors) if sectors else "Alle Bereiche"
    story.append(Paragraph(sector_label, ParagraphStyle(
        "SectorLabel", fontName=BODY_FONT, fontSize=10, textColor=MUTED, spaceAfter=6,
    )))

    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceAfter=6*mm))

    # ── KPI SUMMARY GRID ─────────────────────────────────────────────────────
    def kpi_cell(label, value, color=None):
        vc = color or GOLD
        vstyle = ParagraphStyle("KV", fontName=BOLD_FONT, fontSize=17, leading=20, textColor=vc)
        return [
            Paragraph(label.upper(), S["kpi_label"]),
            Paragraph(value, vstyle),
        ]

    kpi_data = [[
        kpi_cell("Netto bezahlt", eur(net_paid), GOLD),
        kpi_cell("Brutto bezahlt", eur(gross_paid), TEXT),
        kpi_cell("Rücklage", eur(reserve), DANGER),
    ],[
        kpi_cell("Offen", eur(open_gross), WARNING),
        kpi_cell("Erwartet", eur(exp_gross), TEAL),
        kpi_cell("Ziel-Erfüllung", f"{goal_pct:.0f}%",
                 SUCCESS if goal_pct >= 100 else (WARNING if goal_pct >= 50 else DANGER)),
    ]]

    flat_kpi = []
    for row in kpi_data:
        flat_kpi.append([
            Table([[row[0][0]], [row[0][1]]], colWidths=[54*mm]),
            Table([[row[1][0]], [row[1][1]]], colWidths=[54*mm]),
            Table([[row[2][0]], [row[2][1]]], colWidths=[54*mm]),
        ])

    kpi_tbl = Table(flat_kpi, colWidths=[57*mm, 57*mm, 57*mm])
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), PANEL),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("GRID",          (0,0), (-1,-1), 0.4, LINE),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(kpi_tbl)
    story.append(Spacer(1, 5*mm))

    # ── MARKEN-BLICK (3-column) ───────────────────────────────────────────────
    story.append(Paragraph("MARKEN-BLICK", S["eyebrow"]))
    story.append(Paragraph("Netto nach Bereich", S["section_head"]))

    brand_rows = [
        [
            Paragraph("BEREICH", S["table_header"]),
            Paragraph("NETTO", S["table_header"]),
            Paragraph("BRUTTO", S["table_header"]),
            Paragraph("EINTRÄGE", S["table_header"]),
            Paragraph("CALL-MIN", S["table_header"]),
        ]
    ]
    for s_name, s_vals in sec_data.items():
        sc = SECTOR_COLOR.get(s_name, GOLD)
        mins_s = sum(e.get("minutes", 0) for e in entries if e.get("business") == s_name)
        brand_rows.append([
            Paragraph(f'<font color="#{sc.hexval()[2:]}"><b>{s_name}</b></font>', ParagraphStyle(
                "BN", fontName=BOLD_FONT, fontSize=9.5, textColor=sc, leading=13)),
            Paragraph(eur(s_vals["net"]),   ParagraphStyle("NV", fontName=BOLD_FONT, fontSize=9.5, textColor=TEXT,  leading=13)),
            Paragraph(eur(s_vals["gross"]), ParagraphStyle("GV", fontName=BODY_FONT, fontSize=9,   textColor=MUTED, leading=13)),
            Paragraph(str(s_vals["count"]), ParagraphStyle("CV", fontName=BODY_FONT, fontSize=9,   textColor=MUTED, leading=13)),
            Paragraph(f"{mins_s:.0f}",      ParagraphStyle("MV", fontName=BODY_FONT, fontSize=9,   textColor=MUTED if s_name != "Call-Agent" else TEAL, leading=13)),
        ])

    brand_tbl = Table(brand_rows, colWidths=[48*mm, 38*mm, 38*mm, 22*mm, 25*mm])
    brand_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1, 0),   PANEL_2),
        ("BACKGROUND",    (0,1), (-1,-1),   PANEL),
        ("ROWBACKGROUNDS",(0,1), (-1,-1),   [PANEL, HexColor("#191420")]),
        ("TOPPADDING",    (0,0), (-1,-1),   8),
        ("BOTTOMPADDING", (0,0), (-1,-1),   8),
        ("LEFTPADDING",   (0,0), (-1,-1),   10),
        ("RIGHTPADDING",  (0,0), (-1,-1),   8),
        ("LINEBELOW",     (0,0), (-1, 0),   0.6, GOLD_DIM),
        ("LINEBELOW",     (0,1), (-1,-1),   0.3, LINE),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(brand_tbl)
    story.append(Spacer(1, 6*mm))

    # ── DETAIL TABLE ─────────────────────────────────────────────────────────
    story.append(Paragraph("ALLE EINTRÄGE", S["eyebrow"]))
    story.append(Paragraph(f"Detailansicht — {len(entries)} Bewegungen", S["section_head"]))

    if entries:
        header = [
            Paragraph("DATUM",    S["table_header"]),
            Paragraph("BEREICH",  S["table_header"]),
            Paragraph("STATUS",   S["table_header"]),
            Paragraph("BRUTTO",   S["table_header"]),
            Paragraph("NETTO",    S["table_header"]),
            Paragraph("NOTIZ",    S["table_header"]),
        ]
        rows = [header]

        for e in entries:
            biz     = e.get("business", "")
            status  = e.get("status", "")
            sc      = SECTOR_COLOR.get(biz, GOLD)
            stc     = STATUS_COLOR.get(status, MUTED)
            sl      = STATUS_LABEL.get(status, status)
            note    = (e.get("note") or "")[:50]

            rows.append([
                Paragraph(fmt_date(e.get("date", "")), S["table_cell_muted"]),
                Paragraph(f'<font color="#{sc.hexval()[2:]}">{biz}</font>',
                          ParagraphStyle("BF", fontName=BODY_FONT, fontSize=9, textColor=sc, leading=12)),
                Paragraph(f'<font color="#{stc.hexval()[2:]}">{sl}</font>',
                          ParagraphStyle("SF", fontName=BODY_FONT, fontSize=9, textColor=stc, leading=12)),
                Paragraph(eur(e.get("gross", 0)), S["table_cell_muted"]),
                Paragraph(eur(e.get("net",   0)), ParagraphStyle(
                    "NF", fontName=BOLD_FONT, fontSize=9.5, textColor=TEXT, leading=12)),
                Paragraph(note, S["note"]),
            ])

        # Totals row
        rows.append([
            Paragraph("GESAMT", ParagraphStyle("TL", fontName=BOLD_FONT, fontSize=8, textColor=GOLD, letterSpacing=1)),
            Paragraph("", S["table_cell"]),
            Paragraph("", S["table_cell"]),
            Paragraph(eur(sum(e.get("gross",0) for e in entries)), ParagraphStyle(
                "TG", fontName=BOLD_FONT, fontSize=9.5, textColor=TEXT, leading=12)),
            Paragraph(eur(sum(e.get("net",0) for e in entries)), ParagraphStyle(
                "TN", fontName=BOLD_FONT, fontSize=9.5, textColor=GOLD, leading=12)),
            Paragraph("", S["table_cell"]),
        ])

        detail_tbl = Table(
            rows,
            colWidths=[22*mm, 38*mm, 20*mm, 26*mm, 26*mm, 40*mm],
            repeatRows=1,
        )
        n_rows = len(rows)
        detail_tbl.setStyle(TableStyle([
            ("BACKGROUND",     (0,0),   (-1, 0),       PANEL_2),
            ("ROWBACKGROUNDS", (0,1),   (-1, n_rows-2), [PANEL, HexColor("#191420")]),
            ("BACKGROUND",     (0, n_rows-1), (-1, n_rows-1), PANEL_2),
            ("TOPPADDING",     (0,0),   (-1,-1),        7),
            ("BOTTOMPADDING",  (0,0),   (-1,-1),        7),
            ("LEFTPADDING",    (0,0),   (-1,-1),        9),
            ("RIGHTPADDING",   (0,0),   (-1,-1),        7),
            ("LINEBELOW",      (0,0),   (-1, 0),        0.6, GOLD_DIM),
            ("LINEABOVE",      (0, n_rows-1), (-1, n_rows-1), 0.6, GOLD_DIM),
            ("LINEBELOW",      (0,1),   (-1,-2),        0.3, LINE),
            ("VALIGN",         (0,0),   (-1,-1),        "MIDDLE"),
            ("ROUNDEDCORNERS", [6]),
        ]))
        story.append(detail_tbl)
    else:
        story.append(Paragraph("Keine Einträge für den gewählten Zeitraum.", S["body"]))

    story.append(Spacer(1, 5*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceAfter=3*mm))
    story.append(Paragraph(
        f"Generiert von MindOS · {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        S["footer"],
    ))

    doc.build(story, onFirstPage=draw_page_bg, onLaterPages=draw_page_bg)
    print(f"PDF gespeichert: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: generate_invoice_pdf.py '<json>|-' '<output_path>'", file=sys.stderr)
        sys.exit(1)

    json_arg = sys.argv[1]
    out_path = sys.argv[2]

    # '-' means read from stdin
    if json_arg == "-":
        payload_json = sys.stdin.read()
    else:
        # Could be a file path or raw JSON
        if os.path.isfile(json_arg):
            with open(json_arg, "r") as f:
                payload_json = f.read()
        else:
            payload_json = json_arg

    try:
        payload = json.loads(payload_json)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}", file=sys.stderr)
        sys.exit(1)

    generate(payload, out_path)
