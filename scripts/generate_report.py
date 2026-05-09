import os
import json
from datetime import datetime
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import LETTER

# Folder containing JSON files
RESULTS_FOLDER = "results"
OUTPUT_PDF = "scan_report.pdf"


def get_latest_json_file(folder):
    files = [
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if f.endswith(".json")
    ]
    if not files:
        raise FileNotFoundError("No JSON files found in results folder.")
    
    latest_file = max(files, key=os.path.getmtime)
    return latest_file


def load_json(filepath):
    with open(filepath, "r") as f:
        return json.load(f)


def format_date(date_str):
    try:
        return datetime.fromisoformat(date_str).strftime("%B %d, %Y")
    except:
        return date_str


def generate_pdf(data, output_path):
    doc = SimpleDocTemplate(output_path, pagesize=LETTER)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        name="TitleStyle",
        parent=styles["Title"],
        fontSize=20,
        alignment=1,  # center
        spaceAfter=20
    )

    section_style = ParagraphStyle(
        name="SectionStyle",
        parent=styles["Heading2"],
        spaceAfter=10
    )

    normal_style = styles["Normal"]

    elements = []

    # Title
    elements.append(Paragraph("NEW HOPE LIFESCAN", title_style))
    elements.append(Spacer(1, 10))

    # Report data table
    report_data = [
        ["Field", "Value"],
        ["Scan ID", data.get("scan_id")],
        ["Case ID", data.get("case_id")],
        ["Patient MRN", data.get("patient_mrn")],
        ["Patient Name", data.get("patient_name")],
        ["Patient DOB", format_date(data.get("patient_dob"))],
        ["Body Part", data.get("body_part")],
        ["Report Type", data.get("report_type")],
        ["Pre-read Physician", data.get("pre_read_physician")],
        ["Pre-read Date", format_date(data.get("pre_read_date"))],
        ["Final-read Physician", data.get("final_read_physician")],
        ["Final-read Date", format_date(data.get("final_read_date"))],
        ["AI Assisted", str(data.get("ai_assisted"))],
        ["Delivery Status", data.get("delivery_status")],
    ]

    table = Table(report_data, colWidths=[180, 320])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 20))

    # Findings Section
    elements.append(Paragraph("Findings", section_style))
    elements.append(Paragraph(data.get("report_findings_text", ""), normal_style))
    elements.append(Spacer(1, 20))

    # Impression Section
    elements.append(Paragraph("Impression", section_style))
    elements.append(Paragraph(data.get("report_impression_text", ""), normal_style))

    doc.build(elements)


def main():
    try:
        latest_file = get_latest_json_file(RESULTS_FOLDER)
        print(f"Using latest file: {latest_file}")

        data = load_json(latest_file)

        generate_pdf(data, OUTPUT_PDF)

        print(f"PDF report generated: {OUTPUT_PDF}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()