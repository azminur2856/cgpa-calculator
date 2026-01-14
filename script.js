let gradingScales = {};

// Initialize application and fetch data
window.onload = async () => {
  try {
    const response = await fetch("universities.json");
    gradingScales = await response.json();

    // Initial setup
    for (let i = 0; i < 4; i++) addRow();
    updateUI();
  } catch (error) {
    console.error("Error loading grading scales:", error);
  }
};

function updateUI() {
  const uniKey = document.getElementById("uniSelect").value;
  const university = gradingScales[uniKey];
  if (!university) return;

  const scale = university.scale;

  // Display grade and marks in the sidebar
  document.getElementById("gradeDisplay").innerHTML = Object.entries(scale)
    .map(
      ([g, info]) => `
            <div class="flex justify-between p-2 text-sm font-medium border-b border-slate-50 last:border-0">
                <span class="text-slate-600">${g} <span class="text-[10px] text-slate-400">(${
        info.marks
      })</span></span>
                <span class="text-teal-600">${info.point.toFixed(2)}</span>
            </div>
        `
    )
    .join("");

  // Update dropdown options in the table
  const opts = Object.keys(scale)
    .map((g) => `<option value="${g}">${g}</option>`)
    .join("");
  document
    .querySelectorAll(".grade-sel, .prev-grade-sel")
    .forEach((s) => (s.innerHTML = opts));
}

function addRow() {
  const tbody = document.getElementById("courseTable");
  const tr = document.createElement("tr");
  tr.className = "hover:bg-slate-50 transition-colors";
  tr.innerHTML = `
        <td class="px-6 py-3"><input type="text" class="c-name w-full border-0 bg-transparent focus:ring-0 text-sm" placeholder="Course Name"></td>
        <td class="px-6 py-3"><input type="number" class="c-cred w-16 border rounded-lg px-2 py-1 outline-none text-sm" placeholder="0"></td>
        <td class="px-6 py-3"><select class="grade-sel w-20 border rounded-lg px-1 py-1 text-sm bg-white"></select></td>
        <td class="px-6 py-3 text-center"><input type="checkbox" onchange="toggleRetake(this)" class="accent-teal-600"></td>
        <td class="px-6 py-3"><select class="prev-grade-sel w-20 border rounded-lg px-1 py-1 text-sm bg-slate-100" disabled></select></td>
        <td class="px-6 py-3 text-right"><button onclick="this.closest('tr').remove()" class="text-slate-300 hover:text-red-500">✕</button></td>
    `;
  tbody.appendChild(tr);

  // Ensure new row has options if data is already loaded
  if (Object.keys(gradingScales).length > 0) {
    const uniKey = document.getElementById("uniSelect").value;
    const opts = Object.keys(gradingScales[uniKey].scale)
      .map((g) => `<option value="${g}">${g}</option>`)
      .join("");
    tr.querySelectorAll(".grade-sel, .prev-grade-sel").forEach(
      (s) => (s.innerHTML = opts)
    );
  }
}

function toggleRetake(cb) {
  const sel = cb.closest("tr").querySelector(".prev-grade-sel");
  sel.disabled = !cb.checked;
  sel.classList.toggle("bg-slate-100", !cb.checked);
}

function calculate() {
  const uniKey = document.getElementById("uniSelect").value;
  const scale = gradingScales[uniKey].scale;
  let cCGPA = parseFloat(document.getElementById("currCGPA").value) || 0;
  let cCred = parseFloat(document.getElementById("currCred").value) || 0;

  let totalPts = cCGPA * cCred;
  let totalCr = cCred;
  let sPts = 0,
    sCr = 0;

  document.querySelectorAll("#courseTable tr").forEach((row) => {
    const cr = parseFloat(row.querySelector(".c-cred").value) || 0;
    const gr = row.querySelector(".grade-sel").value;
    const retake = row.querySelector('input[type="checkbox"]').checked;

    if (cr > 0) {
      sCr += cr;
      sPts += scale[gr].point * cr;
      if (retake) {
        const prev = row.querySelector(".prev-grade-sel").value;
        totalPts = totalPts - scale[prev].point * cr + scale[gr].point * cr;
      } else {
        totalPts += scale[gr].point * cr;
        totalCr += cr;
      }
    }
  });

  document.getElementById("resSGPA").innerText =
    sCr > 0 ? (sPts / sCr).toFixed(2) : "0.00";
  document.getElementById("resCGPA").innerText =
    totalCr > 0 ? (totalPts / totalCr).toFixed(2) : "0.00";
  document.getElementById("resultBox").classList.remove("hidden");
}

function resetAll() {
  if (confirm("Clear all data?")) location.reload();
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const uni =
    document.getElementById("uniSelect").options[
      document.getElementById("uniSelect").selectedIndex
    ].text;

  doc.setFontSize(22);
  doc.setTextColor(13, 148, 136);
  doc.text("CGPA Progress Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${uni} | Academic Report`, 14, 28);

  const tableData = [];
  document.querySelectorAll("#courseTable tr").forEach((row) => {
    tableData.push([
      row.querySelector(".c-name").value || "Unnamed Course",
      row.querySelector(".c-cred").value || "0",
      row.querySelector(".grade-sel").value,
      row.querySelector('input[type="checkbox"]').checked
        ? "Retake"
        : "Regular",
    ]);
  });

  doc.autoTable({
    head: [["Course Name", "Credits", "Grade", "Type"]],
    body: tableData,
    startY: 40,
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136] },
  });

  const y = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(
    `Semester GPA: ${document.getElementById("resSGPA").innerText}`,
    14,
    y
  );
  doc.text(
    `Updated CGPA: ${document.getElementById("resCGPA").innerText}`,
    14,
    y + 8
  );

  doc.save("Semester_Report.pdf");
}
