'use strict';

const ratios = ['1:1', '3:4', '4:5', '9:16', '16:9'];
const shotTemplates = {
  cover: {
    title: '商品首屏',
    prompt: '冷银灰背景，柔光，完整商品居中，保留轮廓与原色，为商品名称留出清晰空间',
    copy: '商品一览'
  },
  wide: {
    title: '横版主视觉',
    prompt: '冷银灰背景，柔光，商品完整置于右半区，左侧留出商品名称与简短介绍的位置',
    copy: '商品一览'
  },
  selling: {
    title: '核心卖点',
    prompt: '黑曜石背景，聚光，完整展示商品设计特征，画面集中呈现一项已填写的卖点',
    copy: '设计亮点',
    matches: /卖点|特色|设计|亮点/
  },
  detail: {
    title: '材质与工艺',
    prompt: '冷银灰背景，侧光，商品特写，展示白底图可见的纹理、边缘与连接处，保留原有结构',
    copy: '材质与工艺细节',
    matches: /材质|工艺|表面|纹理|抛光|镶嵌|925\s*银/
  },
  scene: {
    title: '佩戴与搭配',
    prompt: '暖色背景，柔光，商品完整平铺，留出搭配建议的文字位置，以原图商品为视觉重点',
    copy: '日常佩戴与搭配参考',
    matches: /佩戴|搭配|场景|通勤|出游|送礼|穿搭|适用/
  },
  specs: {
    title: '尺寸与规格',
    prompt: '月白背景，漫射柔光，完整展示商品外形，底部留白放尺寸和规格文字',
    copy: '选购前请核对尺寸与规格',
    matches: /尺寸|规格|长度|长宽|宽度|高度|直径|围度|圈口|重量|克重|毫米|厘米|\bmm\b|\bcm\b/i
  },
  care: {
    title: '保养与选购须知',
    prompt: '月白背景，柔光，商品居中完整呈现，底部留白放保养方式、包装或选购说明',
    copy: '选购时请核对商品信息',
    matches: /养护|保养|保管|清洁|包装|配件|配套|套装|须知|售后|质保|发货/
  }
};
const detailPresets = {
  essential: { name: '精简版 · 4 张', ratio: '4:5', shots: ['cover', 'selling', 'detail', 'specs'] },
  standard: { name: '标准版 · 6 张', ratio: '3:4', shots: ['cover', 'selling', 'detail', 'scene', 'specs', 'care'] },
  wide: { name: '横版展示 · 4 张', ratio: '16:9', shots: ['wide', 'selling', 'scene', 'specs'] }
};
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
  productName: '',
  productInfo: '',
  reference: null,
  source: 'prompt',
  prompt: '',
  candidatePrompt: '',
  selected: null,
  preset: '',
  count: 3,
  ratio: '3:4',
  settings: Array.from({ length: 8 }, () => ({ prompt: '', copy: '' }))
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
  if (next > 0 && !draft.productName.trim()) {
    const name = $('product-name');
    status('product-name-error', '请输入商品名称后继续。', true);
    name.setAttribute('aria-invalid', 'true');
    name.focus();
    return;
  }
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
  const available = [true, hasProduct, canArrange];
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
  $('generate-button').disabled = busy || !canArrange;
  $('optimize-template').disabled = busy || !canArrange || !draft.preset;
  $('product-actions').hidden = !hasProduct;
  $('prompt-panel').hidden = draft.source !== 'prompt';
  $('reference-panel').hidden = draft.source !== 'reference';
  document.querySelector('input[name="style-source"][value="' + draft.source + '"]').checked = true;
}

function clearResults() {
  for (const result of results) {
    if (result) {
      URL.revokeObjectURL(result.url);
    }
  }
  results = [];
  status('generate-status', '');
  for (let index = 0; index < draft.count; index++) {
    renderPreview(index);
    if ($('preview-message-' + (index + 1))) {
      status('preview-message-' + (index + 1), '');
    }
  }
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
    if (kind === 'product') {
      status('preset-status', '');
    }
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

function productCopyForShots(shots) {
  const name = draft.productName.trim().replace(/\s+/g, ' ');
  const facts = [...new Set(draft.productInfo.split(/[\r\n；;。]+/)
    .map(fact => fact.trim().replace(/\s+/g, ' '))
    .filter(fact => fact && fact !== name))];
  const groups = shots.map(() => []);
  if (name) {
    groups[0].push(name);
  }
  const general = Math.max(0, shots.indexOf('selling'));
  for (const fact of facts) {
    const separator = fact.search(/[:：]/);
    const label = separator === -1 ? '' : fact.slice(0, separator);
    const labeled = shots.findIndex(shot => shotTemplates[shot].matches?.test(label));
    const match = labeled === -1 ? shots.findIndex(shot => shotTemplates[shot].matches?.test(fact)) : labeled;
    groups[match === -1 ? general : match].push(fact);
  }
  return groups.map(items => {
    const copy = items.join(' · ');
    return copy.length > 120 ? copy.slice(0, 119).trimEnd() + '…' : copy;
  });
}

function loadPreset(value) {
  draft.preset = value;
  const preset = detailPresets[value];
  if (preset) {
    draft.count = preset.shots.length;
    draft.ratio = preset.ratio;
    const productCopy = productCopyForShots(preset.shots);
    draft.settings = draft.settings.map((_, index) => {
      const shot = shotTemplates[preset.shots[index]];
      return { prompt: shot?.prompt ?? '', copy: productCopy[index] || shot?.copy || '' };
    });
    $('image-count').value = draft.count;
    $('image-ratio').value = draft.ratio;
    clearResults();
  }
  renderImageRows();
  status('preset-status', preset ? '已载入「' + preset.name + '」，共 ' + draft.count + ' 张。' : '');
  saveDraft();
  updateControls();
}

async function inspectProduct(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = 160 / Math.max(bitmap.width, bitmap.height);
    const sample = canvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    const { width, height } = sample;
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    let left = width, top = height, right = -1, bottom = -1;
    let count = 0, luminance = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2];
        if (data[offset + 3] < 96 || Math.min(r, g, b) > 233) {
          continue;
        }
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        luminance += .2126 * r + .7152 * g + .0722 * b;
        count++;
      }
    }
    if (count < Math.max(4, width * height * .002)) {
      return null;
    }
    const ratio = (right - left + 1) / (bottom - top + 1);
    return {
      shape: ratio >= 1.25 ? '横向' : ratio <= .8 ? '纵向' : '紧凑',
      dark: luminance / count < 128
    };
  } finally {
    bitmap.close();
  }
}

function adaptShot(kind, product, copy) {
  const shot = shotTemplates[kind];
  const outline = product.shape === '紧凑' ? '保留紧凑主体的轮廓' : '沿商品的' + product.shape + '轮廓安排留白';
  const lead = product.dark && (kind === 'cover' || kind === 'wide')
    ? shot.prompt.replace('冷银灰背景', '月白背景')
    : shot.prompt;
  const outlineCopy = (kind === 'cover' || kind === 'wide') && product.shape !== '紧凑'
    ? '商品一览 · ' + product.shape + '轮廓'
    : shot.copy;
  return { prompt: lead + '，' + outline, copy: copy || outlineCopy };
}

async function optimizePreset() {
  const preset = detailPresets[draft.preset];
  if (busy || !preset || !draft.product) {
    return;
  }
  busy = true;
  status('preset-status', '正在分析商品图…');
  updateControls();
  try {
    const product = await inspectProduct(draft.product.blob);
    if (!product) {
      status('preset-status', '商品轮廓不够明显。请换一张主体清晰的白底图后重试。', true);
      return;
    }
    const shots = Array.from({ length: draft.count }, (_, index) => preset.shots[index] ?? 'detail');
    const productCopy = productCopyForShots(shots);
    const optimized = shots.map((kind, index) => adaptShot(kind, product, productCopy[index]));
    const changed = optimized.some((setting, index) => setting.prompt !== draft.settings[index].prompt || setting.copy !== draft.settings[index].copy);
    if (changed) {
      draft.settings.splice(0, optimized.length, ...optimized);
      clearResults();
      renderImageRows();
      saveDraft();
    }
    status('preset-status', '已按商品轮廓和明暗优化 ' + draft.count + ' 张的提示词和文案。');
  } catch {
    status('preset-status', '无法分析商品图，请重新上传后重试。', true);
  } finally {
    busy = false;
    updateControls();
  }
}

function renderImageRows() {
  const template = $('image-row-template');
  const rows = draft.settings.slice(0, draft.count).map((setting, index) => {
    const row = template.content.firstElementChild.cloneNode(true);
    const number = index + 1;
    const title = row.querySelector('.image-title');
    const kind = detailPresets[draft.preset]?.shots[index];
    title.textContent = '第 ' + number + ' 张' + (kind ? ' · ' + shotTemplates[kind].title : '');
    title.id = 'image-title-' + number;
    row.setAttribute('aria-labelledby', title.id);
    for (const field of row.querySelectorAll('textarea[data-field]')) {
      const key = field.dataset.field;
      field.id = 'detail-' + key + '-' + number;
      field.previousElementSibling.htmlFor = field.id;
      field.value = setting[key];
      field.addEventListener('input', () => {
        setting[key] = field.value;
        const result = results[index];
        if (result) {
          URL.revokeObjectURL(result.url);
          delete results[index];
          renderPreview(index);
        }
        status('preview-message-' + number, '');
        status('generate-status', '');
        saveDraft();
      });
    }
    row.querySelector('figure').setAttribute('aria-label', '第 ' + number + ' 张生成结果');
    row.querySelector('img').alt = '第 ' + number + ' 张详情图';
    row.querySelector('.preview-message').id = 'preview-message-' + number;
    row.querySelector('.regenerate').addEventListener('click', () => void generateDetails(index));
    const download = row.querySelector('a');
    download.download = 'detail-' + String(number).padStart(2, '0') + '.png';
    download.setAttribute('aria-label', '下载第 ' + number + ' 张 PNG');
    return row;
  });
  $('image-rows').replaceChildren(...rows);
  rows.forEach((_, index) => renderPreview(index));
}

function renderPreview(index) {
  const row = $('image-rows').children[index];
  if (!row) {
    return;
  }
  const result = results[index];
  row.querySelector('.preview-empty').hidden = Boolean(result);
  const dimensions = row.querySelector('.preview-dimensions');
  dimensions.hidden = !result;
  const button = row.querySelector('.regenerate');
  button.textContent = result ? '重新生成' : '生成此图';
  button.setAttribute('aria-label', button.textContent + '，第 ' + (index + 1) + ' 张');
  const preview = row.querySelector('img');
  const download = row.querySelector('a');
  preview.hidden = !result;
  if (!result) {
    preview.removeAttribute('src');
    download.removeAttribute('href');
    return;
  }
  preview.src = result.url;
  dimensions.textContent = result.width + ' × ' + result.height;
  download.href = result.url;
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

function renderDetail(bitmap, setting, basePalette, backdrop) {
  const [rw, rh] = draft.ratio.split(':').map(Number);
  const unit = 1600 / Math.max(rw, rh);
  const width = Math.round(rw * unit);
  const height = Math.round(rh * unit);
  const image = canvas(width, height);
  const context = image.getContext('2d');
  const copy = setting.copy.trim().replace(/\s+/g, ' ');
  const prompt = setting.prompt;
  const light = /侧光|side light/i.test(prompt) ? 1
    : /聚光|硬光|spotlight/i.test(prompt) ? 2
    : /柔光|漫射|soft light/i.test(prompt) ? 0
    : (draft.selected ?? 0);
  const palette = /黑|月白|奶油|珍珠|冷银|银灰|蓝|绿|暖色|黑曜|pearl|ivory|silver|black|blue|green|warm/i.test(prompt)
    ? promptPalette(prompt, light)
    : basePalette;
  const closeUp = /特写|近景|微距|close.up|macro/i.test(prompt);
  const copyBelow = /文案放底部|下方留白|底部留白|text below/i.test(prompt);
  const sideBySide = Boolean(copy) && rw > rh && !copyBelow;
  const margin = closeUp ? .045 : .095;
  const imageX = sideBySide ? .45 : margin;
  const imageY = copy && !sideBySide && !copyBelow ? .25 : margin;
  const imageWidth = 1 - imageX - margin;
  const imageHeight = sideBySide || !copy ? 1 - margin * 2 : .66;
  const inset = Math.min(width, height) * .024;

  drawBackground(context, width, height, palette, light);
  context.strokeStyle = palette.ink;
  context.globalAlpha = .24;
  context.lineWidth = Math.max(1, inset * .05);
  context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  context.globalAlpha = 1;
  drawProduct(context, bitmap, imageX * width, imageY * height, imageWidth * width, imageHeight * height, backdrop);

  if (copy) {
    const textX = width * .085;
    const textY = height * (sideBySide ? .21 : copyBelow ? .76 : .075);
    const textWidth = width * (sideBySide ? .30 : .83);
    const textHeight = height * (sideBySide ? .58 : .14);
    let size = Math.round(Math.min(width, height) * .052);
    let lines;
    context.fillStyle = palette.ink;
    context.textBaseline = 'top';
    do {
      context.font = '600 ' + size + 'px ' + displayFont;
      lines = wrapLines(context, copy, textWidth);
      if (lines.length * size * 1.36 <= textHeight || size <= 12) {
        break;
      }
      size -= 1;
    } while (true);
    lines.forEach((line, index) => context.fillText(line, textX, textY + index * size * 1.36, textWidth));
  }
  return image;
}

async function generateDetails(singleIndex) {
  if (busy || !draft.product || !selectedStyle()) {
    return;
  }
  const single = singleIndex !== undefined;
  const indices = single ? [singleIndex] : Array.from({ length: draft.count }, (_, index) => index);
  const messageId = single ? 'preview-message-' + (singleIndex + 1) : 'generate-status';
  status('generate-status', '');
  busy = true;
  updateControls();
  let bitmap;
  try {
    status(messageId, single ? '正在生成第 ' + (singleIndex + 1) + ' 张。' : '正在准备生成。');
    const palette = draft.source === 'reference'
      ? await referencePalette(draft.reference.blob)
      : promptPalette(draft.candidatePrompt, draft.selected);
    bitmap = await createImageBitmap(draft.product.blob);
    const backdrop = productNeedsBackdrop(bitmap);
    for (const index of indices) {
      if (!single) {
        status(messageId, '正在生成第 ' + (index + 1) + ' 张，共 ' + draft.count + ' 张。');
        status('preview-message-' + (index + 1), '');
      }
      const image = renderDetail(bitmap, draft.settings[index], palette, backdrop);
      const blob = await png(image);
      const previous = results[index];
      results[index] = { url: URL.createObjectURL(blob), width: image.width, height: image.height };
      renderPreview(index);
      if (previous) {
        URL.revokeObjectURL(previous.url);
      }
    }
    status(messageId, single ? '第 ' + (singleIndex + 1) + ' 张已生成。' : '已生成 ' + draft.count + ' 张详情图。');
  } catch {
    status(messageId, '详情图生成失败，请重试。', true);
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
  for (const [id, key] of [['product-name', 'productName'], ['product-info', 'productInfo']]) {
    $(id).addEventListener('input', event => {
      draft[key] = event.target.value;
      if (key === 'productName' && draft.productName.trim()) {
        status('product-name-error', '');
        event.target.removeAttribute('aria-invalid');
      }
      status('preset-status', '');
      saveDraft();
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
  $('detail-preset').addEventListener('change', event => loadPreset(event.target.value));
  $('optimize-template').addEventListener('click', () => void optimizePreset());
  $('image-count').addEventListener('change', event => {
    draft.count = Number(event.target.value);
    for (const result of results.splice(draft.count)) {
      if (result) {
        URL.revokeObjectURL(result.url);
      }
    }
    renderImageRows();
    status('generate-status', '');
    saveDraft();
  });
  $('image-ratio').addEventListener('change', event => {
    draft.ratio = event.target.value;
    clearResults();
    saveDraft();
  });
  $('detail-form').addEventListener('submit', event => {
    event.preventDefault();
    void generateDetails();
  });
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
    const saved = await readDraft();
    if (saved) {
      const ratio = saved.ratio ?? saved.settings?.[0]?.ratio;
      const settings = draft.settings.map((defaults, index) => {
        const previous = saved.settings?.[index];
        return { prompt: previous?.prompt ?? defaults.prompt, copy: previous?.copy ?? defaults.copy };
      });
      const preset = Object.hasOwn(detailPresets, saved.preset) ? saved.preset : '';
      Object.assign(draft, saved, { ratio: ratios.includes(ratio) ? ratio : draft.ratio, preset, settings });
    }
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
  $('product-name').value = draft.productName;
  $('product-info').value = draft.productInfo;
  $('style-prompt').value = draft.prompt;
  $('detail-preset').append(option('选择预设', ''), ...Object.entries(detailPresets).map(([value, preset]) => option(preset.name, value)));
  $('detail-preset').value = draft.preset;
  $('image-count').append(...Array.from({ length: 8 }, (_, index) => option((index + 1) + ' 张', index + 1)));
  $('image-count').value = draft.count;
  $('image-ratio').append(...ratios.map(value => option(value)));
  $('image-ratio').value = draft.ratio;
  renderImageRows();
  try {
    await renderCandidates();
  } catch {
    draft.selected = null;
    status('style-status', '无法恢复风格候选，请重新生成。', true);
  }
  bindControls();
  $('studio').hidden = false;
  showStep(draft.product && draft.productName.trim() ? (selectedStyle() ? 2 : 1) : 0, false);
}

void start();
