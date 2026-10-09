"""Xuất báo cáo PDF từ nội dung Markdown và ảnh minh chứng trong docs."""
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak

ROOT = Path(__file__).resolve().parents[1]
FONT_DIRS = [ROOT / "scripts/fonts", Path("/usr/share/fonts/truetype/dejavu"), Path("C:/Windows/Fonts")]


def find_font(names):
    for directory in FONT_DIRS:
        for name in names:
            path = directory / name
            if path.exists():
                return path
    raise RuntimeError("Cần DejaVu Sans hoặc Arial. Đặt font vào scripts/fonts hoặc dùng font hệ thống.")


pdfmetrics.registerFont(TTFont("Body", str(find_font(["DejaVuSans.ttf", "arial.ttf"]))))
pdfmetrics.registerFont(TTFont("Bold", str(find_font(["DejaVuSans-Bold.ttf", "arialbd.ttf"]))))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold")
ink = colors.HexColor("#17352E")
green = colors.HexColor("#18664D")
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("ReportBody", fontName="Body", fontSize=9, leading=14, textColor=ink, spaceAfter=9))
styles.add(ParagraphStyle("ReportSmall", parent=styles["ReportBody"], fontSize=7.6, leading=11, spaceAfter=4))
styles.add(ParagraphStyle("ReportHeading", parent=styles["ReportBody"], fontName="Bold", fontSize=12, leading=17, textColor=green, spaceBefore=6, spaceAfter=12))
styles.add(ParagraphStyle("ReportTitle", parent=styles["ReportHeading"], fontSize=20, leading=25))
styles.add(ParagraphStyle("Caption", parent=styles["ReportSmall"], alignment=TA_CENTER))


def p(text, style="ReportBody"):
    metadata = text.startswith("**Course:**")
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = text.replace("`", "").replace("  \n", "<br/>").replace("\n", "<br/>" if metadata else " ")
    return Paragraph(text, styles[style])


text = (ROOT / "docs/Mini-Project-2-Report.md").read_text(encoding="utf-8")
sections = re.split(r"^## \d\. ", text, flags=re.M)
story = [p("MINI-PROJECT 2", "ReportTitle"), p("VKU Room Booking", "ReportHeading")]
meta = sections[0].split("\n\n", 1)[1].split("\n\n---", 1)[0]
story.append(p(meta))


def section(index):
    content = sections[index]
    title, body = content.split("\n", 1)
    return title, body.strip()


def body_blocks(body):
    return [b for b in body.split("\n\n") if b.strip()]


title, body = section(1)
story.append(p("1. " + title, "ReportHeading"))
for block in body_blocks(body):
    if block.startswith("-"):
        for line in block.splitlines():
            story.append(p(line.lstrip("- "), "ReportSmall"))
    else:
        story.append(p(block, "ReportSmall"))
title, body = section(2)
story.append(p("2. " + title, "ReportHeading"))


def markdown_table(body, widths):
    rows = []
    for line in body.splitlines():
        if not line.startswith("|") or set(line.replace("|", "").replace(":", "").replace("-", "").strip()) == set():
            continue
        rows.append([p(cell.strip(), "ReportSmall") for cell in line.strip("|").split("|")])
    table = Table(rows, colWidths=widths, hAlign="LEFT", repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF3ED")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), .4, colors.HexColor("#DDE6DE")), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return table


blocks = body_blocks(body)
story.append(markdown_table(blocks[0], [20, 115, 105, 259]))
story.append(Spacer(1, 8))
validation_blocks = blocks[1:]
story.append(PageBreak())
for block in validation_blocks:
    story.append(p(block, "ReportSmall"))
title, body = section(3)
story.append(p("3. " + title, "ReportHeading"))
for block in body_blocks(body):
    if block.startswith("|"):
        story.append(markdown_table(block, [195, 304]))
        story.append(Spacer(1, 12))
    else:
        story.append(p(block))
story.append(PageBreak())
title, body = section(4)
story.append(p("4. " + title, "ReportHeading"))
blocks = body_blocks(body)
story.append(p(blocks[0]))
figures = []
captions = ["Hình 1 - Khám phá và bộ lọc", "Hình 2 - Chọn ngày, khung giờ", "Hình 3 - Mã QR đã xác nhận", "Hình 4 - Lịch trong phiên demo"]
files = ["01-explore-web.png", "02-slots-web.png", "03-qr-web.png", "04-bookings-web.png"]
for caption, filename in zip(captions, files):
    path = ROOT / "docs/screenshots" / filename
    figures.append([Image(str(path), width=120, height=120 * 844 / 390), Spacer(1, 7), p(caption, "Caption")])
grid = Table([[figures[0], figures[1]], [figures[2], figures[3]]], colWidths=[249.5, 249.5])
grid.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("BOTTOMPADDING", (0, 0), (-1, -1), 14)]))
story.append(grid)
story.append(p(blocks[-1], "ReportSmall"))
story.append(PageBreak())
title, body = section(5)
story.append(p("5. " + title, "ReportHeading"))
for block in body_blocks(body):
    story.append(p(block))
story.append(Spacer(1, 18))
story.append(p("Kiểm tra trước khi nộp", "ReportHeading"))
for item in ["Điền URL repository public, link demo/QR sử dụng được và video 2-3 phút.", "Điền ngày nộp và thông tin điện thoại/OS/Expo Go đã chạy.", "Thay ảnh web bằng ảnh native theo yêu cầu template, bổ sung nhắc lịch thật trước 15 phút.", "Ghi kết quả đo hiệu năng nếu đã đo; không khẳng định 60 FPS khi chưa có dữ liệu.", "Xuất lại PDF, kiểm tra 2-4 trang, chữ/ảnh rõ và không còn mục chưa hoàn thiện."]:
    story.append(p("• " + item))


def footer(canvas, doc):
    canvas.setStrokeColor(colors.HexColor("#DDE6DE"))
    canvas.line(48, 40, A4[0] - 48, 40)
    canvas.setFont("Body", 8)
    canvas.setFillColor(ink)
    canvas.drawString(48, 25, "VKU | Nguyễn Đăng Đức Huy | 23IT101 | Lab 2")
    canvas.drawRightString(A4[0] - 48, 25, str(doc.page))


output = ROOT / "docs/Mini-Project-2-Report.pdf"
doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=42, bottomMargin=52, title="Mini-Project 2 - VKU Room Booking", author="Nguyễn Đăng Đức Huy")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(output)
