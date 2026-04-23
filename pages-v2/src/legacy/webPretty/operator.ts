import { fetchJson } from '../../api.js';
import type { StoredData } from '../../types.js';
import { BASE_URL, gameTargets, launcherWebApiLang } from '../../utils/constants.js';

export async function renderOperator(container: HTMLElement) {
  const outerCard = document.createElement('div');
  outerCard.className = 'card mb-3';

  // Header
  const header = document.createElement('div');
  header.className = 'card-header d-flex justify-content-between align-items-center';
  header.style.cursor = 'pointer';
  header.setAttribute('data-bs-toggle', 'collapse');
  header.setAttribute('data-bs-target', '#collapseOperator');
  header.innerHTML = '<h3 class="h4 mb-0">Operator</h3>';
  outerCard.appendChild(header);

  // Collapse
  const collapseDiv = document.createElement('div');
  collapseDiv.id = 'collapseOperator';
  collapseDiv.className = 'collapse show';
  outerCard.appendChild(collapseDiv);

  const body = document.createElement('div');
  body.className = 'card-body';
  collapseDiv.appendChild(body);

  // ======================
  // 🔹 Controls (เมนู)
  // ======================
  const controls = document.createElement('div');
  controls.className = 'row g-3 mb-4';

  // Target
  const targetCol = document.createElement('div');
  targetCol.className = 'col-md-6';
  targetCol.innerHTML = '<label class="form-label fw-bold">Target</label>';

  const targetSelect = document.createElement('select');
  targetSelect.className = 'form-select';

  gameTargets.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = i.toString();
    opt.textContent = `${t.region === 'cn' ? 'China' : 'Global'} - ${t.name}`;
    targetSelect.appendChild(opt);
  });

  targetCol.appendChild(targetSelect);

  // Language
  const langCol = document.createElement('div');
  langCol.className = 'col-md-6';
  langCol.innerHTML = '<label class="form-label fw-bold">Language</label>';

  const langSelect = document.createElement('select');
  langSelect.className = 'form-select';
  langCol.appendChild(langSelect);

  controls.appendChild(targetCol);
  controls.appendChild(langCol);
  body.appendChild(controls);

  // Content
  const content = document.createElement('div');
  body.appendChild(content);

  // ======================
  // 🔹 Logic
  // ======================
  const updateLanguages = () => {
    const target = gameTargets[parseInt(targetSelect.value)];
    const langs = launcherWebApiLang[target.region] || [];
    const defaultLang = target.region === 'os' ? 'en-us' : 'zh-cn';

    langSelect.innerHTML = '';

    langs.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = lang;
      if (lang === defaultLang) opt.selected = true;
      langSelect.appendChild(opt);
    });

    langCol.style.display = langs.length <= 1 ? 'none' : 'block';
  };

  const render = async () => {
    const target = gameTargets[parseInt(targetSelect.value)];
    const lang = langSelect.value;

    if (!lang) {
      content.innerHTML = '<div class="text-muted">No language</div>';
      return;
    }

    const url = `https://raw.githubusercontent.com/horoyoi-san/Endfield/refs/heads/main/output/characters.json`;

    content.innerHTML = '<div class="text-muted">Loading...</div>';

    try {
      const data = await fetchJson<StoredData<any>[]>(url);

      if (!data || data.length === 0) {
        content.innerHTML = '<div class="text-muted">No data</div>';
        return;
      }

      const latest = data[data.length - 1];

      content.innerHTML = '';

      const grid = document.createElement('div');
      grid.className = 'row row-cols-2 row-cols-md-4 row-cols-lg-6 g-2';

      Object.entries(latest.rsp).forEach(([name, imgUrl]) => {
        const col = document.createElement('div');
        col.className = 'col';

        col.innerHTML = `
          <div class="card border-0 shadow-sm h-100">
            <img src="${imgUrl}" class="card-img-top" style="object-fit:cover;">
            <div class="card-body p-1 text-center" style="font-size:0.7rem;">
              ${name}
            </div>
          </div>
        `;

        grid.appendChild(col);
      });

      content.appendChild(grid);
    } catch (e) {
      console.error(e);
      content.innerHTML = '<div class="text-danger">Error loading</div>';
    }
  };

  // Events
  targetSelect.addEventListener('change', () => {
    updateLanguages();
    render();
  });

  langSelect.addEventListener('change', render);

  // Init
  updateLanguages();
  render();

  container.appendChild(outerCard);
}
