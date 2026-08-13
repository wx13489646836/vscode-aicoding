const CONFIG_KEY = "brandvision_ai_config_v2";
    const REQUEST_TIMEOUT_MS = 60 * 1000;
    const REQUEST_RETRY_LIMIT = 1;
    const FIXTURE_MANIFEST_PATH = "/external-fixtures/current/manifest.json";
    const TEXT_REVEAL_DELAY_MS = 10 * 1000;
    const IMAGE_REVEAL_DELAY_MS = 10 * 1000;
    const FIXTURE_SLOT_COUNT = 5;
    const DEFAULT_CONFIG = {
      apiKey: "",
      apiHost: "",
      textModel: "",
      imageModel: ""
    };

    const state = {
      stage: 0,
      selectedIp: "",
      selectedPoster: "",
      selectedFinals: [],
      posterTextReady: false,
      posterVariantOrder: [],
      inputVersion: { ip: 0, product: 0 },
      generationContext: { ip: "", poster: "", final: "" },
      refs: { ip: null, product: null },
      generated: { ip: {}, poster: {}, final: {} },
      posterContent: {},
      disableBackgroundGeneration: false,
      fixturesLoaded: false,
      fixtureManifest: null,
      fixtureManifestPromise: null,
      fixtureAssetCache: {},
      presentationMode: "fixture-only",
      revealTokens: {
        ip: 0,
        poster: 0,
        final: 0,
        posterSlots: [0, 0, 0, 0]
      }
    };

    const currentStageText = document.getElementById("currentStageText");
    const lockedIpText = document.getElementById("lockedIpText");
    const lockedPosterText = document.getElementById("lockedPosterText");
    const confirmUploadBtn = document.getElementById("confirmUpload");
    const confirmIpBtn = document.getElementById("confirmIp");
    const confirmPosterBtn = document.getElementById("confirmPoster");
    const saveConfigBtn = document.getElementById("saveConfig");

    function getConfig() {
      return {
        apiKey: document.getElementById("apiKey").value.trim(),
        apiHost: document.getElementById("apiHost").value.trim(),
        textModel: document.getElementById("textModel").value.trim(),
        imageModel: document.getElementById("imageModel").value.trim()
      };
    }

    function normalizeApiHost(apiHost) {
      const trimmed = String(apiHost || "").trim().replace(/\/+$/, "");
      if (!trimmed) return "";
      if (/\/v1beta\/models$/i.test(trimmed)) return trimmed;
      return `${trimmed}/v1beta/models`;
    }

    function loadConfig() {
      try {
        const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
        document.getElementById("apiKey").value = saved.apiKey || DEFAULT_CONFIG.apiKey;
        document.getElementById("apiHost").value = saved.apiHost || DEFAULT_CONFIG.apiHost;
        document.getElementById("textModel").value = saved.textModel || DEFAULT_CONFIG.textModel;
        document.getElementById("imageModel").value = saved.imageModel || DEFAULT_CONFIG.imageModel;
      } catch (_) {
        document.getElementById("apiKey").value = DEFAULT_CONFIG.apiKey;
        document.getElementById("apiHost").value = DEFAULT_CONFIG.apiHost;
        document.getElementById("textModel").value = DEFAULT_CONFIG.textModel;
        document.getElementById("imageModel").value = DEFAULT_CONFIG.imageModel;
      }
    }

    function saveConfig() {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(getConfig()));
      alert("配置已保存。");
    }

    function setStage(stage) {
      state.stage = stage;
      const labels = ["录入阶段", "IP 构筑", "布局设计", "成品精修"];
      currentStageText.textContent = labels[stage] || labels[0];
      document.querySelectorAll(".step-card").forEach((card) => {
        card.classList.toggle("active", Number(card.dataset.stage || 0) === stage);
      });
    }

    async function readPreview(input, img, wrapper, key) {
      const file = input.files && input.files[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      img.src = dataUrl;
      wrapper.classList.add("has-image");
      state.refs[key] = {
        name: file.name,
        mimeType: file.type || "image/png",
        data: dataUrl.split(",")[1],
        dataUrl
      };
      state.inputVersion[key] = (state.inputVersion[key] || 0) + 1;
    }

    function bindSingleCards(selector, stateKey, targetEl, onSelect) {
      document.querySelectorAll(selector).forEach((card) => {
        card.addEventListener("click", () => {
          document.querySelectorAll(selector).forEach((item) => item.classList.remove("selected"));
          card.classList.add("selected");
          state[stateKey] = card.dataset.id || "";
          if (targetEl) targetEl.textContent = card.dataset.id || "已确认";
          if (onSelect) onSelect(card);
        });
      });
    }

    function updateCompare(tab) {
      document.querySelectorAll(".poster-tab").forEach((card) => {
        const selected = card.dataset.id === tab;
        card.classList.toggle("selected", selected);
        const editor = card.querySelector(".prompt-editor");
        if (editor) editor.disabled = !selected;
      });
      state.selectedPoster = tab;
      lockedPosterText.textContent = tab || "未确认";
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error("文件读取失败"));
        reader.readAsDataURL(file);
      });
    }

    function dataUrlToInlineData(dataUrl) {
      const [meta, data] = dataUrl.split(",");
      const mimeType = (meta.match(/data:(.*?);base64/) || [])[1] || "image/png";
      return { mimeType, data };
    }

    function getDataUrlFileExtension(dataUrl) {
      const mimeType = (String(dataUrl || "").match(/^data:(.*?);base64,/) || [])[1] || "image/png";
      if (mimeType === "image/jpeg") return "jpg";
      if (mimeType === "image/webp") return "webp";
      if (mimeType === "image/svg+xml") return "svg";
      return "png";
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function ensureApiReady() {
      const { apiKey, apiHost, textModel, imageModel } = getConfig();
      if (!apiKey) throw new Error("请先填写 API Key。");
      if (!apiHost) throw new Error("请先填写接口地址。");
      if (!textModel) throw new Error("请先填写文本模型。");
      if (!imageModel) throw new Error("请先填写出图模型。");
    }

    function buildInputSummary() {
      return {
        sceneType: document.getElementById("sceneType").value
      };
    }

    async function callModel(model, body) {
      const { apiKey, apiHost } = getConfig();
      const normalizedHost = normalizeApiHost(apiHost);
      const response = await fetch(`${normalizedHost}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `请求失败: ${response.status}`);
      }
      return response.json();
    }

    function extractText(result) {
      const parts = result?.candidates?.[0]?.content?.parts || [];
      return parts.filter((part) => typeof part.text === "string").map((part) => part.text).join("\n").trim();
    }

    function extractImageDataUrl(result) {
      const parts = result?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => part.inlineData || part.inline_data);
      const inlineData = imagePart?.inlineData || imagePart?.inline_data;
      if (!inlineData?.data) throw new Error("图片模型未返回图片数据。");
      return `data:${inlineData.mimeType || inlineData.mime_type || "image/png"};base64,${inlineData.data}`;
    }

    function safeJsonParse(text) {
      try {
        return JSON.parse(text);
      } catch (_) {
        const match = text.match(/\{[\s\S]*\}$/);
        if (!match) throw new Error("模型没有返回有效 JSON。");
        return JSON.parse(match[0]);
      }
    }

    function createGenericGenerationError() {
      return new Error("生成失败，请稍后重试。");
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(createGenericGenerationError());
        reader.readAsDataURL(blob);
      });
    }

    function logBackgroundFailure(scope, error) {
      console.warn(`[presentation:${scope}]`, error);
    }

    function hasReadyTextModel() {
      if (state.disableBackgroundGeneration) return false;
      const { apiKey, apiHost, textModel } = getConfig();
      return Boolean(apiKey && apiHost && textModel);
    }

    function hasReadyImageModel() {
      if (state.disableBackgroundGeneration) return false;
      const { apiKey, apiHost, imageModel } = getConfig();
      return Boolean(apiKey && apiHost && imageModel);
    }

    function startBackgroundTask(scope, factory) {
      try {
        const task = factory();
        if (task && typeof task.then === "function") {
          task.catch((error) => logBackgroundFailure(scope, error));
        }
      } catch (error) {
        logBackgroundFailure(scope, error);
      }
    }

    async function ensureFixtureManifestLoaded() {
      if (state.fixtureManifest) {
        return state.fixtureManifest;
      }
      if (!state.fixtureManifestPromise) {
        state.fixtureManifestPromise = fetch(FIXTURE_MANIFEST_PATH, { cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) {
              throw createGenericGenerationError();
            }
            return response.json();
          })
          .then((manifest) => {
            state.fixtureManifest = manifest;
            state.fixturesLoaded = true;
            return manifest;
          })
          .catch((error) => {
            state.fixtureManifestPromise = null;
            state.fixturesLoaded = false;
            console.error("[presentation:fixtures]", error);
            throw createGenericGenerationError();
          });
      }
      return state.fixtureManifestPromise;
    }

    async function resolveFixtureImageData(imagePath) {
      if (!imagePath) {
        return "";
      }
      if (state.fixtureAssetCache[imagePath]) {
        return state.fixtureAssetCache[imagePath];
      }
      const assetUrl = new URL(imagePath, new URL(FIXTURE_MANIFEST_PATH, window.location.href));
      const response = await fetch(assetUrl.toString(), { cache: "no-store" });
      if (!response.ok) {
        throw createGenericGenerationError();
      }
      const dataUrl = await blobToDataUrl(await response.blob());
      state.fixtureAssetCache[imagePath] = dataUrl;
      return dataUrl;
    }

    function getFallbackFixtureId(stageName, index) {
      if (stageName === "ip") {
        return `IP ${String(index + 1).padStart(2, "0")}`;
      }
      if (stageName === "poster") {
        return `方案 ${String(index + 1).padStart(2, "0")}`;
      }
      return `终稿 ${String(index + 1).padStart(2, "0")}`;
    }

    async function getFixtureEntries(stageName) {
      const manifest = await ensureFixtureManifestLoaded();
      const sourceEntries = Array.isArray(manifest?.[stageName]) ? manifest[stageName] : [];
      const entries = [];
      for (let index = 0; index < FIXTURE_SLOT_COUNT; index += 1) {
        const source = sourceEntries[index] || {};
        const fallbackId = getFallbackFixtureId(stageName, index);
        const entry = {
          id: source.id || fallbackId,
          title: source.title || source.id || fallbackId,
          description: source.description || "",
          prompt: source.prompt || ""
        };
        if (typeof source.image === "string" && source.image) {
          entry.imageDataUrl = await resolveFixtureImageData(source.image);
        }
        entries.push(entry);
      }
      return entries;
    }

    function bumpRevealToken(stageName, slotIndex) {
      if (stageName === "posterSlot") {
        const next = (state.revealTokens.posterSlots[slotIndex] || 0) + 1;
        state.revealTokens.posterSlots[slotIndex] = next;
        return next;
      }
      const next = (state.revealTokens[stageName] || 0) + 1;
      state.revealTokens[stageName] = next;
      return next;
    }

    function isRevealTokenCurrent(stageName, token, slotIndex) {
      if (stageName === "posterSlot") {
        return state.revealTokens.posterSlots[slotIndex] === token;
      }
      return state.revealTokens[stageName] === token;
    }

    function invalidateRevealTokens() {
      state.revealTokens.ip += 1;
      state.revealTokens.poster += 1;
      state.revealTokens.final += 1;
      state.revealTokens.posterSlots = state.revealTokens.posterSlots.map((token) => token + 1);
    }

    function clearGeneratedImage(card) {
      const img = card.querySelector(".generated-shot");
      if (img) img.remove();
    }

    function setStageCardsLoading(selector, loading) {
      document.querySelectorAll(selector).forEach((card) => {
        card.classList.toggle("is-loading", loading);
      });
    }

    function applyFixtureImage(card, imageDataUrl) {
      clearGeneratedImage(card);
      if (imageDataUrl) {
        applyGeneratedImage(card, imageDataUrl);
      }
    }

    function applyIpFixtures(entries, prompt) {
      const cards = Array.from(document.querySelectorAll(".selection-card"));
      state.generated.ip = {};
      state.selectedIp = "";
      lockedIpText.textContent = "未确认";
      cards.forEach((card, index) => {
        const entry = entries[index] || { id: getFallbackFixtureId("ip", index), title: getFallbackFixtureId("ip", index), description: "" };
        card.classList.remove("selected", "is-loading");
        card.dataset.id = entry.id;
        applyCardContent(card, entry);
        applyFixtureImage(card, entry.imageDataUrl);
        state.generated.ip[entry.id] = {
          id: entry.id,
          title: entry.title,
          badge: entry.badge || "",
          description: entry.description,
          prompt,
          imageDataUrl: entry.imageDataUrl || ""
        };
      });
    }

    function applyPosterFixtures(entries) {
      const cards = Array.from(document.querySelectorAll(".poster-tab"));
      state.posterContent = {};
      state.generated.poster = {};
      state.posterTextReady = entries.length > 0;
      state.posterVariantOrder = entries.map((entry) => entry.id);
      state.selectedPoster = "";
      lockedPosterText.textContent = "未确认";
      cards.forEach((card, index) => {
        const entry = entries[index] || { id: getFallbackFixtureId("poster", index), title: getFallbackFixtureId("poster", index), description: "", prompt: "" };
        const title = card.querySelector("strong");
        const desc = card.querySelector(".muted");
        const promptEditor = card.querySelector(".prompt-editor");
        clearGeneratedImage(card);
        card.classList.remove("selected", "is-loading");
        card.dataset.id = entry.id;
        if (title) title.textContent = entry.title || entry.id;
        if (desc) desc.textContent = entry.description || "";
        if (promptEditor) {
          promptEditor.value = entry.prompt || "";
          promptEditor.disabled = true;
        }
        state.posterContent[entry.id] = {
          title: entry.title || entry.id,
          description: entry.description || "",
          prompt: entry.prompt || ""
        };
      });
    }

    function applyPosterFixtureSlot(slotIndex, entry, oldId) {
      const card = document.querySelectorAll(".poster-tab")[slotIndex];
      if (!card) return;
      const title = card.querySelector("strong");
      const desc = card.querySelector(".muted");
      const promptEditor = card.querySelector(".prompt-editor");
      clearGeneratedImage(card);
      card.classList.remove("selected", "is-loading");
      card.dataset.id = entry.id;
      if (title) title.textContent = entry.title || entry.id;
      if (desc) desc.textContent = entry.description || "";
      if (promptEditor) {
        promptEditor.value = entry.prompt || "";
        promptEditor.disabled = true;
      }
      if (oldId && oldId !== entry.id) {
        delete state.generated.poster[oldId];
        delete state.posterContent[oldId];
      }
      state.posterContent[entry.id] = {
        title: entry.title || entry.id,
        description: entry.description || "",
        prompt: entry.prompt || ""
      };
      state.posterVariantOrder[slotIndex] = entry.id;
      state.posterTextReady = true;
      if (state.selectedPoster === oldId) {
        state.selectedPoster = "";
        lockedPosterText.textContent = "未确认";
      }
    }

    function applyFinalFixtures(entries, finalPrompt) {
      const cards = Array.from(document.querySelectorAll(".final-card"));
      state.generated.final = {};
      state.selectedFinals = [];
      cards.forEach((card, index) => {
        const entry = entries[index] || { id: getFallbackFixtureId("final", index), title: "", description: "" };
        const title = card.querySelector("strong");
        const desc = card.querySelector(".muted");
        card.classList.remove("selected", "is-loading");
        card.dataset.id = entry.id;
        if (title) title.textContent = entry.title || "";
        if (desc) desc.textContent = entry.description || "";
        applyFixtureImage(card, entry.imageDataUrl);
        state.generated.final[entry.id] = {
          id: entry.id,
          title: entry.title || "",
          description: entry.description || "",
          prompt: finalPrompt,
          imageDataUrl: entry.imageDataUrl || ""
        };
      });
    }

    async function generateStructuredPlan(stageName) {
      const input = buildInputSummary();
      const selectedIp = state.generated.ip[state.selectedIp] || null;
      const selectedPoster = state.posterContent[state.selectedPoster] || null;
      const stagePromptMap = {
        poster: `你是海报创意总监。基于已选 IP 输出 4 个海报文字方案。
返回 JSON，格式必须为 {"variants":[{"id":"","title":"","description":"","prompt":""}]}。
每个方案都必须包含：
1. 简短中文标题
2. 中文描述
3. 一段可直接用于 AI 绘图的详细中文提示词

要求：
- 这一阶段只输出文字方案，不生成图片
- prompt 必须足够详细，至少覆盖主体、IP形象、产品位置、互动方式、镜头景别、构图结构、背景环境、灯光、材质、色彩、氛围、商业海报质感、1:1画幅
- prompt 必须明确要求沿用上一阶段已锁定的 IP 形象，不得改动角色动作与核心识别特征
- prompt 必须是完整中文长提示词，不要写成关键词堆砌
- 4 个方案之间要有明显构图差异`,
        final: `你是品牌精修导演。基于已选海报方案输出 5 个终稿精修方向。
返回 JSON，格式必须为 {"variants":[{"id":"终稿 01","title":"","badge":"","description":"","prompt":""}]}。
只允许做微调级增强，不改变已选 IP 和构图逻辑。`
      };

      const parts = [{
            text: [
              stagePromptMap[stageName],
              `海报场景: ${input.sceneType}`,
              selectedIp ? `已选 IP: ${selectedIp.title} / ${selectedIp.description}` : "",
              selectedPoster ? `已选海报方向: ${selectedPoster.title} / ${selectedPoster.description}` : ""
            ].filter(Boolean).join("\n")
      }];

      if (stageName === "poster") {
        const selectedIpImage = state.generated.ip[state.selectedIp]?.imageDataUrl;
        if (selectedIpImage) {
          const ref = dataUrlToInlineData(selectedIpImage);
          parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
        }
        if (state.refs.product) {
          parts.push({ inlineData: { mimeType: state.refs.product.mimeType, data: state.refs.product.data } });
        }
      }

      const payload = {
        contents: [{
          role: "user",
          parts
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const result = await callModel(getConfig().textModel, payload);
      return safeJsonParse(extractText(result));
    }

    async function generateSinglePosterText(slotIndex) {
      const input = buildInputSummary();
      const selectedIp = state.generated.ip[state.selectedIp] || null;
      const parts = [{
        text: [
          "你是海报创意总监。基于已选 IP 与产品图，只输出 1 个新的海报文字方案。",
          `这是第 ${slotIndex + 1} 个方案位，请返回一个与常见电商海报不同但可执行的构图方向。`,
          '返回 JSON，格式必须为 {"variant":{"id":"","title":"","description":"","prompt":""}}。',
          "title 12 字内，description 24 字内，prompt 是完整中文长提示词，用于终稿阶段生图。",
          "prompt 必须详细描述主体、IP与产品关系、构图、镜头、光线、背景、材质、氛围与商业完成度。",
          "必须强调沿用已锁定 IP，不改人物动作与核心识别特征。",
          `海报场景: ${input.sceneType}`,
          selectedIp ? `已选 IP: ${selectedIp.title} / ${selectedIp.description}` : ""
        ].filter(Boolean).join("\n")
      }];

      const selectedIpImage = state.generated.ip[state.selectedIp]?.imageDataUrl;
      if (selectedIpImage) {
        const ref = dataUrlToInlineData(selectedIpImage);
        parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
      }
      if (state.refs.product) {
        parts.push({ inlineData: { mimeType: state.refs.product.mimeType, data: state.refs.product.data } });
      }

      const result = await callModel(getConfig().textModel, {
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const parsed = safeJsonParse(extractText(result));
      return parsed.variant || null;
    }

    async function generateImage(prompt, refs) {
      const parts = [{ text: prompt }];
      refs.filter(Boolean).forEach((ref) => {
        parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
      });

      const result = await callModel(getConfig().imageModel, {
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
      });

      return extractImageDataUrl(result);
    }

    function buildIpImagePrompt() {
      return [
        "基于上传的手绘 IP 线稿生成图片。",
        "要求：只做精准上色与 3D 化重建。",
        "严格保持原始人物动作、姿态、构图、比例、服装结构和道具不变。",
        "不要改动作，不要改视角，不要重设计人物。",
        "输出单个完整角色，白色纯背景，干净棚拍感。",
        "高质量 3D 手办质感，细节清晰，边缘完整，适合后续做海报。",
        "不要加入场景，不要加入产品，不要加入多余文字、水印或装饰元素。"
      ].join("\n");
    }

    function applyCardContent(card, meta) {
      const badge = card.querySelector(".select-badge");
      const title = card.querySelector("strong");
      const desc = card.querySelector(".muted");
      if (badge && meta.badge) badge.textContent = meta.badge;
      if (title && meta.title) title.textContent = meta.title;
      if (desc && meta.description) desc.textContent = meta.description;
    }

    function applyGeneratedImage(card, dataUrl) {
      const visual = card.querySelector(".selection-visual, .poster-visual, .final-visual");
      if (!visual) return;
      let img = visual.querySelector(".generated-shot");
      if (!img) {
        img = document.createElement("img");
        img.className = "generated-shot";
        img.alt = "AI 生成结果";
        visual.prepend(img);
      }
      img.src = dataUrl;
    }

    async function populateStage(stageName, metaList) {
      const selectorMap = {
        ip: ".selection-card",
        poster: ".poster-tab",
        final: ".final-card"
      };
      const cards = Array.from(document.querySelectorAll(selectorMap[stageName]));
      const tasks = [];
      for (let i = 0; i < metaList.length && i < cards.length; i += 1) {
        const meta = metaList[i];
        const card = cards[i];
        card.dataset.id = meta.id;
        applyCardContent(card, meta);
        const refs = [];
        if (stageName === "ip") refs.push(state.refs.ip);
        if (stageName === "poster") {
          refs.push(state.refs.product);
          const selectedIpImage = state.generated.ip[state.selectedIp]?.imageDataUrl;
          if (selectedIpImage) refs.unshift(dataUrlToInlineData(selectedIpImage));
        }
        if (stageName === "final") {
          refs.push(state.refs.product);
          const selectedIpImage = state.generated.ip[state.selectedIp]?.imageDataUrl;
          const selectedPosterImage = state.generated.poster[state.selectedPoster]?.imageDataUrl;
          if (selectedIpImage) refs.unshift(dataUrlToInlineData(selectedIpImage));
          if (selectedPosterImage) refs.unshift(dataUrlToInlineData(selectedPosterImage));
        }
        card.classList.add("is-loading");
        tasks.push(
          generateImage(meta.prompt, refs).then((imageDataUrl) => {
            card.classList.remove("is-loading");
            applyGeneratedImage(card, imageDataUrl);
            state.generated[stageName][meta.id] = { ...meta, imageDataUrl };
          }).catch((error) => {
            card.classList.remove("is-loading");
            throw error;
          })
        );
      }
      await Promise.all(tasks);
    }

    function populatePosterText(metaList) {
      const cards = Array.from(document.querySelectorAll(".poster-tab"));
      cards.forEach((card, index) => {
        const meta = metaList[index] || {};
        const title = card.querySelector("strong");
        const desc = card.querySelector(".muted");
        const promptEditor = card.querySelector(".prompt-editor");
        const img = card.querySelector(".generated-shot");
        if (img) img.remove();
        card.classList.remove("selected", "is-loading");
        card.dataset.id = meta.id || `方案 ${index + 1}`;
        if (title) title.textContent = meta.title || card.dataset.id;
        if (desc) desc.textContent = meta.description || "";
        if (promptEditor) {
          promptEditor.value = meta.prompt || "";
          promptEditor.disabled = true;
        }
      });
    }

    async function handleGenerateIp() {
      if (!state.refs.ip) throw new Error("请先上传手绘 IP。");
      const token = bumpRevealToken("ip");
      const prompt = buildIpImagePrompt();
      const cards = Array.from(document.querySelectorAll(".selection-card"));
      const fixturePromise = getFixtureEntries("ip");
      cards.forEach((card, i) => {
        const id = `方案 ${i + 1}`;
        card.dataset.id = id;
        const title = card.querySelector("strong");
        const desc = card.querySelector(".muted");
        const badge = card.querySelector(".select-badge");
        if (title) title.textContent = id;
        if (desc) desc.textContent = "";
        if (badge) badge.textContent = "";
        card.classList.add("is-loading");
        clearGeneratedImage(card);
      });
      startBackgroundTask("ip", () => {
        if (!hasReadyImageModel()) {
          return Promise.resolve();
        }
        return Promise.all(cards.map(() => generateImage(prompt, [state.refs.ip])));
      });
      await wait(IMAGE_REVEAL_DELAY_MS);
      const entries = await fixturePromise;
      if (!isRevealTokenCurrent("ip", token)) {
        return;
      }
      applyIpFixtures(entries, prompt);
      setStage(1);
      document.getElementById("ipSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function handleGeneratePosterText() {
      if (!state.selectedIp) throw new Error("请先选择 1 个 IP 方案。");
      const token = bumpRevealToken("poster");
      const fixturePromise = getFixtureEntries("poster");
      setStageCardsLoading(".poster-tab", true);
      startBackgroundTask("poster", () => {
        if (!hasReadyTextModel()) {
          return Promise.resolve();
        }
        return generateStructuredPlan("poster");
      });
      await wait(TEXT_REVEAL_DELAY_MS);
      const entries = await fixturePromise;
      if (!isRevealTokenCurrent("poster", token)) {
        return;
      }
      applyPosterFixtures(entries);
      setStage(2);
      document.getElementById("posterSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function handleRegenerateSinglePosterText(slotIndex, button) {
      if (!state.selectedIp) throw new Error("请先选择 1 个 IP 方案。");
      const card = document.querySelectorAll(".poster-tab")[slotIndex];
      if (!card) return;
      const token = bumpRevealToken("posterSlot", slotIndex);
      const oldId = card.dataset.id;
      const original = button.textContent;
      const fixturePromise = getFixtureEntries("poster");
      button.disabled = true;
      button.textContent = "正在生成...";
      card.classList.add("is-loading");
      try {
        startBackgroundTask(`poster-${slotIndex}`, () => {
          if (!hasReadyTextModel()) {
            return Promise.resolve();
          }
          return generateSinglePosterText(slotIndex);
        });
        await wait(TEXT_REVEAL_DELAY_MS);
        const entries = await fixturePromise;
        if (!isRevealTokenCurrent("posterSlot", token, slotIndex)) {
          return;
        }
        const entry = entries[slotIndex] || {
          id: getFallbackFixtureId("poster", slotIndex),
          title: getFallbackFixtureId("poster", slotIndex),
          description: "",
          prompt: ""
        };
        applyPosterFixtureSlot(slotIndex, entry, oldId);
      } finally {
        card.classList.remove("is-loading");
        button.disabled = false;
        button.textContent = original;
      }
    }

    async function handleGenerateFinal() {
      if (!state.selectedPoster) throw new Error("请先选择 1 个海报方案。");
      const selectedPoster = state.posterContent[state.selectedPoster];
      if (!selectedPoster?.prompt) throw new Error("当前海报方案缺少可用提示词。");
      const token = bumpRevealToken("final");
      const finalPrompt = [
        selectedPoster.prompt,
        "基于这个已确认的海报方案，输出最终商用成品图。",
        "保持方案中的构图逻辑、IP 与产品关系不变。",
        "提升质感、细节、光影与完成度。",
        "输出 1:1 成品海报。"
      ].join("\n");
      const fixturePromise = getFixtureEntries("final");
      document.querySelectorAll(".final-card").forEach((card, index) => {
        const title = card.querySelector("strong");
        const desc = card.querySelector(".muted");
        card.dataset.id = `终稿 ${String(index + 1).padStart(2, "0")}`;
        if (title) title.textContent = "";
        if (desc) desc.textContent = "";
        clearGeneratedImage(card);
        card.classList.add("is-loading");
      });
      const cards = Array.from(document.querySelectorAll(".final-card"));
      startBackgroundTask("final", () => {
        if (!hasReadyImageModel()) {
          return Promise.resolve();
        }
        return Promise.all(cards.map(() => {
          const refs = [];
          const selectedIpImage = state.generated.ip[state.selectedIp]?.imageDataUrl;
          if (selectedIpImage) refs.push(dataUrlToInlineData(selectedIpImage));
          if (state.refs.product) refs.push(state.refs.product);
          return generateImage(finalPrompt, refs);
        }));
      });
      await wait(IMAGE_REVEAL_DELAY_MS);
      const entries = await fixturePromise;
      if (!isRevealTokenCurrent("final", token)) {
        return;
      }
      applyFinalFixtures(entries, finalPrompt);
      setStage(3);
      document.getElementById("finalSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function withLoading(button, pendingText, task) {
      return async () => {
        const original = button.textContent;
        button.disabled = true;
        button.textContent = pendingText;
        try {
          await task();
        } catch (error) {
          alert(error.message || "生成失败。");
        } finally {
          button.disabled = false;
          button.textContent = original;
        }
      };
    }

    document.getElementById("ipInput").addEventListener("change", function () {
      readPreview(this, document.getElementById("ipPreview"), document.getElementById("ipDropzone"), "ip");
    });

    document.getElementById("productInput").addEventListener("change", function () {
      readPreview(this, document.getElementById("productPreview"), document.getElementById("productDropzone"), "product");
    });

    bindSingleCards(".selection-card", "selectedIp", lockedIpText);
    document.querySelectorAll(".final-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.id || "";
        if (!id) return;
        card.classList.toggle("selected");
        if (card.classList.contains("selected")) {
          if (!state.selectedFinals.includes(id)) state.selectedFinals.push(id);
        } else {
          state.selectedFinals = state.selectedFinals.filter((item) => item !== id);
        }
      });
    });

    document.querySelectorAll(".poster-tab").forEach((card) => {
      card.addEventListener("click", () => updateCompare(card.dataset.id));
    });

    document.querySelectorAll(".prompt-editor").forEach((editor) => {
      editor.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      editor.addEventListener("input", () => {
        const card = editor.closest(".poster-tab");
        const id = card && card.dataset.id;
        if (!id) return;
        if (!state.posterContent[id]) {
          state.posterContent[id] = {
            title: (card.querySelector("strong")?.textContent || id).trim(),
            description: (card.querySelector(".muted")?.textContent || "").trim(),
            prompt: ""
          };
        }
        state.posterContent[id].prompt = editor.value;
      });
    });

    document.querySelectorAll(".poster-regen").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        handleRegenerateSinglePosterText(Number(button.dataset.index || 0), button).catch((error) => {
          alert(error.message || "生成失败。");
        });
      });
    });

    saveConfigBtn.addEventListener("click", saveConfig);
    confirmUploadBtn.addEventListener("click", withLoading(confirmUploadBtn, "正在生成...", handleGenerateIp));
    confirmIpBtn.addEventListener("click", withLoading(confirmIpBtn, "正在生成...", handleGeneratePosterText));
    confirmPosterBtn.addEventListener("click", withLoading(confirmPosterBtn, "正在生成...", handleGenerateFinal));

    document.getElementById("exportBtn").addEventListener("click", () => {
      if (!window.JSZip) return alert("打包组件未加载完成，请稍后重试。");
      if (!state.selectedIp) return alert("请先选择已锁定的 3D IP 图。");
      if (!state.selectedPoster) return alert("请先选择海报方案。");
      if (!state.selectedFinals.length) return alert("请至少勾选 1 张终稿图。");

      const ipAsset = state.generated.ip[state.selectedIp];
      if (!ipAsset?.imageDataUrl) return alert("当前缺少已选 IP 图。");

      const posterAsset = state.posterContent[state.selectedPoster];
      if (!posterAsset?.prompt) return alert("当前缺少已选方案文字稿。");

      const zip = new JSZip();
      const ipFolder = zip.folder("01_ip");
      const posterFolder = zip.folder("02_poster_text");
      const finalFolder = zip.folder("03_finals");

      const ipBase64 = ipAsset.imageDataUrl.split(",")[1];
      ipFolder.file(`${state.selectedIp}.${getDataUrlFileExtension(ipAsset.imageDataUrl)}`, ipBase64, { base64: true });

      const posterText = [
        `方案名称：${posterAsset.title || state.selectedPoster}`,
        "",
        `方案说明：${posterAsset.description || ""}`,
        "",
        "AI 绘图提示词：",
        posterAsset.prompt || ""
      ].join("\n");
      posterFolder.file("selected_poster_plan.txt", posterText);

      state.selectedFinals.forEach((id) => {
        const asset = state.generated.final[id];
        if (!asset?.imageDataUrl) return;
        finalFolder.file(`${id}.${getDataUrlFileExtension(asset.imageDataUrl)}`, asset.imageDataUrl.split(",")[1], { base64: true });
      });

      zip.generateAsync({ type: "blob" }).then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "brandvision-export.zip";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }).catch((error) => {
        alert(error.message || "导出失败。");
      });
    });

    document.getElementById("resetAll").addEventListener("click", () => {
      invalidateRevealTokens();
      state.stage = 0;
      state.selectedIp = "";
      state.selectedPoster = "";
      state.selectedFinals = [];
      state.posterTextReady = false;
      state.posterVariantOrder = [];
      state.refs = { ip: null, product: null };
      state.generated = { ip: {}, poster: {}, final: {} };
      state.posterContent = {};
      setStage(0);
      lockedIpText.textContent = "未确认";
      lockedPosterText.textContent = "未确认";
      document.querySelectorAll(".selection-card, .poster-tab, .final-card").forEach((item) => {
        item.classList.remove("selected", "is-loading");
        const img = item.querySelector(".generated-shot");
        if (img) img.remove();
      });
      document.querySelectorAll(".poster-tab").forEach((card, index) => {
        const title = card.querySelector("strong");
        const desc = card.querySelector(".muted");
        const promptEditor = card.querySelector(".prompt-editor");
        card.dataset.id = `方案${index + 1}`;
        if (title) title.textContent = `方案${index + 1}`;
        if (desc) desc.textContent = "";
        if (promptEditor) {
          promptEditor.value = "";
          promptEditor.disabled = true;
        }
      });
      ["ipInput", "productInput"].forEach((id) => { document.getElementById(id).value = ""; });
      [["ipDropzone", "ipPreview"], ["productDropzone", "productPreview"]].forEach(([wrapperId, imgId]) => {
        document.getElementById(wrapperId).classList.remove("has-image");
        document.getElementById(imgId).removeAttribute("src");
      });
      updateCompare("");
      document.getElementById("uploadSection").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    loadConfig();
    void ensureFixtureManifestLoaded().catch(() => undefined);
    updateCompare("");
    setStage(0);


/* scripted-ip-upload-workflow:start */
(function () {
  const uploadStatusEl = document.getElementById("uploadStatus");
  const ipInputEl = document.getElementById("ipInput");
  const productInputEl = document.getElementById("productInput");
  const resetAllBtn = document.getElementById("resetAll");
  const maxEdge = 1536;
  const maxBytes = 4 * 1024 * 1024;
  const imagePreprocessFailureMessage = "Image preprocessing failed: the uploaded file could not be reduced to the supported size profile. Please try another image with a simpler background or lower native resolution.";
  const originalReadPreview = readPreview;
  const originalHandleGenerateIp = handleGenerateIp;

  state.uploadDiagnostics = state.uploadDiagnostics || { ip: null, product: null };

  function setUploadStatus(message, type) {
    if (!uploadStatusEl) {
      return;
    }
    if (!message) {
      uploadStatusEl.textContent = "";
      uploadStatusEl.dataset.state = "idle";
      return;
    }
    uploadStatusEl.textContent = message;
    uploadStatusEl.dataset.state = type || "info";
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片尺寸读取失败"));
      img.src = dataUrl;
    });
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error("图片压缩失败"));
          return;
        }
        resolve(blob);
      }, mimeType, quality);
    });
  }

  async function preprocessImage(file) {
    const originalDataUrl = await fileToDataUrl(file);
    const sourceImage = await loadImage(originalDataUrl);
    const longestEdge = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight) || 1;
    const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;
    const width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    const height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(imagePreprocessFailureMessage);
    }
    context.drawImage(sourceImage, 0, 0, width, height);

    const candidates = [
      { mimeType: file.type === "image/png" ? "image/png" : "image/jpeg", quality: 0.92 },
      { mimeType: "image/jpeg", quality: 0.88 },
      { mimeType: "image/jpeg", quality: 0.8 },
      { mimeType: "image/jpeg", quality: 0.72 },
      { mimeType: "image/jpeg", quality: 0.64 },
      { mimeType: "image/jpeg", quality: 0.56 }
    ];

    let chosenBlob = null;
    let chosenMimeType = file.type || "image/png";
    for (const candidate of candidates) {
      const blob = await canvasToBlob(canvas, candidate.mimeType, candidate.quality);
      if (!chosenBlob || blob.size < chosenBlob.size) {
        chosenBlob = blob;
        chosenMimeType = candidate.mimeType;
      }
      if (blob.size <= maxBytes) {
        chosenBlob = blob;
        chosenMimeType = candidate.mimeType;
        break;
      }
    }

    if (!chosenBlob || chosenBlob.size > maxBytes) {
      throw new Error(imagePreprocessFailureMessage);
    }

    const dataUrl = await blobToDataUrl(chosenBlob);
    return {
      name: file.name,
      mimeType: chosenMimeType,
      size: chosenBlob.size,
      width,
      height,
      longestEdge: Math.max(width, height),
      dataUrl,
      wasCompressed: scale < 1 || chosenBlob.size !== file.size || chosenMimeType !== (file.type || "image/png")
    };
  }

  async function applyCompressedPreview(input, img, wrapper, key) {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    await originalReadPreview(input, img, wrapper, key);
    setUploadStatus("", "idle");
    const processed = await preprocessImage(file);
    img.src = processed.dataUrl;
    wrapper.classList.add("has-image");
    state.refs[key] = {
      name: processed.name,
      mimeType: processed.mimeType,
      data: processed.dataUrl.split(",")[1],
      dataUrl: processed.dataUrl,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      longestEdge: processed.longestEdge
    };
    state.inputVersion[key] = (state.inputVersion[key] || 0) + 1;
    state.uploadDiagnostics[key] = processed;
    setUploadStatus(processed.wasCompressed ? "Reference image prepared for generation. Size and resolution were optimized automatically." : "Reference image is ready for generation.", processed.wasCompressed ? "success" : "info");
  }

  async function runGenerateIp() {
    const originalText = confirmUploadBtn.textContent;
    confirmUploadBtn.disabled = true;
    confirmUploadBtn.textContent = "正在生成...";
    try {
      setUploadStatus("", "idle");
      await originalHandleGenerateIp();
    } catch (error) {
      setUploadStatus(error.message || "生成失败。", "error");
    } finally {
      confirmUploadBtn.disabled = false;
      confirmUploadBtn.textContent = originalText;
    }
  }

  ipInputEl.addEventListener("change", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void applyCompressedPreview(ipInputEl, document.getElementById("ipPreview"), document.getElementById("ipDropzone"), "ip").catch(error => {
      setUploadStatus(error.message || imagePreprocessFailureMessage, "error");
    });
  }, true);

  productInputEl.addEventListener("change", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void applyCompressedPreview(productInputEl, document.getElementById("productPreview"), document.getElementById("productDropzone"), "product").catch(error => {
      setUploadStatus(error.message || imagePreprocessFailureMessage, "error");
    });
  }, true);

  confirmUploadBtn.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void runGenerateIp();
  }, true);

  resetAllBtn.addEventListener("click", () => {
    setUploadStatus("", "idle");
    state.uploadDiagnostics = { ip: null, product: null };
  }, true);
})();
/* scripted-ip-upload-workflow:end */


/* scripted-ip-knowledge-workflow:start */
(function () {
  const knowledgeBasePath = "./data/knowledge-base.json";
  const knowledgeButton = document.getElementById("knowledgeBaseButton");
  const knowledgeBackdrop = document.getElementById("knowledgeBaseBackdrop");
  const knowledgeDrawer = document.getElementById("knowledgeBaseDrawer");
  const knowledgeClose = document.getElementById("knowledgeBaseClose");
  const knowledgeTabs = document.getElementById("knowledgeBaseTabs");
  const knowledgeContent = document.getElementById("knowledgeBaseContent");
  const posterStatus = document.getElementById("posterGenerationStatus");
  const finalStatus = document.getElementById("finalGenerationStatus");
  const resetWorkflowButton = document.getElementById("resetAll");
  const originalHandleGeneratePosterText = handleGeneratePosterText;
  const originalHandleGenerateFinal = handleGenerateFinal;
  const statusIntervals = new Map();
  let knowledgeBasePromise;
  let knowledgeBase;
  let activeCategoryId = "brand";
  let previousFocus;

  const generationMessages = {
    poster: [
      "正在分析已锁定的 IP 与产品信息",
      "正在提炼品牌定位与核心卖点",
      "正在读取知识库并调整生成效果",
      "正在校验功效边界与违禁表达",
      "正在组装 4 组可执行提示词"
    ],
    final: [
      "正在锁定海报构图与主体关系",
      "正在读取知识库并调整生成效果",
      "正在适配品牌色与柔光氛围",
      "正在检查违禁元素与合规边界",
      "正在渲染 5 张终稿方案"
    ]
  };

  async function ensureKnowledgeBaseLoaded() {
    if (knowledgeBase) return knowledgeBase;
    if (!knowledgeBasePromise) {
      knowledgeBasePromise = fetch(knowledgeBasePath, { cache: "no-store" })
        .then(response => {
          if (!response.ok) throw new Error("知识库摘要加载失败");
          return response.json();
        })
        .then(data => {
          knowledgeBase = data;
          return data;
        })
        .catch(error => {
          knowledgeBasePromise = null;
          throw error;
        });
    }
    return knowledgeBasePromise;
  }

  function createKnowledgeCard(item) {
    const card = document.createElement("article");
    card.className = "knowledge-card";
    const title = document.createElement("strong");
    title.textContent = item.title || "知识条目";
    const content = document.createElement("p");
    content.textContent = item.content || "";
    card.append(title, content);
    return card;
  }

  function renderKnowledgeCategory(categoryId) {
    if (!knowledgeBase || !knowledgeContent) return;
    activeCategoryId = categoryId;
    const category = (knowledgeBase.categories || []).find(item => item.id === categoryId);
    knowledgeTabs && knowledgeTabs.querySelectorAll(".knowledge-tab").forEach(tab => {
      tab.setAttribute("aria-selected", String(tab.dataset.category === categoryId));
    });
    knowledgeContent.replaceChildren();
    if (!category) {
      knowledgeContent.textContent = "当前分类暂无摘要。";
      return;
    }
    const summary = document.createElement("p");
    summary.className = "knowledge-category-summary";
    summary.textContent = category.summary || "";
    knowledgeContent.append(summary);
    (category.items || []).forEach(item => knowledgeContent.append(createKnowledgeCard(item)));
  }

  function renderKnowledgeTabs() {
    if (!knowledgeBase || !knowledgeTabs) return;
    knowledgeTabs.replaceChildren();
    (knowledgeBase.categories || []).forEach(category => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "knowledge-tab";
      tab.dataset.category = category.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(category.id === activeCategoryId));
      tab.textContent = category.title;
      tab.addEventListener("click", () => renderKnowledgeCategory(category.id));
      knowledgeTabs.append(tab);
    });
    renderKnowledgeCategory(activeCategoryId);
  }

  async function openKnowledgeBase() {
    previousFocus = document.activeElement;
    knowledgeBackdrop.hidden = false;
    knowledgeDrawer.dataset.open = "true";
    knowledgeDrawer.setAttribute("aria-hidden", "false");
    knowledgeButton.setAttribute("aria-expanded", "true");
    try {
      await ensureKnowledgeBaseLoaded();
      renderKnowledgeTabs();
    } catch (error) {
      knowledgeContent.textContent = error.message || "知识库摘要加载失败。";
    }
    knowledgeClose.focus();
  }

  function closeKnowledgeBase() {
    knowledgeDrawer.dataset.open = "false";
    knowledgeDrawer.setAttribute("aria-hidden", "true");
    knowledgeButton.setAttribute("aria-expanded", "false");
    knowledgeBackdrop.hidden = true;
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  function stopGenerationStatus(statusElement) {
    if (!statusElement) return;
    const existing = statusIntervals.get(statusElement.id);
    if (existing) clearInterval(existing);
    statusIntervals.delete(statusElement.id);
    statusElement.dataset.active = "false";
  }

  function startGenerationStatus(statusElement, messages) {
    stopGenerationStatus(statusElement);
    if (!statusElement) return;
    const textElement = statusElement.querySelector(".generation-status-text");
    const progressElement = statusElement.querySelector(".generation-progress > span");
    let messageIndex = 0;
    statusElement.dataset.active = "true";
    if (textElement) textElement.textContent = messages[0];
    if (progressElement) {
      progressElement.style.animation = "none";
      void progressElement.offsetWidth;
      progressElement.style.animation = "";
    }
    const interval = setInterval(() => {
      messageIndex = Math.min(messageIndex + 1, messages.length - 1);
      if (textElement) textElement.textContent = messages[messageIndex];
      if (messageIndex === messages.length - 1) {
        clearInterval(interval);
        statusIntervals.delete(statusElement.id);
      }
    }, 2000);
    statusIntervals.set(statusElement.id, interval);
  }

  function stopAllGenerationStatus() {
    stopGenerationStatus(posterStatus);
    stopGenerationStatus(finalStatus);
  }

  async function runKnowledgeGeneration(button, pendingText, statusElement, messages, task) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = pendingText;
    startGenerationStatus(statusElement, messages);
    try {
      await ensureKnowledgeBaseLoaded();
      await task();
    } catch (error) {
      alert(error.message || "生成失败。");
    } finally {
      stopGenerationStatus(statusElement);
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  knowledgeButton.addEventListener("click", () => { void openKnowledgeBase(); });
  knowledgeClose.addEventListener("click", closeKnowledgeBase);
  knowledgeBackdrop.addEventListener("click", closeKnowledgeBase);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && knowledgeDrawer.dataset.open === "true") closeKnowledgeBase();
  });

  state.disableBackgroundGeneration = true;

  confirmIpBtn.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void runKnowledgeGeneration(confirmIpBtn, "正在生成...", posterStatus, generationMessages.poster, originalHandleGeneratePosterText);
  }, true);

  confirmPosterBtn.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void runKnowledgeGeneration(confirmPosterBtn, "正在生成...", finalStatus, generationMessages.final, originalHandleGenerateFinal);
  }, true);

  document.querySelectorAll(".poster-regen").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const slotIndex = Number(button.dataset.index || 0);
      void runKnowledgeGeneration(button, "正在生成...", posterStatus, generationMessages.poster, () => handleRegenerateSinglePosterText(slotIndex, button));
    }, true);
  });

  resetWorkflowButton.addEventListener("click", () => {
    stopAllGenerationStatus();
    closeKnowledgeBase();
  }, true);

  void ensureKnowledgeBaseLoaded().catch(error => console.error("[knowledge-base]", error));
})();
/* scripted-ip-knowledge-workflow:end */
