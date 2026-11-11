import re, subprocess, sys, pathlib, markdown

docs = pathlib.Path(sys.argv[1])
out_html = pathlib.Path(sys.argv[2])
out_pdf = pathlib.Path(sys.argv[3])

def read(name):
    return (docs / name).read_text(encoding="utf-8")

ideas = read("IDEAS.md")
ideas = ideas[ideas.index("## Pick: Blind deal"):]

sections = [
    ("TEAM-HANDOFF.md", read("TEAM-HANDOFF.md")),
    ("Build brief", read("BUILD-BRIEF.md")),
    ("The idea", "# The idea: Blind deal\n\n" + ideas),
    ("PRD", read("PRD.md")),
    ("Architecture", read("ARCHITECTURE.md")),
    ("Team", read("TEAM.md")),
    ("Contributing", read("CONTRIBUTING.md")),
    ("Plan", read("plans/IMPLEMENTATION.md")),
    ("Design brief", read("DESIGN-BRIEF.md")),
    ("Identity", read("IDENTITY.md")),
    ("Decisions", read("DECISIONS.md")),
    ("Endgame", read("ENDGAME.md")),
    ("Recon", read("research/RECON.md")),
    ("Competitors", read("research/COMPETITORS.md")),
    ("Assumptions", read("ASSUMPTIONS.md")),
]

md = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists"])
body = "".join(f'<section class="doc">{md.reset().convert(text)}</section>' for _, text in sections)

css = """
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body { font-family: 'Familjen Grotesk', 'Segoe UI', sans-serif; color: #10183a; font-size: 10.5pt; line-height: 1.45; margin: 0; }
h1, h2, h3, h4 { font-family: 'Big Shoulders Display', 'Arial Narrow', sans-serif; color: #2E4FA3; line-height: 1; margin: 1.2em 0 .4em; break-after: avoid; }
h1 { font-size: 34pt; font-weight: 900; text-transform: uppercase; margin-top: 0; border-bottom: 6px solid #F2D640; padding-bottom: 6px; }
h2 { font-size: 19pt; font-weight: 900; }
h3 { font-size: 14pt; font-weight: 800; }
h4 { font-size: 12pt; font-weight: 800; }
.doc { break-before: page; }
.doc:first-child { break-before: auto; }
table { border-collapse: collapse; width: 100%; margin: .6em 0 1em; font-size: 9pt; break-inside: auto; }
tr { break-inside: avoid; }
th { background: #2E4FA3; color: #F4F6FB; text-align: left; font-weight: 700; }
th, td { border: 1px solid #C9D4F0; padding: 4px 6px; vertical-align: top; }
tr:nth-child(even) td { background: #F1F4FB; }
code { font-family: Consolas, monospace; font-size: 8.8pt; background: #EEF1F9; padding: 0 3px; border-radius: 2px; overflow-wrap: anywhere; }
pre { background: #EEF1F9; padding: 8px 10px; border-left: 4px solid #2E4FA3; font-size: 8.3pt; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
pre code { background: none; padding: 0; }
blockquote { margin: .6em 0; padding: 8px 12px; background: #FDF7D6; border-left: 4px solid #F2D640; }
a { color: #2E4FA3; overflow-wrap: anywhere; }
hr { border: 0; border-top: 2px solid #C9D4F0; margin: 1.4em 0; }
li { margin: .15em 0; }
"""
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Blind deal: team handoff</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Familjen+Grotesk:wght@400;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{body}</body></html>"""
out_html.write_text(html, encoding="utf-8")

edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                "--virtual-time-budget=8000", f"--print-to-pdf={out_pdf}", out_html.resolve().as_uri()],
               check=True, timeout=120)
print("written", out_pdf)
