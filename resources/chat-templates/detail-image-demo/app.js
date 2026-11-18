'use strict';

const templates = {
  overview: { title: '商品概览', layout: [0.08, 0.26, 0.84, 0.66, 0.08, 0.08, 0.84, 0.16] },
  benefits: { title: '核心卖点', layout: [0.08, 0.08, 0.84, 0.55, 0.08, 0.69, 0.84, 0.23] },
  detail: { title: '细节展示', layout: [0.39, 0.08, 0.53, 0.84, 0.08, 0.11, 0.27, 0.75] },
  scene: { title: '使用场景', layout: [0.08, 0.33, 0.84, 0.59, 0.08, 0.08, 0.84, 0.22] },
  specs: { title: '规格参数', layout: [0.08, 0.08, 0.45, 0.84, 0.57, 0.12, 0.35, 0.76] },
  custom: { title: '自定义', layout: [0.08, 0.31, 0.84, 0.61, 0.08, 0.08, 0.84, 0.20] }
};
const ratios = ['1:1', '3:4', '4:5', '9:16', '16:9'];
const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const candidateNames = ['漫射柔光', '侧向轮廓', '聚光对比'];
const displayFont = '"Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif';
const $ = id => document.getElementById(id);

let config;
let db;
let busy = false;
let step = 0;
let results = [];
const previewUrls = {};
const draft = {
  product: null,
  reference: null,
  source: 'prompt',
  prompt: '',
  candidatePrompt: '',
  selected: null,
  count: 3,
  settings: Array.from({ length: 8 }, (_, index) => ({
    template: ['overview', 'benefits', 'detail'][index] ?? 'custom',
    copy: '',
    ratio: '3:4'
  }))
};

function status(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.toggleAttribute('data-error', error);
}

function openDrafts() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('product-detail-image-demo', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readDraft() {
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get(config.id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveDraft() {
  if (!db) {
    return;
  }
  try {
    const transaction = db.transaction('drafts', 'readwrite');
    transaction.onabort = () => status('app-status', '当前浏览器无法保存草稿。建议完成下载后再刷新。', true);
    transaction.objectStore('drafts').put(draft, config.id);
  } catch {
    status('app-status', '当前浏览器无法保存草稿。建议完成下载后再刷新。', true);
  }
}

function canvas(width, height) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return element;
}

function png(element) {
  return new Promise((resolve, reject) => {
    element.toBlob(blob => blob ? resolve(blob) : reject(new Error('无法编码 PNG。')), 'image/png');
  });
}

async function prepareImage(blob, original) {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (config.version === 1 && longest > 4096) {
      throw new Error('图片上传失败。原始尺寸为 ' + width + ' × ' + height + '，当前支持的最长边为 4096 像素。');
    }
    const image = { blob, width, height, original: original ?? { width, height } };
    if (config.version === 2 && longest > 2048) {
      const scale = 2048 / longest;
      const resized = canvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
      const context = resized.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, resized.width, resized.height);
      return { ...image, width: resized.width, height: resized.height, blob: await png(resized) };
    }
    return image;
  } finally {
    bitmap.close();
  }
}

function showImage(kind) {
  if (previewUrls[kind]) {
    URL.revokeObjectURL(previewUrls[kind]);
  }
  const image = draft[kind];
  const preview = $(kind + '-preview');
  preview.hidden = !image;
  const label = document.querySelector('label[for="' + kind + '-file"]');
  label.textContent = (image ? '更换' : '选择') + (kind === 'product' ? '白底图' : '参考图');
  if (!image) {
    preview.removeAttribute('src');
    return;
  }
  previewUrls[kind] = URL.createObjectURL(image.blob);
  preview.src = previewUrls[kind];
  const before = image.original.width + ' × ' + image.original.height;
  const after = image.width + ' × ' + image.height;
  status(kind + '-status', before === after ? '已上传 ' + after + ' 像素' : '已等比缩放 ' + before + ' → ' + after + ' 像素');
}

function selectedStyle() {
  return draft.source === 'prompt' ? draft.selected !== null : Boolean(draft.reference);
}

function showStep(next, focus = true) {
  if (next === step && focus) {
    return;
  }
  step = next;
  const panels = [...document.querySelectorAll('[data-panel]')];
  panels.forEach((panel, index) => panel.hidden = index !== step);
  updateControls();
  if (focus) {
    panels[step].querySelector('h2').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function updateControls() {
  const hasProduct = Boolean(draft.product);
  const canArrange = hasProduct && selectedStyle();
  const available = [true, hasProduct, canArrange, results.length > 0];
  for (const button of document.querySelectorAll('[data-step], [data-next]')) {
    const target = Number(button.dataset.step ?? button.dataset.next);
    button.disabled = busy || !available[target];
    if (button.hasAttribute('data-step')) {
      if (target === step) {
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }
    }
  }
  $('product-fields').disabled = busy;
  $('style-fields').disabled = busy || !hasProduct;
  $('template-fields').disabled = busy || !canArrange;
  $('product-actions').hidden = !hasProduct;
  $('prompt-panel').hidden = draft.source !== 'prompt';
  $('reference-panel').hidden = draft.source !== 'reference';
  document.querySelector('input[name="style-source"][value="' + draft.source + '"]').checked = true;
}

function clearResults() {
  for (const result of results) {
    URL.revokeObjectURL(result.url);
  }
  results = [];
  $('result-list').replaceChildren();
  status('output-status', '');
  status('generate-status', '');
  updateControls();
}

async function upload(kind, file) {
  if (!file || busy) {
    return;
  }
  busy = true;
  updateControls();
  try {
    if (!imageTypes.includes(file.type)) {
      throw new Error('请选择 PNG、JPEG 或 WebP 格式的图片。');
    }
    const image = await prepareImage(file);
    draft[kind] = image;
    clearResults();
    showImage(kind);
    status('style-status', '');
    saveDraft();
    if (kind === 'product' && draft.candidatePrompt) {
      await renderCandidates();
    }
  } catch (error) {
    status(kind + '-status', error instanceof Error ? error.message : '无法读取此图片。', true);
  } finally {
    busy = false;
    updateControls();
  }
}

function promptHue(prompt) {
  const colors = [
    [/蓝|冷色|blue|cool/i, 210],
    [/绿|自然|植物|green|nature/i, 148],
    [/金|暖|黄|橙|gold|warm/i, 36],
    [/粉|玫瑰|pink/i, 340],
    [/紫|purple/i, 276],
    [/红|red/i, 2]
  ];
  const known = colors.find(([pattern]) => pattern.test(prompt));
  return known?.[1] ?? Array.from(prompt).reduce((value, char) => (value * 31 + char.codePointAt(0)) % 360, 0);
}

function promptPalette(prompt, index) {
  if (/黑曜|黑底|深色|黑色|obsidian|dark|black/i.test(prompt)) {
    return {
      light: ['#45484f', '#343b44', '#45464b'][index],
      deep: ['#15171a', '#111518', '#0e1012'][index],
      ink: '#f5f3ed'
    };
  }
  if (/月白|珍珠|奶油|柔白|pearl|ivory/i.test(prompt)) {
    return {
      light: ['#fcfaf4', '#f6f5ef', '#eeeae4'][index],
      deep: ['#e7e1d6', '#dcdcd6', '#cccbc8'][index],
      ink: '#282725'
    };
  }
  if (/银灰|冷银|金属|银饰|银戒|silver|metallic/i.test(prompt)) {
    return {
      light: ['#f0f2f3', '#e3e8eb', '#d0d6db'][index],
      deep: ['#ccd0d3', '#b0bbc4', '#9aa5af'][index],
      ink: '#222a30'
    };
  }
  const hue = promptHue(prompt);
  const shift = (hue + [0, 18, 342][index]) % 360;
  return {
    light: 'hsl(' + shift + ' 23% ' + [96, 93, 87][index] + '%)',
    deep: 'hsl(' + shift + ' 20% ' + [86, 79, 68][index] + '%)',
    ink: 'hsl(' + shift + ' 17% 15%)'
  };
}

async function referencePalette(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const sample = canvas(24, 24).getContext('2d');
    sample.drawImage(bitmap, 0, 0, 24, 24);
    const pixels = sample.getImageData(0, 0, 24, 24).data;
    const channels = [0, 0, 0];
    let weight = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const [r, g, b, a] = pixels.subarray(offset, offset + 4);
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const contribution = (a / 255) * (1 + chroma);
      channels[0] += r * contribution;
      channels[1] += g * contribution;
      channels[2] += b * contribution;
      weight += contribution;
    }
    const color = channels.map(value => Math.round(value / weight || 0)).join(' ');
    function tint(amount) {
      return 'color-mix(in srgb, rgb(' + color + '), white ' + amount + '%)';
    }
    return { light: tint(80), deep: tint(53), ink: '#18212a' };
  } finally {
    bitmap.close();
  }
}

function drawContained(context, bitmap, x, y, width, height) {
  const scale = Math.min(width / bitmap.width, height / bitmap.height);
  const naturalWidth = bitmap.width * scale;
  const naturalHeight = bitmap.height * scale;
  context.drawImage(bitmap, x + (width - naturalWidth) / 2, y + (height - naturalHeight) / 2, naturalWidth, naturalHeight);
}

function drawBackground(context, width, height, palette, lightDirection = 0) {
  const spot = width * [.42, .68, .34][lightDirection];
  const spread = Math.max(width, height) * [.8, .82, .58][lightDirection];
  const gradient = context.createRadialGradient(spot, height * .35, 0, spot, height * .35, spread);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(1, palette.deep);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function productNeedsBackdrop(bitmap) {
  const sample = canvas(2, 2).getContext('2d');
  sample.drawImage(bitmap, 0, 0, 2, 2);
  const pixels = sample.getImageData(0, 0, 2, 2).data;
  return [3, 7, 11, 15].every(index => pixels[index] > 245);
}

function drawProduct(context, bitmap, x, y, width, height, backdrop) {
  const inset = Math.min(width, height) * .055;
  context.save();
  if (backdrop) {
    context.fillStyle = '#faf9f6';
    context.fillRect(x, y, width, height);
    context.strokeStyle = '#2222221e';
    context.strokeRect(x + .5, y + .5, width - 1, height - 1);
  } else {
    context.shadowColor = '#141a2260';
    context.shadowBlur = inset;
    context.shadowOffsetY = inset * .72;
  }
  drawContained(context, bitmap, x + inset, y + inset, width - inset * 2, height - inset * 2);
  context.restore();
}

function refreshCandidateSelection() {
  for (const [index, button] of Array.from($('style-candidates').children).entries()) {
    button.setAttribute('aria-pressed', String(index === draft.selected));
  }
}

async function renderCandidates() {
  if (!draft.product || !draft.candidatePrompt) {
    return;
  }
  const bitmap = await createImageBitmap(draft.product.blob);
  try {
    const backdrop = productNeedsBackdrop(bitmap);
    const cards = candidateNames.map((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'candidate';
      const image = canvas(424, 252);
      const context = image.getContext('2d');
      const palette = promptPalette(draft.candidatePrompt, index);
      drawBackground(context, image.width, image.height, palette, index);
      drawProduct(context, bitmap, [50, 102, 28][index], 19, 300, 214, backdrop);
      const caption = document.createElement('span');
      caption.className = 'candidate-name';
      caption.textContent = name;
      button.append(image, caption);
      button.addEventListener('click', () => {
        draft.selected = index;
        refreshCandidateSelection();
        clearResults();
        status('style-status', '已选用「' + name + '」风格。');
        saveDraft();
        updateControls();
      });
      return button;
    });
    $('style-candidates').replaceChildren(...cards);
    refreshCandidateSelection();
  } finally {
    bitmap.close();
  }
}

function option(text, value = text) {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = text;
  return element;
}

function labeledControl(label, id, control, className = '') {
  const wrapper = document.createElement('div');
  const caption = document.createElement('label');
  caption.textContent = label;
  caption.htmlFor = id;
  control.id = id;
  wrapper.className = className;
  wrapper.append(caption, control);
  return wrapper;
}

function renderSettings() {
  const rows = draft.settings.slice(0, draft.count).map((setting, index) => {
    const row = document.createElement('fieldset');
    row.className = 'image-setting';
    const title = document.createElement('legend');
    title.textContent = '第 ' + (index + 1) + ' 张';
    const template = document.createElement('select');
    template.append(...Object.entries(templates).map(([value, spec]) => option(spec.title, value)));
    template.value = setting.template;
    const ratio = document.createElement('select');
    ratio.append(...ratios.map(value => option(value)));
    ratio.value = setting.ratio;
    const copy = document.createElement('textarea');
    copy.maxLength = 72;
    copy.rows = 2;
    copy.value = setting.copy;
    copy.placeholder = '填写要出现在图上的文字';
    row.append(title, labeledControl('内容模板', 'template-' + index, template), labeledControl('图片比例', 'ratio-' + index, ratio), labeledControl('图上文案', 'copy-' + index, copy, 'copy'));
    for (const [event, control, key] of [['change', template, 'template'], ['change', ratio, 'ratio'], ['input', copy, 'copy']]) {
      control.addEventListener(event, () => {
        setting[key] = control.value;
        clearResults();
        saveDraft();
      });
    }
    return row;
  });
  $('image-settings').replaceChildren(...rows);
}

function wrapLines(context, text, width) {
  return text.split(/\r?\n/).flatMap(paragraph => {
    const lines = [];
    let line = '';
    for (const char of paragraph) {
      if (line && context.measureText(line + char).width > width) {
        lines.push(line.trimEnd());
        line = char.trimStart();
      } else {
        line += char;
      }
    }
    lines.push(line);
    return lines;
  });
}

function renderDetail(bitmap, setting, palette, backdrop) {
  const [rw, rh] = setting.ratio.split(':').map(Number);
  const unit = 1600 / Math.max(rw, rh);
  const width = Math.round(rw * unit);
  const height = Math.round(rh * unit);
  const image = canvas(width, height);
  const context = image.getContext('2d');
  const template = templates[setting.template];
  const [px, py, pw, ph, tx, ty, tw, th] = template.layout;
  const short = Math.min(width, height);
  const inset = Math.max(9, short * .021);
  const lightDirection = draft.source === 'prompt' ? draft.selected : 0;

  drawBackground(context, width, height, palette, lightDirection);
  context.strokeStyle = palette.ink;
  context.globalAlpha = .25;
  context.lineWidth = Math.max(1, short * .001);
  context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  context.globalAlpha = 1;
  drawProduct(context, bitmap, px * width, py * height, pw * width, ph * height, backdrop);

  context.fillStyle = palette.ink;
  context.textBaseline = 'top';
  const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
  const textWidth = tw * width;
  const body = setting.copy.trim().replace(/\s+/g, ' ');
  const headingSize = Math.round(short * .059);
  const titleX = tx * width;
  const titleY = ty * height;
  context.font = '600 ' + headingSize + 'px ' + displayFont;
  context.fillText(template.title, titleX, titleY, textWidth);
  context.globalAlpha = .55;
  context.fillRect(titleX, titleY + headingSize * 1.2, Math.min(textWidth * .25, short * .125), context.lineWidth);
  context.globalAlpha = 1;

  if (body) {
    const bodyTop = titleY + headingSize * 1.52;
    let size = Math.round(short * .029);
    let lines;
    do {
      context.font = size + 'px ' + font;
      lines = wrapLines(context, body, textWidth);
      if (lines.length * size * 1.25 <= ty * height + th * height - bodyTop || size <= 14) {
        break;
      }
      size -= 1;
    } while (true);
    lines.forEach((line, index) => context.fillText(line, tx * width, bodyTop + index * size * 1.25, textWidth));
  }
  return image;
}

function resultCard(result, index) {
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  image.src = result.url;
  image.alt = '第 ' + (index + 1) + ' 张 · ' + result.title;
  const caption = document.createElement('figcaption');
  const link = document.createElement('a');
  link.className = 'download';
  link.href = result.url;
  link.download = 'detail-' + String(index + 1).padStart(2, '0') + '.png';
  link.textContent = '下载 PNG';
  link.setAttribute('aria-label', '下载第 ' + (index + 1) + ' 张 PNG');
  caption.append(document.createTextNode(result.title + ' · ' + result.width + ' × ' + result.height), link);
  figure.append(image, caption);
  return figure;
}

async function generateDetails(event) {
  event.preventDefault();
  if (busy || !draft.product || !selectedStyle()) {
    return;
  }
  clearResults();
  busy = true;
  updateControls();
  let bitmap;
  try {
    const palette = draft.source === 'reference'
      ? await referencePalette(draft.reference.blob)
      : promptPalette(draft.candidatePrompt, draft.selected);
    bitmap = await createImageBitmap(draft.product.blob);
    const backdrop = productNeedsBackdrop(bitmap);
    for (const [index, setting] of draft.settings.slice(0, draft.count).entries()) {
      status('generate-status', '正在生成第 ' + (index + 1) + ' 张，共 ' + draft.count + ' 张。');
      const image = renderDetail(bitmap, setting, palette, backdrop);
      const blob = await png(image);
      results.push({ url: URL.createObjectURL(blob), title: templates[setting.template].title, width: image.width, height: image.height });
    }
    $('result-list').replaceChildren(...results.map(resultCard));
    status('output-status', '已生成 ' + results.length + ' 张详情图。');
    status('generate-status', '');
    showStep(3);
  } catch {
    clearResults();
    status('generate-status', '详情图生成失败，请重试。', true);
  } finally {
    bitmap?.close();
    busy = false;
    updateControls();
  }
}

function bindControls() {
  for (const kind of ['product', 'reference']) {
    $(kind + '-file').addEventListener('change', event => {
      const file = event.target.files[0];
      event.target.value = '';
      void upload(kind, file);
    });
  }
  for (const button of document.querySelectorAll('[data-step], [data-next]')) {
    button.addEventListener('click', () => showStep(Number(button.dataset.step ?? button.dataset.next)));
  }
  for (const input of document.querySelectorAll('input[name="style-source"]')) {
    input.addEventListener('change', () => {
      draft.source = input.value;
      status('style-status', '');
      clearResults();
      saveDraft();
      updateControls();
    });
  }
  $('style-prompt').addEventListener('input', event => {
    draft.prompt = event.target.value;
    saveDraft();
  });
  $('style-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !draft.product || !draft.prompt.trim()) {
      return;
    }
    busy = true;
    draft.candidatePrompt = draft.prompt.trim();
    draft.selected = null;
    clearResults();
    updateControls();
    $('style-candidates').replaceChildren();
    try {
      await renderCandidates();
      status('style-status', '已生成三张风格图，请选用一张。');
    } catch {
      draft.candidatePrompt = '';
      status('style-status', '无法生成风格图，请重试。', true);
    } finally {
      busy = false;
      saveDraft();
      updateControls();
    }
  });
  $('image-count').addEventListener('change', event => {
    draft.count = Number(event.target.value);
    renderSettings();
    clearResults();
    saveDraft();
  });
  $('detail-form').addEventListener('submit', generateDetails);
}

async function start() {
  try {
    const response = await fetch('demo.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('缺少演示配置。');
    }
    config = await response.json();
    if (config.demo !== 'product-detail-images' || ![1, 2].includes(config.version)) {
      throw new Error('演示配置无法识别。');
    }
  } catch {
    status('app-status', '请通过项目的 start-preview.bat 启动本地预览后，再打开此页面。', true);
    return;
  }

  try {
    db = await openDrafts();
    Object.assign(draft, await readDraft());
  } catch {
    status('app-status', '当前浏览器无法读取本地草稿。', true);
  }

  if (draft.product?.sample) {
    draft.product = null;
  }

  for (const kind of ['product', 'reference']) {
    const image = draft[kind];
    if (config.version === 2 && image && Math.max(image.width, image.height) > 2048) {
      try {
        draft[kind] = await prepareImage(image.blob, image.original);
      } catch {
        draft[kind] = null;
        status(kind + '-status', '无法处理已保存的图片，请重新上传。', true);
      }
    }
    showImage(kind);
  }
  saveDraft();
  $('version').textContent = 'V' + config.version;
  $('style-prompt').value = draft.prompt;
  $('image-count').append(...Array.from({ length: 8 }, (_, index) => option((index + 1) + ' 张', index + 1)));
  $('image-count').value = draft.count;
  renderSettings();
  try {
    await renderCandidates();
  } catch {
    draft.selected = null;
    status('style-status', '无法恢复风格候选，请重新生成。', true);
  }
  bindControls();
  $('studio').hidden = false;
  showStep(draft.product ? (selectedStyle() ? 2 : 1) : 0, false);
}

void start();
