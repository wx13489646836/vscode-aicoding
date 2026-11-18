'use strict';

void (async () => {
  const vscode = acquireVsCodeApi();
  const checks = [];
  const byId = id => document.getElementById(id);
  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };
  const waitFor = async (condition, message, timeout = 15000) => {
    const limit = performance.now() + timeout;
    while (!condition()) {
      if (performance.now() > limit) {
        throw new Error(message);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };
  const change = (node, value) => {
    node.value = value;
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  };
  const upload = (id, file) => {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    byId(id).files = transfer.files;
    byId(id).dispatchEvent(new Event('change', { bubbles: true }));
  };
  const selectedPattern = () => [...document.querySelectorAll('.image-row textarea')].map(element => element.value);

  try {
    await waitFor(() => !byId('studio').hidden, '工作台未启动。');
    assert(!byId('product').hidden && byId('product-preview').hidden && byId('product-name').value === ''
      && byId('product-info').value === '' && byId('detail-preset').value === '', '启动时应显示空白商品步骤。');
    assert(globalThis.detailImageDemoConfig?.version === 2, '审核需要在 V2 运行。');
    assert(document.documentElement.scrollWidth <= window.innerWidth, '桌面页面出现横向溢出。');

    const sample = document.createElement('canvas');
    sample.width = 4097;
    sample.height = 900;
    const context = sample.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, sample.width, sample.height);
    context.fillStyle = '#596b77';
    context.fillRect(1750, 220, 600, 460);
    const png = await new Promise(resolve => sample.toBlob(resolve, 'image/png'));
    assert(png, '无法创建大图测试素材。');
    const file = new File([png], 'audit-4097.png', { type: 'image/png' });
    upload('product-file', file);
    await waitFor(() => byId('product-status').textContent.includes('4097 × 900 → 2048 × 450'), '商品大图预处理失败。');
    await byId('product-preview').decode();
    assert(byId('product-preview').naturalWidth === 2048, '商品预览未使用缩放后的图片。');
    const next = document.querySelector('#product [data-next="1"]');
    next.click();
    assert(!byId('product').hidden && byId('product-name').getAttribute('aria-invalid') === 'true', '空商品名错误地进入了下一步。');
    change(byId('product-name'), '自审样品');
    change(byId('product-info'), '材质：银\n规格：内径 16 毫米');
    next.click();
    assert(!byId('style').hidden, '无法进入风格步骤。');

    document.querySelector('input[name="style-source"][value="reference"]').click();
    upload('reference-file', file);
    await waitFor(() => byId('reference-status').textContent.includes('4097 × 900 → 2048 × 450'), '风格参考图预处理失败。');
    await byId('reference-preview').decode();
    assert(!byId('style-continue').disabled && byId('reference-preview').naturalWidth === 2048, '无法使用风格参考图。');
    checks.push('空白启动及商品名称必填通过，4097 像素宽的商品图和参考图均已缩放到 2048 像素。');

    document.querySelector('input[name="style-source"][value="prompt"]').click();
    change(byId('style-prompt'), '自审风格描述');
    document.querySelector('#style-form button').click();
    await waitFor(() => document.querySelectorAll('.candidate img').length === 3, '未生成三张风格图。');
    const styles = [...document.querySelectorAll('.candidate img')];
    await Promise.all(styles.map(image => image.decode()));
    assert(styles.every((image, index) => new URL(image.src).pathname.endsWith('/style-' + (index + 1) + '.png')), '风格图素材不匹配。');
    document.querySelector('.candidate').click();
    byId('style-continue').click();
    assert(!byId('template').hidden, '选择风格后无法进入排版。');
    checks.push('文字生成的三张固定风格图均可预览，选图后可进入排版。');

    const preset = byId('detail-preset');
    change(preset, 'standard');
    assert(byId('image-count').value === '6' && byId('image-ratio').value === '3:4'
      && selectedPattern().length === 12 && selectedPattern().every(value => !value), '载入标准版没有保持提示词和文案为空。');
    change(byId('detail-prompt-1'), '手动填写的提示词');
    change(byId('detail-copy-1'), '手动填写的文案');
    change(preset, 'essential');
    assert(byId('image-count').value === '4' && byId('image-ratio').value === '4:5', '精简版的张数或比例不正确。');
    change(preset, 'wide');
    assert(byId('image-count').value === '4' && byId('image-ratio').value === '16:9', '横版的张数或比例不正确。');
    change(preset, 'standard');
    assert(byId('detail-prompt-1').value === '手动填写的提示词' && byId('detail-copy-1').value === '手动填写的文案', '切换预设覆盖了手写内容。');

    const optimizeStart = performance.now();
    byId('optimize-template').click();
    assert(byId('optimize-template').disabled && !byId('detail-prompt-2').value, '优化尚未结束就修改了字段。');
    await waitFor(() => byId('preset-status').textContent.includes('已按商品轮廓'), '模板优化没有完成。');
    assert(performance.now() - optimizeStart >= 3000 && selectedPattern().every(Boolean)
      && byId('detail-copy-1').value === '自审样品' && byId('detail-copy-3').value.includes('材质：银')
      && byId('detail-copy-5').value.includes('内径 16 毫米'), '优化时间或生成内容不正确。');
    checks.push('三个预设的张数和比例正确，切换预设保留字段，约 3 秒后填入含商品信息的提示词和文案。');

    byId('generate-button').click();
    await waitFor(() => byId('generate-status').textContent.includes('已生成 6 张'), '标准版未完成六张详情图生成。');
    const images = [...document.querySelectorAll('.image-row img')];
    await Promise.all(images.map(image => image.decode()));
    assert(images.length === 6 && images.every((image, index) => image.naturalWidth === 1086 && image.naturalHeight === 1448
      && new URL(image.src).pathname.endsWith('/detail-' + (index + 1) + '.png')), '六张详情图的素材或尺寸不正确。');

    const otherImages = images.slice(1).map(image => image.src);
    change(byId('detail-copy-1'), '重生成测试');
    document.querySelector('.image-row .regenerate').click();
    await waitFor(() => byId('preview-message-1').textContent.includes('第 1 张已生成'), '单张重新生成失败。');
    assert(!images[0].hidden && images.slice(1).every((image, index) => image.src === otherImages[index]), '重生成影响了其他图片。');

    const downloads = [...document.querySelectorAll('.image-row a.download')];
    const pngSignatures = await Promise.all(downloads.map(async link => {
      assert(link.download.endsWith('.png') && link.href, '缺少 PNG 下载入口。');
      const response = await fetch(link.href);
      return response.ok && new Uint8Array(await response.arrayBuffer()).subarray(0, 4).join(',') === '137,80,78,71';
    }));
    assert(pngSignatures.length === 6 && pngSignatures.every(Boolean), '下载资源无法读取为 PNG。');
    checks.push('六张 3:4 详情图均已出图，单张重新生成保留其余结果，六个下载入口均可读取 PNG。');

    vscode.postMessage({ type: 'detail-image-audit', checks });
  } catch (error) {
    vscode.postMessage({ type: 'detail-image-audit', checks, error: error.message });
  }
})();
