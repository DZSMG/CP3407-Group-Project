/**
 * Prompt 4 - Demo login quick-select helper.
 * Adds a dropdown to the login modal that auto-fills credentials for demo accounts.
 * Only active when the backend /api/demo-passwords endpoint is available.
 */

const DEMO_ACCOUNTS = [
  { label: "Student (jc100001)", id: "jc100001" },
  { label: "Student (jc100002)", id: "jc100002" },
  { label: "Student (jc100050)", id: "jc100050" },
  { label: "Staff  (st0001)",    id: "st0001"   },
  { label: "Staff  (st0010)",    id: "st0010"   },
  { label: "Admin  (ad0001)",    id: "ad0001"   },
  { label: "Admin  (ad0005)",    id: "ad0005"   },
];

let demoPasswords = null;

async function loadDemoPasswords() {
  try {
    const resp = await fetch('http://localhost:3001/api/demo-passwords');
    if (resp.ok) {
      demoPasswords = await resp.json();
    }
  } catch (e) {
    // Demo passwords not available (production mode) — silently ignore
  }
}

function initDemoLoginHelper() {
  loadDemoPasswords();

  const formGrid = document.querySelector('#loginModal .form-grid');
  if (!formGrid) return;

  const demoLabel = document.createElement('label');
  demoLabel.className   = 'form-label';
  demoLabel.textContent = 'Quick Demo:';
  demoLabel.style.cssText = 'color:var(--primary,#1B3A5C);font-weight:600;font-size:.85rem;';

  const demoSelect = document.createElement('select');
  demoSelect.className  = 'glass-input';
  demoSelect.style.cssText = 'border-color:var(--primary,#1B3A5C);cursor:pointer;';
  demoSelect.innerHTML  = '<option value="">— Select demo account —</option>';

  DEMO_ACCOUNTS.forEach(({ label, id }) => {
    const opt   = document.createElement('option');
    opt.value   = id;
    opt.textContent = label;
    demoSelect.appendChild(opt);
  });

  demoSelect.onchange = function () {
    const selectedId = this.value;
    if (!selectedId) return;

    const studentIdInput  = document.getElementById('studentId');
    const passwordInput   = document.getElementById('passwordInput');

    if (studentIdInput)  studentIdInput.value  = selectedId;
    if (passwordInput && demoPasswords && demoPasswords[selectedId]) {
      passwordInput.value = demoPasswords[selectedId];
    } else if (passwordInput) {
      passwordInput.value = '';  // clear so user knows to wait for passwords to load
    }

    // Remove maxlength restriction for demo IDs (jc/st/ad format != 8-digit limit)
    if (studentIdInput) studentIdInput.removeAttribute('maxlength');
  };

  // Insert label then select at the top of the form
  formGrid.insertBefore(demoSelect, formGrid.firstChild);
  formGrid.insertBefore(demoLabel,  demoSelect);
}

document.addEventListener('DOMContentLoaded', initDemoLoginHelper);
