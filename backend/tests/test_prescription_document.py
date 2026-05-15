from __future__ import annotations

import unittest
from pathlib import Path

from app.llm.agents.prescription_document import _extract_pdf_page_texts
from app.llm.tasks import is_parse_weak, run_prescription_document_agent


class TestPrescriptionDocumentFixture(unittest.TestCase):
    def test_root_ayurvedic_prescription_pdf_extracts_structured_fields(self) -> None:
        pdf = Path(__file__).resolve().parents[2] / "Sri_Dhanvantari_Ayurvedic_Prescription.pdf"
        data = pdf.read_bytes()

        page_texts = _extract_pdf_page_texts(data)
        self.assertGreaterEqual(len(page_texts), 2)
        self.assertTrue(all(text.strip() for text in page_texts))

        parsed = run_prescription_document_agent(pdf.name, "application/pdf", data)
        self.assertEqual(parsed["provenance"], "page_extract")
        self.assertFalse(is_parse_weak(parsed))
        self.assertEqual(parsed["doctor"], "Dr. V. K. Sharma, B.A.M.S., M.D. (Ayu)")
        self.assertEqual(parsed["date"], "15-May-2026")

        medication_names = [item["name"] for item in parsed["medications"]]
        self.assertIn("Mahayogaraj Guggulu", medication_names)
        self.assertIn("Mahanarayan Taila (Oil)", medication_names)
        self.assertIn("Shirashooladi Vajra Ras", medication_names)

        flat_text = parsed["flat_text"]
        self.assertIn("Prescription / document upload:", flat_text)
        self.assertIn("Medication: Mahayogaraj Guggulu", flat_text)
        self.assertIn("2 Tablets, twice a day (BD). After food.", flat_text)
        self.assertIn("Medication: Mahanarayan Taila (Oil)", flat_text)
        self.assertIn("Gentle external application", flat_text)
        self.assertIn("Medication: Shirashooladi Vajra Ras", flat_text)
        self.assertIn("1 Tablet, twice a day (BD). After food.", flat_text)


if __name__ == "__main__":
    unittest.main()
